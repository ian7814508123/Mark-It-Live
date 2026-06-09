import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import ExternalMediaShield, { extractDomain } from './ExternalMediaShield';
import { remarkGithubAlerts } from './remarkGithubAlerts';
import { remarkWikiLink } from './remarkWikiLink';
import { remarkPageBreak } from './remarkPageBreak';
import { useImageStorage } from '../../hooks/useImageStorage';
import DiagramBlock from './DiagramBlock';
import { ResizableWrapper } from '../ui/ResizableWrapper';
import { hashString } from '../../utils';
import { usePersistentCanvasSettings } from '../../hooks/usePersistentCanvasSettings';
import LineCommentItem from './LineCommentItem';
import { CommentProvider } from './CommentContext';
import MagneticButton from '../ui/MagneticButton';
import { detectMarkdownFeatures } from '../../utils/markdownScanner';

interface MarkdownPreviewProps {
    content: string;
    isDarkMode: boolean;
    documents?: any[];
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    currentDocId?: string | null;
    isPrinting?: boolean;
    printSessionId?: number;
    isMergedPrint?: boolean;
    previewTheme?: 'default' | 'academic' | 'minimal' | 'developer' | 'implementation-plan' | 'classical' | 'newspaper' | 'nordicforest' | 'cosmic' | 'sunsetglow' | 'neonrain' | 'aurora';
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
    activeScale?: number;
}

// 原有的輔助 Hook 與組件已抽離至 DiagramBlock.tsx 與 ResizableWrapper.tsx 處理

// ─── 標註工具按鈕元件 ──────────────────────────────────────────────────────

/** 
 * 淨化 Mermaid 生成的 SVG 字串
 * 移除固定的 width 和 height 屬性，改由 CSS 控制，以實現自適應縮放
 */
const cleanMermaidSvg = (svgHtml: string) => {
    return svgHtml
        .replace(/width=".*?"/i, 'width="100%"')
        .replace(/height=".*?"/i, 'height="auto"')
        .replace(/style="max-width:.*?"/i, 'style="max-width: 100%"');
};

const MermaidBlock: React.FC<{
    code: string;
    isDarkMode: boolean;
    isPrinting?: boolean;
    printSessionId?: number;
    previewTheme?: string;
}> = React.memo(({ code, isDarkMode, isPrinting, printSessionId = 0, previewTheme = 'default' }) => {
    const render = useCallback(async (container: HTMLDivElement, renderCode: string, isDark: boolean) => {
        // 動態載入 Mermaid（首次渲染時才下載，後續使用已快取實例）
        const mermaid = (await import('mermaid')).default;

        // 1. 向上爬 DOM 樹找到 .prose 容器，從那裡讀取 CSS 變數
        // 主題變數（如 --mermaid-node-bg）宣告在 .theme-academic 上，
        // 必須從攜帶主題 class 的 .prose 祖先元素讀取，才能取得正確的主題色
        const themeRoot = container.closest('.prose') ?? container;
        const computedStyle = window.getComputedStyle(themeRoot);
        const fontFamily = computedStyle.getPropertyValue('--theme-font-family') || 'Inter, system-ui, sans-serif';

        // 2. 提取核心必填變數 (Core)
        const nodeBg = computedStyle.getPropertyValue('--mermaid-node-bg').trim();
        const nodeText = computedStyle.getPropertyValue('--mermaid-node-text').trim();
        const nodeBorder = computedStyle.getPropertyValue('--mermaid-node-border').trim();
        const lineColor = computedStyle.getPropertyValue('--mermaid-line').trim();
        const edgeBg = computedStyle.getPropertyValue('--mermaid-edge-bg').trim();

        // 3. 提取選配進階變數，若無則自動 Fallback 繼承 Core 變數 (Fallback)
        const actorBg = computedStyle.getPropertyValue('--mermaid-actor-bg').trim() || nodeBg;
        const actorText = computedStyle.getPropertyValue('--mermaid-actor-text').trim() || nodeText;
        const actorBorder = computedStyle.getPropertyValue('--mermaid-actor-border').trim() || nodeBorder;
        const noteBg = computedStyle.getPropertyValue('--mermaid-note-bg').trim() || edgeBg;
        const noteText = computedStyle.getPropertyValue('--mermaid-note-text').trim() || nodeText;
        const noteBorder = computedStyle.getPropertyValue('--mermaid-note-border').trim() || nodeBorder;

        // 4. 定義 themeVariables，為各主題注入專屬色彩與極簡黑白 fallback
        const themeVars: Record<string, string> = {
            background: 'transparent',
            primaryColor: nodeBg || (isDark ? '#1e293b' : '#f1f5f9'),
            primaryTextColor: nodeText || (isDark ? '#f1f5f9' : '#1e293b'),
            primaryBorderColor: nodeBorder || (isDark ? '#334155' : '#cbd5e1'),
            lineColor: lineColor || (isDark ? '#94a3b8' : '#64748b'),
            edgeLabelBackground: edgeBg || (isDark ? '#1e293b' : '#ffffff'),

            // 流程圖 Cluster 適配
            clusterBkg: nodeBg || (isDark ? '#1e293b' : '#f1f5f9'),
            clusterBorder: nodeBorder || (isDark ? '#334155' : '#cbd5e1'),

            // 序列圖 (Sequence Diagram) 相關適配
            actorBkg: actorBg || (isDark ? '#1e293b' : '#f1f5f9'),
            actorBorder: actorBorder || (isDark ? '#334155' : '#cbd5e1'),
            actorTextColor: actorText || (isDark ? '#f1f5f9' : '#1e293b'),
            actorLineColor: lineColor || (isDark ? '#94a3b8' : '#64748b'),
            signalColor: actorText || (isDark ? '#f1f5f9' : '#1e293b'),
            signalTextColor: actorText || (isDark ? '#f1f5f9' : '#1e293b'),

            // 註解 (Note) 適配
            noteBkgColor: noteBg || (isDark ? '#1e293b' : '#ffffff'),
            noteBorderColor: noteBorder || (isDark ? '#334155' : '#cbd5e1'),
            noteTextColor: noteText || (isDark ? '#f1f5f9' : '#1e293b'),
        };

        // 5. 初始化 Mermaid，使用 base 主題
        mermaid.initialize({
            theme: 'base',
            fontFamily: fontFamily,
            securityLevel: 'loose',
            themeVariables: themeVars
        });

        // 將 previewTheme 納入 id hash，確保切換主題時強制觸發 Mermaid 重新渲染
        // 若沒有 theme，Mermaid 會快取相同 id 的 SVG，導致主題色永遠套用不上
        const id = `mermaid-${hashString(renderCode + (isDark ? 'dark' : 'light') + previewTheme)}`;

        // 先進行語法檢查，避免 mermaid.render 回傳 "Syntax error in text" 的 SVG
        await mermaid.parse(renderCode, { suppressErrors: false });

        // 只有語法正確才會執行到這裡
        const { svg: renderedSvg } = await mermaid.render(id, renderCode);
        container.innerHTML = cleanMermaidSvg(renderedSvg);
    }, [previewTheme]);

    return (
        <DiagramBlock
            type="mermaid"
            code={code}
            isDarkMode={isDarkMode}
            isPrinting={isPrinting}
            printSessionId={printSessionId}
            render={render}
            errorTitle="Mermaid Syntax Error"
        />
    );
});

