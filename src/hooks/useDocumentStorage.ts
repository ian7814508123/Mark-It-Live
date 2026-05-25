import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DocumentRecord, AppState, FolderRecord } from '../types';
import pkg from '../../package.json';
import {
    idbLoadAppState,
    idbPutDocument,
    idbPutDocuments,
    idbDeleteDocument,
    idbPutFolder,
    idbPutFolders,
    idbDeleteFolder,
    idbSetMeta,
    migrateFromLocalStorage,
    LS_VERSION_KEY,
} from '../utils/docStorage';

const MAX_DOCUMENTS = 50; // 防止儲存過多文檔

/**
 * 每次更新 default-markdown.md / default-mermaid.md 時，
 * 請遞增此版本號，讓既有使用者的快取預設文件自動刷新。
 * 使用者自訂的文件不受影響。
 */
const DEFAULT_VERSION = pkg.version;

/**
 * 生成簡單的 UUID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 文檔管理 Hook（IndexedDB 版本）
 *
 * 儲存層架構：
 * - 主要儲存：IndexedDB（mlp-docs-db），非同步、容量近乎無限
 * - 首次啟動：自動偵測並遷移 localStorage 舊資料
 * - React State：仍同步更新（確保 UI 即時回應），IndexedDB 作為持久化後端
 */
