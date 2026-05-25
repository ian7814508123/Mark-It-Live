import { useState, useCallback, useEffect, useMemo } from 'react';
import { DocumentRecord, AppState, FolderRecord } from '../types';
import pkg from '../../package.json';

const STORAGE_KEY = 'mermaid-lens-documents';
/**
 * 每次更新 default-markdown.md / default-mermaid.md 時，
 * 請遞增此版本號，讓既有使用者的快取預設文件自動刷新。
 * 使用者自訂的文件不受影響。
 */
const DEFAULT_VERSION = pkg.version;
const VERSION_KEY = 'mermaid-lens-default-version';
const MAX_DOCUMENTS = 50; // 防止儲存過多文檔

/**
 * 生成簡單的 UUID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 從 localStorage 載入所有文檔
 */
function loadFromStorage(): AppState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { currentDocId: null, documents: [], folders: [] };
        }

        const parsed = JSON.parse(stored) as AppState;
        if (!parsed.folders) parsed.folders = []; // Migration for existing users

        // 版本對比：若預設文件版本過舊，清除內建預設文件，讓 App.tsx 重新建立
        const storedVersion = localStorage.getItem(VERSION_KEY);
        if (storedVersion !== DEFAULT_VERSION) {
            localStorage.setItem(VERSION_KEY, DEFAULT_VERSION);
            // 僅刪除兩個內建的預設文件（以固定名稱識別），保留使用者自訂文件
            const DEFAULT_NAMES = ['預設 標記掉落 文檔', '預設 美人魚 文檔'];
            const filtered = parsed.documents.filter(
                doc => !DEFAULT_NAMES.includes(doc.name)
            );
            return {
                currentDocId: filtered.length > 0 ? filtered[0].id : null,
                documents: filtered,
                folders: parsed.folders || [],
            };
        }

        return parsed;
    } catch (error) {
        console.error('載入文檔失敗:', error);
        return { currentDocId: null, documents: [], folders: [] };
    }
}

/**
 * 儲存到 localStorage
 */
function saveToStorage(state: AppState): boolean {
    try {
        const data = JSON.stringify(state);
        // 檢查容量（粗略估計，1 char ≈ 2 bytes）
        const sizeInBytes = data.length * 2;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 9) {
            console.warn('localStorage 容量接近上限');
            alert('儲存空間即將不足，建議刪除部分舊文檔或匯出備份');
            return false;
        }

        localStorage.setItem(STORAGE_KEY, data);
        return true;
    } catch (error) {
        console.error('儲存文檔失敗:', error);
        alert('儲存失敗：容量已滿，請刪除部分文檔');
        return false;
    }
}

/**
 * 文檔管理 Hook
 */
