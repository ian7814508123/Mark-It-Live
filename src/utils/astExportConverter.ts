/**
 * astExportConverter.ts
 *
 * Markdown 雙格式匯出轉換引擎：
 * 1. enhanced (增強格式): 保留本軟體專屬 AST 擴充語法（:font, HTML style, :::row/col, [[WikiLink]], 分頁符等），
 *    便於在切換裝置後使用本軟體無損重新載入並接續編輯。
 * 2. standard (原生標準): 將所有專屬語法編譯還原為純 CommonMark / GitHub Flavored Markdown (GFM) 原生寫法，
 *    百分之百相容於 GitHub, Obsidian, Typora, VS Code, Notion 等通用閱讀器。
 */

export interface ExportConversionOptions {
    /** 是否為資料夾合併匯出模式（若為合併模式，WikiLink 會自動編譯為錨點跳轉連結） */
    isMerged?: boolean;
    /** 是否清理圖表代碼塊內的自訂樣式註解（例如 %% width: 80% %%） */
    cleanDiagramDirectives?: boolean;
}

/**
 * 將增強版 Markdown 內容轉換為純原生 CommonMark / GFM 標準寫法
 *
 * @param markdown - 原始 Markdown 字串
 * @param options - 轉換選項
 * @returns 轉換後的標準原生 Markdown 字串
 */
export function convertAstToStandardMarkdown(
    markdown: string,
    options: ExportConversionOptions = {}
): string {
    if (!markdown) return '';

    const { isMerged = false, cleanDiagramDirectives = false } = options;

    // ─── 階段 1: 程式碼區塊保護 (Code Block Masking) ─────────────────────────
    // 嚴格隔離 ``` 圍欄代碼塊與 ` 行內代碼，防止代碼區塊內的 HTML 或特殊標記被誤傷
    const codeBlocks: string[] = [];
    const inlineCodes: string[] = [];

    let processed = markdown;

    // 1-A: 抽出圍欄代碼塊 (Fenced Code Blocks: ``` 或 ~~~)
    processed = processed.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
        let blockContent = match;
        if (cleanDiagramDirectives) {
            // 選擇性清理 %% width: ... %% 與 %% align: ... %%
            blockContent = blockContent
                .replace(/^[ \t]*%%\s*width:\s*\d+%?\s*%%[ \t]*\n?/gim, '')
                .replace(/^[ \t]*%%\s*align:\s*(?:left|center|right)\s*%%[ \t]*\n?/gim, '');
        }
        const index = codeBlocks.length;
        codeBlocks.push(blockContent);
        return `@@@FENCED_CODE_BLOCK_PLACEHOLDER_${index}@@@`;
    });

    // 1-B: 抽出行內代碼 (`code`)
    processed = processed.replace(/(`[^`\n]+`)/g, (match) => {
        const index = inlineCodes.length;
        inlineCodes.push(match);
        return `@@@INLINE_CODE_PLACEHOLDER_${index}@@@`;
    });

    // ─── 階段 2: 自訂分頁符號轉換為原生 Markdown 分隔線 ────────────────────────
    // \pagebreak, [page-break], ---pb---, <div class="page-break"></div>
    processed = processed.replace(/^[ \t]*(?:\\pagebreak|\[page-break\]|---pb---)[ \t]*$/gm, '---');
    processed = processed.replace(/<div\s+class=["'][^"']*page-break[^"']*["'][^>]*>\s*<\/div>/gi, '---');

    // ─── 階段 3: 排版 HTML 標籤轉為原生 Markdown ──────────────────────────────
    // 3-A: 標題標籤 <h1 style="...">文字</h1> -> # 文字
    processed = processed.replace(/<h([1-6])(?:\s+[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_, levelStr, innerText) => {
        const level = parseInt(levelStr, 10);
        const prefix = '#'.repeat(level);
        return `${prefix} ${innerText.trim()}`;
    });

    // 3-B: 段落標籤 <p style="...">文字</p> -> 文字
    processed = processed.replace(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi, (_, innerText) => {
        return innerText.trim();
    });

    // 3-C: 行內樣式標籤 <span style="...">文字</span> -> 文字
    processed = processed.replace(/<span(?:\s+[^>]*)?>([\s\S]*?)<\/span>/gi, (_, innerText) => {
        return innerText;
    });

    // ─── 階段 4: 排版 Remark Directive 語法還原 ───────────────────────────────
    // 4-A: 容器級排版 Directive :::typography{...} \n 內容 \n :::
    processed = processed.replace(/^[ \t]*:::(?:typography|font|style)(?:\{[^}]*\})?[ \t]*$/gm, '');

    // 4-B: 區塊/標題行尾 Directive: # 標題 :font{size="24px" color="blue"}
    processed = processed.replace(/[ \t]*:(?:font|style|typography)\{[^}]*\}[ \t]*$/gm, '');

    // 4-C: 行內局部 Directive: :font[重點文字]{color="red"} -> 重點文字
    processed = processed.replace(/:(?:font|style|typography)\[(.*?)\]\{[^}]*\}/g, '$1');

    // ─── 階段 5: Grid 分欄排版 Directive 還原 ─────────────────────────────────
    // :::row, :::col, :::
    processed = processed.replace(/^[ \t]*:::+(?:row|col)(?:\{[^}]*\})?[ \t]*$/gm, '');
    processed = processed.replace(/^[ \t]*:::+[ \t]*$/gm, '');

    // ─── 階段 6: 雙向鏈接 WikiLink 語法轉換 ────────────────────────────────────
    // [[頁面名稱|顯示別名]] 或 [[頁面名稱]]
    processed = processed.replace(/\[\[(.*?)\]\]/g, (_, rawContent) => {
        if (rawContent.includes('|')) {
            const [target, alias] = rawContent.split('|');
            const trimmedTarget = target.trim();
            const trimmedAlias = alias.trim();
            return isMerged
                ? `[${trimmedAlias}](#wikilink-${encodeURIComponent(trimmedTarget)})`
                : trimmedAlias;
        }
        const trimmed = rawContent.trim();
        return isMerged
            ? `[${trimmed}](#wikilink-${encodeURIComponent(trimmed)})`
            : trimmed;
    });

    // ─── 階段 7: 規格化多餘空白空行 ────────────────────────────────────────────
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // ─── 階段 8: 還原程式碼區塊 ────────────────────────────────────────────────
    // 8-A: 還原行內代碼
    processed = processed.replace(/@@@INLINE_CODE_PLACEHOLDER_(\d+)@@@/g, (_, indexStr) => {
        const index = parseInt(indexStr, 10);
        return inlineCodes[index] ?? '';
    });

    // 8-B: 還原圍欄代碼塊
    processed = processed.replace(/@@@FENCED_CODE_BLOCK_PLACEHOLDER_(\d+)@@@/g, (_, indexStr) => {
        const index = parseInt(indexStr, 10);
        return codeBlocks[index] ?? '';
    });

    return processed;
}
