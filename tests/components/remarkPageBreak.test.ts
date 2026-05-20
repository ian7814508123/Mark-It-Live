import { describe, it, expect } from 'vitest';
import { remarkPageBreak } from '../../src/components/markdown/remarkPageBreak';

describe('remarkPageBreak 插件測試', () => {
    it('1. 應能正確將單獨成行的 \\pagebreak 轉為 html 類型的 div 節點', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '\\pagebreak'
                        }
                    ]
                }
            ]
        };

        const plugin = remarkPageBreak();
        plugin(ast);

        const node = ast.children[0] as any;
        expect(node.type).toBe('html');
        expect(node.value).toBe('<div class="page-break"></div>');
        expect(node.children).toBeUndefined();
    });

    it('2. 應能正確解析 [page-break] 與 ---pb---', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '  [page-break]  ' // 帶有前後導空格
                        }
                    ]
                },
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '---pb---'
                        }
                    ]
                }
            ]
        };

        const plugin = remarkPageBreak();
        plugin(ast);

        const node1 = ast.children[0] as any;
        expect(node1.type).toBe('html');
        expect(node1.value).toBe('<div class="page-break"></div>');

        const node2 = ast.children[1] as any;
        expect(node2.type).toBe('html');
        expect(node2.value).toBe('<div class="page-break"></div>');
    });

    it('3. 若換頁標籤與其他文字並存（非單獨一行），不應轉換為 page-break', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '請在此處換頁：\\pagebreak'
                        }
                    ]
                }
            ]
        };

        const plugin = remarkPageBreak();
        plugin(ast);

        const node = ast.children[0] as any;
        // 必須保持為一般的 paragraph 節點與 text 內容
        expect(node.type).toBe('paragraph');
        expect(node.children[0].value).toBe('請在此處換頁：\\pagebreak');
    });

    it('4. 在 code block 中的 \\pagebreak 應被完全忽略，不得轉換', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'code',
                    lang: 'markdown',
                    value: '使用 [page-break] 進行強制換頁'
                }
            ]
        };

        const plugin = remarkPageBreak();
        plugin(ast);

        expect(ast.children[0]).toEqual({
            type: 'code',
            lang: 'markdown',
            value: '使用 [page-break] 進行強制換頁'
        });
    });
});