const VegaBlock: React.FC<{ code: string; isDarkMode: boolean; isPrinting?: boolean; printSessionId?: number }> = React.memo(({ code, isDarkMode, isPrinting, printSessionId = 0 }) => {
    const { getDataFileByName } = useImageStorage();

    const render = useCallback(async (container: HTMLDivElement, renderCode: string, isDark: boolean) => {
        // 動態載入 vega-embed（首次渲染時才下載，後續使用已快取實例）
        const { default: embed } = await import('vega-embed');
        const spec = JSON.parse(renderCode);

        container.innerHTML = '';
        const result = await embed(container, spec, {
            actions: false,
            theme: isDark ? 'dark' : 'vox',
            renderer: 'svg',
            loader: {
                // 1. 覆寫同步過濾器：對所有協定（包含 data-local://）同步放行，徹底消除 Sanitize failure 錯誤！
                sanitize: (uri: string) => {
                    return { href: uri };
                },
                // 2. 覆寫非同步載入器：在載入數據時進行擴截
                load: async (uri: string) => {
                    if (uri.startsWith('data-local://')) {
                        const fileName = uri.replace('data-local://', '');
                        const blob = await getDataFileByName(fileName);
                        if (blob) {
                            // 直接以純文字（JSON/CSV 字串）形式傳回，Vega 會自動接手解析！
                            return await blob.text();
                        }
                        throw new Error(`本地數據庫中找不到檔案：${fileName}`);
                    }

                    // 對於一般網路的 http/https 請求，使用標準 fetch 加載
                    const response = await fetch(uri);
                    if (!response.ok) {
                        throw new Error(`無法載入網路資源 ${uri}: ${response.statusText}`);
                    }
                    return await response.text();
                }
            } as any
        });

        // 返回清理函數：當圖表卸載或代碼更新時，呼叫 view.finalize() 釋放 Vega View 實例，
        // 防止 Canvas/SVG 事件監聽與內部計時器持續佔用記憶體（修復 Memory Leak）
        return () => {
            try {
                result?.view?.finalize();
            } catch (e) {
                // view 已被清除時靜默忽略
            }
        };
    }, [getDataFileByName]);

    return (
        <DiagramBlock
            type="vega"
            code={code}
            isDarkMode={isDarkMode}
            isPrinting={isPrinting}
            printSessionId={printSessionId}
            render={render}
            errorTitle="Vega Render Error"
        />
    );
});


const SmilesBlock: React.FC<{ code: string; isDarkMode: boolean; isPrinting?: boolean; printSessionId?: number }> = React.memo(({ code, isDarkMode, isPrinting, printSessionId = 0 }) => {
    const render = useCallback(async (container: HTMLDivElement, renderCode: string, isDark: boolean) => {
        // Dynamically import SmilesDrawer
        const SmilesModule = await import('smiles-drawer');
        const SmilesDrawer = SmilesModule.default || SmilesModule;

        const drawer = new SmilesDrawer.SvgDrawer({
            width: 200,
            height: 100,
            padding: 20,
            bondThickness: 1.2,
            bondLength: 15,
            shortBondLength: 0.85,
            bondSpacing: 4,
            compactDrawing: true,
            fontFamily: 'Inter, Arial, sans-serif',
            terminalCarbons: false,
            explicitHydrogens: false,
        });

        return new Promise<void>((resolve, reject) => {
            SmilesDrawer.parse(
                renderCode.trim(),
                (tree: any) => {
                    container.innerHTML = '';
                    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svgEl.setAttribute('width', '100%');
                    svgEl.setAttribute('height', 'auto');
                    svgEl.setAttribute('viewBox', '0 0 200 100');
                    svgEl.style.maxHeight = '100%';
                    container.appendChild(svgEl);
                    drawer.draw(tree, svgEl, isDark ? 'dark' : 'light');
                    resolve();
                },
                (err: any) => {
                    reject(new Error(typeof err === 'string' ? err : (err?.message || 'SMILES 解析失敗')));
                }
            );
        });
    }, []);

    return (
        <DiagramBlock
            type="smiles"
            code={code}
            isDarkMode={isDarkMode}
            isPrinting={isPrinting}
            printSessionId={printSessionId}
            render={render}
            errorTitle="⚗️ SMILES 語法錯誤"
            containerClassName="min-h-[200px]"
        />
    );
});


const AbcBlock = React.lazy(() => import('./AbcBlock'));

// ─── 懶載入程式碼區塊（react-syntax-highlighter 只在有程式碼區塊時才下載）────────────────
// 這是告知 Lighthouse「此為合法懶載入」的關鍵：
// React.lazy() + 動態 import() → Vite 建立真正的 async chunk
// Lighthouse 不再將其標記為「Reduce unused JavaScript」
const LazyEnhancedCodeBlock = React.lazy(() => import('./EnhancedCodeBlock'));

// ─── 懶載入 MathJax 渲染器（better-react-mathjax + mathjax-full 只在有數學公式時才下載）
// 與 LazyMathJaxProvider（在 App.tsx）共享同一個 vendor-mathjax async chunk
const LazyMathRenderer = React.lazy(() => import('./MemoizedMathJaxRenderer'));

