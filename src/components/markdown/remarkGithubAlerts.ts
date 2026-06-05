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
                const hasNewline = match[0].includes('\n');

                // 3. 移除匹配到的 Alert 標記文字與前導空格，以防產生多餘的空白
                let remainingValue = value.slice(matchedLength);
                remainingValue = remainingValue.replace(/^[ \t]+/, ''); // 移去同一行後面的前導空白

                const uppercaseType = alertType.toUpperCase();

                // 4. 判斷是否需要自動為 Alert 生成加粗標題（NOTE:）
                // 只要整個 blockquote 有其他子節點，或當前 paragraph 有其他子節點，或同行有文字，就表示有內容需生成標題
                const hasContent = remainingValue.trim() !== '' || 
                                   firstChild.children.length > 1 || 
                                   node.children.length > 1;

                if (hasContent) {
                    const strongNode = {
                        type: 'strong',
                        children: [{ type: 'text', value: uppercaseType }]
                    };

                    if (remainingValue.trim() !== '') {
                        // 同一行有文字內容
                        if (hasNewline) {
                            // 情況 B：同一行有文字，但中間有換行符（例如 markdown 內部的換行）
                            const separatorAndTextNode = {
                                type: 'text',
                                value: `: `
                            };
                            const breakNode = {
                                type: 'break'
                            };
                            const textNode = {
                                type: 'text',
                                value: remainingValue
                            };
                            firstChild.children.splice(0, 1, strongNode, separatorAndTextNode, breakNode, textNode);
                        } else {
                            // 情況 C：同一行有文字且沒有換行
                            // 檢查剩餘的文字開頭是否已經手動輸入了該類型前綴（例如 **NOTE**: 或 NOTE:）
                            const prefixRegex = new RegExp(`^(?:\\*\\*)?${uppercaseType}(?:\\*\\*)?:?\\s*`, 'i');
                            if (prefixRegex.test(remainingValue)) {
                                remainingValue = remainingValue.replace(prefixRegex, '');
                            }
                            const separatorAndTextNode = {
                                type: 'text',
                                value: `: ${remainingValue}`
                            };
                            firstChild.children.splice(0, 1, strongNode, separatorAndTextNode);
                        }
                    } else {
                        // 同一行沒有文字，但後續有其他節點（例如換行寫內文，或者有手動 <br>）
                        const breakNode = {
                            type: 'break'
                        };
                        firstChild.children.splice(0, 1, strongNode, breakNode);

                        // 順便清除隨後緊跟的換行 (br 節點) 如果存在的話，以防雙重換行
                        if (firstChild.children.length > 2 && (firstChild.children[2].type === 'break' || firstChild.children[2].type === 'html')) {
                            firstChild.children.splice(2, 1);
                        }
                    }
                } else {
                    // 完全沒有任何內容的空 Alert，移出 text 節點
                    firstChild.children.shift();
                }

                // 5. 如果第一個 paragraph 已經沒有任何 children，則直接從 blockquote 節點中移除該 paragraph，防止產生空 <p> 導致視覺上多一行空行
                if (firstChild.children.length === 0) {
                    node.children.shift();
                }

                // 6. 注入屬性，讓 Rehype 與 React 元件能讀取 class 與自訂的 alertType
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
