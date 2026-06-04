import React, { useState, useEffect } from 'react';
import { MathJax } from 'better-react-mathjax';
import { useDebounce } from '../../hooks/useDebounce';

interface MemoizedMathJaxRendererProps {
    content: string;
    inline?: boolean;
    isDarkMode: boolean;
}

/**
 * MathJax 渲染元件（懶載入專用）
 *
 * 此元件將 MathJax 封裝在獨立檔案中，讓 MarkdownPreview.tsx 透過 React.lazy() 懶載入。
 * 與 LazyMathJaxProvider.tsx 同屬 vendor-mathjax chunk，Vite 只下載一次。
 *
 * 懶載入宣告位於 MarkdownPreview.tsx：
 *   const LazyMathRenderer = React.lazy(() => import('./MemoizedMathJaxRenderer'));
 */
const MemoizedMathJaxRenderer: React.FC<MemoizedMathJaxRendererProps> = React.memo(({ content, inline, isDarkMode }) => {
    // 為數學公式加入內部 Debounce，避免公式隨著打字不斷抖動
    const debouncedContent = useDebounce(content, 300);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        if (content !== debouncedContent) {
            setIsPending(true);
        } else {
            setIsPending(false);
        }
    }, [content, debouncedContent]);

    const Wrapper = inline ? 'span' : 'div';

    return (
        <Wrapper className={`transition-opacity duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
            <MathJax inline={inline} dynamic hideUntilTypeset="every">
                {inline ? `\\(${debouncedContent}\\)` : `\\[${debouncedContent}\\]`}
            </MathJax>
        </Wrapper>
    );
});

MemoizedMathJaxRenderer.displayName = 'MemoizedMathJaxRenderer';

export default MemoizedMathJaxRenderer;
