import { describe, it, expect } from 'vitest';
import { remarkGithubAlerts } from '../../src/components/markdown/remarkGithubAlerts';

describe('remarkGithubAlerts 插件測試', () => {
    it('1. 應能正確解析標準的 [!NOTE] 標籤並移除前綴字串', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[!NOTE]\n這是一條筆記'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const plugin = remarkGithubAlerts();
        plugin(ast);

        const blockquote = ast.children[0] as any;
        expect(blockquote.data).toBeDefined();
        expect(blockquote.data.alertType).toBe('note');
        expect(blockquote.data.hProperties.className).toContain('markdown-alert');
        expect(blockquote.data.hProperties.className).toContain('markdown-alert-note');

        const paragraph = blockquote.children[0];
        expect(paragraph.children[0].value).toBe('這是一條筆記');
    });

    it('2. 應能相容不帶驚嘆號的 [TIP] 標籤', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[TIP] 這是小技巧'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const plugin = remarkGithubAlerts();
        plugin(ast);

        const blockquote = ast.children[0] as any;
        expect(blockquote.data.alertType).toBe('tip');
        expect(blockquote.data.hProperties.className).toContain('markdown-alert-tip');
        
        const paragraph = blockquote.children[0];
        expect(paragraph.children[0].value).toBe(' 這是小技巧');
    });

    it('3. 應能相容大小寫變體與前後空白字元', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '   [!ImPoRtAnT] 重要資訊'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const plugin = remarkGithubAlerts();
        plugin(ast);

        const blockquote = ast.children[0] as any;
        expect(blockquote.data.alertType).toBe('important');
        expect(blockquote.data.hProperties.className).toContain('markdown-alert-important');
        
        const paragraph = blockquote.children[0];
        expect(paragraph.children[0].value).toBe(' 重要資訊');
    });

    it('4. 若 Alert 標籤後沒有內容，應正確清除該 text 節點', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '[!WARNING]'
                                },
                                {
                                    type: 'text',
                                    value: ' 這是警告內容'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const plugin = remarkGithubAlerts();
        plugin(ast);

        const blockquote = ast.children[0] as any;
        expect(blockquote.data.alertType).toBe('warning');
        
        const paragraph = blockquote.children[0];
        // 第一個 text 節點因為在 value 被清空後被 shift 移除了
        expect(paragraph.children.length).toBe(1);
        expect(paragraph.children[0].value).toBe(' 這是警告內容');
    });

    it('5. 對於一般的 blockquote，不應做任何變更', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'text',
                                    value: '這只是一般的引言，不包含 Alert 語法。'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const plugin = remarkGithubAlerts();
        plugin(ast);

        const blockquote = ast.children[0] as any;
        expect(blockquote.data).toBeUndefined();
        
        const paragraph = blockquote.children[0];
        expect(paragraph.children[0].value).toBe('這只是一般的引言，不包含 Alert 語法。');
    });
});
