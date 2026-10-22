import React, { useCallback, useRef, useState, useId } from 'react';
import DiagramBlock from './DiagramBlock';
import { LuMaximize, LuZoomIn, LuZoomOut } from 'react-icons/lu';

interface MindmapBlockProps {
    code: string;
    isDarkMode: boolean;
    isPrinting?: boolean;
    printSessionId?: number;
}

/**
 * MindmapBlock: 心智圖視覺化組件
 * 整合 markmap-lib 與 markmap-view，將 Markdown 階層列表或標題即時轉換為互動式心智圖
 */
const MindmapBlock: React.FC<MindmapBlockProps> = React.memo(({
    code,
    isDarkMode,
    isPrinting,
    printSessionId = 0
}) => {
    const rawUniqueId = useId();
    const uniqueId = `mm-${rawUniqueId.replace(/[:]/g, '')}`;
    const markmapInstanceRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const handleZoomIn = () => {
        markmapInstanceRef.current?.rescale(1.25);
    };

    const handleZoomOut = () => {
        markmapInstanceRef.current?.rescale(0.8);
    };

    const handleFit = () => {
        markmapInstanceRef.current?.fit();
    };

    const render = useCallback(async (container: HTMLDivElement, renderCode: string, isDark: boolean) => {
        // 動態非同步載入 markmap 核心模組
        const [libModule, viewModule, commonModule] = await Promise.all([
            import('markmap-lib'),
            import('markmap-view'),
            import('markmap-common')
        ]);

        const Transformer = libModule.Transformer;
        const Markmap = viewModule.Markmap;
        const { loadCSS, loadJS } = commonModule;

        // 若前次實例存在，先清理以防記憶體洩漏
        if (markmapInstanceRef.current) {
            try {
                markmapInstanceRef.current.destroy?.();
            } catch (_) {}
            markmapInstanceRef.current = null;
        }

        container.innerHTML = '';

        // 轉換 Markdown 為心智圖階層樹
        const transformer = new Transformer();
        const { root, features } = transformer.transform(renderCode);
        const assets = transformer.getUsedAssets(features);
        if (assets.styles) loadCSS(assets.styles);
        if (assets.scripts) loadJS(assets.scripts, { getMarkmap: () => ({ Markmap }) });

        // 建立外層包裝容器與 SVG 畫布
        const wrapper = document.createElement('div');
        wrapper.id = uniqueId;
        wrapper.className = `markmap-canvas-wrapper relative w-full overflow-hidden rounded-xl border border-slate-200/80 dark:border-neutral-700/80 transition-colors ${
            isDark ? 'bg-neutral-900/90 markmap-dark-theme' : 'bg-slate-50/70 markmap-light-theme'
        }`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-full block markmap-svg-root');
        svg.style.height = isPrinting ? '550px' : '440px';
        svg.style.minHeight = '320px';
        svg.style.userSelect = 'none';

        // 注入深淺色模式專屬樣式，確保節點文字與連線對比鮮明
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            #${uniqueId} .markmap-node text {
                font-family: inherit !important;
                font-weight: 500;
            }
            #${uniqueId}.markmap-dark-theme text {
                fill: #f1f5f9 !important;
            }
            #${uniqueId}.markmap-dark-theme div {
                color: #f1f5f9 !important;
            }
            #${uniqueId}.markmap-dark-theme a {
                color: #60a5fa !important;
            }
            #${uniqueId}.markmap-dark-theme code {
                background: #1e293b !important;
                color: #38bdf8 !important;
                padding: 1px 4px;
                border-radius: 4px;
            }
            #${uniqueId}.markmap-dark-theme circle {
                stroke-width: 2px;
            }

            #${uniqueId}.markmap-light-theme text {
                fill: #1e293b !important;
            }
            #${uniqueId}.markmap-light-theme div {
                color: #1e293b !important;
            }
            #${uniqueId}.markmap-light-theme a {
                color: #2563eb !important;
            }
            #${uniqueId}.markmap-light-theme code {
                background: #e2e8f0 !important;
                color: #0369a1 !important;
                padding: 1px 4px;
                border-radius: 4px;
            }
        `;

        wrapper.appendChild(styleTag);
        wrapper.appendChild(svg);
        container.appendChild(wrapper);

        // 建立 Markmap 互動實例
        const mm = Markmap.create(svg, {
            autoFit: true,
            duration: 250,
            zoom: !isPrinting,
            pan: !isPrinting
        }, root);

        markmapInstanceRef.current = mm;
        setIsLoaded(true);

        // 初始化微調視圖佈局適配
        const timer = setTimeout(() => {
            try {
                mm.fit();
            } catch (_) {}
        }, 120);

        return () => {
            clearTimeout(timer);
            try {
                mm.destroy?.();
            } catch (_) {}
            markmapInstanceRef.current = null;
            setIsLoaded(false);
        };
    }, [uniqueId, isPrinting]);

    return (
        <div className="relative group/mindmap">
            {/* 浮動快捷操作工具列 (僅在非列印模式下顯示) */}
            {!isPrinting && isLoaded && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 p-1 rounded-lg bg-white/80 dark:bg-neutral-800/80 backdrop-blur shadow-sm border border-slate-200/60 dark:border-neutral-700/60 opacity-0 group-hover/mindmap:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={handleFit}
                        title="適配全景 (Fit)"
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <LuMaximize className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        title="放大 (+)"
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <LuZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        title="縮小 (-)"
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors"
                    >
                        <LuZoomOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <DiagramBlock
                type="mindmap"
                code={code}
                isDarkMode={isDarkMode}
                isPrinting={isPrinting}
                printSessionId={printSessionId}
                render={render}
                errorTitle="🧠 心智圖 (Mindmap) 語法錯誤"
                containerClassName="mindmap-container"
            />
        </div>
    );
});

export default MindmapBlock;