const LazyAlertIcon = React.lazy(() => import('./AlertIcon'));

// ─── GitHub-style Alert 標註解析輔助 ──────────────────────────────────────────
const alertConfig: Record<string, { label: string; className: string }> = {
    // Note / Info (藍色)
    note: { label: 'Note', className: 'markdown-alert-note' },
    info: { label: 'Info', className: 'markdown-alert-note' },

    // Tip / Success (綠色)
    tip: { label: 'Tip', className: 'markdown-alert-tip' },
    success: { label: 'Success', className: 'markdown-alert-tip' },
    check: { label: 'Check', className: 'markdown-alert-tip' },
    quickstart: { label: 'Quick Start', className: 'markdown-alert-tip' },
    start: { label: 'Start', className: 'markdown-alert-tip' },

    // Warning / Caution (黃色 / 紅色)
    warning: { label: 'Warning', className: 'markdown-alert-warning' },
    attention: { label: 'Attention', className: 'markdown-alert-warning' },
    caution: { label: 'Caution', className: 'markdown-alert-caution' },
    ban: { label: 'Ban', className: 'markdown-alert-caution' },
    danger: { label: 'Danger', className: 'markdown-alert-caution' },
    error: { label: 'Error', className: 'markdown-alert-caution' },
    bug: { label: 'Bug', className: 'markdown-alert-caution' },
    failure: { label: 'Failure', className: 'markdown-alert-caution' },

    // Important / Question (紫色)
    important: { label: 'Important', className: 'markdown-alert-important' },
    question: { label: 'Question', className: 'markdown-alert-important' },
    help: { label: 'Help', className: 'markdown-alert-important' },
    faq: { label: 'FAQ', className: 'markdown-alert-important' }
};





// ─── 本地圖片元件：非同步從 IndexedDB 讀取 Data URL 並顯示 (按需載入) ──────────────────────
interface LocalImageProps {
    id: string;
    alt?: string;
    className?: string;
}

// 建立一個輕量的記憶體快取，避免每次 markdown re-render 時都產生非同步讀取的落差(bounce)
const memoryImageCache = new Map<string, string>();

const LocalImage: React.FC<LocalImageProps & { getImage: (id: string) => Promise<string | null> }> = React.memo(({ id, alt, className, getImage }) => {
    const cached = memoryImageCache.get(id);
    const [src, setSrc] = useState<string | null>(cached || null);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(cached ? 'loaded' : 'loading');

    useEffect(() => {
        if (cached) {
            window.dispatchEvent(new CustomEvent('content-layout-ready'));
            return;
        }

        let cancelled = false;
        setStatus('loading');
        getImage(id).then(dataUrl => {
            if (cancelled) return;
            if (dataUrl) {
                memoryImageCache.set(id, dataUrl);
                setSrc(dataUrl);
                setStatus('loaded');
            } else {
                setStatus('error');
            }
            // 通知佈局已就緒
            window.dispatchEvent(new CustomEvent('content-layout-ready'));
        }).catch(() => {
            if (!cancelled) {
                setStatus('error');
                window.dispatchEvent(new CustomEvent('content-layout-ready'));
            }
        });
        return () => { cancelled = true; };
    }, [id, getImage]);

    if (status === 'loading') {
        return (
            <div className={`flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/50  w-full min-h-[150px] ${className || ''}`}>
                <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                    <span className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin inline-block" />
                    載入圖片中…
                </span>
            </div>
        );
    }

    if (status === 'error' || !src) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-500 text-xs">
                ⚠️ 圖片不存在或已到期: {alt || id}
            </span>
        );
    }

    return <img src={src ?? undefined} alt={alt ?? ''} className={className ?? 'rounded-xl max-w-full h-auto'} />;

});

// 將 base64 dataURL 轉換成 Blob 物件，提供高相容性流式播放
const dataURLtoBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

// ─── 本地影片元件：非同步從 IndexedDB 讀取 Data URL 並播放 (按需載入) ──────────────────────
interface LocalMediaProps {
    id: string;
    className?: string;
    controls?: boolean;
}

const memoryMediaCache = new Map<string, string>();

const LocalVideo: React.FC<LocalMediaProps & { getImage: (id: string) => Promise<string | null> }> = React.memo(({ id, className, controls = true, getImage }) => {
    const cached = memoryMediaCache.get(id);
    const [src, setSrc] = useState<string | null>(cached || null);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(cached ? 'loaded' : 'loading');

    useEffect(() => {
        if (cached) {
            window.dispatchEvent(new CustomEvent('content-layout-ready'));
            return;
        }

        let cancelled = false;
        let objectUrl: string | null = null;
        setStatus('loading');

        getImage(id).then(dataUrl => {
            if (cancelled) return;
            if (dataUrl) {
                try {
                    const blob = dataURLtoBlob(dataUrl);
                    objectUrl = URL.createObjectURL(blob);

                    memoryMediaCache.set(id, objectUrl);
                    setSrc(objectUrl);
                    setStatus('loaded');
                } catch (e) {
                    console.error('Failed to convert base64 video to blob url:', e);
                    setStatus('error');
                }
            } else {
                setStatus('error');
            }
            window.dispatchEvent(new CustomEvent('content-layout-ready'));
        }).catch(() => {
            if (!cancelled) {
                setStatus('error');
                window.dispatchEvent(new CustomEvent('content-layout-ready'));
            }
        });

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                memoryMediaCache.delete(id);
            }
        };
    }, [id, getImage, cached]);

    if (status === 'loading') {
        return (
            <div className={`flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/50 w-full min-h-[150px] ${className || ''}`}>
                <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
                    <span className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin inline-block" />
                    載入影片中…
                </span>
            </div>
        );
    }

    if (status === 'error' || !src) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-500 text-xs">
                ⚠️ 影片不存在或已到期: {id}
            </span>
        );
    }

    return (
        <video src={src} controls={controls} className={className ?? 'w-full max-h-[500px] block'} />
    );
});

