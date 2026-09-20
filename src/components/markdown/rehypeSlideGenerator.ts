export interface SlideGeneratorOptions {
    isSlideMode?: boolean;
}

/**
 * 判斷是否為手動分頁節點（由 remarkPageBreak 產生的 `<div class="page-break"></div>`）
 */
function isPageBreak(child: any): boolean {
    const isElementPageBreak =
        child.type === 'element' &&
        child.tagName === 'div' &&
        child.properties &&
        Array.isArray(child.properties.className) &&
        child.properties.className.includes('page-break');

    const isRawPageBreak =
        (child.type === 'raw' || child.type === 'html') &&
        typeof child.value === 'string' &&
        child.value.includes('page-break');

    return isElementPageBreak || isRawPageBreak;
}

/**
 * 判斷是否為可自動分頁的標題（h1 / h2）
 */
function isAutoSplitHeading(child: any): boolean {
    return child.type === 'element' && (child.tagName === 'h1' || child.tagName === 'h2');
}

/**
 * 建構一張投影片的 AST 結構：
 * <div class="marp-slide-wrapper" data-slide-index="N">
 *   <section class="marp-slide">
 *     <div class="marp-slide-inner">
 *       ...children...
 *     </div>
 *   </section>
 * </div>
 */
function createSlideWrapper(children: any[], index: number): any {
    return {
        type: 'element',
        tagName: 'div',
        properties: {
            className: ['marp-slide-wrapper'],
            dataSlideIndex: String(index),
        },
        children: [{
            type: 'element',
            tagName: 'section',
            properties: { className: ['marp-slide'] },
            children: [{
                type: 'element',
                tagName: 'div',
                properties: { className: ['marp-slide-inner'] },
                children: children,
            }],
        }],
    };
}

/**
 * 自訂 Rehype 插件：rehypeSlideGenerator
 *
 * 核心行為：
 * 1. 若文件中存在手動分頁標記（---pb---、\pagebreak、[page-break]），
 *    則完全按照手動標記分頁（保持現有行為）。
 * 2. 若文件中完全沒有手動分頁標記，則自動以 h1/h2 為分頁點，
 *    每遇到一個 h1 或 h2 就開啟一張新投影片。
 * 3. 每張投影片內容包裹在 .marp-slide-inner 中，供 JS 做內容溢出自動縮放。
 */
export default function rehypeSlideGenerator(options: SlideGeneratorOptions = {}) {
    return (tree: any) => {
        if (!options.isSlideMode) return;

        // 只處理 root 節點的直接子節點
        if (tree.type !== 'root' || !tree.children) return;

        // 1. 檢查是否存在手動分頁標記
        const hasManualBreaks = tree.children.some((child: any) => isPageBreak(child));

        const newChildren: any[] = [];
        let currentSlideChildren: any[] = [];
        let slideIndex = 0;

        const pushSlide = () => {
            if (currentSlideChildren.length > 0) {
                newChildren.push(createSlideWrapper(currentSlideChildren, slideIndex));
                currentSlideChildren = [];
                slideIndex++;
            }
        };

        for (const child of tree.children) {
            if (isPageBreak(child)) {
                // ─── 手動分頁：遇到 page-break 就收尾目前的投影片 ───
                pushSlide();
            } else if (!hasManualBreaks && isAutoSplitHeading(child)) {
                // ─── 自動分頁：以 h1/h2 為分頁點（僅在無手動標記時啟用）───
                // 先收尾前一張投影片，然後將此 heading 放入新投影片
                pushSlide();
                currentSlideChildren.push(child);
            } else {
                currentSlideChildren.push(child);
            }
        }

        // 收尾最後一張投影片
        pushSlide();

        // 替換 root 的 children
        tree.children = newChildren;
    };
}