export function useDocumentStorage() {
    const [state, setState] = useState<AppState>(loadFromStorage);

    // 同步到 localStorage（debounce 500ms：減少打字時的 I/O 阻塞，
    // 停止打字後才執行序列化寫入，避免 localStorage 阻斷主執行緒）
    useEffect(() => {
        const timer = setTimeout(() => {
            saveToStorage(state);
        }, 500);
        return () => clearTimeout(timer);
    }, [state]);

    /**
     * 建立新文檔
     */
    const createDocument = useCallback((mode: 'markdown' | 'mermaid', content: string = '', name?: string, folderId: string | null = null, templateId: string | null = null, icon?: string) => {
        const id = generateId();

        setState(prev => {
            if (prev.documents.length >= MAX_DOCUMENTS) {
                alert(`最多只能建立 ${MAX_DOCUMENTS} 個文檔，請刪除部分舊文檔`);
                return prev;
            }

            const now = Date.now();
            const base = "未命名文檔";
            let finalName = name?.trim();

            if (!finalName) {
                const existingSet = new Set(prev.documents.map(d => d.name));
                if (!existingSet.has(base)) {
                    finalName = base;
                } else {
                    let n = 1;
                    while (existingSet.has(`${base}(${n})`)) {
                        n++;
                    }
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

            return {
                ...prev,
                currentDocId: id,
                documents: [...prev.documents, newDoc],
            };
        });

        return id;
    }, []);


    /**
     * 更新當前文檔內容
     */
    const updateCurrentDocument = useCallback((content: string) => {
        setState(prev => {
            if (!prev.currentDocId) return prev;

            return {
                ...prev,
                documents: prev.documents.map(doc =>
                    doc.id === prev.currentDocId
                        ? { ...doc, content, updatedAt: Date.now() }
                        : doc
                ),
            };
        });
    }, []);

    /**
     * 更新行號註解
     */
    const updateLineComment = useCallback((docId: string, line: number, comment: string) => {
        setState(prev => ({
            ...prev,
            documents: prev.documents.map(doc => {
                if (doc.id !== docId) return doc;
                
                const newComments = { ...(doc.lineComments || {}) };
                if (!comment.trim()) {
                    delete newComments[line];
                } else {
                    newComments[line] = comment;
                }
                
                return { ...doc, lineComments: newComments, updatedAt: Date.now() };
            })
        }));
    }, []);

    /**
     * 切換到指定文檔
     */
    const switchDocument = useCallback((docId: string) => {
        setState(prev => ({
            ...prev,
            currentDocId: docId,
        }));
    }, []);

    /**
     * 刪除文檔
     */
    const deleteDocument = useCallback((docId: string) => {
        setState(prev => {
            const newDocs = prev.documents.filter(doc => doc.id !== docId);
            let newCurrentId = prev.currentDocId;

            // 如果刪除的是當前文檔，切換到第一個可用文檔
            if (prev.currentDocId === docId) {
                newCurrentId = newDocs.length > 0 ? newDocs[0].id : null;
            }

            return {
                ...prev,
                currentDocId: newCurrentId,
                documents: newDocs,
            };
        });
    }, []);

    /**
     * 重新命名文檔
     */
    const renameDocument = useCallback((docId: string, newName: string) => {
        setState(prev => ({
            ...prev,
            documents: prev.documents.map(doc =>
                doc.id === docId
                    ? { ...doc, name: newName.trim() || doc.name, updatedAt: Date.now() }
                    : doc
            ),
        }));
    }, []);

    /**
     * 建立重新資料夾
     */
    const createFolder = useCallback((name?: string) => {
        const now = Date.now();
        const base = "資料夾";
        let finalName = name?.trim();

        if (!finalName) {
            const existingSet = new Set(state.folders.map(f => f.name));
            if (!existingSet.has(base)) {
                finalName = base;
            } else {
                let n = 1;
                while (existingSet.has(`${base}(${n})`)) {
                    n++;
                }
                finalName = `${base}(${n})`;
            }
        }

        const newFolder: FolderRecord = {
            id: generateId(),
            name: finalName,
            createdAt: now,
            updatedAt: now,
        };

        setState(prev => ({
            ...prev,
            folders: [...prev.folders, newFolder],
        }));

        return newFolder.id;
    }, [state.folders]);

    /**
     * 刪除資料夾及其所有文檔
     */
    const deleteFolder = useCallback((folderId: string) => {
        setState(prev => {
            const newFolders = prev.folders.filter(f => f.id !== folderId);
            const newDocs = prev.documents.filter(doc => doc.folderId !== folderId);

            let newCurrentId = prev.currentDocId;
            // 如果當前文檔在被刪除的資料夾中
            const currentDoc = prev.documents.find(d => d.id === prev.currentDocId);
            if (currentDoc && currentDoc.folderId === folderId) {
                newCurrentId = newDocs.length > 0 ? newDocs[0].id : null;
            }

            return {
                ...prev,
                currentDocId: newCurrentId,
                folders: newFolders,
                documents: newDocs,
            };
        });
    }, []);

    /**
     * 重命名資料夾
     */
    const renameFolder = useCallback((folderId: string, name: string) => {
        setState(prev => ({
            ...prev,
            folders: prev.folders.map(f =>
                f.id === folderId ? { ...f, name: name.trim() || f.name, updatedAt: Date.now() } : f
            ),
        }));
    }, []);

    /**
     * 將文檔移入/移出資料夾
     */
    const moveDocument = useCallback((docId: string, folderId: string | null) => {
        setState(prev => {
            // 計算在目標資料夾中的排序 (如果是移入資料夾)
            let order = 0;
            if (folderId) {
                const folderDocs = prev.documents.filter(d => d.folderId === folderId);
                if (folderDocs.length > 0) {
                    order = Math.max(...folderDocs.map(d => d.order ?? 0)) + 1;
                }
            }

            return {
                ...prev,
                documents: prev.documents.map(doc =>
                    doc.id === docId ? { ...doc, folderId, order, updatedAt: Date.now() } : doc
                ),
            };
        });
    }, []);

    /**
     * 重新排序文檔
     */
    const reorderDocuments = useCallback((docIds: string[]) => {
        setState(prev => {
            const newDocs = [...prev.documents];
            docIds.forEach((id, index) => {
                const docIndex = newDocs.findIndex(d => d.id === id);
                if (docIndex !== -1) {
                    newDocs[docIndex] = { ...newDocs[docIndex], order: index, updatedAt: Date.now() };
                }
            });
            return { ...prev, documents: newDocs };
        });
    }, []);

    /**
     * 當前文檔（僅在 currentDocId 或 documents 改變時重新計算）
     */
    const currentDocument = useMemo((): DocumentRecord | null => {
        if (!state.currentDocId) return null;
        return state.documents.find(doc => doc.id === state.currentDocId) ?? null;
    }, [state.currentDocId, state.documents]);

    /**
     * 儲存空間使用率（僅在 documents 改變時重新序列化計算）
     */
    const storageUsage = useMemo(() => {
        try {
            const appStateData = JSON.stringify(state);
            const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
            return Math.min(100, Math.round((appStateData.length * 2 / maxSizeBytes) * 100));
        } catch (e) {
            return 0;
        }
    }, [state.documents]);

    /**
     * 取得連結至當前文檔的所有文檔 (Backlinks) - 僅限同資料夾內
     */
    const getBacklinks = useCallback((docName: string) => {
        if (!docName || !state.currentDocId) return [];

        const currentDoc = state.documents.find(d => d.id === state.currentDocId);
        if (!currentDoc || !currentDoc.folderId) return []; // 獨立檔案不支援反向連結

        return state.documents.filter(doc => {
            return doc.folderId === currentDoc.folderId &&
                doc.id !== currentDoc.id &&
                doc.content.includes(`[[${docName}]]`);
        });
    }, [state.documents, state.currentDocId]);

    return {
        documents: state.documents,
        currentDocId: state.currentDocId,
        currentDocument,
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
