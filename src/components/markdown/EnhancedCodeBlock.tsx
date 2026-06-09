import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PrismAsync as SyntaxHighlighter } from 'react-syntax-highlighter';
import { CodeBlockHeader } from './CodeBlockHeader';

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
 * react-syntax-highlighter（約 695 KiB）只會在 Markdown 文件中實際存在程式碼區塊時才下載，
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
