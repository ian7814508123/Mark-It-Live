import { describe, it, expect } from 'vitest';
import {
    detectMarkdownFeatures,
    areFeaturesEqual,
    EMPTY_FEATURES,
    type MarkdownFeatures,
} from '../../src/utils/markdownScanner';

describe('detectMarkdownFeatures', () => {
    describe('空內容處理', () => {
        it('空字串應返回所有 false', () => {
            const result = detectMarkdownFeatures('');
            expect(result).toEqual(EMPTY_FEATURES);
        });

        it('純文字 Markdown 應返回所有 false', () => {
            const result = detectMarkdownFeatures('# 標題\n\n這是一段純文字。');
            expect(result.hasMermaid).toBe(false);
            expect(result.hasVega).toBe(false);
            expect(result.hasSmiles).toBe(false);
            expect(result.hasAbc).toBe(false);
            expect(result.hasMath).toBe(false);
        });
    });

    describe('Mermaid 偵測', () => {
        it('標準 ```mermaid 語法', () => {
            const content = '```mermaid\ngraph TD\n  A --> B\n```';
            expect(detectMarkdownFeatures(content).hasMermaid).toBe(true);
        });

        it('大小寫不敏感', () => {
            const content = '```Mermaid\ngraph TD\n  A --> B\n```';
            expect(detectMarkdownFeatures(content).hasMermaid).toBe(true);
        });

        it('縮排的程式碼塊', () => {
            const content = '  ```mermaid\ngraph TD\n  A --> B\n```';
            expect(detectMarkdownFeatures(content).hasMermaid).toBe(true);
        });

        it('無 mermaid 語法應為 false', () => {
            const content = '```javascript\nconsole.log("hello")\n```';
            expect(detectMarkdownFeatures(content).hasMermaid).toBe(false);
        });
    });

    describe('Vega 偵測', () => {
        it('```vega 語法', () => {
            const content = '```vega\n{"mark": "point"}\n```';
            expect(detectMarkdownFeatures(content).hasVega).toBe(true);
        });

        it('```vega-lite 語法', () => {
            const content = '```vega-lite\n{"mark": "bar"}\n```';
            expect(detectMarkdownFeatures(content).hasVega).toBe(true);
        });

        it('大小寫不敏感', () => {
            const content = '```Vega-Lite\n{"mark": "bar"}\n```';
            expect(detectMarkdownFeatures(content).hasVega).toBe(true);
        });
    });

    describe('SMILES 偵測', () => {
        it('```smiles 語法', () => {
            const content = '```smiles\nC1=CC=CC=C1\n```';
            expect(detectMarkdownFeatures(content).hasSmiles).toBe(true);
        });

        it('無 smiles 語法應為 false', () => {
            const content = '這是普通文字，沒有化學式。';
            expect(detectMarkdownFeatures(content).hasSmiles).toBe(false);
        });
    });

    describe('ABC 樂譜偵測', () => {
        it('```abc 語法', () => {
            const content = '```abc\nX:1\nT:測試\nK:C\n```';
            expect(detectMarkdownFeatures(content).hasAbc).toBe(true);
        });
    });

    describe('數學公式偵測', () => {
        it('$$...$$（行間）', () => {
            const content = '$$\nE = mc^2\n$$';
            expect(detectMarkdownFeatures(content).hasMath).toBe(true);
        });

        it('\\[...\\]（行間）', () => {
            const content = '\\[\nE = mc^2\n\\]';
            expect(detectMarkdownFeatures(content).hasMath).toBe(true);
        });

        it('$...$（行內）', () => {
            const content = '質能等效公式 $E = mc^2$ 很重要。';
            expect(detectMarkdownFeatures(content).hasMath).toBe(true);
        });

        it('無數學公式', () => {
            const content = '# 標題\n無任何數學符號。';
            expect(detectMarkdownFeatures(content).hasMath).toBe(false);
        });
    });

    describe('WikiLink 偵測', () => {
        it('[[pageName]] 語法', () => {
            const content = '請參考 [[首頁]] 的說明。';
            expect(detectMarkdownFeatures(content).hasWikiLink).toBe(true);
        });

        it('[[pageName|alias]] 語法', () => {
            const content = '詳見 [[首頁|點這裡]]。';
            expect(detectMarkdownFeatures(content).hasWikiLink).toBe(true);
        });

        it('無 WikiLink', () => {
            const content = '[普通連結](https://example.com)';
            expect(detectMarkdownFeatures(content).hasWikiLink).toBe(false);
        });
    });

    describe('本地圖片偵測', () => {
        it('img-local:// 協定', () => {
            const content = '![alt](img-local://abc123)';
            expect(detectMarkdownFeatures(content).hasLocalImage).toBe(true);
        });

        it('一般圖片不應觸發', () => {
            const content = '![alt](https://example.com/image.png)';
            expect(detectMarkdownFeatures(content).hasLocalImage).toBe(false);
        });
    });

    describe('複合語法偵測', () => {
        it('同時包含多種特徵應全部偵測到', () => {
            const content = `
# 標題

這裡有數學 $E=mc^2$ 和 WikiLink [[首頁]]。

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`vega
{"mark": "point"}
\`\`\`

![local](img-local://abc123)
            `.trim();

            const features = detectMarkdownFeatures(content);
            expect(features.hasMermaid).toBe(true);
            expect(features.hasVega).toBe(true);
            expect(features.hasMath).toBe(true);
            expect(features.hasWikiLink).toBe(true);
            expect(features.hasLocalImage).toBe(true);
            expect(features.hasSmiles).toBe(false);
            expect(features.hasAbc).toBe(false);
        });
    });
});

describe('areFeaturesEqual', () => {
    it('相同特徵應返回 true', () => {
        const a: MarkdownFeatures = { ...EMPTY_FEATURES, hasMermaid: true };
        const b: MarkdownFeatures = { ...EMPTY_FEATURES, hasMermaid: true };
        expect(areFeaturesEqual(a, b)).toBe(true);
    });

    it('不同特徵應返回 false', () => {
        const a: MarkdownFeatures = { ...EMPTY_FEATURES, hasMermaid: true };
        const b: MarkdownFeatures = { ...EMPTY_FEATURES, hasMermaid: false };
        expect(areFeaturesEqual(a, b)).toBe(false);
    });

    it('EMPTY_FEATURES 與自身比較應返回 true', () => {
        expect(areFeaturesEqual(EMPTY_FEATURES, EMPTY_FEATURES)).toBe(true);
    });
});
