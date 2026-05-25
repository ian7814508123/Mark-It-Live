import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AppState } from '../../src/types';

/**
 * docStorage 單元測試
 *
 * 策略：由於 vitest 無法輕易 partial-mock 同一模組內的相互呼叫，
 * 此測試直接驗證 migrateFromLocalStorage 在 Node.js 環境中的行為：
 * - localStorage 相關邏輯（不依賴 IDB）
 * - IDB 不存在時的降級行為（防禦性回退）
 * - 常數值的正確性
 */

// ─── Mock localStorage ─────────────────────────────────────────────────────────
const _store: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => _store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { _store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete _store[key]; }),
    clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// ─── 常數測試 ──────────────────────────────────────────────────────────────────
describe('docStorage 常數', () => {
    it('LS_DOCS_KEY 應為正確的 localStorage key', async () => {
        const { LS_DOCS_KEY } = await import('../../src/utils/docStorage');
        expect(LS_DOCS_KEY).toBe('mermaid-lens-documents');
    });

    it('LS_VERSION_KEY 應為正確的版本 key', async () => {
        const { LS_VERSION_KEY } = await import('../../src/utils/docStorage');
        expect(LS_VERSION_KEY).toBe('mermaid-lens-default-version');
    });
});

// ─── 遷移邏輯測試（localStorage 端） ─────────────────────────────────────────
describe('migrateFromLocalStorage：localStorage 端行為', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('無 localStorage 資料時應返回 0', async () => {
        const { migrateFromLocalStorage } = await import('../../src/utils/docStorage');
        const count = await migrateFromLocalStorage();
        expect(count).toBe(0);
    });

    it('已有遷移時間戳（mlp-idb-migrated-at）時應跳過並返回 0', async () => {
        const { migrateFromLocalStorage, LS_DOCS_KEY } = await import('../../src/utils/docStorage');
        localStorageMock.setItem('mlp-idb-migrated-at', String(Date.now()));
        localStorageMock.setItem(LS_DOCS_KEY, JSON.stringify({
            currentDocId: 'doc-1',
            documents: [{ id: 'doc-1', name: '測試', mode: 'markdown', content: '# Hi', createdAt: 1, updatedAt: 1 }],
            folders: [],
        }));

        const count = await migrateFromLocalStorage();
        expect(count).toBe(0);
        // 跳過時不應刪除 LS_DOCS_KEY
        expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(LS_DOCS_KEY);
    });

    it('localStorage 資料損毀（無效 JSON）時應靜默處理並返回 0', async () => {
        const { migrateFromLocalStorage, LS_DOCS_KEY } = await import('../../src/utils/docStorage');
        localStorageMock.setItem(LS_DOCS_KEY, '{ invalid json ===');

        // 不應拋出錯誤
        await expect(migrateFromLocalStorage()).resolves.toBe(0);
        // 損毀時保留資料以便重試（不刪除）
        expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(LS_DOCS_KEY);
    });

    it('空的 localStorage 資料（空 documents 陣列）時應直接標記完成並清除', async () => {
        const { migrateFromLocalStorage, LS_DOCS_KEY } = await import('../../src/utils/docStorage');
        const emptyState: AppState = { currentDocId: null, documents: [], folders: [] };
        localStorageMock.setItem(LS_DOCS_KEY, JSON.stringify(emptyState));

        const count = await migrateFromLocalStorage();

        expect(count).toBe(0);
        // 空資料也應清除 LS_DOCS_KEY（避免下次重複讀取）
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_DOCS_KEY);
        // 應設置遷移完成標記
        expect(localStorageMock.setItem).toHaveBeenCalledWith('mlp-idb-migrated-at', expect.any(String));
    });

    it('有資料但 IDB 不可用時應靜默回退（返回 0，不刪除 localStorage）', async () => {
        const { migrateFromLocalStorage, LS_DOCS_KEY } = await import('../../src/utils/docStorage');
        const mockState: AppState = {
            currentDocId: 'doc-1',
            documents: [
                { id: 'doc-1', name: '文件一', mode: 'markdown', content: '# Hello', createdAt: 1000, updatedAt: 1000 },
            ],
            folders: [],
        };
        localStorageMock.setItem(LS_DOCS_KEY, JSON.stringify(mockState));

        // Node.js 環境中 indexedDB 不存在，IDB 呼叫會拋錯
        // migrateFromLocalStorage 應該捕捉錯誤並返回 0（降級行為），不刪除 localStorage
        const count = await migrateFromLocalStorage();
        expect(count).toBe(0);
        // IDB 失敗時不應清除 localStorage（保留讓下次重試）
        expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(LS_DOCS_KEY);
    });
});
