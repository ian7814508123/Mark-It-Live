/**
 * markdownScanner.ts
 *
 * 輕量級 Markdown 特徵偵測器。
 * 在解析 AST 之前，先用正則快速掃描原始文本，
 * 判斷哪些大型套件真正需要被動態載入。
 *
 * 設計原則：
 * - 純函數，無副作用，可在任意 thread 呼叫
 * - 只做 O(n) 掃描，不建立 AST
 * - 結果可搭配 useMemo / useDeferredValue 快取
 */

export interface MarkdownFeatures {
    /** 是否包含 Mermaid 圖表語法 ```mermaid */
    hasMermaid: boolean;
    /** 是否包含 Vega / Vega-Lite 圖表語法 ```vega 或 ```vega-lite */
    hasVega: boolean;
    /** 是否包含 SMILES 化學結構式語法 ```smiles */
    hasSmiles: boolean;
    /** 是否包含 ABC 樂譜語法 ```abc */
    hasAbc: boolean;
    /** 是否包含 LaTeX 數學式（行間或行內） */
    hasMath: boolean;
    /** 是否包含 WikiLink 語法 [[...]] */
    hasWikiLink: boolean;
    /** 是否包含本地圖片協定 img-local:// */
    hasLocalImage: boolean;
}

/** 空特徵物件，用於初始狀態或空內容，避免每次回傳新物件 */
export const EMPTY_FEATURES: MarkdownFeatures = Object.freeze({
    hasMermaid: false,
    hasVega: false,
    hasSmiles: false,
    hasAbc: false,
    hasMath: false,
    hasWikiLink: false,
    hasLocalImage: false,
});

/**
 * 快速偵測 Markdown 文本中使用的特殊功能
 *
 * @param content - 原始 Markdown 文本
 * @returns 各功能的存在旗標
 *
 * @example
 * const features = detectMarkdownFeatures(markdownContent);
 * if (features.hasMermaid) {
 *   // 預載 mermaid
 * }
 */
export function detectMarkdownFeatures(content: string): MarkdownFeatures {
    // 空內容快速返回，避免不必要的正則執行
    if (!content || content.length === 0) {
        return EMPTY_FEATURES;
    }

    return {
        // 偵測 ```mermaid 代碼圍欄（忽略大小寫，相容縮排寫法）
        hasMermaid: /^[ \t]*```[ \t]*mermaid/im.test(content),

        // 偵測 ```vega 或 ```vega-lite 代碼圍欄
        hasVega: /^[ \t]*```[ \t]*vega(?:-lite)?/im.test(content),

        // 偵測 ```smiles 代碼圍欄
        hasSmiles: /^[ \t]*```[ \t]*smiles/im.test(content),

        // 偵測 ```abc 代碼圍欄
        hasAbc: /^[ \t]*```[ \t]*abc/im.test(content),

        // 偵測 LaTeX 數學語法：
        // - 行間公式：$$...$$  或 \[...\]
        // - 行內公式：$...$（需排除 $$，且不為行首的單獨 $）
        hasMath: /\$\$|\\\[|\\\(|\$[^$\n]/.test(content),

        // 偵測 WikiLink：[[pageName]] 或 [[pageName|alias]]
        hasWikiLink: /\[\[[^\]]+\]\]/.test(content),

        // 偵測本地圖片協定：img-local://
        hasLocalImage: content.includes('img-local://'),
    };
}

/**
 * 比較兩個 MarkdownFeatures 物件是否相等
 * 用於 React.memo / useMemo 的淺比較，避免不必要的 re-render
 *
 * @param a - 前一次掃描結果
 * @param b - 本次掃描結果
 * @returns 若所有旗標相同則返回 true
 */
export function areFeaturesEqual(a: MarkdownFeatures, b: MarkdownFeatures): boolean {
    return (
        a.hasMermaid === b.hasMermaid &&
        a.hasVega === b.hasVega &&
        a.hasSmiles === b.hasSmiles &&
        a.hasAbc === b.hasAbc &&
        a.hasMath === b.hasMath &&
        a.hasWikiLink === b.hasWikiLink &&
        a.hasLocalImage === b.hasLocalImage
    );
}
