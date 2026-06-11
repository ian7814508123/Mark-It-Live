import { useState, useEffect, useCallback, useMemo } from 'react';

// ─── 常數設定 ─────────────────────────────────────────────────────────────
const DB_NAME = 'mlp-images-db';
const STORE_NAME = 'images';
const STORE_DATAFILES = 'datafiles';
const DB_VERSION = 2; // 升級至版本 2 以加建數據檔案 store
const MAX_IMAGES = 50;                      // 最大圖片數量上限
const MAX_DATAFILES = 50;                   // 最大數據檔案數量上限
const TTL_DAYS = 15;                         // 檔案時效（天）
const MAX_SIZE_PER_IMAGE_MB = 10;             // 單個檔案大小上限（MB）
const MAX_SIZE_BYTES = MAX_SIZE_PER_IMAGE_MB * 1024 * 1024;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

// ─── 型別定義 ────────────────────────────────────────────────────────────────
export interface ImageRecord {
    id: string;
    name: string;
    dataUrl: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: number;
    expiresAt: number;  // createdAt + TTL_MS
}

export interface ImageMeta {
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: number;
    expiresAt: number;
}

export interface DataFileRecord {
    id: string;
    name: string;        // 檔名，例如 "world-110m.json"
    blob: Blob;          // 資料 Blob (可以是 File)
    sizeBytes: number;
    mimeType: string;
    createdAt: number;
    expiresAt: number;
}

export interface DataFileMeta {
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: number;
    expiresAt: number;
}

// ─── IndexedDB 工具函式 ──────────────────────────────────────────────────────

/** 開啟（或建立/升級）IndexedDB 資料庫 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            // 建立圖片儲存空間
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('expiresAt', 'expiresAt', { unique: false });
            }
            // 建立數據檔案儲存空間
            if (!db.objectStoreNames.contains(STORE_DATAFILES)) {
                const store = db.createObjectStore(STORE_DATAFILES, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('expiresAt', 'expiresAt', { unique: false });
                store.createIndex('name', 'name', { unique: true }); // 用以做同名覆蓋與快速檢索
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ─── 圖片 DB 存取 ───

/** 從 IndexedDB 讀取單一圖片（包含 dataUrl） */
async function dbGetImage(id: string): Promise<ImageRecord | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 讀取所有 ImageMeta（不含 dataUrl，節省記憶體） */
async function dbGetAllMeta(): Promise<ImageMeta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const all: ImageMeta[] = [];

        const req = store.openCursor();
        req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                const { id, name, sizeBytes, mimeType, createdAt, expiresAt } = cursor.value as ImageRecord;
                all.push({ id, name, sizeBytes, mimeType, createdAt, expiresAt });
                cursor.continue();
            } else {
                resolve(all);
            }
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 寫入一筆 ImageRecord */
async function dbPutImage(record: ImageRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    });
}

/** 刪除一筆 ImageRecord */
async function dbDeleteImage(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 批次刪除多筆 ImageRecord */
async function dbDeleteImages(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

// ─── 數據檔案 DB 存取 ───

/** 從 IndexedDB 讀取單一數據檔案的 Blob */
async function dbGetDataFile(id: string): Promise<DataFileRecord | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DATAFILES, 'readonly');
        const req = tx.objectStore(STORE_DATAFILES).get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 透過檔名（name）在 IndexedDB 中查詢數據檔案的 Blob */
async function dbGetDataFileByName(name: string): Promise<DataFileRecord | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DATAFILES, 'readonly');
        const store = tx.objectStore(STORE_DATAFILES);
        const index = store.index('name');
        const req = index.get(name);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 讀取所有 DataFile 的 Meta（不含 blob，節省記憶體） */
async function dbGetAllDataMeta(): Promise<DataFileMeta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DATAFILES, 'readonly');
        const store = tx.objectStore(STORE_DATAFILES);
        const all: DataFileMeta[] = [];

        const req = store.openCursor();
        req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                const { id, name, sizeBytes, mimeType, createdAt, expiresAt } = cursor.value as DataFileRecord;
                all.push({ id, name, sizeBytes, mimeType, createdAt, expiresAt });
                cursor.continue();
            } else {
                resolve(all);
            }
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 寫入一筆 DataFileRecord */
async function dbPutDataFile(record: DataFileRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DATAFILES, 'readwrite');
        tx.objectStore(STORE_DATAFILES).put(record);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    });
}

