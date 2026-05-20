import { describe, it, expect } from 'vitest';
import { remarkWikiLink } from '../../src/components/markdown/remarkWikiLink';

describe('remarkWikiLink 插件測試', () => {
    it('1. 應能正確將一般的 [[PageName]] 轉為對應的 link AST 節點', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '請參考 [[關於我們]] 以獲得更多聯絡資訊。'
                        }
                    ]
                }
            ]
        };

        const plugin = remarkWikiLink();
        plugin(ast);

        const paragraph = ast.children[0];
        // 原本 1 個 text 節點應該被拆分成 3 個子節點：text, link, text
        expect(paragraph.children.length).toBe(3);
        
        expect(paragraph.children[0].type).toBe('text');
        expect(paragraph.children[0].value).toBe('請參考 ');

        const linkNode = paragraph.children[1] as any;
        expect(linkNode.type).toBe('link');
        expect(linkNode.url).toBe('#wikilink-%E9%97%9C%E6%96%BC%E6%88%91%E5%80%91'); // encodeURIComponent
        expect(linkNode.children[0].type).toBe('text');
        expect(linkNode.children[0].value).toBe('關於我們');

        expect(paragraph.children[2].type).toBe('text');
        expect(paragraph.children[2].value).toBe(' 以獲得更多聯絡資訊。');
    });

    it('2. 應能正確解析單行內的多個 WikiLinks', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '從 [[首頁]] 前往 [[設定]] 頁面。'
                        }
                    ]
                }
            ]
        };

        const plugin = remarkWikiLink();
        plugin(ast);

        const paragraph = ast.children[0];
        // 拆分成 5 個節點：text, link, text, link, text
        expect(paragraph.children.length).toBe(5);

        expect(paragraph.children[0].value).toBe('從 ');
        expect(paragraph.children[1].url).toBe('#wikilink-%E9%A6%96%E9%A0%81');
        expect(paragraph.children[2].value).toBe(' 前往 ');
        expect(paragraph.children[3].url).toBe('#wikilink-%E8%A8%AD%E5%AE%9A');
        expect(paragraph.children[4].value).toBe(' 頁面。');
    });

    it('3. 在 code block (程式碼區塊) 中，不應轉換雙括號', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'code',
                    lang: 'javascript',
                    value: 'const matrix = [[1, 2], [3, 4]];'
                }
            ]
        };

        const plugin = remarkWikiLink();
        plugin(ast);

        // code 節點本身沒有 children，它只是一個 leaf 節點，故其內容不應被誤判或修改
        expect(ast.children[0]).toEqual({
            type: 'code',
            lang: 'javascript',
            value: 'const matrix = [[1, 2], [3, 4]];'
        });
    });

    it('4. 在 inlineCode (行內程式碼) 中，亦不應轉換雙括號', () => {
        const ast = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '在 JS 中定義二維陣列 '
                        },
                        {
                            type: 'inlineCode',
                            value: '[[1, 2]]'
                        },
                        {
                            type: 'text',
                            value: ' 非常簡單。'
                        }
                    ]
                }
            ]
        };

        const plugin = remarkWikiLink();
        plugin(ast);

        const paragraph = ast.children[0];
        // inlineCode 節點必須被完全保留，不能被轉換為 link 節點
        expect(paragraph.children[1]).toEqual({
            type: 'inlineCode',
            value: '[[1, 2]]'
        });
    });
});