export function useDocumentStorage() {
    const [state, setState] = useState<AppState>({
        currentDocId: null,
        documents: [],
        folders: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    // 追蹤當前批次操作的順序，避免舊的 async 操作覆蓋新的狀態
    const stateVersionRef = useRef(0);

    // ─── 初始化：遷移 + 讀取 IndexedDB ────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                // Step 1：嘗試從 localStorage 遷移舊版資料（首次啟動時執行）
                await migrateFromLocalStorage();

                // Step 2：處理預設文件版本更新（若 app 版本升級，清除舊預設文件）
                const storedVersion = localStorage.getItem(LS_VERSION_KEY);
                let needsVersionCleaning = storedVersion !== DEFAULT_VERSION;

                // Step 3：從 IndexedDB 讀取完整 AppState
                const loaded = await idbLoadAppState();

                // Step 4：若版本升級，清除內建預設文件，讓 App.tsx 重建
                if (needsVersionCleaning && loaded.documents.length > 0) {
                    localStorage.setItem(LS_VERSION_KEY, DEFAULT_VERSION);
                    const DEFAULT_NAMES = ['預設 標記掉落 文檔', '預設 美人魚 文檔'];
                    const defaultDocs = loaded.documents.filter(d => DEFAULT_NAMES.includes(d.name));

                    // 從 IndexedDB 刪除舊預設文件
                    await Promise.all(defaultDocs.map(d => idbDeleteDocument(d.id)));

                    const filtered = loaded.documents.filter(d => !DEFAULT_NAMES.includes(d.name));
                    const newCurrentId = filtered.length > 0 ? filtered[0].id : null;

                    // 更新 currentDocId
                    if (newCurrentId) await idbSetMeta('currentDocId', newCurrentId);

                    setState({
                        currentDocId: newCurrentId,
                        documents: filtered,
                        folders: loaded.folders,
                    });
                } else {
                    setState(loaded);
                }
            } catch (err) {
                console.error('[useDocumentStorage] 初始化失敗:', err);
                // 降級：嘗試從 localStorage 讀取（緊急備援）
                try {
                    const raw = localStorage.getItem('mermaid-lens-documents');
                    if (raw) {
                        const parsed = JSON.parse(raw) as AppState;
                        setState({ ...parsed, folders: parsed.folders ?? [] });
                    }
                } catch {
                    // 完全失敗，使用空狀態
                }
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []); // 只在掛載時執行一次

    // ─── 建立新文檔 ────────────────────────────────────────────────────────────
    const createDocument = useCallback((
        mode: 'markdown' | 'mermaid',
        content: string = '',
        name?: string,
        folderId: string | null = null,
        templateId: string | null = null,
        icon?: string
    ) => {
        const id = generateId();

        setState(prev => {
            if (prev.documents.length >= MAX_DOCUMENTS) {
                alert(`最多只能建立 ${MAX_DOCUMENTS} 個文檔，請刪除部分舊文檔`);
                return prev;
            }

            const now = Date.now();
            const base = '未命名文檔';
            let finalName = name?.trim();

            if (!finalName) {
                const existingSet = new Set(prev.documents.map(d => d.name));
                if (!existingSet.has(base)) {
                    finalName = base;
                } else {
                    let n = 1;
                    while (existingSet.has(`${base}(${n})`)) n++;
                    finalName = `${base}(${n})`;
                }
            }

            // 計算在目標資料夾中的排序
            let order = 0;
            if (folderId) {
                const folderDocs = prev.documents.filter(d => d.folderId === folderId);
                if (folderDocs.length > 0) {
                    order = Math.max(...folderDocs.map(d => d.order ?? 0)) + 1;
                }
            }

            const newDoc: DocumentRecord = {
                id,
                name: finalName,
                mode,
                content,
                icon,
                templateId,
                folderId,
                order,
                createdAt: now,
                updatedAt: now,
            };

            // 非同步持久化至 IndexedDB
            idbPutDocument(newDoc).catch(err =>
                console.error('[useDocumentStorage] createDocument 持久化失敗:', err)
            );
            idbSetMeta('currentDocId', id).catch(() => {});

            return {
                ...prev,
                currentDocId: id,
                documents: [...prev.documents, newDoc],
            };
        });

        return id;
    }, []);

    // ─── 更新當前文檔內容 ─────────────────────────────────────────────────────
    const updateCurrentDocument = useCallback((content: string) => {
        setState(prev => {
            if (!prev.currentDocId) return prev;

            const updatedDoc = prev.documents.find(d => d.id === prev.currentDocId);
            if (!updatedDoc) return prev;

            const newDoc = { ...updatedDoc, content, updatedAt: Date.now() };

            // 非同步持久化：只更新單一文件，避免序列化整個 AppState
            idbPutDocument(newDoc).catch(err =>
                console.error('[useDocumentStorage] updateCurrentDocument 持久化失敗:', err)
            );

            return {
                ...prev,
                documents: prev.documents.map(doc =>
                    doc.id === prev.currentDocId ? newDoc : doc
                ),
            };
        });
    }, []);

    // ─── 更新行號註解 ──────────────────────────────────────────────────────────
    const updateLineComment = useCallback((docId: string, line: number, comment: string) => {
        setState(prev => {
            const targetDoc = prev.documents.find(d => d.id === docId);
            if (!targetDoc) return prev;

            const newComments = { ...(targetDoc.lineComments || {}) };
            if (!comment.trim()) {
                delete newComments[line];
            } else {
                newComments[line] = comment;
            }

            const newDoc = { ...targetDoc, lineComments: newComments, updatedAt: Date.now() };

            idbPutDocument(newDoc).catch(err =>
                console.error('[useDocumentStorage] updateLineComment 持久化失敗:', err)
            );

            return {
                ...prev,
                documents: prev.documents.map(doc => doc.id === docId ? newDoc : doc),
            };
        });
    }, []);

    // ─── 切換文檔 ─────────────────────────────────────────────────────────────
    const switchDocument = useCallback((docId: string) => {
        setState(prev => {
            idbSetMeta('currentDocId', docId).catch(() => {});
            return { ...prev, currentDocId: docId };
        });
    }, []);

    // ─── 刪除文檔 ─────────────────────────────────────────────────────────────
    const deleteDocument = useCallback((docId: string) => {
        setState(prev => {
            const newDocs = prev.documents.filter(doc => doc.id !== docId);
            let newCurrentId = prev.currentDocId;

            if (prev.currentDocId === docId) {
                newCurrentId = newDocs.length > 0 ? newDocs[0].id : null;
            }

            idbDeleteDocument(docId).catch(err =>
                console.error('[useDocumentStorage] deleteDocument 持久化失敗:', err)
            );
            if (newCurrentId) {
                idbSetMeta('currentDocId', newCurrentId).catch(() => {});
            }

            return { ...prev, currentDocId: newCurrentId, documents: newDocs };
        });
    }, []);

    // ─── 重新命名文檔 ─────────────────────────────────────────────────────────
    const renameDocument = useCallback((docId: string, newName: string) => {
        setState(prev => {
            const targetDoc = prev.documents.find(d => d.id === docId);
            if (!targetDoc) return prev;

            const newDoc = { ...targetDoc, name: newName.trim() || targetDoc.name, updatedAt: Date.now() };

            idbPutDocument(newDoc).catch(err =>
                console.error('[useDocumentStorage] renameDocument 持久化失敗:', err)
            );

            return {
                ...prev,
                documents: prev.documents.map(doc => doc.id === docId ? newDoc : doc),
            };
        });
    }, []);

    // ─── 建立資料夾 ───────────────────────────────────────────────────────────
    const createFolder = useCallback((name?: string) => {
        const now = Date.now();
        const base = '資料夾';
        let finalName = name?.trim();

        if (!finalName) {
            const existingSet = new Set(state.folders.map(f => f.name));
            if (!existingSet.has(base)) {
                finalName = base;
            } else {
                let n = 1;
                while (existingSet.has(`${base}(${n})`)) n++;
                finalName = `${base}(${n})`;
            }
        }

        const newFolder: FolderRecord = {
            id: generateId(),
            name: finalName,
            createdAt: now,
            updatedAt: now,
        };

        setState(prev => {
            idbPutFolder(newFolder).catch(err =>
                console.error('[useDocumentStorage] createFolder 持久化失敗:', err)
            );
            return { ...prev, folders: [...prev.folders, newFolder] };
        });

        return newFolder.id;
    }, [state.folders]);

    // ─── 刪除資料夾及其所有文檔 ──────────────────────────────────────────────
    const deleteFolder = useCallback((folderId: string) => {
        setState(prev => {
            const newFolders = prev.folders.filter(f => f.id !== folderId);
            const deletedDocs = prev.documents.filter(doc => doc.folderId === folderId);
            const newDocs = prev.documents.filter(doc => doc.folderId !== folderId);

            let newCurrentId = prev.currentDocId;
            const currentDoc = prev.documents.find(d => d.id === prev.currentDocId);
            if (currentDoc && currentDoc.folderId === folderId) {
                newCurrentId = newDocs.length > 0 ? newDocs[0].id : null;
            }

            // 批次刪除 IndexedDB 中的文件和資料夾
            Promise.all([
                ...deletedDocs.map(d => idbDeleteDocument(d.id)),
                idbDeleteFolder(folderId),
                newCurrentId ? idbSetMeta('currentDocId', newCurrentId) : Promise.resolve(),
            ]).catch(err =>
                console.error('[useDocumentStorage] deleteFolder 持久化失敗:', err)
            );

            return { ...prev, currentDocId: newCurrentId, folders: newFolders, documents: newDocs };
        });
    }, []);

    // ─── 重命名資料夾 ─────────────────────────────────────────────────────────
    const renameFolder = useCallback((folderId: string, name: string) => {
        setState(prev => {
            const targetFolder = prev.folders.find(f => f.id === folderId);
            if (!targetFolder) return prev;

            const newFolder = { ...targetFolder, name: name.trim() || targetFolder.name, updatedAt: Date.now() };

            idbPutFolder(newFolder).catch(err =>
                console.error('[useDocumentStorage] renameFolder 持久化失敗:', err)
            );

            return {
                ...prev,
                folders: prev.folders.map(f => f.id === folderId ? newFolder : f),
            };
        });
    }, []);

    // ─── 將文檔移入/移出資料夾 ───────────────────────────────────────────────
    const moveDocument = useCallback((docId: string, folderId: string | null) => {
        setState(prev => {
            const targetDoc = prev.documents.find(d => d.id === docId);
            if (!targetDoc) return prev;

            let order = 0;
            if (folderId) {
                const folderDocs = prev.documents.filter(d => d.folderId === folderId);
                if (folderDocs.length > 0) {
                    order = Math.max(...folderDocs.map(d => d.order ?? 0)) + 1;
                }
            }

            const newDoc = { ...targetDoc, folderId, order, updatedAt: Date.now() };

            idbPutDocument(newDoc).catch(err =>
                console.error('[useDocumentStorage] moveDocument 持久化失敗:', err)
            );

            return {
                ...prev,
                documents: prev.documents.map(doc => doc.id === docId ? newDoc : doc),
            };
        });
    }, []);

    // ─── 重新排序文檔 ─────────────────────────────────────────────────────────
    const reorderDocuments = useCallback((docIds: string[]) => {
        setState(prev => {
            const newDocs = [...prev.documents];
            const updatedDocs: DocumentRecord[] = [];

            docIds.forEach((id, index) => {
                const docIndex = newDocs.findIndex(d => d.id === id);
                if (docIndex !== -1) {
                    newDocs[docIndex] = { ...newDocs[docIndex], order: index, updatedAt: Date.now() };
                    updatedDocs.push(newDocs[docIndex]);
                }
            });

            // 批次更新 IndexedDB
            idbPutDocuments(updatedDocs).catch(err =>
                console.error('[useDocumentStorage] reorderDocuments 持久化失敗:', err)
            );

            return { ...prev, documents: newDocs };
        });
    }, []);

    // ─── 計算衍生狀態 ────────────────────────────────────────────────────────

    /** 當前文檔（僅在 currentDocId 或 documents 改變時重新計算） */
    const currentDocument = useMemo((): DocumentRecord | null => {
        if (!state.currentDocId) return null;
        return state.documents.find(doc => doc.id === state.currentDocId) ?? null;
    }, [state.currentDocId, state.documents]);

    /**
     * 儲存空間使用估算（IndexedDB 版本）
     * 因 IndexedDB 無固定上限，改以文件數量的百分比作為視覺指示
     * 若超過 MAX_DOCUMENTS 的 80%（40 份）則顯示警告
     */
    const storageUsage = useMemo(() => {
        return Math.min(100, Math.round((state.documents.length / MAX_DOCUMENTS) * 100));
    }, [state.documents.length]);

    /** 取得連結至當前文檔的所有文檔（Backlinks）- 僅限同資料夾內 */
    const getBacklinks = useCallback((docName: string) => {
        if (!docName || !state.currentDocId) return [];

        const currentDoc = state.documents.find(d => d.id === state.currentDocId);
        if (!currentDoc || !currentDoc.folderId) return [];

        return state.documents.filter(doc =>
            doc.folderId === currentDoc.folderId &&
            doc.id !== currentDoc.id &&
            doc.content.includes(`[[${docName}]]`)
        );
    }, [state.documents, state.currentDocId]);

    return {
        documents: state.documents,
        currentDocId: state.currentDocId,
        currentDocument,
        isLoading,
        createDocument,
        updateCurrentDocument,
        switchDocument,
        deleteDocument,
        renameDocument,
        storageUsage,
        getBacklinks,
        folders: state.folders,
        createFolder,
        deleteFolder,
        renameFolder,
        moveDocument,
        reorderDocuments,
        updateLineComment,
    };
}