/** 刪除一筆 DataFileRecord */
async function dbDeleteDataFile(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DATAFILES, 'readwrite');
        tx.objectStore(STORE_DATAFILES).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 批次刪除多筆 DataFileRecord */
async function dbDeleteDataFiles(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DATAFILES, 'readwrite');
        const store = tx.objectStore(STORE_DATAFILES);
        ids.forEach(id => store.delete(id));
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

// ─── 輔助函式 ─────────────────────────────────────────────────────────────────

/** 生成唯一 ID（時間戳 + 隨機碼） */
function generateId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 將 File 轉換成 Base64 Data URL */
function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/** 格式化到期日 */
export function formatExpiryDate(expiresAt: number): string {
    return new Date(expiresAt).toLocaleDateString('zh-TW', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    });
}

/** 格式化檔案大小 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Hook：useImageStorage ────────────────────────────────────────────────────

export interface UseImageStorageReturn {
    // ── 圖片庫 ──
    /** 所有已上傳圖片的 Meta 列表（不含 dataUrl） */
    images: ImageMeta[];
    /** 圖片數量是否達到上限 */
    isAtLimit: boolean;
    /** 上傳圖片 */
    uploadImage: (file: File, currentDocContent?: string) => Promise<
        { success: true; id: string; name: string; markdownRef: string } |
        { success: false; error: string }
    >;
    /** 取得圖片 Data URL */
    getImage: (id: string) => Promise<string | null>;
    /** 刪除圖片 */
    deleteImage: (id: string) => Promise<void>;
    /** 最大圖片數量上限 */
    maxImages: number;

    // ── 數據庫 (新增) ──
    /** 所有已上傳數據檔案的 Meta 列表 */
    dataFiles: DataFileMeta[];
    /** 數據數量是否達到上限 */
    isDataAtLimit: boolean;
    /** 上傳數據檔案 */
    uploadDataFile: (file: File, currentDocContent?: string) => Promise<
        { success: true; id: string; name: string; ref: string } |
        { success: false; error: string }
    >;
    /** 取得數據檔案 Blob */
    getDataFile: (id: string) => Promise<Blob | null>;
    /** 依檔名取得數據檔案 Blob */
    getDataFileByName: (name: string) => Promise<Blob | null>;
    /** 刪除數據檔案 */
    deleteDataFile: (id: string) => Promise<void>;
    /** 最大數據檔案數量上限 */
    maxDataFiles: number;

    // ── 聯立管理 ──
    /** 聯立已用總容量（MB，加總圖片 + 數據檔案） */
    totalSizeMB: number;
    /** 單個檔案大小上限 MB */
    maxSizeMB: number;
    /** TTL 天數 */
    ttlDays: number;
}

/**
 * 管理媒體與數據檔案（圖片與資料）的儲存與生命週期。
 * 使用同一個 IndexedDB 資料庫（不同 store）來維護，支援容量聯立管理、TTL 到期清理與 LRU 數量淘汰。
 */