// ─── 本地音訊元件：非同步從 IndexedDB 讀取 Data URL 並播放 (按需載入) ──────────────────────
const LocalAudio: React.FC<LocalMediaProps & { getImage: (id: string) => Promise<string | null> }> = React.memo(({ id, className, controls = true, getImage }) => {
    const cached = memoryMediaCache.get(id);
    const [src, setSrc] = useState<string | null>(cached || null);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(cached ? 'loaded' : 'loading');

    useEffect(() => {
        if (cached) return;

        let cancelled = false;
        let objectUrl: string | null = null;
        setStatus('loading');

        getImage(id).then(dataUrl => {
            if (cancelled) return;
            if (dataUrl) {
                try {
                    const blob = dataURLtoBlob(dataUrl);
                    objectUrl = URL.createObjectURL(blob);

                    memoryMediaCache.set(id, objectUrl);
                    setSrc(objectUrl);
                    setStatus('loaded');
                } catch (e) {
                    console.error('Failed to convert base64 audio to blob url:', e);
                    setStatus('error');
                }
            } else {
                setStatus('error');
            }
        }).catch(() => {
            if (!cancelled) {
                setStatus('error');
            }
        });

        return () => {
            cancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                memoryMediaCache.delete(id);
            }
        };
    }, [id, getImage, cached]);

    if (status === 'loading') {
        return (
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs py-2 pl-4">
                <span className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin inline-block" />
                載入音訊中…
            </div>
        );
    }

    if (status === 'error' || !src) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-500 text-xs">
                ⚠️ 音訊不存在或已到期: {id}
            </span>
        );
    }

    return (
        <audio src={src} controls={controls} className={className ?? 'w-full max-w-2xl'} />
    );
});

// ─── 可縮放圖片元件：整合 ResizableWrapper ───────────────────────────────────────────
interface ResizableImageProps {
    src: string;
    alt?: string;
    line?: number;
    currentDocId?: string | null;
    getImage: (id: string) => Promise<string | null>;
    isDarkMode: boolean;
    isActuallyPrinting?: boolean;
}

const ResizableImage: React.FC<ResizableImageProps> = ({ src, alt, line, currentDocId, getImage, isDarkMode, isActuallyPrinting }) => {
    // ─── 狀態持久化：加上 currentDocId 和 line 避免同圖打架 ──────────────────────────────
    const storageKey = useMemo(() => {
        const docPrefix = currentDocId ? `doc:${currentDocId}` : 'global';
        const lineSuffix = line !== undefined ? `:line:${line}` : '';
        return `chart-size-img:${docPrefix}${lineSuffix}:${src}`;
    }, [src, line, currentDocId]);
    const { width, align, updateWidth, updateAlign, reset } = usePersistentCanvasSettings(storageKey);

    const containerRef = useRef<HTMLDivElement>(null);

    const isLocal = src?.startsWith('img-local://');
    const imgId = isLocal ? src.replace('img-local://', '') : '';

    if (isActuallyPrinting) {
        return (
            <div
                className={`chart-wrapper align-${align} print:!my-0 flex w-full`}
                style={{
                    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
                }}
            >
                <div
                    className="chart-content"
                    style={{ width }}
                >
                    {isLocal ? (
                        <LocalImage id={imgId} alt={alt} getImage={getImage} className="max-w-full h-auto block" />
                    ) : (
                        <img src={src} alt={alt} className="max-w-full h-auto block" />
                    )}
                </div>
            </div>
        );
    }

    return (
        <ResizableWrapper
            width={width}
            align={align}
            onWidthChange={updateWidth}
            onAlignChange={updateAlign}
            onReset={reset}
            isDarkMode={isDarkMode}
        >
            <div
                ref={containerRef}
                className={`relative rounded-xl overflow-hidden flex w-full justify-${align === 'left' ? 'start' : align === 'right' ? 'end' : 'center'}`}
            >
                {isLocal ? (
                    <LocalImage id={imgId} alt={alt} getImage={getImage} />
                ) : (
                    <img src={src} alt={alt} className="rounded-xl max-w-full h-auto block" />
                )}
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 dark:text-slate-600 font-mono select-none pointer-events-none opacity-0 group-hover/resizable:opacity-100 transition-opacity z-10">
                {isLocal ? 'LOCAL IMAGE' : 'IMAGE'}
            </div>
        </ResizableWrapper>
    );
};

// ─── WikiLink 元件（模組層級，確保 React.memo 真正生效）──────────────────────────────
interface WikiLinkProps {
    name: string;
    children: React.ReactNode;
    documents: any[];
    currentDocId?: string | null;
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    isActuallyPrinting?: boolean;
    isMergedPrint?: boolean;
}

const WikiLink: React.FC<WikiLinkProps> = React.memo(({ name, children, documents, currentDocId, onSelectDocument, onCreateMissing, isActuallyPrinting, isMergedPrint }) => {
    const decodedName = decodeURIComponent(name);

    // 如果正在列印/匯出，且並非合併列印，則轉化為純文字（單檔 PDF 無目標頁面可跳轉）
    if (isActuallyPrinting && !isMergedPrint) {
        return <span>{children}</span>;
    }

    const currentDoc = documents.find((d: any) => d.id === currentDocId);
    const isInVault = !!currentDoc?.folderId;
    if (!isInVault) return <span>[[{children}]]</span>;

    const targetDoc = documents.find((doc: any) => doc.name === decodedName && doc.folderId === currentDoc.folderId);
    const exists = !!targetDoc;

    return (
        <a
            href={`#wikilink-${encodeURIComponent(decodedName)}`}
            onClick={(e) => {
                // 如果在目前的「列印預覽模式」或「PDF」中，不攔截預設跳轉（讓它實現頁面內移動）
                // 但為了瀏覽器內的使用者體驗，如果是正常模式，依然執行切換文件
                if (window.location.hash.includes('wikilink-') || document.querySelector('.show-print-preview')) {
                    // 讓瀏覽器自然跳轉
                } else {
                    e.preventDefault();
                    if (exists && onSelectDocument && targetDoc) {
                        onSelectDocument(targetDoc.id);
                    } else if (!exists && onCreateMissing) {
                        onCreateMissing(name);
                    }
                }
            }}
            className={`px-1 py-0.5 rounded-md transition-all duration-200 ${exists ? 'text-brand-primary bg-brand-secondary/50 dark:bg-brand-primary/20 hover:bg-brand-secondary dark:hover:bg-brand-primary/40 border-b border-brand-primary/30 dark:border-brand-primary/70' : 'text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/20 hover:bg-slate-200 dark:hover:bg-slate-800 border-b border-dashed border-slate-300 dark:border-slate-700 italic cursor-help'}`}
            title={exists ? `跳轉至: ${name}` : `文件不存在: ${name} (在目前資料夾中)`}
        >
            {children}
        </a>
    );
});

