import { describe, it, expect } from 'vitest';
import { calculatePreviewScrollTop, calculateEditorScrollTop } from '../../src/utils';

describe('同步滾動演算法測試', () => {
    // 建立一個穩定的測試用 lineMap，模擬 Markdown 標題與段落行號與預覽高度的對照
    // 行 10 對應預覽區高度 100px
    // 行 20 對應預覽區高度 250px
    // 行 30 對應預覽區高度 400px
    const testLineMap = new Map<number, number>([
        [10, 100],
        [20, 250],
        [30, 400]
    ]);

    // 模擬編輯器高度對照：
    // 行 10 頂部為 80px
    // 行 20 頂部為 200px
    // 行 30 頂部為 320px
    const mockGetEditorLineTop = (line: number): number => {
        if (line === 10) return 80;
        if (line === 20) return 200;
        if (line === 30) return 320;
        return 0;
    };

    describe('calculatePreviewScrollTop - 編輯器同步至預覽區', () => {
        it('1. 頂部極端邊界：編輯器滾動 scrollTop <= 0 時預覽區應對齊 0', () => {
            const result = calculatePreviewScrollTop({
                editorScrollTop: 0,
                editorMaxScroll: 600,
                previewMaxScroll: 800,
                lineNumber: 1,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(0);
        });

        it('2. 底部極端邊界：編輯器滾動 scrollTop 貼近/超過最大滾動值時應對齊預覽區最大值', () => {
            const result = calculatePreviewScrollTop({
                editorScrollTop: 599, // 貼近最大值 600
                editorMaxScroll: 600,
                previewMaxScroll: 800,
                lineNumber: 35,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(800);
        });

        it('3. 無標記點時：應退回百分比對齊模式', () => {
            const result = calculatePreviewScrollTop({
                editorScrollTop: 150,
                editorMaxScroll: 600,
                previewMaxScroll: 800,
                lineNumber: 15,
                lineMap: new Map(), // 空的 mapping
                getEditorLineTop: mockGetEditorLineTop
            });
            // 比例為 150 / 600 = 0.25
            // 預覽區目標高度為 800 * 0.25 = 200
            expect(result).toBe(200);
        });

        it('4. 中間正常區段插值：應精確進行線性插值', () => {
            // 行 10 (editor: 80, preview: 100) 與 行 20 (editor: 200, preview: 250) 之間
            // 當編輯器 scrollTop = 140 (正好在 80 與 200 的正中間，比例為 0.5)
            // 預覽區目標應在 100 與 250 的正中間，即 175
            const result = calculatePreviewScrollTop({
                editorScrollTop: 140,
                editorMaxScroll: 600,
                previewMaxScroll: 800,
                lineNumber: 15, // 在 10 與 20 之間
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(175);
        });

        it('5. 第一個標記點之前（接近頂部）：應在 [0, h_first] 與 [0, p_first] 之間等比例線性插值', () => {
            // 第一個標記點為 行 10 (editor: 80, preview: 100)
            // 編輯器 scrollTop = 40 (比例為 40 / 80 = 0.5)
            // 預覽區目標應為 100 * 0.5 = 50
            const result = calculatePreviewScrollTop({
                editorScrollTop: 40,
                editorMaxScroll: 600,
                previewMaxScroll: 800,
                lineNumber: 5, // 小於第一個標記行 10
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(50);
        });

        it('6. 最後一個標記點之後（接近底部）：應在 [h_last, editorMaxScroll] 與 [p_last, previewMaxScroll] 之間等比例線性插值', () => {
            // 最後一個標記點為 行 30 (editor: 320, preview: 400)
            // 編輯器範圍 [320, 600] 區間大小為 280
            // 預覽區範圍 [400, 800] 區間大小為 400
            // 當編輯器 scrollTop = 460 (區間正中間，比例 0.5)
            // 預覽區目標應為 400 + 400 * 0.5 = 600
            const result = calculatePreviewScrollTop({
                editorScrollTop: 460,
                editorMaxScroll: 600,
                previewMaxScroll: 800,
                lineNumber: 35, // 大於最後一個標記行 30
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(600);
        });
    });

    describe('calculateEditorScrollTop - 預覽區同步至編輯器', () => {
        it('1. 頂部極端邊界：預覽區滾動 scrollTop <= 0 時編輯器應對齊 0', () => {
            const result = calculateEditorScrollTop({
                previewScrollTop: 0,
                previewMaxScroll: 800,
                editorMaxScroll: 600,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(0);
        });

        it('2. 底部極端邊界：預覽區滾動 scrollTop >= max 時應對齊編輯器最大值', () => {
            const result = calculateEditorScrollTop({
                previewScrollTop: 799,
                previewMaxScroll: 800,
                editorMaxScroll: 600,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(600);
        });

        it('3. 中間正常區段插值：應精確進行線性插值', () => {
            // 行 10 (preview: 100, editor: 80) 與 行 20 (preview: 250, editor: 200) 之間
            // 當預覽區 scrollTop = 175 (正好在 100 與 250 的正中間，比例為 0.5)
            // 編輯器目標應在 80 與 200 的正中間，即 140
            const result = calculateEditorScrollTop({
                previewScrollTop: 175,
                previewMaxScroll: 800,
                editorMaxScroll: 600,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(140);
        });

        it('4. 第一個標記點之前（接近頂部）：應在 [0, p_first] 與 [0, h_first] 之間等比例線性插值', () => {
            // 第一個標記點為 行 10 (preview: 100, editor: 80)
            // 預覽區 scrollTop = 50 (比例為 50 / 100 = 0.5)
            // 編輯器目標應為 80 * 0.5 = 40
            const result = calculateEditorScrollTop({
                previewScrollTop: 50,
                previewMaxScroll: 800,
                editorMaxScroll: 600,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(40);
        });

        it('5. 最後一個標記點之後（接近底部）：應在 [p_last, previewMaxScroll] 與 [h_last, editorMaxScroll] 之間等比例線性插值', () => {
            // 最後一個標記點為 行 30 (preview: 400, editor: 320)
            // 預覽區範圍 [400, 800] 區間大小為 400
            // 編輯器範圍 [320, 600] 區間大小為 280
            // 當預覽區 scrollTop = 600 (區間正中間，比例 0.5)
            // 編輯器目標應為 320 + 280 * 0.5 = 460
            const result = calculateEditorScrollTop({
                previewScrollTop: 600,
                previewMaxScroll: 800,
                editorMaxScroll: 600,
                lineMap: testLineMap,
                getEditorLineTop: mockGetEditorLineTop
            });
            expect(result).toBe(460);
        });
    });
});
