// ─── 輔助函式：簡單的字串雜湊 ──────────────────────────────────────────────────
// 用於生成基於內容的穩定 Key，防止 React 在內容未變時重新掛載組件
export const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};
// ─── 輔助函式：防抖 (Debounce) ──────────────────────────────────────────────────
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
    let timeout: any;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// ─── 輔助介面與函式：計算預覽區目標 ScrollTop ──────────────────────────────────────────
export interface PreviewScrollParams {
    editorScrollTop: number;
    editorMaxScroll: number;
    previewMaxScroll: number;
    lineNumber: number;
    lineMap: Map<number, number>;
    getEditorLineTop: (line: number) => number;
}

/**
 * 根據編輯器的滾動狀態計算預覽區的目標 ScrollTop，採用首尾等比例雙向線性插值
 */
export function calculatePreviewScrollTop(params: PreviewScrollParams): number {
    const { editorScrollTop, editorMaxScroll, previewMaxScroll, lineNumber, lineMap, getEditorLineTop } = params;

    // 1. 極端邊界處理：若編輯器滾到最上方或最下方，預覽區應直接貼齊邊界，防止小數計算誤差造成無法置頂貼底
    if (editorScrollTop <= 0) return 0;
    if (editorScrollTop >= editorMaxScroll - 2) return previewMaxScroll;

    // 2. 無標記點時退回百分比對齊
    const sortedLines = Array.from(lineMap.keys()).sort((a, b) => a - b);
    if (sortedLines.length === 0) {
        const percentage = editorScrollTop / (editorMaxScroll || 1);
        return percentage * previewMaxScroll;
    }

    // 3. 尋找包圍當前行號的兩個標記點
    let l1 = -1;
    let l2 = -1;
    for (let i = 0; i < sortedLines.length; i++) {
        if (sortedLines[i] <= lineNumber) {
            l1 = sortedLines[i];
        } else {
            l2 = sortedLines[i];
            break;
        }
    }

    if (l1 !== -1 && l2 !== -1) {
        // 中間正常區段線性插值
        const p1 = lineMap.get(l1)!;
        const p2 = lineMap.get(l2)!;
        const h1 = getEditorLineTop(l1);
        const h2 = getEditorLineTop(l2);

        const ratio = (editorScrollTop - h1) / (h2 - h1 || 1);
        return p1 + ratio * (p2 - p1);
    } else if (l1 !== -1) {
        // 最後一個標記點之後（接近底部），在 [h_last, editorMaxScroll] 與 [p_last, previewMaxScroll] 之間進行等比例線性插值
        const p1 = lineMap.get(l1)!;
        const h1 = getEditorLineTop(l1);

        if (editorMaxScroll <= h1) return p1;
        const ratio = (editorScrollTop - h1) / (editorMaxScroll - h1);
        const target = p1 + ratio * (previewMaxScroll - p1);
        return Math.min(previewMaxScroll, Math.max(0, target));
    } else {
        // 第一個標記點之前（接近頂部），在 [0, h_first] 與 [0, p_first] 之間進行等比例線性插值
        const l_first = sortedLines[0];
        const p2 = lineMap.get(l_first)!;
        const h2 = getEditorLineTop(l_first);

        if (h2 <= 0) return 0;
        const ratio = editorScrollTop / h2;
        const target = ratio * p2;
        return Math.min(previewMaxScroll, Math.max(0, target));
    }
}

// ─── 輔助介面與函式：計算編輯器目標 ScrollTop ──────────────────────────────────────────
export interface EditorScrollParams {
    previewScrollTop: number;
    previewMaxScroll: number;
    editorMaxScroll: number;
    lineMap: Map<number, number>;
    getEditorLineTop: (line: number) => number;
}

/**
 * 根據預覽區的滾動狀態計算編輯器的目標 ScrollTop，採用首尾等比例雙向線性插值
 */
export function calculateEditorScrollTop(params: EditorScrollParams): number {
    const { previewScrollTop, previewMaxScroll, editorMaxScroll, lineMap, getEditorLineTop } = params;

    // 1. 極端邊界處理：若預覽區滾到最上方或最下方，編輯器應直接貼齊邊界
    if (previewScrollTop <= 0) return 0;
    if (previewScrollTop >= previewMaxScroll - 2) return editorMaxScroll;

    // 2. 無標記點時退回百分比對齊
    const sortedLines = Array.from(lineMap.keys()).sort((a, b) => a - b);
    if (sortedLines.length === 0) {
        const percentage = previewScrollTop / (previewMaxScroll || 1);
        return percentage * editorMaxScroll;
    }

    // 3. 尋找目前預覽區頂部包圍的映射點
    const offsets = sortedLines.map(line => ({ line, offset: lineMap.get(line)! }));

    let l1 = -1;
    let l2 = -1;
    for (let i = 0; i < offsets.length; i++) {
        if (offsets[i].offset <= previewScrollTop) {
            l1 = offsets[i].line;
        } else {
            l2 = offsets[i].line;
            break;
        }
    }

    if (l1 !== -1 && l2 !== -1) {
        // 中間正常區段線性插值
        const p1 = lineMap.get(l1)!;
        const p2 = lineMap.get(l2)!;
        const h1 = getEditorLineTop(l1);
        const h2 = getEditorLineTop(l2);

        const ratio = (previewScrollTop - p1) / (p2 - p1 || 1);
        return h1 + ratio * (h2 - h1);
    } else if (l1 !== -1) {
        // 最後一個標記點之後（接近底部），在 [p_last, previewMaxScroll] 與 [h_last, editorMaxScroll] 之間進行等比例線性插值
        const p1 = lineMap.get(l1)!;
        const h1 = getEditorLineTop(l1);

        if (previewMaxScroll <= p1) return h1;
        const ratio = (previewScrollTop - p1) / (previewMaxScroll - p1);
        const target = h1 + ratio * (editorMaxScroll - h1);
        return Math.min(editorMaxScroll, Math.max(0, target));
    } else {
        // 第一個標記點之前（接近頂部），在 [0, p_first] 與 [0, h_first] 之間進行等比例線性插值
        const l_first = sortedLines[0];
        const p2 = lineMap.get(l_first)!;
        const h2 = getEditorLineTop(l_first);

        if (p2 <= 0) return 0;
        const ratio = previewScrollTop / p2;
        const target = ratio * h2;
        return Math.min(editorMaxScroll, Math.max(0, target));
    }
}