// ─── MemoizedMathJax 已移至 MemoizedMathJaxRenderer.tsx ─────────────────────────────────
// 透過 React.lazy() 懶載入，better-react-mathjax 只在文件包含數學公式時才下載。
// 詳見上方 LazyMathRenderer 的宣告。

// ─── EnhancedCodeBlock 已移至 EnhancedCodeBlock.tsx ─────────────────────────────────────────────
// 透過 React.lazy() 懶載入，react-syntax-highlighter 只在文件包含程式碼區塊時才下載。
// 詳見上方 LazyEnhancedCodeBlock 的宣告。

// ─── 區塊判斷上下文：用於解決 react-markdown v10 移除 inline prop 後的辨識問題 ───────
const IsInPreContext = React.createContext(false);
// 用於追蹤是否已經處於某個已包裹評論的 Block 容器中，避免巢狀結構（如 blockquote > p）重複渲染標註按鈕
const IsInBlockContext = React.createContext(false);

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
    content,
    isDarkMode,
    documents = [],
    onSelectDocument,
    onCreateMissing,
    currentDocId,
    isPrinting,
    printSessionId = 0,
    isMergedPrint,
    previewTheme,
    isCommentMode = false,
    setIsCommentMode,
    onUpdateLineComment,
    activeScale = 1,
}) => {
    const isActuallyPrinting = !!isPrinting;
    const shouldShowDark = isDarkMode && !isActuallyPrinting;
    const { getImage } = useImageStorage();

    // ─── 外部媒體隱私安全與授權狀態 ──────────────────────────────────────────────
    const [temporarilyAllowedUrls, setTemporarilyAllowedUrls] = useState<Set<string>>(new Set());
    const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
    const [allowAllExternal, setAllowAllExternal] = useState<boolean>(false);

    const syncExternalMediaSettings = useCallback(() => {
        try {
            const allowAll = localStorage.getItem('markdown-previewer:allow-all-external-media') === 'true';
            const trustedStr = localStorage.getItem('markdown-previewer:trusted-domains');
            const trusted = trustedStr ? JSON.parse(trustedStr) : [];
            setAllowAllExternal(allowAll);
            setTrustedDomains(Array.isArray(trusted) ? trusted : []);
        } catch (e) {
            console.error('Failed to sync external media settings:', e);
        }
    }, []);

    useEffect(() => {
        syncExternalMediaSettings();

        // 監聽外部媒體偏好設定變更的自訂事件
        window.addEventListener('external-media-settings-changed', syncExternalMediaSettings);
        return () => {
            window.removeEventListener('external-media-settings-changed', syncExternalMediaSettings);
        };
    }, [syncExternalMediaSettings]);

    const handleAllowOnce = useCallback((url: string) => {
        setTemporarilyAllowedUrls(prev => {
            const next = new Set(prev);
            next.add(url);
            return next;
        });
    }, []);

    const handleTrustDomain = useCallback((domain: string) => {
        try {
            const trustedStr = localStorage.getItem('markdown-previewer:trusted-domains');
            const currentTrusted = trustedStr ? JSON.parse(trustedStr) : [];
            const nextTrusted = Array.isArray(currentTrusted) ? [...currentTrusted] : [];

            if (!nextTrusted.includes(domain)) {
                nextTrusted.push(domain);
                localStorage.setItem('markdown-previewer:trusted-domains', JSON.stringify(nextTrusted));
                setTrustedDomains(nextTrusted);
                // 通知系統設定與其他預覽實例已更新
                window.dispatchEvent(new CustomEvent('external-media-settings-changed'));
            }
        } catch (e) {
            console.error('Failed to trust domain:', e);
        }
    }, []);

    const shouldBlock = useCallback((url: string) => {
        if (!url) return false;
        if (allowAllExternal) return false;
        if (url.startsWith('img-local://') || url.startsWith('data-local://') || url.startsWith('data:')) return false;
        if (temporarilyAllowedUrls.has(url)) return false;

        const domain = extractDomain(url);
        const isTrusted = trustedDomains.some(d => {
            const trustedLower = d.toLowerCase();
            return domain === trustedLower || domain.endsWith('.' + trustedLower);
        });

        return !isTrusted;
    }, [allowAllExternal, temporarilyAllowedUrls, trustedDomains]);

    const currentDoc = useMemo(() => documents.find(d => d.id === currentDocId), [documents, currentDocId]);
    // 穩定化 lineComments 參照：避免空物件 {} 每次 render 都是新參照，
    // 導致 wrapWithComment 的 useCallback 失效並觸發 components 重建
    const lineComments = useMemo(
        () => currentDoc?.lineComments ?? {},
        [currentDoc?.lineComments]
    );

    // 註解相關 state 已搬移至 LineCommentItem 組件內部自治管理

    const renderContextRef = useRef<any>(null);

    // ─── wrapWithComment：在 block 元素旁插入行內評論組件與 hover 提示 ────────────
    const wrapWithComment = useCallback((node: any, children: React.ReactNode, className: string = '') => {
        const line = node?.position?.start?.line;
        const hasComment = !!lineComments[line];

        return (
            <IsInBlockContext.Consumer>
                {(isInBlock) => {
                    // 如果已經在外層 Block 內部了，或者沒有行號，就直接渲染 children，不再重複包裹評論與 Hover 按鈕
                    if (isInBlock || !line) {
                        return <>{children}</>;
                    }

                    return (
                        <IsInBlockContext.Provider value={true}>
                            <div className={`relative group/line ${className}`} data-line={line}>
                                {children}

                                {/* ─── Hover 提示 Badge（非評論模式 & 有評論時顯示） ──── */}
                                {!isCommentMode && hasComment && (
                                    <div
                                        aria-label={`第 ${line} 行有評論`}
                                        className="
                                            absolute left-full ml-2 top-1/2 -translate-y-1/2
                                            opacity-0 group-hover/line:opacity-100
                                            pointer-events-none
                                            transition-opacity duration-150
                                            flex items-center gap-1
                                            px-1.5 py-0.5 rounded-full
                                            bg-brand-primary/15 dark:bg-brand-primary/25
                                            border border-brand-primary/30 dark:border-brand-primary/50
                                            text-brand-primary text-[9px] font-bold
                                            select-none z-10 print:hidden
                                        "
                                    >
                                        <span>💬</span>
                                        <span>#{line}</span>
                                    </div>
                                )}

                                {/* ─── 評論操作組件（評論模式 or 有評論時掛載） ─────────── */}
                                <LineCommentItem
                                    line={line}
                                    comment={lineComments[line]}
                                    isCommentMode={isCommentMode}
                                    currentDocId={currentDocId ?? null}
                                    onUpdateLineComment={onUpdateLineComment}
                                />
                            </div>
                        </IsInBlockContext.Provider>
                    );
                }}
            </IsInBlockContext.Consumer>
        );
    }, [lineComments, isCommentMode, currentDocId, onUpdateLineComment]);

    // 🛠️ 同步更新渲染上下文 (Ref)，確保 ReactMarkdown 中的 Memoized 子組件能讀取到最新狀態，
    // 同時避免因為 components 物件 identity 改變而觸發整個 Markdown 樹重掛。
    // 解決列印後輔助工具「狀態回退延遲」的關鍵在於不等待 useEffect，而是直接在渲染階段階段同步最新值。
    renderContextRef.current = {
        documents,
        currentDocId,
        onSelectDocument,
        onCreateMissing,
        shouldShowDark,
        isActuallyPrinting,
        isDarkMode,
        isPrinting,
        printSessionId,
        isMergedPrint,
        previewTheme,
        getImage
    };

    // ─── URI 轉換：允許自定義協定通過 react-markdown 的過濾 ───────────────────────────
    const urlTransform = useCallback((uri: string) => {
        // 放行我們的本地圖片協定
        if (uri.startsWith('img-local://')) return uri;

        // 其他常見的安全協定
        const protocols = ['http', 'https', 'mailto', 'tel', '#'];
        for (const protocol of protocols) {
            if (uri.toLowerCase().startsWith(protocol)) return uri;
        }

        // 相對路徑也放行
        if (uri.startsWith('/') || uri.startsWith('./') || uri.startsWith('../')) return uri;

        return `about:blank`; // 過濾掉潛在不安全的連結
    }, []);


    const remarkRehypeOptions = useMemo(() => ({
        handlers: {
            math: (h: any, node: any) => ({
                type: 'element' as const,
                tagName: 'div',
                properties: { className: ['math-display'] },
                children: [{ type: 'text' as const, value: node.value }]
            }),
            inlineMath: (h: any, node: any) => ({
                type: 'element' as const,
                tagName: 'span',
                properties: { className: ['math-inline'] },
                children: [{ type: 'text' as const, value: node.value }]
            })
        }
    }), []);

    const components = useMemo(() => ({
        pre: ({ children }: any) => <IsInPreContext.Provider value={true}>{children}</IsInPreContext.Provider>,
        code({ node, className, children, ...props }: any) {
            const isBlock = React.useContext(IsInPreContext);
            const ctx = renderContextRef.current;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const stableKey = hashString(codeString);
            const line = node?.position?.start?.line;

            if (isBlock) {
                if (language === 'mermaid') {
                    return wrapWithComment(
                        node,
                        <div key={`${stableKey}-${ctx.previewTheme}-${ctx.shouldShowDark}`} className="not-prose">
                            <MermaidBlock
                                code={codeString}
                                isDarkMode={ctx.shouldShowDark}
                                isPrinting={ctx.isPrinting}
                                previewTheme={ctx.previewTheme}
                            />
                        </div>
                    );
                }
                if (language === 'vega' || language === 'vega-lite') return wrapWithComment(node, <div key={stableKey} className="not-prose"><VegaBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'smiles') return wrapWithComment(node, <div key={stableKey} className="not-prose"><SmilesBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'abc') return wrapWithComment(node, <React.Suspense key={stableKey} fallback={<div className="p-4 flex justify-center items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">樂譜加載中...</div>}><div className="not-prose"><AbcBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div></React.Suspense>);

                return wrapWithComment(node, (
                    <div key={stableKey} className="code-block-wrapper not-prose">
                        <LazyEnhancedCodeBlock
                            language={language}
                            codeString={codeString}
                            stableKey={stableKey}
                            isActuallyPrinting={ctx.isActuallyPrinting}
                            shouldShowDark={ctx.shouldShowDark}
                        />
                    </div>
                ));
            }
            return <code className={`${className || ''} inline-code`} {...props} data-line={line}>{children}</code>;
        },
        // ─── 注入 Line Number 以實現精準同步捲動 ───────────────────────────────────
        p: ({ node, ...props }: any) => wrapWithComment(node, <div className="mb-4 last:mb-0" {...props} />),
        h1: ({ node, ...props }: any) => wrapWithComment(node, <h1 {...props} />),
        h2: ({ node, ...props }: any) => wrapWithComment(node, <h2 {...props} />),
        h3: ({ node, ...props }: any) => wrapWithComment(node, <h3 {...props} />),
        h4: ({ node, ...props }: any) => wrapWithComment(node, <h4 {...props} />),
        h5: ({ node, ...props }: any) => wrapWithComment(node, <h5 {...props} />),
        h6: ({ node, ...props }: any) => wrapWithComment(node, <h6 {...props} />),
        ul: ({ node, ...props }: any) => <ul {...props} />,
        ol: ({ node, ...props }: any) => <ol {...props} />,
        li: ({ node, ...props }: any) => wrapWithComment(node, <li {...props} />),
        blockquote: ({ node, children, ...props }: any) => {
            const line = node?.position?.start?.line;
            // 優先由 HTML 屬性 data-alert-type 或 dataAlertType 讀取以確保在 Rehype AST 中不丟失，最後 fallback 到 node.data.alertType
            const alertType = props.dataAlertType || props['data-alert-type'] || node?.data?.alertType;
            // 優先由 HTML 屬性 data-alert-title 或 dataAlertTitle 讀取以確保在 Rehype AST 中不丟失，最後 fallback 到 node.data.alertTitle
            const alertTitle = props.dataAlertTitle || props['data-alert-title'] || node?.data?.alertTitle;

            if (alertType) {
                const config = alertConfig[alertType] || alertConfig.note;
                const titleToDisplay = alertTitle || config.label;
                
                // 過濾掉不該直接傳遞到 blockquote DOM 上的自訂屬性，防止 React 在 Console 報 Custom Property Warning
                const { dataAlertType, dataAlertTitle, ...domProps } = props;


                return wrapWithComment(node, (
                    <blockquote
                        {...domProps}
                        className={`markdown-alert ${config.className}`}
                        data-line={line}
                    >
                        <div className="markdown-alert-title">
                            <React.Suspense fallback={<div className="w-3.5 h-3.5 mr-1.5 inline-block animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />}>
                                <LazyAlertIcon type={alertType} />
                            </React.Suspense>

                            <strong>{titleToDisplay}</strong>
                        </div>
                        <div className="markdown-alert-content">
                            {children}
                        </div>
                    </blockquote>
                ));
            }

            return wrapWithComment(node, <blockquote {...props}>{children}</blockquote>);
        },
        table: ({ node, ...props }: any) => wrapWithComment(node, <table {...props} />),
        // ─────────────────────────────────────────────────────────────────────────
        div: ({ node, className, children, ...props }: any) => {
            if (className?.includes('math-display')) {
                const ctx = renderContextRef.current;
                const mathContent = String(children);
                const stableKey = hashString(mathContent);
                return (
                    <div key={stableKey} className="my-4 overflow-x-auto" style={{ whiteSpace: 'nowrap' }} data-line={node?.position?.start?.line}>
                        <Suspense fallback={<span className="opacity-50 font-mono text-sm">{mathContent}</span>}>
                            <LazyMathRenderer content={mathContent} isDarkMode={ctx.shouldShowDark} />
                        </Suspense>
                    </div>
                );
            }
            return <div className={className} {...props} data-line={node?.position?.start?.line}>{children}</div>;
        },
        span: ({ node, className, children, ...props }: any) => {
            if (className?.includes('math-inline')) {
                const ctx = renderContextRef.current;
                const mathContent = String(children);
                const stableKey = hashString(mathContent);
                return (
                    <span key={stableKey} className="math-inline" style={{ whiteSpace: 'nowrap' }} data-line={node?.position?.start?.line}>
                        <Suspense fallback={<span className="opacity-50 font-mono text-sm">{mathContent}</span>}>
                            <LazyMathRenderer content={mathContent} inline isDarkMode={ctx.shouldShowDark} />
                        </Suspense>
                    </span>
                );
            }
            return <span className={className} {...props} data-line={node?.position?.start?.line}>{children}</span>;
        },
        a: ({ node, href, children, ...props }: any) => {
            if (href?.startsWith('#wikilink-')) {
                const ctx = renderContextRef.current;
                const name = decodeURIComponent(href.replace('#wikilink-', ''));
                return (
                    <WikiLink
                        name={name}
                        documents={ctx.documents}
                        currentDocId={ctx.currentDocId}
                        onSelectDocument={ctx.onSelectDocument}
                        onCreateMissing={ctx.onCreateMissing}
                        isActuallyPrinting={ctx.isActuallyPrinting}
                        isMergedPrint={ctx.isMergedPrint}
                    >
                        {children}
                    </WikiLink>
                );
            }
            return <a href={href} {...props} target="_blank" rel="noopener noreferrer" data-line={node?.position?.start?.line}>{children}</a>;
        },
        // ─── 圖片解析：支援本地與遠端，並提供縮放工具 ──────────────────────────────────────────
        img: ({ node, src, alt, ...props }: any) => {
            if (!src) return null;
            const ctx = renderContextRef.current;
            const line = node?.position?.start?.line;
            return (
                <ResizableImage
                    key={`${src}-${line}`}
                    src={src}
                    alt={alt}
                    line={line}
                    currentDocId={ctx.currentDocId}
                    getImage={ctx.getImage}
                    isDarkMode={ctx.shouldShowDark}
                    isActuallyPrinting={ctx.isActuallyPrinting}
                />
            );
        },
        // ─── 外部媒體解析：支援隱私遮罩、沙箱隔離與延遲載入 ────────────────────────────────────
        iframe: ({ node, src, ...props }: any) => {
            if (!src) return null;

            // 🛡️ 安全過濾：僅放行安全加密的 HTTPS 來源
            if (!src.toLowerCase().startsWith('https://')) {
                return (
                    <div className="my-4 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-mono" data-line={node?.position?.start?.line}>
                        <span className="shrink-0 text-base">⚠️</span>
                        <span>安全性警告：基於安全性考量，外部嵌入僅支援安全加密的 https:// 來源。已封鎖此內容：{src}</span>
                    </div>
                );
            }

            const blocked = shouldBlock(src);

            if (blocked) {
                return (
                    <div className="my-6 w-full" data-line={node?.position?.start?.line}>
                        <ExternalMediaShield
                            url={src}
                            onLoadOnce={() => handleAllowOnce(src)}
                            onTrustDomain={handleTrustDomain}
                        />
                    </div>
                );
            }

            return (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6 shadow-md bg-slate-50 dark:bg-slate-900/50 group/iframe transition-all duration-300 hover:shadow-lg" data-line={node?.position?.start?.line}>
                    <iframe
                        src={src}
                        className="absolute inset-0 w-full h-full"
                        frameBorder="0"
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        {...props}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-sm text-[9px] text-slate-300 font-mono tracking-wider opacity-0 group-hover/iframe:opacity-100 transition-opacity duration-300 pointer-events-none select-none">
                        SECURE HTTPS EMBED
                    </div>
                </div>
            );
        },
        video: ({ node, src, ...props }: any) => {
            if (!src) return null;
            const ctx = renderContextRef.current;

            const isLocal = src.startsWith('img-local://');
            if (isLocal) {
                const id = src.replace('img-local://', '');
                if (ctx.isActuallyPrinting) {
                    return <LocalVideo id={id} getImage={ctx.getImage} className="max-w-full h-auto block" />;
                }
                return (
                    <div className="my-6 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md" data-line={node?.position?.start?.line}>
                        <LocalVideo id={id} getImage={ctx.getImage} />
                    </div>
                );
            }

            if (!src.toLowerCase().startsWith('https://')) {
                return (
                    <div className="my-4 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-mono" data-line={node?.position?.start?.line}>
                        <span className="shrink-0 text-base">⚠️</span>
                        <span>安全性警告：基於安全性考量，外部影片僅支援安全加密的 https:// 來源。已封鎖此內容：{src}</span>
                    </div>
                );
            }

            const blocked = shouldBlock(src);

            if (blocked) {
                return (
                    <div className="my-6 w-full" data-line={node?.position?.start?.line}>
                        <ExternalMediaShield
                            url={src}
                            onLoadOnce={() => handleAllowOnce(src)}
                            onTrustDomain={handleTrustDomain}
                        />
                    </div>
                );
            }

            if (ctx.isActuallyPrinting) {
                return (
                    <video
                        src={src}
                        controls
                        preload="metadata"
                        className="max-w-full h-auto block"
                        {...props}
                    />
                );
            }

            return (
                <div className="my-6 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md" data-line={node?.position?.start?.line}>
                    <video
                        src={src}
                        controls
                        preload="metadata"
                        className="w-full max-h-[500px] block"
                        {...props}
                    >
                        您的瀏覽器不支援播放此外部 HTTPS 影片。
                    </video>
                </div>
            );
        },
        audio: ({ node, src, ...props }: any) => {
            if (!src) return null;
            const ctx = renderContextRef.current;

            const isLocal = src.startsWith('img-local://');
            if (isLocal) {
                const id = src.replace('img-local://', '');
                return (
                    <div className="my-4 w-full flex justify-center py-2" data-line={node?.position?.start?.line}>
                        <LocalAudio id={id} getImage={ctx.getImage} />
                    </div>
                );
            }

            if (!src.toLowerCase().startsWith('https://')) {
                return (
                    <div className="my-4 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-mono" data-line={node?.position?.start?.line}>
                        <span className="shrink-0 text-base">⚠️</span>
                        <span>安全性警告：基於安全性考量，外部音訊僅支援安全加密的 https:// 來源。已封鎖此內容：{src}</span>
                    </div>
                );
            }

            const blocked = shouldBlock(src);

            if (blocked) {
                return (
                    <div className="my-6 w-full" data-line={node?.position?.start?.line}>
                        <ExternalMediaShield
                            url={src}
                            onLoadOnce={() => handleAllowOnce(src)}
                            onTrustDomain={handleTrustDomain}
                        />
                    </div>
                );
            }

            return (
                <div className="my-4 w-full flex justify-center py-2" data-line={node?.position?.start?.line}>
                    <audio
                        src={src}
                        controls
                        preload="metadata"
                        className="w-full max-w-2xl"
                        {...props}
                    >
                        您的瀏覽器不支援播放此外部 HTTPS 音訊。
                    </audio>
                </div>
            );
        },
    }), [wrapWithComment, urlTransform, shouldBlock, handleAllowOnce, handleTrustDomain]);

    // 監聽圖片載入完成，若有必要可觸發同步刷新
    useEffect(() => {
        const container = document.querySelector('.prose');
        if (!container) return;

        const handleImageLoad = () => {
            window.dispatchEvent(new CustomEvent('preview-content-height-change'));
        };

        container.addEventListener('load', handleImageLoad, true);
        return () => container.removeEventListener('load', handleImageLoad, true);
    }, [content]);

    // ─── 3-A 前置：ReactMarkdown 渲染完成通知 ────────────────────────────────
    // 當 content 更新並完成渲染後（useEffect 在 commit 階段後執行），
    // 派發 markdown-render-complete 事件通知 App.tsx 重建 lineMap，
    // 取代原本靠「猜測」的 setTimeout(rebuildLineMap, 500)，實現精準觸發。
    useEffect(() => {
        if (isActuallyPrinting) return; // 列印模式不需要 ScrollSync 校準
        // requestAnimationFrame 確保瀏覽器已完成一次 paint 後才通知（DOM 量測正確）
        const rafId = requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent('markdown-render-complete'));
        });
        return () => cancelAnimationFrame(rafId);
    }, [content, isActuallyPrinting]);

    // ─── 3-B：整合 markdownScanner 取代重複裸露正則 ─────────────────────────────
    // 使用統一的 detectMarkdownFeatures 函數掃描特徵，
    // 相比裸露正則，支援縮排容忍 / 更完整的語法偵測，且邏輯集中維護。
    useEffect(() => {
        if (!content || isActuallyPrinting) return;

        const schedulePreload = (fn: () => void) => {
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(fn, { timeout: 2000 });
            } else {
                setTimeout(fn, 200);
            }
        };

        // 使用 markdownScanner 統一偵測，避免重複維護多份正則
        const features = detectMarkdownFeatures(content);

        schedulePreload(() => {
            if (features.hasMermaid) import('mermaid').catch(() => { });
            if (features.hasVega) import('vega-embed').catch(() => { });
            if (features.hasAbc) import('./AbcBlock').catch(() => { });
        });
    }, [content, isActuallyPrinting]);

    return (
        // CommentProvider 確保整個 Markdown 樹內所有 LineCommentItem 共享同一個 editingLine
        <CommentProvider>
            <div className={`relative w-full h-full min-h-[500px] print:h-auto print:min-h-0`}>
                <div className={`prose max-w-none px-8 pb-4  ${previewTheme && previewTheme !== 'default' ? `theme-${previewTheme}` : ''} ${shouldShowDark ? 'prose-invert' : 'prose-slate'} prose-headings:font-bold prose-a:text-brand-primary prose-img:rounded-xl print:p-0 print:max-w-none print:bg-white relative z-10`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath, remarkGithubAlerts, remarkWikiLink, remarkPageBreak]}
                        rehypePlugins={[rehypeRaw]}
                        remarkRehypeOptions={remarkRehypeOptions}
                        components={components}
                        urlTransform={urlTransform}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </CommentProvider>
    );
};

export default MarkdownPreview;
