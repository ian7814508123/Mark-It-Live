/**
 * 資料夾 (資料夾/Vault) 型別
 */
export interface FolderRecord {
    id: string;                          // UUID
    name: string;                        // 資料夾名稱
    createdAt: number;                   // 建立時間戳
    updatedAt: number;                   // 最後修改時間戳
}

/**
 * 文檔記錄型別
 */
export interface DocumentRecord {
    id: string;                          // UUID
    name: string;                        // 使用者自訂名稱
    mode: 'markdown' | 'mermaid';        // 文檔類型
    content: string;                     // 編輯內容
    icon?: string;                        // 使用者自訂圖示 (Emoji 或 Lucide 名稱)
    templateId?: string | null;           // 來源範本 ID
    folderId?: string | null;            // 所屬資料夾 ID (null 為獨立檔案)
    order?: number;                      // 排序順序
    lineComments?: Record<number, string>; // 行號註解 (行號 -> 註解內容)
    createdAt: number;                   // 建立時間戳
    updatedAt: number;                   // 最後修改時間戳
}

/**
 * 應用狀態型別
 */
export interface AppState {
    currentDocId: string | null;         // 當前編輯的文檔 ID
    documents: DocumentRecord[];         // 所有文檔列表
    folders: FolderRecord[];             // 所有資料夾列表
}
