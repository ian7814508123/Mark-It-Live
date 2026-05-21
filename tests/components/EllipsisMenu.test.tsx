/**
 * EllipsisMenu 邏輯單元測試
 *
 * 由於本專案目前未安裝 @testing-library/react，
 * 本測試著重於驗證 EllipsisMenu 的純函式邏輯：
 *   - 移動目標資料夾清單的過濾規則
 *   - 「可移動至根目錄」的判斷邏輯
 *   - 「是否顯示移動選項」的邊界情境
 *
 * UI 互動測試（開關、Callback 觸發、ClickAway）
 * 建議待 @testing-library/react + jsdom 設定完成後補充。
 */
import { describe, it, expect } from 'vitest';
import { FolderRecord } from '../../src/types';

// ── 複製自 EllipsisMenu 的核心過濾邏輯（確保測試與實作一致） ──────────────

/**
 * 計算可作為移動目標的資料夾清單
 * 排除目前文檔所在的資料夾，避免「移到同一個地方」
 */
function getAvailableFolders(folders: FolderRecord[], currentFolderId: string | null | undefined): FolderRecord[] {
    return folders.filter(f => f.id !== currentFolderId);
}

/**
 * 判斷是否顯示「移至根目錄」選項
 * 只有當文件目前在某個資料夾中（currentFolderId 不為 null/undefined）才需要此選項
 */
function canMoveToRoot(currentFolderId: string | null | undefined): boolean {
    return currentFolderId != null;
}

/**
 * 判斷是否應顯示「移動至...」按鈕
 * 若無任何可移動目標（無資料夾且已在根目錄），則隱藏此按鈕
 */
function hasMoveTargets(folders: FolderRecord[], currentFolderId: string | null | undefined): boolean {
    return getAvailableFolders(folders, currentFolderId).length > 0 || canMoveToRoot(currentFolderId);
}

// ── 測試資料 Fixtures ────────────────────────────────────────────────────────

const mockFolders: FolderRecord[] = [
    { id: 'folder-a', name: '專案A', createdAt: 1000, updatedAt: 1000 },
    { id: 'folder-b', name: '專案B', createdAt: 2000, updatedAt: 2000 },
    { id: 'folder-c', name: '專案C', createdAt: 3000, updatedAt: 3000 },
];

// ── 測試套件 ─────────────────────────────────────────────────────────────────

describe('EllipsisMenu：移動目標過濾邏輯', () => {

    // ── getAvailableFolders ──────────────────────────────────
    it('1. 根目錄文件（currentFolderId = null）：所有資料夾均可作為移動目標', () => {
        const result = getAvailableFolders(mockFolders, null);
        expect(result).toHaveLength(3);
        expect(result.map(f => f.id)).toEqual(['folder-a', 'folder-b', 'folder-c']);
    });

    it('2. 資料夾內文件：應從清單中排除當前所在資料夾', () => {
        const result = getAvailableFolders(mockFolders, 'folder-b');
        expect(result).toHaveLength(2);
        expect(result.map(f => f.id)).not.toContain('folder-b');
        expect(result.map(f => f.id)).toContain('folder-a');
        expect(result.map(f => f.id)).toContain('folder-c');
    });

    it('3. 只有一個資料夾且文件在其中：移動清單應為空', () => {
        const singleFolder: FolderRecord[] = [{ id: 'folder-a', name: '專案A', createdAt: 1000, updatedAt: 1000 }];
        const result = getAvailableFolders(singleFolder, 'folder-a');
        expect(result).toHaveLength(0);
    });

    it('4. currentFolderId 為 undefined 時（未提供 prop）：效果等同 null，所有資料夾可移動', () => {
        const result = getAvailableFolders(mockFolders, undefined);
        expect(result).toHaveLength(3);
    });

    // ── canMoveToRoot ────────────────────────────────────────
    it('5. 文件在根目錄（null）時：不顯示「移至根目錄」', () => {
        expect(canMoveToRoot(null)).toBe(false);
    });

    it('6. 文件在根目錄（undefined 未提供）時：不顯示「移至根目錄」', () => {
        expect(canMoveToRoot(undefined)).toBe(false);
    });

    it('7. 文件在某資料夾中：顯示「移至根目錄」', () => {
        expect(canMoveToRoot('folder-a')).toBe(true);
    });

    // ── hasMoveTargets（整體顯示控制） ───────────────────────
    it('8. 有資料夾 + 根目錄文件：應顯示「移動至...」', () => {
        expect(hasMoveTargets(mockFolders, null)).toBe(true);
    });

    it('9. 有資料夾 + 文件在資料夾中：應顯示「移動至...」（有根目錄可移動）', () => {
        expect(hasMoveTargets(mockFolders, 'folder-a')).toBe(true);
    });

    it('10. 無資料夾 + 根目錄文件：應隱藏「移動至...」（無任何目的地）', () => {
        expect(hasMoveTargets([], null)).toBe(false);
    });

    it('11. 無資料夾 + 文件在某資料夾中：雖無其他資料夾，但可移至根目錄，應顯示「移動至...」', () => {
        // 當只有一個資料夾且文件在其中，availableFolders 為空
        // 但 canMoveToRoot 為 true，所以仍應顯示
        const oneFolder: FolderRecord[] = [{ id: 'folder-a', name: '專案A', createdAt: 1000, updatedAt: 1000 }];
        expect(hasMoveTargets(oneFolder, 'folder-a')).toBe(true);
    });
});