export function useImageStorage(): UseImageStorageReturn {
    const [images, setImages] = useState<ImageMeta[]>([]);
    const [dataFiles, setDataFiles] = useState<DataFileMeta[]>([]);

    /** 從 IndexedDB 同步最新狀態 */
    const refreshAll = useCallback(async () => {
        try {
            // 同步圖片
            const allImgs = await dbGetAllMeta();
            allImgs.sort((a, b) => b.createdAt - a.createdAt);
            setImages(allImgs);

            // 同步數據檔案
            const allData = await dbGetAllDataMeta();
            allData.sort((a, b) => b.createdAt - a.createdAt);
            setDataFiles(allData);
        } catch (err) {
            console.error('[useImageStorage] refreshAll 失敗:', err);
        }
    }, []);

    /** 初始化：清除過期圖片與數據檔案，並同步數據 */
    useEffect(() => {
        const init = async () => {
            try {
                const now = Date.now();

                // 清理圖片
                const allImgs = await dbGetAllMeta();
                const expiredImgs = allImgs.filter(img => img.expiresAt <= now).map(img => img.id);
                if (expiredImgs.length > 0) {
                    await dbDeleteImages(expiredImgs);
                    console.info(`[useImageStorage] 已自動清理 ${expiredImgs.length} 張過期圖片`);
                }

                // 清理數據檔案
                const allData = await dbGetAllDataMeta();
                const expiredData = allData.filter(d => d.expiresAt <= now).map(d => d.id);
                if (expiredData.length > 0) {
                    await dbDeleteDataFiles(expiredData);
                    console.info(`[useImageStorage] 已自動清理 ${expiredData.length} 個過期數據檔案`);
                }
            } catch (err) {
                console.error('[useImageStorage] TTL 清理失敗:', err);
            } finally {
                await refreshAll();
            }
        };
        init();
    }, [refreshAll]);

    // ─── 圖片操作 ───

    const uploadImage = useCallback(async (
        file: File,
        currentDocContent: string = ''
    ): Promise<
        { success: true; id: string; name: string; markdownRef: string } |
        { success: false; error: string }
    > => {
        // 1. 驗證檔案類型
        const ALLOWED_TYPES = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/ogg',
            'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav'
        ];
        if (!ALLOWED_TYPES.includes(file.type)) {
            return { success: false, error: `不支援的檔案類型：${file.type}。僅支援圖片(JPG, PNG, WebP) 與影片(MP4, WebM) 或音訊(MP3, WAV)。` };
        }

        // 2. 驗證檔案大小
        if (file.size > MAX_SIZE_BYTES) {
            return {
                success: false,
                error: `媒體檔案過大（${formatFileSize(file.size)}），單個上傳上限為 ${MAX_SIZE_PER_IMAGE_MB} MB。`
            };
        }

        // 3. 檢查數量上限，執行 LRU 淘汰
        const all = await dbGetAllMeta();
        if (all.length >= MAX_IMAGES) {
            const unreferenced = all
                .filter(img => !currentDocContent.includes(`img-local://${img.id}`))
                .sort((a, b) => a.createdAt - b.createdAt); // 最舊的在前

            if (unreferenced.length === 0) {
                return {
                    success: false,
                    error: `已達到媒體數量上限（${MAX_IMAGES} 個），且所有媒體均被文件引用，無法自動淘汰。請手動刪除不需要的檔案。`
                };
            }

            const toEvict = unreferenced[0];
            await dbDeleteImage(toEvict.id);
            console.info(`[useImageStorage] LRU 淘汰最舊媒體：${toEvict.name} (${toEvict.id})`);
        }

        // 4. 轉換 Base64 並寫入 IndexedDB
        try {
            const dataUrl = await fileToDataUrl(file);
            const now = Date.now();
            const id = generateId();

            const record: ImageRecord = {
                id,
                name: file.name,
                dataUrl,
                sizeBytes: file.size,
                mimeType: file.type,
                createdAt: now,
                expiresAt: now + TTL_MS,
            };

            await dbPutImage(record);
            await refreshAll();

            let markdownRef = `![${file.name}](img-local://${id})`;
            if (file.type.startsWith('video/')) {
                markdownRef = `<video src="img-local://${id}"></video>`;
            } else if (file.type.startsWith('audio/')) {
                markdownRef = `<audio src="img-local://${id}"></audio>`;
            }

            return { success: true, id, name: file.name, markdownRef };
        } catch (err: any) {
            console.error('[useImageStorage] 圖片上傳失敗:', err);
            return { success: false, error: `圖片上傳失敗：${err?.message ?? '未知錯誤'}` };
        }
    }, [refreshAll]);

    const getImage = useCallback(async (id: string): Promise<string | null> => {
        try {
            const record = await dbGetImage(id);
            if (!record) return null;
            if (record.expiresAt <= Date.now()) {
                await dbDeleteImage(id);
                await refreshAll();
                return null;
            }
            return record.dataUrl;
        } catch (err) {
            console.error('[useImageStorage] getImage 失敗:', err);
            return null;
        }
    }, [refreshAll]);

    const deleteImage = useCallback(async (id: string): Promise<void> => {
        try {
            await dbDeleteImage(id);
            await refreshAll();
        } catch (err) {
            console.error('[useImageStorage] deleteImage 失敗:', err);
        }
    }, [refreshAll]);

    // ─── 數據檔案操作 ───

    const uploadDataFile = useCallback(async (
        file: File,
        currentDocContent: string = ''
    ): Promise<
        { success: true; id: string; name: string; ref: string } |
        { success: false; error: string }
    > => {
        // 1. 驗證副檔名
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const ALLOWED_EXTS = ['json', 'csv', 'tsv', 'topojson'];
        if (!fileExt || !ALLOWED_EXTS.includes(fileExt)) {
            return { success: false, error: `不支援的檔案格式：.${fileExt}。僅支援 JSON、CSV、TSV、TopoJSON。` };
        }

        // 2. 驗證檔案大小
        if (file.size > MAX_SIZE_BYTES) {
            return {
                success: false,
                error: `數據檔案過大（${formatFileSize(file.size)}），單個檔案上傳上限為 ${MAX_SIZE_PER_IMAGE_MB} MB。`
            };
        }

        // 3. 檢查是否有同名檔案，如果有，則為「覆蓋」策略（直接複用舊 ID，不增加總數限制）
        const all = await dbGetAllDataMeta();
        const existing = all.find(d => d.name === file.name);

        try {
            const now = Date.now();
            let id = generateId();

            if (existing) {
                id = existing.id;
                console.info(`[useImageStorage] 同名數據檔案覆蓋：${file.name} (${id})`);
            } else if (all.length >= MAX_DATAFILES) {
                // 非覆蓋且超限，進行 LRU 淘汰
                const unreferenced = all
                    .filter(d => !currentDocContent.includes(`data-local://${d.name}`))
                    .sort((a, b) => a.createdAt - b.createdAt); // 最舊的在前

                if (unreferenced.length === 0) {
                    return {
                        success: false,
                        error: `已達到數據檔案數量上限（${MAX_DATAFILES} 個），且所有檔案均被文件引用，無法自動淘汰。請手動刪除不需要的檔案。`
                    };
                }

                const toEvict = unreferenced[0];
                await dbDeleteDataFile(toEvict.id);
                console.info(`[useImageStorage] LRU 淘汰最舊數據檔案：${toEvict.name} (${toEvict.id})`);
            }

            const record: DataFileRecord = {
                id,
                name: file.name,
                blob: file, // File 繼承自 Blob，直接儲存 Blob 是完美的
                sizeBytes: file.size,
                mimeType: file.type || 'application/octet-stream',
                createdAt: now,
                expiresAt: now + TTL_MS,
            };

            await dbPutDataFile(record);
            await refreshAll();

            const ref = `data-local://${file.name}`;
            return { success: true, id, name: file.name, ref };
        } catch (err: any) {
            console.error('[useImageStorage] 數據上傳失敗:', err);
            return { success: false, error: `數據上傳失敗：${err?.message ?? '未知錯誤'}` };
        }
    }, [refreshAll]);

    const getDataFile = useCallback(async (id: string): Promise<Blob | null> => {
        try {
            const record = await dbGetDataFile(id);
            if (!record) return null;
            if (record.expiresAt <= Date.now()) {
                await dbDeleteDataFile(id);
                await refreshAll();
                return null;
            }
            return record.blob;
        } catch (err) {
            console.error('[useImageStorage] getDataFile 失敗:', err);
            return null;
        }
    }, [refreshAll]);

    const getDataFileByName = useCallback(async (name: string): Promise<Blob | null> => {
        try {
            const record = await dbGetDataFileByName(name);
            if (!record) return null;
            if (record.expiresAt <= Date.now()) {
                await dbDeleteDataFile(record.id);
                await refreshAll();
                return null;
            }
            return record.blob;
        } catch (err) {
            console.error('[useImageStorage] getDataFileByName 失敗:', err);
            return null;
        }
    }, [refreshAll]);

    const deleteDataFile = useCallback(async (id: string): Promise<void> => {
        try {
            await dbDeleteDataFile(id);
            await refreshAll();
        } catch (err) {
            console.error('[useImageStorage] deleteDataFile 失敗:', err);
        }
    }, [refreshAll]);

    // ─── 聯立空間加總 ───
    const totalSizeMB = useMemo(() => {
        const imgSize = images.reduce((acc, img) => acc + img.sizeBytes, 0);
        const dataSize = dataFiles.reduce((acc, d) => acc + d.sizeBytes, 0);
        return (imgSize + dataSize) / (1024 * 1024);
    }, [images, dataFiles]);

    return {
        // 圖片
        images,
        isAtLimit: images.length >= MAX_IMAGES,
        uploadImage,
        getImage,
        deleteImage,
        maxImages: MAX_IMAGES,

        // 數據
        dataFiles,
        isDataAtLimit: dataFiles.length >= MAX_DATAFILES,
        uploadDataFile,
        getDataFile,
        getDataFileByName,
        deleteDataFile,
        maxDataFiles: MAX_DATAFILES,

        // 共享與聯立
        totalSizeMB,
        maxSizeMB: MAX_SIZE_PER_IMAGE_MB,
        ttlDays: TTL_DAYS,
    };
}
