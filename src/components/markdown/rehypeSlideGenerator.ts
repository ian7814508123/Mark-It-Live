import { visit } from 'unist-util-visit';

export interface SlideGeneratorOptions {
    isSlideMode?: boolean;
}

/**
 * 自訂 Rehype 插件：rehypeSlideGenerator
 * 當 isSlideMode 開啟時，會掃描 AST 的頂層 children，
 * 並將被 `<div class="page-break"></div>` 分隔的內容打包進 `<section class="marp-slide">` 中。
 */
export default function rehypeSlideGenerator(options: SlideGeneratorOptions = {}) {
    return (tree: any) => {
        if (!options.isSlideMode) return;

        // 我們只處理 root 節點的直接子節點
        if (tree.type !== 'root' || !tree.children) return;

        console.log("rehypeSlideGenerator RUNNING. Children count:", tree.children.length);
        const newChildren: any[] = [];
        let currentSlideChildren: any[] = [];

        for (const child of tree.children) {
            // 判斷是否為 page-break 節點
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

            const isPageBreak = isElementPageBreak || isRawPageBreak;

            if (isPageBreak) {
                // 遇到 page break，將目前收集到的內容打包為一張 slide
                if (currentSlideChildren.length > 0) {
                    // 外層 wrapper 提供 scroll snap 定位與縮放後的正確版面高度
                    newChildren.push({
                        type: 'element',
                        tagName: 'div',
                        properties: { className: ['marp-slide-wrapper'] },
                        children: [{
                            type: 'element',
                            tagName: 'section',
                            properties: { className: ['marp-slide'] },
                            children: currentSlideChildren,
                        }],
                    });
                    currentSlideChildren = [];
                }
            } else {
                currentSlideChildren.push(child);
            }
        }

        // 把最後一張 slide 收尾
        if (currentSlideChildren.length > 0) {
            newChildren.push({
                type: 'element',
                tagName: 'div',
                properties: { className: ['marp-slide-wrapper'] },
                children: [{
                    type: 'element',
                    tagName: 'section',
                    properties: { className: ['marp-slide'] },
                    children: currentSlideChildren,
                }],
            });
        }

        // 替換 root 的 children
        tree.children = newChildren;
    };
}
