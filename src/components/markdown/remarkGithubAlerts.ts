// 簡單的 AST 節點遞迴遍歷工具
function visit(node: any, type: string, handler: (node: any) => void) {
    if (!node) return;
    if (node.type === type) {
        handler(node);
    }
    if (node.children && Array.isArray(node.children)) {
        const childrenCopy = [...node.children];
        childrenCopy.forEach((child) => visit(child, type, handler));
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

            // 2. 判斷第一個子節點的類型 (link 或 text)
            const firstNode = firstChild.children?.[0];
            if (!firstNode) return;

            // 支援的所有核心與擴充警示類型
            const supportedTypes = new Set([
                'note', 'important', 'warning', 'caution', 'tip',
                'info', 'success', 'check', 'danger', 'error',
                'bug', 'failure', 'question', 'help', 'faq',
                'quickstart', 'start', 'attention', 'ban'
            ]);

            // 核心類型對照表，將所有語法對應到 5 大核心樣式類別
            const coreTypeMap: Record<string, string> = {
                note: 'note',
                info: 'note',

                tip: 'tip',
                success: 'tip',
                check: 'tip',
                quickstart: 'tip',
                start: 'tip',

                warning: 'warning',
                attention: 'warning',

                caution: 'caution',
                ban: 'caution',
                danger: 'caution',
                error: 'caution',
                bug: 'caution',
                failure: 'caution',

                important: 'important',
                question: 'important',
                help: 'important',
                faq: 'important'
            };

            let alertType = '';
            let alertTitle = '';
            let isLinkSyntax = false;
            let matchedLength = 0;
            let remainingValue = '';
            let hasNewline = false;

            if (firstNode.type === 'link') {
                // 處理 [!TYPE](Title) 語法。此時在 AST 中，第一節點已經是 link 節點
                const linkTextNode = firstNode.children?.[0];
                if (linkTextNode && linkTextNode.type === 'text') {
                    const linkText = linkTextNode.value.trim();
                    const linkMatch = linkText.match(/^!\s*([a-z0-9_-]+)$/i) || linkText.match(/^([a-z0-9_-]+)$/i);
                    if (linkMatch) {
                        const originalType = linkMatch[1].toLowerCase();
                        if (supportedTypes.has(originalType)) {
                            alertType = originalType;
                            alertTitle = firstNode.url ? firstNode.url.trim() : '';
                            isLinkSyntax = true;
                        }
                    }
                }
            } else if (firstNode.type === 'text') {
                // 處理標準 [!TYPE] 或 [TYPE] 語法。只匹配方括號本身，後面的字當作普通內文
                const value = firstNode.value;
                const match = value.match(/^\s*\[!\s*([a-z0-9_-]+)\s*\](?:\s*\n)?/i) ||
                    value.match(/^\s*\[\s*([a-z0-9_-]+)\s*\](?:\s*\n)?/i);

                if (match) {
                    const originalType = match[1].toLowerCase();
                    if (supportedTypes.has(originalType)) {
                        alertType = originalType;
                        matchedLength = match[0].length;
                        hasNewline = match[0].includes('\n');
                        remainingValue = value.slice(matchedLength);
                        // 沒有括號語法，所以此處自訂標題為空
                        alertTitle = '';
                    }
                }
            }

            if (!alertType) return;

            const coreType = coreTypeMap[alertType] || 'note';

            // 判斷是否需要自動為 Alert 生成內容
            const hasContent = alertTitle !== '' ||
                remainingValue.trim() !== '' ||
                firstChild.children.length > 1 ||
                node.children.length > 1;

            if (hasContent) {
                // 不論有無自訂標題，我們都不在內容區重複生成任何 strong 標題，只保留乾淨的後續內文
                if (isLinkSyntax) {
                    firstChild.children.shift(); // 移出 link 節點
                    
                    // 去重：如果下一個節點是 text 節點，並且開頭含有與自訂標題重複的前綴文字，則將其清洗
                    if (alertTitle) {
                        const nextNode = firstChild.children?.[0];
                        if (nextNode && nextNode.type === 'text') {
                            const escapedTitle = alertTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            // 重複前綴必須後面跟著半形/全形冒號（包含可選空格），或者直接是換行或字串結尾，以防誤殺與標題字眼開頭相同的正常句子
                            const prefixRegex = new RegExp(`^(?:[\\n\\r\\s]+)?(?:\\*\\*)?${escapedTitle}(?:\\*\\*)?(?:[:：]\\s*|(?=[\\n\\r]|$))`, 'i');
                            if (prefixRegex.test(nextNode.value)) {
                                nextNode.value = nextNode.value.replace(prefixRegex, '');
                            }
                        }
                    }
                } else {
                    // 標準語法：直接移除第一個 text 節點中的 `[!TYPE]` 標記，保留後續內文
                    if (remainingValue.trim() !== '') {
                        firstNode.value = remainingValue.replace(/^[ \t]+/, ''); // 保留剩餘內容並去除前導空白
                    } else {
                        firstChild.children.shift();
                    }
                }
            } else {
                // 完全沒有任何內容的空 Alert，移出 text/link 節點
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
                `markdown-alert-${coreType}`
            ];

            // 儲存為 HTML 屬性 (data-alert-type)，讓 React Markdown 在 Rehype 轉換後依然能讀取
            node.data.hProperties.dataAlertType = alertType;


            // 儲存 alertType 與 alertTitle，以便在 React Markdown blockquote component 中渲染特定的 Icon 和 Title
            node.data.alertType = alertType;
            if (alertTitle) {
                node.data.alertTitle = alertTitle;
                node.data.hProperties.dataAlertTitle = alertTitle;
            }

        });
    };
};

