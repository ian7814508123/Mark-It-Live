// 簡單的 AST 節點遞迴遍歷工具
function visit(node: any, type: string, handler: (node: any) => void) {
    if (node.type === type) {
        handler(node);
    }
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child) => visit(child, type, handler));
    }
}

/**
 * 自訂 Remark 插件：remarkGithubAlerts
 * 用於在 AST 解析階段，將 GitHub-style Alert (例如 [!NOTE]) 從 blockquote 中辨識出來。
 * 成功匹配後，會移除標記文字，並在 node.data.hProperties 中寫入對應的 class 名稱與 alertType。
 */
export function remarkGithubAlerts() {
    return (tree: any) => {
        visit(tree, 'blockquote', (node: any) => {
            // 1. 確保 blockquote 含有子節點，且第一個子節點是 paragraph
            const firstChild = node.children?.[0];
            if (!firstChild || firstChild.type !== 'paragraph') return;

            // 2. 確保 paragraph 含有子節點，且第一個子節點是 text
            const firstTextNode = firstChild.children?.[0];
            if (!firstTextNode || firstTextNode.type !== 'text') return;

            const value = firstTextNode.value;
            // 匹配 [!NOTE] 或 [NOTE] 格式 (不區分大小寫)
            const match = value.match(/^\s*\[!(NOTE|IMPORTANT|WARNING|CAUTION|TIP)\](?:\s*\n)?/i) ||
                          value.match(/^\s*\[(NOTE|IMPORTANT|WARNING|CAUTION|TIP)\](?:\s*\n)?/i);

            if (match) {
                const alertType = match[1].toLowerCase();
                const matchedLength = match[0].length;
                
                // 3. 移除匹配到的 Alert 標記文字
                firstTextNode.value = value.slice(matchedLength);

                // 4. 若該 text 節點剩餘文字均為空白，則將其移出子節點列表，以防產生多餘的空行或空白
                if (firstTextNode.value.trim() === '') {
                    firstChild.children.shift();
                    
                    // 順便清除隨後的換行 (br 節點) 如果存在的話
                    if (firstChild.children.length > 0 && firstChild.children[0].type === 'break') {
                        firstChild.children.shift();
                    }
                }

                // 5. 注入屬性，讓 Rehype 與 React 元件能讀取 class 與自訂的 alertType
                node.data = node.data || {};
                
                // 注入類別名稱供 HTML 渲染
                node.data.hProperties = node.data.hProperties || {};
                const existingClass = node.data.hProperties.className || [];
                const classes = Array.isArray(existingClass) ? existingClass : [existingClass];
                
                node.data.hProperties.className = [
                    ...classes,
                    'markdown-alert',
                    `markdown-alert-${alertType}`
                ];

                // 儲存 alertType，以便在 React Markdown blockquote component 中渲染特定的 Icon 和 Title
                node.data.alertType = alertType;
            }
        });
    };
}
