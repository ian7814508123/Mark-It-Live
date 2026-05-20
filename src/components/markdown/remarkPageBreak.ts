// 帶有 parent 參照的 AST 節點遍歷工具
function visitWithParent(node: any, type: string, handler: (node: any, parent: any) => void, parent?: any) {
    if (node.type === type) {
        handler(node, parent);
    }
    if (node.children && Array.isArray(node.children)) {
        const childrenCopy = [...node.children];
        for (const child of childrenCopy) {
            visitWithParent(child, type, handler, node);
        }
    }
}

/**
 * 自訂 Remark 插件：remarkPageBreak
 * 用於在 AST 階段解析單獨成行的分頁符號：\pagebreak, [page-break], ---pb---
 * 並將其轉換為 html 節點，供 rehype-raw 進一步編譯成 <div class="page-break"></div> 節點。
 */
export function remarkPageBreak() {
    return (tree: any) => {
        visitWithParent(tree, 'paragraph', (node: any, parent: any) => {
            // 1. 確保段落內只有一個子節點，且該子節點為 text 節點
            if (node.children && node.children.length === 1) {
                const child = node.children[0];
                if (child.type === 'text') {
                    const value = child.value.trim();
                    // 2. 匹配三種分頁標記之一
                    if (value === '\\pagebreak' || value === '[page-break]' || value === '---pb---') {
                        // 3. 將 paragraph 節點改造成 html 節點
                        node.type = 'html';
                        node.value = '<div class="page-break"></div>';
                        // 4. 清除 children 屬性，使其成為無子節點的葉子節點
                        delete node.children;
                    }
                }
            }
        });
    };
}
