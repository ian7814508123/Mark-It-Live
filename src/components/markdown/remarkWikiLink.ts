// 帶有 parent 參照的 AST 節點遍歷工具 (防禦性複製子節點以避免 splice 導致的 index 偏移)
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
 * 自訂 Remark 插件：remarkWikiLink
 * 用於在 AST 階段將 [[頁面]] 語法安全地轉換為 link 節點。
 * 此插件會跳過 code、inlineCode 以及 link 元件內部，徹底避免程式碼區塊被「誤殺」的 Bug。
 */
export function remarkWikiLink() {
    return (tree: any) => {
        visitWithParent(tree, 'text', (node: any, parent: any) => {
            // 1. 避開 code block、inline code 以及本身已經是 link 內部的 text
            if (parent && (parent.type === 'code' || parent.type === 'inlineCode' || parent.type === 'link')) {
                return;
            }

            const value = node.value;
            const regex = /\[\[(.*?)\]\]/g;
            if (!regex.test(value)) return;

            regex.lastIndex = 0; // 重設正規表示式狀態
            const newChildren: any[] = [];
            let lastIndex = 0;
            let match;

            // 2. 循環匹配所有的 [[頁面名稱]]
            while ((match = regex.exec(value)) !== null) {
                const textBefore = value.substring(lastIndex, match.index);
                if (textBefore) {
                    newChildren.push({ type: 'text', value: textBefore });
                }

                const pageName = match[1];
                // 3. 建立標準 link 節點，其 URL 指向 #wikilink-頁面名稱
                newChildren.push({
                    type: 'link',
                    title: null,
                    url: `#wikilink-${encodeURIComponent(pageName)}`,
                    children: [
                        { type: 'text', value: pageName }
                    ]
                });

                lastIndex = regex.lastIndex;
            }

            const textAfter = value.substring(lastIndex);
            if (textAfter) {
                newChildren.push({ type: 'text', value: textAfter });
            }

            // 4. 在父節點的 children 陣列中，用拆分後的節點替換原來的 text 節點
            if (parent && parent.children) {
                const index = parent.children.indexOf(node);
                if (index !== -1) {
                    parent.children.splice(index, 1, ...newChildren);
                }
            }
        });
    };
}
