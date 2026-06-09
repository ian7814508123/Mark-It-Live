import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { CodeBlockHeader } from './CodeBlockHeader';

// ─── 載入 Prism 輕量語言套件 ────────────────────────────────────────────────
import js from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import ts from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'; // HTML / XML / SVG
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import arduino from 'react-syntax-highlighter/dist/esm/languages/prism/arduino';
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';
import makefile from 'react-syntax-highlighter/dist/esm/languages/prism/makefile';

// ─── 註冊對應語言的別名與語法高亮 ──────────────────────────────────────────────
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('js', js);
SyntaxHighlighter.registerLanguage('typescript', ts);
SyntaxHighlighter.registerLanguage('ts', ts);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('rs', rust);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('golang', go);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('svg', markup);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('toml', toml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('console', bash);
SyntaxHighlighter.registerLanguage('zsh', bash);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('arduino', arduino);
SyntaxHighlighter.registerLanguage('docker', docker);
SyntaxHighlighter.registerLanguage('dockerfile', docker);
SyntaxHighlighter.registerLanguage('makefile', makefile);

// ─── 增強型程式碼區塊 Props ───────────────────────────────────────────────────
export interface EnhancedCodeBlockProps {
    language: string;
    codeString: string;
    stableKey: string;
    isActuallyPrinting: boolean;
    shouldShowDark: boolean;
}

/**
 * 增強型程式碼區塊
 *
 * 此元件刻意抽離為獨立檔案，透過 React.lazy() 實現真正的懶載入。
 * react-syntax-highlighter 只會在 Markdown 文件中實際存在程式碼區塊時才下載，
 * 避免初始載入時被 Lighthouse 標記為「Unused JavaScript」。
 *
 * 懶載入宣告位於 MarkdownPreview.tsx：
 *   const LazyEnhancedCodeBlock = React.lazy(() => import('./EnhancedCodeBlock'));
 */
const EnhancedCodeBlock: React.FC<EnhancedCodeBlockProps> = ({
    language,
    codeString,
    stableKey,
    isActuallyPrinting,
    shouldShowDark
}) => {
    // 預設需要換行的語言
    const defaultWrapLanguages = ['text', 'log', 'json', 'bash', 'sh', 'yaml', 'plaintext', 'markdown'];
    const [isWrapped, setIsWrapped] = useState(defaultWrapLanguages.includes(language));
    const [isScrolled, setIsScrolled] = useState(false);

    // 列印模式為了防截斷，強制換行
    const effectiveWrapped = isActuallyPrinting || isWrapped;

    // 當斷行狀態改變或初次渲染時，通知預覽器重新計算佈局高度（列印同步用）
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('content-layout-ready'));
    }, [effectiveWrapped]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        setIsScrolled(target.scrollLeft > 0);
    }, []);

    // 動態計算最大位數，仿照 VS Code 做法，至少預留 2 位數空間
    const maxDigits = useMemo(() => {
        const lineCount = codeString.split('\n').length;
        return Math.max(2, lineCount.toString().length);
    }, [codeString]);

    return (
        <div
            className="relative group/codeblock w-full my-6"
            style={{ '--code-max-digits': maxDigits } as React.CSSProperties}
        >
            <div
                className={`enhanced-codeblock ${effectiveWrapped ? 'code-block-wrap' : 'code-block-scroll'} ${!effectiveWrapped && isScrolled ? 'has-scrolled' : ''}`}
                data-theme-style={(isActuallyPrinting || !shouldShowDark) ? 'light' : 'dark'}
                onScrollCapture={handleScroll}
            >
                {language && (
                    <CodeBlockHeader
                        language={language}
                        isWrapped={isWrapped}
                        onToggleWrap={isActuallyPrinting ? undefined : () => setIsWrapped(!isWrapped)}
                        showWrapButton={!isActuallyPrinting}
                    />
                )}

                <SyntaxHighlighter
                    key={stableKey}
                    language={language || 'text'}
                    useInlineStyles={false}
                    customStyle={{
                        margin: '0',
                        padding: language ? '1rem' : '1.2rem 1rem 1rem 1rem',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        backgroundColor: 'var(--code-bg)',
                        borderRadius: '0', /* 圓角由外層卡片統一裁剪 */
                        border: 'none', /* 拔除內層重複邊框，消除雙重邊框 Bug */
                        overflowX: effectiveWrapped ? 'hidden' : 'auto',
                        tabSize: '2',
                    }}
                    showLineNumbers={false} /* 關閉原生的缺陷行號 */
                    wrapLines={true} /* 強制每一行編織成 span，作為 css counter 基準 */
                    lineProps={{
                        className: 'code-line'
                    }}
                    preTagProps={{}}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export default EnhancedCodeBlock;
