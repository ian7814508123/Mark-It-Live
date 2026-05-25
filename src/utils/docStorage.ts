/**
 * docStorage.ts
 *
 * 文件資料的 IndexedDB 底層存取層。
 * 負責管理 mlp-docs-db，儲存 DocumentRecord、FolderRecord 及 metadata。
 *
 * 設計原則：
 * - 純函數，所有操作返回 Promise，不持有任何狀態
 * - 與 useImageStorage 使用分離的 DB（mlp-docs-db），避免版本衝突
 * - DB Schema 升級透過 version 管理，保持向後相容
 */

import { AppState, DocumentRecord, FolderRecord } from '../types';

// ─── 常數設定 ─────────────────────────────────────────────────────────────────
const DB_NAME = 'mlp-docs-db';
const DB_VERSION = 1;

const STORE_DOCUMENTS = 'documents';
const STORE_FOLDERS = 'folders';
const STORE_META = 'metadata';

/** localStorage 的文件資料 key（用於遷移偵測） */
export const LS_DOCS_KEY = 'mermaid-lens-documents';
/** localStorage 的版本號 key */
export const LS_VERSION_KEY = 'mermaid-lens-default-version';
/** 遷移完成後在 localStorage 留下的標記 key，保留 7 天 */
const LS_MIGRATED_KEY = 'mlp-idb-migrated-at';

// ─── DB 開啟 ──────────────────────────────────────────────────────────────────

/** 開啟（或建立/升級）mlp-docs-db 資料庫 */
function openDocDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;

            // 文件儲存空間
            if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
                const docStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
                docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                docStore.createIndex('folderId', 'folderId', { unique: false });
            }

            // 資料夾儲存空間
            if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
                db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
            }

            // 應用 metadata（currentDocId、appVersion 等）
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'key' });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ─── 文件 CRUD ────────────────────────────────────────────────────────────────

/** 取得所有文件（不含排序，呼叫端自行排序） */
export async function idbGetAllDocuments(): Promise<DocumentRecord[]> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
        const req = tx.objectStore(STORE_DOCUMENTS).getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 寫入（或覆蓋）單一文件 */
export async function idbPutDocument(doc: DocumentRecord): Promise<void> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
        tx.objectStore(STORE_DOCUMENTS).put(doc);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 批次寫入多筆文件（用於遷移與初始化） */
export async function idbPutDocuments(docs: DocumentRecord[]): Promise<void> {
    if (docs.length === 0) return;
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
        const store = tx.objectStore(STORE_DOCUMENTS);
        docs.forEach(doc => store.put(doc));
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 刪除單一文件 */
export async function idbDeleteDocument(id: string): Promise<void> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
        tx.objectStore(STORE_DOCUMENTS).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

// ─── 資料夾 CRUD ──────────────────────────────────────────────────────────────

/** 取得所有資料夾 */
export async function idbGetAllFolders(): Promise<FolderRecord[]> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readonly');
        const req = tx.objectStore(STORE_FOLDERS).getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 寫入（或覆蓋）單一資料夾 */
export async function idbPutFolder(folder: FolderRecord): Promise<void> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readwrite');
        tx.objectStore(STORE_FOLDERS).put(folder);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 批次寫入多筆資料夾（用於遷移） */
export async function idbPutFolders(folders: FolderRecord[]): Promise<void> {
    if (folders.length === 0) return;
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readwrite');
        const store = tx.objectStore(STORE_FOLDERS);
        folders.forEach(f => store.put(f));
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 刪除單一資料夾 */
export async function idbDeleteFolder(id: string): Promise<void> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FOLDERS, 'readwrite');
        tx.objectStore(STORE_FOLDERS).delete(id);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

// ─── 應用 Metadata ────────────────────────────────────────────────────────────

/** 讀取 metadata 欄位（currentDocId 等） */
export async function idbGetMeta(key: string): Promise<string | null> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readonly');
        const req = tx.objectStore(STORE_META).get(key);
        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

/** 寫入 metadata 欄位 */
export async function idbSetMeta(key: string, value: string): Promise<void> {
    const db = await openDocDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_META, 'readwrite');
        tx.objectStore(STORE_META).put({ key, value });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

// ─── 批次讀取完整 AppState ─────────────────────────────────────────────────────

/**
 * 一次性讀取完整的 AppState（documents + folders + currentDocId）
 * 使用三個平行 Promise 減少總等待時間
 */
export async function idbLoadAppState(): Promise<AppState> {
    const [documents, folders, currentDocId] = await Promise.all([
        idbGetAllDocuments(),
        idbGetAllFolders(),
        idbGetMeta('currentDocId'),
    ]);
    return { documents, folders, currentDocId };
}

// ─── 一次性遷移（localStorage → IndexedDB） ──────────────────────────────────

/**
 * 偵測 localStorage 中是否有舊版文件資料，若有則遷移至 IndexedDB。
 * 遷移成功後：
 * 1. 在 localStorage 寫入遷移完成時間戳記（LS_MIGRATED_KEY）
 * 2. 移除 localStorage 中的文件資料（釋放空間）
 *
 * @returns 遷移的文件數量（0 = 無需遷移或已遷移過）
 */
export async function migrateFromLocalStorage(): Promise<number> {
    // 已遷移過則跳過
    if (localStorage.getItem(LS_MIGRATED_KEY)) return 0;

    const raw = localStorage.getItem(LS_DOCS_KEY);
    if (!raw) return 0;

    try {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const docs: DocumentRecord[] = parsed.documents ?? [];
        const folders: FolderRecord[] = parsed.folders ?? [];
        const currentDocId: string | null = parsed.currentDocId ?? null;

        if (docs.length === 0 && folders.length === 0) {
            // 空資料，標記遷移完成，清除 localStorage
            localStorage.setItem(LS_MIGRATED_KEY, String(Date.now()));
            localStorage.removeItem(LS_DOCS_KEY);
            return 0;
        }

        // 批次寫入 IndexedDB
        await Promise.all([
            idbPutDocuments(docs),
            idbPutFolders(folders),
            currentDocId ? idbSetMeta('currentDocId', currentDocId) : Promise.resolve(),
        ]);

        // 遷移成功：標記並清除 localStorage
        localStorage.setItem(LS_MIGRATED_KEY, String(Date.now()));
        localStorage.removeItem(LS_DOCS_KEY);

        console.info(`[docStorage] 自動遷移完成：${docs.length} 份文件、${folders.length} 個資料夾已從 localStorage 移轉至 IndexedDB`);
        return docs.length;

    } catch (err) {
        // 遷移失敗：保留 localStorage 資料，下次啟動重試
        console.error('[docStorage] localStorage 遷移失敗，將於下次啟動重試:', err);
        return 0;
    }
}

/**
 * 檢查 IndexedDB 中是否有任何文件資料
 * 用於判斷是否需要建立預設文件
 */
export async function idbHasAnyData(): Promise<boolean> {
    const docs = await idbGetAllDocuments();
    return docs.length > 0;
}
