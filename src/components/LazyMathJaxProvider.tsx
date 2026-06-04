import React from 'react';
import { MathJaxContext } from 'better-react-mathjax';

interface LazyMathJaxProviderProps {
    config: Record<string, unknown>;
    children: React.ReactNode;
}

/**
 * MathJax Context 包裝層（懶載入專用）
 *
 * 此元件將 MathJaxContext 封裝在獨立檔案中，讓 App.tsx 透過 React.lazy() 懶載入。
 * better-react-mathjax（含 mathjax-full）只在此元件首次 render 時下載，
 * 避免佔用初始載入資源。
 *
 * 懶載入宣告位於 App.tsx：
 *   const LazyMathJaxProvider = React.lazy(() => import('./src/components/LazyMathJaxProvider'));
 */
const LazyMathJaxProvider: React.FC<LazyMathJaxProviderProps> = ({ config, children }) => {
    return (
        <MathJaxContext config={config}>
            {children}
        </MathJaxContext>
    );
};

export default LazyMathJaxProvider;
