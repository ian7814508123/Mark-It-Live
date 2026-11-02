import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import ExternalMediaShield, { extractDomain } from './ExternalMediaShield';
import { remarkGithubAlerts } from './remarkGithubAlerts';
import { remarkWikiLink } from './remarkWikiLink';
import { remarkPageBreak } from './remarkPageBreak';
import remarkDirective from 'remark-directive';
import remarkGridDirective from './remarkGridDirective';
import remarkTypography from './remarkTypography';
import rehypeSlideGenerator from './rehypeSlideGenerator';
import rehypeSlideScaleInlineStyles, { scaleStyleObjectForSlide } from './rehypeSlideScaleInlineStyles';
import SlideHUD, { SlideAspectRatio } from './SlideHUD';
import { TypographyInspector } from './TypographyInspector';
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar';
import { TypographyAttrs, parseLineTypography, updateLineTypography, parseStyleString, getElementComputedTypography, typographyAttrsToStyle, applyInlineTypographyToMarkdown } from '../../utils/typographyUtils';
import { Type } from '../ui/Icons';
import { useImageStorage } from '../../hooks/useImageStorage';
import DiagramBlock from './DiagramBlock';
import { ResizableWrapper } from '../ui/ResizableWrapper';
import { hashString } from '../../utils';
import { usePersistentCanvasSettings } from '../../hooks/usePersistentCanvasSettings';
import LineCommentItem from './LineCommentItem';
import TypographyButton from './TypographyButton';
import { CommentProvider } from './CommentContext';
import { TypographyContext, useTypographyContext } from './TypographyContext';
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
    previewTheme?: import('../../config/previewThemes').PreviewTheme;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
    onUpdateContent?: (docId: string, content: string) => void;
    activeScale?: number;
    isSlideMode?: boolean;
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
    onUpdateContent?: (docId: string, content: string) => void;
    globalContent?: string;
    startLine?: number;
    endLine?: number;
    currentDocId?: string | null;
    docMode?: string;
}> = React.memo(({ code, isDarkMode, isPrinting, printSessionId = 0, previewTheme = 'default', onUpdateContent, globalContent, startLine, endLine, currentDocId, docMode }) => {
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

    const contextRef = useRef({ onUpdateContent, globalContent, currentDocId, startLine, endLine, docMode });
    useEffect(() => {
        contextRef.current = { onUpdateContent, globalContent, currentDocId, startLine, endLine, docMode };
    }, [onUpdateContent, globalContent, currentDocId, startLine, endLine, docMode]);

    // attachInteractivity 由 DiagramBlock 在每次渲染完成後透過 ref 呼叫，
    // 由於我們把事件直接綁在會被覆寫的 g.node 上，必須透過 ref 讀取最新的 globalContent 避免 stale closure
    const attachInteractivity = useCallback((container: HTMLDivElement) => {
        const { onUpdateContent: updateContent, globalContent: currentGlobalContent, currentDocId: docId, startLine: sLine, endLine: eLine, docMode: dMode } = contextRef.current;
        if (!updateContent || !currentGlobalContent || !docId) return;

        const lines = currentGlobalContent.split('\n');
        let actualEndLine = eLine;

        // 如果沒有 endLine，嘗試從 startLine 往下尋找 ``` 結尾
        if (!actualEndLine && sLine) {
            for (let i = sLine; i < lines.length; i++) {
                if (lines[i].trim() === '```') {
                    actualEndLine = i + 1;
                    break;
                }
            }
        }
        if (!actualEndLine) actualEndLine = lines.length;

        const nodes = container.querySelectorAll('g.node');
        nodes.forEach(node => {
            const nodeElement = node as HTMLElement;
            // 用 setAttribute 強制覆蓋父層 cursor-grab 的繼承
            nodeElement.setAttribute('style',
                (nodeElement.getAttribute('style') || '') + '; cursor: pointer !important;'
            );

            // Hover 視覺效果（SVG g 元素 transform-origin 預設為(0,0)，移除 scale 避免節點飛到左上角）
            // 勿用 transition: all！all 包含 transform，會和 SVG 的 transform 屬性衝突
            nodeElement.addEventListener('mouseenter', () => {
                nodeElement.style.opacity = '0.7';
                nodeElement.style.filter = 'drop-shadow(0 0 6px rgba(14, 165, 233, 0.8))';
                nodeElement.style.transition = 'opacity 0.2s ease, filter 0.2s ease';
            });
            nodeElement.addEventListener('mouseleave', () => {
                nodeElement.style.opacity = '1';
                nodeElement.style.filter = 'none';
            });

            // mousedown 攔截：阻止冒泡到父層 pan/zoom 的 onMouseDown handler
            nodeElement.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });

            nodeElement.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                let nodeId = nodeElement.id;
                const match = nodeId.match(/^flowchart-([^-]+)-/);
                if (match) {
                    nodeId = match[1];
                } else if (nodeId.startsWith('flowchart-')) {
                    nodeId = nodeId.split('-')[1];
                }
                if (!nodeId) return;

                const { onUpdateContent: freshUpdateContent, globalContent: freshGlobalContent, currentDocId: freshDocId, docMode: freshDocMode } = contextRef.current;
                if (!freshUpdateContent || !freshGlobalContent || !freshDocId) return;

                const newId = `node_${Date.now().toString().slice(-4)}`;
                // 每次點擊都重新 split，並從 ref 讀取最新的 globalContent 避免 stale closure
                const freshLines = freshGlobalContent.split('\n');
                // endLine 是 ` ``` ` 的那一行，我們在它前面插入
                freshLines.splice(actualEndLine - 1, 0, `  ${nodeId} --> ${newId}[新分支]`);

                let newContent = freshLines.join('\n');
                if (freshDocMode === 'mermaid') {
                    // mermaid 模式：globalContent 是被包裝過的，存檔前需移除首尾行
                    newContent = freshLines.slice(1, -1).join('\n');
                }

                freshUpdateContent(freshDocId, newContent);
            });
        });
    }, []);

    return (
        <DiagramBlock
            type="mermaid"
            code={code}
            isDarkMode={isDarkMode}
            isPrinting={isPrinting}
            printSessionId={printSessionId}
            render={render}
            attachInteractivity={attachInteractivity}
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
const PlotBlock = React.lazy(() => import('./PlotBlock'));
const MindmapBlock = React.lazy(() => import('./MindmapBlock'));

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
    // ─── 語法解析 (Syntax Parsing) ─────────────────────────────────────────────
    let fixedWidth: string | null = null;
    let fixedAlign: string | null = null;
    let displayAlt = alt || '';
    let parsedSrc = src;

    // 解析 alt 中的語法，例如 ![說明|300|center](url) 或 ![說明|50%](url)
    if (displayAlt.includes('|')) {
        const parts = displayAlt.split('|');
        const altText = parts[0];

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            if (/^\d+(px|%)?$/.test(part)) {
                fixedWidth = part.includes('px') || part.includes('%') ? part : `${part}px`;
            } else if (['left', 'center', 'right'].includes(part.toLowerCase())) {
                fixedAlign = part.toLowerCase();
            }
        }
        displayAlt = altText;
    }

    // 支援另一種常見語法 =300x 或 =300x400
    if (displayAlt.includes('=')) {
        const match = displayAlt.match(/=([\d]+)(px|%)?(x[\d]+)?\s*$/);
        if (match) {
            fixedWidth = match[1] + (match[2] || 'px');
            displayAlt = displayAlt.replace(match[0], '').trim();
        }
    }

    // 支援從 src 網址參數解析
    if (src && src.includes('?')) {
        try {
            const [base, query] = src.split('?');
            const params = new URLSearchParams(query);
            if (params.has('width') || params.has('w')) {
                const w = params.get('width') || params.get('w');
                if (w) {
                    fixedWidth = w.includes('%') || w.includes('px') ? w : `${w}px`;
                    parsedSrc = base;
                }
            }
        } catch (e) { }
    }

    // ─── 狀態持久化：加上 currentDocId 和 line 避免同圖打架 ──────────────────────────────
    const storageKey = useMemo(() => {
        const docPrefix = currentDocId ? `doc:${currentDocId}` : 'global';
        const lineSuffix = line !== undefined ? `:line:${line}` : '';
        return `chart-size-img:${docPrefix}${lineSuffix}:${parsedSrc}`;
    }, [parsedSrc, line, currentDocId]);

    const { width, align, updateWidth, updateAlign, reset } = usePersistentCanvasSettings(storageKey);

    const containerRef = useRef<HTMLDivElement>(null);

    const isLocal = parsedSrc?.startsWith('img-local://');
    const imgId = isLocal ? parsedSrc.replace('img-local://', '') : '';

    const finalWidth = fixedWidth || width;
    const finalAlign = fixedAlign || align;

    if (fixedWidth || fixedAlign || isActuallyPrinting) {
        return (
            <div
                className={`chart-wrapper align-${finalAlign} print:!my-0 flex w-full relative group/fixed-img`}
                style={{
                    justifyContent: finalAlign === 'left' ? 'flex-start' : finalAlign === 'right' ? 'flex-end' : 'center'
                }}
            >
                <div
                    className="chart-content relative rounded-xl overflow-hidden"
                    style={{ width: finalWidth }}
                >
                    {isLocal ? (
                        <LocalImage id={imgId} alt={displayAlt} getImage={getImage} className="max-w-full h-auto block" />
                    ) : (
                        <img src={parsedSrc} alt={displayAlt} className="max-w-full h-auto block" />
                    )}
                </div>
                {!isActuallyPrinting && (
                    <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 dark:text-slate-600 font-mono select-none pointer-events-none opacity-0 group-hover/fixed-img:opacity-100 transition-opacity z-10">
                        {isLocal ? 'LOCAL IMAGE' : 'IMAGE'}
                    </div>
                )}
            </div>
        );
    }

    return (
        <ResizableWrapper
            width={finalWidth}
            align={finalAlign}
            onWidthChange={updateWidth}
            onAlignChange={updateAlign}
            onReset={reset}
            isDarkMode={isDarkMode}
        >
            <div
                ref={containerRef}
                className={`relative rounded-xl overflow-hidden flex w-full justify-${finalAlign === 'left' ? 'start' : finalAlign === 'right' ? 'end' : 'center'}`}
            >
                {isLocal ? (
                    <LocalImage id={imgId} alt={displayAlt} getImage={getImage} />
                ) : (
                    <img src={parsedSrc} alt={displayAlt} className="rounded-xl max-w-full h-auto block" />
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
                if (window.location.hash.includes('wikilink-') || isActuallyPrinting) {
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

const PreviewRenderContext = React.createContext<React.RefObject<any>>({ current: null });

interface LineBlockWrapperProps {
    line?: number;
    className?: string;
    tagName?: string;
    typographyData?: TypographyAttrs;
    children: React.ReactNode;
}

const LineBlockWrapper: React.FC<LineBlockWrapperProps> = ({
    line,
    className = '',
    tagName,
    typographyData,
    children,
}) => {
    const isInBlock = React.useContext(IsInBlockContext);
    const { activeLine, onOpenTypography } = useTypographyContext();
    const renderContextRef = React.useContext(PreviewRenderContext);
    const ctx = renderContextRef.current;

    // 如果已經在外層 Block 內部了，或者沒有行號，就直接渲染 children，不再重複包裹評論與 Hover 按鈕
    if (isInBlock || !line) {
        return <>{children}</>;
    }

    const isTypoActive = activeLine === line;
    const hasComment = !!ctx?.lineComments?.[line];
    const isPrinting = ctx?.isPrinting;
    const isSlideMode = ctx?.isSlideMode;

    return (
        <IsInBlockContext.Provider value={true}>
            <div
                className={`relative group/line ${className} ${
                    isTypoActive
                        ? 'z-30 outline-dashed outline-2 outline-brand-primary ring-4 ring-brand-primary/10 shadow-xs rounded-xs'
                        : ''
                }`}
                data-line={line}
            >
                {children}

                {/* ─── 行動作列：排版調整按鈕 + 註解按鈕（簡報模式與列印時隱藏，免開模式隨時可用） ──── */}
                {!isPrinting && !isSlideMode && (
                    <div
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-150 flex items-center gap-1 print:hidden ${
                            isTypoActive || hasComment
                                ? 'opacity-100'
                                : 'opacity-0 group-hover/line:opacity-100'
                        }`}
                    >
                        {/* 1. 排版微調按鈕（標題與段落） */}
                        {tagName && (
                            <TypographyButton
                                line={line}
                                tagName={tagName}
                                typographyData={typographyData}
                                isActive={isTypoActive}
                                hasComment={hasComment}
                                onOpen={onOpenTypography}
                            />
                        )}

                        {/* 2. 註解按鈕（緊鄰排版按鈕，免切換全域模式隨時可用） */}
                        <LineCommentItem
                            line={line}
                            comment={ctx?.lineComments?.[line]}
                            currentDocId={ctx?.currentDocId ?? null}
                            onUpdateLineComment={ctx?.onUpdateLineComment}
                        />
                    </div>
                )}
            </div>
        </IsInBlockContext.Provider>
    );
};

const MarkdownListItem: React.FC<any> = ({ node, children, ...props }) => {
    const line = node?.position?.start?.line;
    const { activeLine, onOpenTypography } = useTypographyContext();
    const renderContextRef = React.useContext(PreviewRenderContext);
    const ctx = renderContextRef.current;
    const styleObj = parseStyleString(props.style);
    const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
    let typoData: TypographyAttrs | undefined;
    if (rawTypo) {
        typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
    }
    const { dataTypography, 'data-typography': _dt, ...domProps } = props;
    const isActive = !ctx?.isSlideMode && activeLine === line;
    const hasComment = !!ctx?.lineComments?.[line];
    const isPrinting = ctx?.isPrinting;
    const isSlideMode = ctx?.isSlideMode;

    return (
        <li
            {...domProps}
            style={styleObj}
            data-line={line}
            className={`relative group/line ${props.className || ''} ${!isSlideMode && isActive ? 'outline-dashed outline-2 outline-brand-primary ring-4 ring-brand-primary/10 shadow-xs rounded-xs' : ''}`}
        >
            {children}

            {/* ─── 行動作列：排版調整按鈕 + 註解按鈕 ──── */}
            {!isPrinting && !isSlideMode && line && (
                <div
                    className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 transition-opacity duration-150 flex items-center gap-1 print:hidden ${
                        isActive || hasComment
                            ? 'opacity-100'
                            : 'opacity-0 group-hover/line:opacity-100'
                    }`}
                >
                    <TypographyButton
                        line={line}
                        tagName="清單項目"
                        typographyData={typoData}
                        isActive={isActive}
                        hasComment={hasComment}
                        onOpen={onOpenTypography}
                    />
                    <LineCommentItem
                        line={line}
                        comment={ctx?.lineComments?.[line]}
                        currentDocId={ctx?.currentDocId ?? null}
                        onUpdateLineComment={ctx?.onUpdateLineComment}
                    />
                </div>
            )}
        </li>
    );
};

const MarkdownAlertBlockquote: React.FC<any> = ({ node, children, ...props }) => {
    const { activeLine } = useTypographyContext();
    const renderContextRef = React.useContext(PreviewRenderContext);
    const ctx = renderContextRef.current;
    const line = node?.position?.start?.line;
    const alertType = props.dataAlertType || props['data-alert-type'] || node?.data?.alertType;
    const alertTitle = props.dataAlertTitle || props['data-alert-title'] || node?.data?.alertTitle;

    if (alertType) {
        const config = alertConfig[alertType] || alertConfig.note;
        const titleToDisplay = alertTitle || config.label;

        const currentContent = ctx?.content || '';
        const alertHeaderLine = (line && currentContent) ? (currentContent.split('\n')[line - 1] || '') : '';
        const titleTypoAttrs = parseLineTypography(alertHeaderLine);
        const titleStyleFromLine = typographyAttrsToStyle(titleTypoAttrs);

        const spanStyleMatch = typeof titleToDisplay === 'string'
            ? /^<span\b[^>]*style=["']([^"']*)["'][^>]*>(.*?)<\/span>$/i.exec(titleToDisplay.trim())
            : null;
        const rawMergedTitleStyle = {
            ...(spanStyleMatch ? parseStyleString(spanStyleMatch[1]) : {}),
            ...titleStyleFromLine
        };
        const mergedTitleStyle = ctx?.isSlideMode ? scaleStyleObjectForSlide(rawMergedTitleStyle) : rawMergedTitleStyle;
        const cleanTitleText = spanStyleMatch ? spanStyleMatch[2] : titleToDisplay;

        const isTitleActive = !ctx?.isSlideMode && activeLine === line;
        const { dataAlertType, dataAlertTitle, ...domProps } = props;

        return (
            <LineBlockWrapper line={line}>
                <blockquote
                    {...domProps}
                    className={`markdown-alert ${config.className}`}
                    data-line={line}
                >
                    <div
                        className={`markdown-alert-title select-none transition-all ${!ctx?.isSlideMode && isTitleActive ? 'outline-dashed outline-2 outline-brand-primary ring-4 ring-brand-primary/10 rounded-xs' : ''}`}
                    >
                        <React.Suspense fallback={<div className="w-3.5 h-3.5 mr-1.5 inline-block animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />}>
                            <LazyAlertIcon type={alertType} />
                        </React.Suspense>

                        <strong style={mergedTitleStyle}>{cleanTitleText}</strong>
                    </div>
                    <div className="markdown-alert-content">
                        {children}
                    </div>
                </blockquote>
            </LineBlockWrapper>
        );
    }

    return (
        <LineBlockWrapper line={line}>
            <blockquote {...props}>{children}</blockquote>
        </LineBlockWrapper>
    );
};

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
    onUpdateContent,
    onUpdateLineComment,
    activeScale = 1,
    isSlideMode = false,
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

    // ─── 排版微調 Inspector 狀態管理 ──────────────────────────────────────────
    const [typographyState, setTypographyState] = useState<{
        isOpen: boolean;
        targetLine: number;
        tagName: string;
        targetRect: DOMRect | null;
        targetElement: HTMLElement | null;
        initialAttrs: TypographyAttrs;
        lineContent?: string;
        occurrenceIndex?: number;
    }>({
        isOpen: false,
        targetLine: 0,
        tagName: '',
        targetRect: null,
        targetElement: null,
        initialAttrs: {},
        lineContent: '',
        occurrenceIndex: 0,
    });

    const handleOpenTypography = useCallback((
        line: number,
        tagName: string,
        targetEl: HTMLElement,
        existingAttrs?: TypographyAttrs
    ) => {
        if (isSlideMode) return;
        const lineContent = (renderContextRef.current?.content || content)?.split('\n')?.[line - 1] || '';
        const parsedAttrs = existingAttrs && Object.keys(existingAttrs).length > 0
            ? existingAttrs
            : parseLineTypography(lineContent);

        // 打開面板前先讀取文字當下在 DOM 中的 Computed Style，避免與主題預設值脫節（如 2.4rem 顯示成 16px）
        const computedAttrs = targetEl ? getElementComputedTypography(targetEl) : {};

        setTypographyState({
            isOpen: true,
            targetLine: line,
            tagName: tagName.toUpperCase(),
            targetRect: targetEl ? targetEl.getBoundingClientRect() : null,
            targetElement: targetEl || null,
            initialAttrs: {
                ...computedAttrs,
                ...parsedAttrs,
            },
            lineContent,
        });
    }, [content, isSlideMode]);

    const handleApplyTypography = useCallback((attrs: TypographyAttrs, targetFormat: 'directive' | 'html' = 'html') => {
        const targetLine = typographyState.targetLine;
        if (!targetLine) return;
        const currentContent = renderContextRef.current?.content || content;
        const currentDoc = renderContextRef.current?.currentDocId || currentDocId;
        const updateFn = renderContextRef.current?.onUpdateContent || onUpdateContent;

        if (updateFn && currentContent && currentDoc) {
            if (typographyState.tagName === '選取文字' && typographyState.lineContent) {
                const newContent = applyInlineTypographyToMarkdown({
                    markdownContent: currentContent,
                    targetLine,
                    selectedText: typographyState.lineContent,
                    attrs,
                    action: 'apply',
                    occurrenceIndex: typographyState.occurrenceIndex ?? 0,
                });
                updateFn(currentDoc, newContent);
            } else {
                const newContent = updateLineTypography(currentContent, targetLine, attrs, targetFormat);
                updateFn(currentDoc, newContent);
            }
        }
    }, [typographyState.targetLine, typographyState.tagName, typographyState.lineContent, typographyState.occurrenceIndex, content, currentDocId, onUpdateContent]);

    const handleResetTypography = useCallback(() => {
        const targetLine = typographyState.targetLine;
        if (!targetLine) return;
        const currentContent = renderContextRef.current?.content || content;
        const currentDoc = renderContextRef.current?.currentDocId || currentDocId;
        const updateFn = renderContextRef.current?.onUpdateContent || onUpdateContent;

        if (updateFn && currentContent && currentDoc) {
            if (typographyState.tagName === '選取文字' && typographyState.lineContent) {
                const newContent = applyInlineTypographyToMarkdown({
                    markdownContent: currentContent,
                    targetLine,
                    selectedText: typographyState.lineContent,
                    action: 'clear',
                    occurrenceIndex: typographyState.occurrenceIndex ?? 0,
                });
                updateFn(currentDoc, newContent);
            } else {
                const newContent = updateLineTypography(currentContent, targetLine, {}, 'html');
                updateFn(currentDoc, newContent);
            }
        }
        setTypographyState(prev => ({ ...prev, isOpen: false }));
    }, [typographyState.targetLine, typographyState.tagName, typographyState.lineContent, typographyState.occurrenceIndex, content, currentDocId, onUpdateContent]);

    // 簡報模式啟用時，立即關閉開啟中的排版微調彈窗
    useEffect(() => {
        if (isSlideMode && typographyState.isOpen) {
            setTypographyState(prev => ({ ...prev, isOpen: false, targetElement: null, targetRect: null }));
        }
    }, [isSlideMode, typographyState.isOpen]);

    const previewRootRef = useRef<HTMLDivElement>(null);

    // ─── 行內文字選取排版 (Word 模式) 狀態管理 ──────────────────────────────
    const [inlineSelectionState, setInlineSelectionState] = useState<{
        isOpen: boolean;
        position: { top: number; left: number };
        selectionRect?: DOMRect | null;
        containerRect?: DOMRect | null;
        selectedText: string;
        targetLine: number;
        occurrenceIndex: number;
        currentAttrs: TypographyAttrs;
        targetElement: HTMLElement | null;
    }>({
        isOpen: false,
        position: { top: 0, left: 0 },
        selectionRect: null,
        containerRect: null,
        selectedText: '',
        targetLine: 0,
        occurrenceIndex: 0,
        currentAttrs: {},
        targetElement: null,
    });

    // 監聽文字反白選取事件 (MouseUp & SelectionChange)
    useEffect(() => {
        if (isSlideMode || isActuallyPrinting) return;

        const handleSelection = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) {
                return;
            }

            const rawText = selection.toString();
            const trimmedText = rawText.trim();
            if (!trimmedText) return;

            const range = selection.getRangeAt(0);
            const container = previewRootRef.current;
            if (!container) return;

            // 確保選取範圍在預覽容器內
            if (!container.contains(range.commonAncestorContainer)) return;

            // 排除程式碼區塊、圖表容器、SVG 內部與按鈕輸入框
            const ancestorEl = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
                ? range.commonAncestorContainer
                : range.commonAncestorContainer.parentElement) as HTMLElement | null;

            if (ancestorEl?.closest('pre, code, .diagram-block-container, svg, button, input, textarea')) {
                return;
            }

            // 尋找最近的 [data-line] 父層元素
            const lineEl = ancestorEl?.closest('[data-line]') as HTMLElement | null;
            if (!lineEl) return;

            const lineAttr = lineEl.getAttribute('data-line');
            const targetLine = lineAttr ? parseInt(lineAttr, 10) : 0;
            if (!targetLine) return;

            // 計算在該行中這是第幾次出現該選取文字 (occurrenceIndex)
            let occurrenceIndex = 0;
            try {
                const preRange = document.createRange();
                preRange.selectNodeContents(lineEl);
                preRange.setEnd(range.startContainer, range.startOffset);
                const textBefore = preRange.toString();
                occurrenceIndex = Math.max(0, textBefore.split(trimmedText).length - 1);
            } catch (err) {
                occurrenceIndex = 0;
            }

            const rect = range.getBoundingClientRect();
            const containerRect = container ? container.getBoundingClientRect() : null;
            // 計算浮動工具列基礎位置
            const left = rect.left + rect.width / 2;
            const top = rect.top;

            const computed = ancestorEl ? getElementComputedTypography(ancestorEl) : {};

            setInlineSelectionState({
                isOpen: true,
                position: { top, left },
                selectionRect: rect,
                containerRect,
                selectedText: trimmedText,
                targetLine,
                occurrenceIndex,
                currentAttrs: computed,
                targetElement: ancestorEl,
            });
        };

        const handleMouseUp = () => {
            // 短暫延遲等待瀏覽器 selection 穩定
            setTimeout(handleSelection, 30);
        };

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                setInlineSelectionState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
            }
        };

        const handleDocumentClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // 點擊工具列內部或觸發按鈕時不關閉
            if (target.closest('[data-floating-toolbar]') || target.closest('[data-typography-trigger]')) return;
            setInlineSelectionState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
        };

        const previewEl = previewRootRef.current;
        if (previewEl) {
            previewEl.addEventListener('mouseup', handleMouseUp);
        }
        document.addEventListener('mousedown', handleDocumentClick);
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            if (previewEl) {
                previewEl.removeEventListener('mouseup', handleMouseUp);
            }
            document.removeEventListener('mousedown', handleDocumentClick);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [isSlideMode, isActuallyPrinting]);

    const handleApplyInlineTypography = useCallback((newAttrs: Partial<TypographyAttrs>) => {
        const { targetLine, selectedText, occurrenceIndex, currentAttrs } = inlineSelectionState;
        if (!targetLine || !selectedText) return;

        const mergedAttrs: TypographyAttrs = { ...currentAttrs, ...newAttrs };
        const currentContent = renderContextRef.current?.content || content;
        const currentDoc = renderContextRef.current?.currentDocId || currentDocId;
        const updateFn = renderContextRef.current?.onUpdateContent || onUpdateContent;

        if (updateFn && currentContent && currentDoc) {
            const newContent = applyInlineTypographyToMarkdown({
                markdownContent: currentContent,
                targetLine,
                selectedText,
                attrs: mergedAttrs,
                action: 'apply',
                occurrenceIndex,
            });
            updateFn(currentDoc, newContent);
            setInlineSelectionState(prev => ({
                ...prev,
                currentAttrs: mergedAttrs,
            }));
        }
    }, [inlineSelectionState, content, currentDocId, onUpdateContent]);

    const handleClearInlineTypography = useCallback(() => {
        const { targetLine, selectedText, occurrenceIndex } = inlineSelectionState;
        if (!targetLine || !selectedText) return;

        const currentContent = renderContextRef.current?.content || content;
        const currentDoc = renderContextRef.current?.currentDocId || currentDocId;
        const updateFn = renderContextRef.current?.onUpdateContent || onUpdateContent;

        if (updateFn && currentContent && currentDoc) {
            const newContent = applyInlineTypographyToMarkdown({
                markdownContent: currentContent,
                targetLine,
                selectedText,
                action: 'clear',
                occurrenceIndex,
            });
            updateFn(currentDoc, newContent);
            setInlineSelectionState(prev => ({
                ...prev,
                isOpen: false,
                currentAttrs: {},
            }));
        }
    }, [inlineSelectionState, content, currentDocId, onUpdateContent]);

    const handleOpenFullInspectorFromInline = useCallback(() => {
        const { targetLine, selectedText, targetElement, currentAttrs, occurrenceIndex } = inlineSelectionState;
        if (!targetLine) return;
        setTypographyState({
            isOpen: true,
            targetLine,
            tagName: '選取文字',
            targetRect: targetElement ? targetElement.getBoundingClientRect() : null,
            targetElement: targetElement || null,
            initialAttrs: currentAttrs,
            lineContent: selectedText,
            occurrenceIndex,
        });
        setInlineSelectionState(prev => ({ ...prev, isOpen: false }));
    }, [inlineSelectionState]);

    // ─── wrapWithComment：在 block 元素旁插入行內評論組件、排版微調按鈕與 hover 提示 ────────────
    const wrapWithComment = useCallback((
        node: any,
        children: React.ReactNode,
        className: string = '',
        tagName?: string,
        typographyData?: TypographyAttrs
    ) => {
        const line = node?.position?.start?.line;
        return (
            <LineBlockWrapper
                line={line}
                className={className}
                tagName={tagName}
                typographyData={typographyData}
            >
                {children}
            </LineBlockWrapper>
        );
    }, []);

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
        getImage,
        onUpdateContent,
        content,
        lineComments,
        onUpdateLineComment,
        isSlideMode,
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
        allowDangerousHtml: true,
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
                                onUpdateContent={ctx.onUpdateContent}
                                globalContent={ctx.content}
                                startLine={node?.position?.start?.line}
                                endLine={node?.position?.end?.line}
                                currentDocId={ctx.currentDocId}
                                docMode={ctx.documents?.find((d: any) => d.id === ctx.currentDocId)?.mode}
                            />
                        </div>
                    );
                }
                if (language === 'vega' || language === 'vega-lite') return wrapWithComment(node, <div key={stableKey} className="not-prose"><VegaBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'smiles') return wrapWithComment(node, <div key={stableKey} className="not-prose"><SmilesBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'abc') return wrapWithComment(node, <React.Suspense key={stableKey} fallback={<div className="p-4 flex justify-center items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">樂譜加載中...</div>}><div className="not-prose"><AbcBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div></React.Suspense>);
                if (language === 'plot' || language === 'functionplot' || language === 'function-plot' || language === 'graph') {
                    return wrapWithComment(node, (
                        <React.Suspense key={stableKey} fallback={<div className="p-4 flex justify-center items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">📈 函數圖加載中...</div>}>
                            <div className="not-prose">
                                <PlotBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} />
                            </div>
                        </React.Suspense>
                    ));
                }
                if (language === 'mindmap' || language === 'markmap') {
                    return wrapWithComment(node, (
                        <React.Suspense key={stableKey} fallback={<div className="p-4 flex justify-center items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">🧠 心智圖加載中...</div>}>
                            <div className="not-prose">
                                <MindmapBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} />
                            </div>
                        </React.Suspense>
                    ));
                }

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
        // ─── 注入 Line Number 與 排版雙邊點擊調整 ───────────────────────────────────
        p: ({ node, ...props }: any) => {
            // 若為 blockquote / alert 中的段落，其 children[0] 的行號通常才是內文真正所在的行（避免與開頭 [!NOTE] 混淆）
            const firstChildLine = node?.children?.[0]?.position?.start?.line;
            const line = (firstChildLine && firstChildLine > (node?.position?.start?.line || 0))
                ? firstChildLine
                : (node?.position?.start?.line);
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <div
                    className="md-paragraph mb-4 last:mb-0 transition-all"
                    {...domProps}
                    style={styleObj}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : (firstChildLine && firstChildLine > (node?.position?.start?.line || 0) ? 'Alert 內文' : '段落'),
                typoData
            );
        },
        h1: ({ node, ...props }: any) => {
            const line = node?.position?.start?.line;
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <h1
                    {...domProps}
                    style={styleObj}
                    className={`${props.className || ''} transition-all`}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : 'h1',
                typoData
            );
        },
        h2: ({ node, ...props }: any) => {
            const line = node?.position?.start?.line;
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <h2
                    {...domProps}
                    style={styleObj}
                    className={`${props.className || ''} transition-all`}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : 'h2',
                typoData
            );
        },
        h3: ({ node, ...props }: any) => {
            const line = node?.position?.start?.line;
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <h3
                    {...domProps}
                    style={styleObj}
                    className={`${props.className || ''} transition-all`}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : 'h3',
                typoData
            );
        },
        h4: ({ node, ...props }: any) => {
            const line = node?.position?.start?.line;
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <h4
                    {...domProps}
                    style={styleObj}
                    className={`${props.className || ''} transition-all`}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : 'h4',
                typoData
            );
        },
        h5: ({ node, ...props }: any) => {
            const line = node?.position?.start?.line;
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <h5
                    {...domProps}
                    style={styleObj}
                    className={`${props.className || ''} transition-all`}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : 'h5',
                typoData
            );
        },
        h6: ({ node, ...props }: any) => {
            const line = node?.position?.start?.line;
            const styleObj = parseStyleString(props.style);
            const rawTypo = props?.['data-typography'] || props?.dataTypography || node?.properties?.['data-typography'] || node?.data?.hProperties?.['data-typography'];
            let typoData: TypographyAttrs | undefined;
            if (rawTypo) {
                typoData = typeof rawTypo === 'object' ? rawTypo : (() => { try { return JSON.parse(rawTypo); } catch { return undefined; } })();
            }
            const { dataTypography, 'data-typography': _dt, ...domProps } = props;

            return wrapWithComment(
                node,
                <h6
                    {...domProps}
                    style={styleObj}
                    className={`${props.className || ''} transition-all`}
                />,
                '',
                renderContextRef.current?.isSlideMode ? undefined : 'h6',
                typoData
            );
        },
        ul: ({ node, ...props }: any) => <ul {...props} />,
        ol: ({ node, ...props }: any) => <ol {...props} />,
        li: ({ node, children, ...props }: any) => (
            <MarkdownListItem node={node} {...props}>
                {children}
            </MarkdownListItem>
        ),
        blockquote: ({ node, children, ...props }: any) => (
            <MarkdownAlertBlockquote node={node} {...props}>
                {children}
            </MarkdownAlertBlockquote>
        ),
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
            if (features.hasPlot) import('./PlotBlock').catch(() => { });
            if (features.hasMindmap) import('./MindmapBlock').catch(() => { });
        });
    }, [content, isActuallyPrinting]);

    // ─── 4：簡報模式 — 單頁展示核心邏輯 ───────────────────────────────────────────

    // 投影片導航狀態
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [totalSlides, setTotalSlides] = useState(0);
    const currentSlideIndexRef = useRef(0);
    const totalSlidesRef = useRef(0);
    const slideContainerRef = useRef<HTMLDivElement>(null);

    // 同步 ref 與 state
    useEffect(() => {
        currentSlideIndexRef.current = currentSlideIndex;
    }, [currentSlideIndex]);
    useEffect(() => {
        totalSlidesRef.current = totalSlides;
    }, [totalSlides]);

    // 進入簡報模式時重置至第一張
    useEffect(() => {
        if (isSlideMode) {
            currentSlideIndexRef.current = 0;
            setCurrentSlideIndex(0);
        }
    }, [isSlideMode]);

    // ─── 導航函式（使用 ref 以保持引用穩定）──────────────────────────────────────
    const navigateToSlide = useCallback((index: number) => {
        const container = slideContainerRef.current;
        if (!container) return;

        const wrappers = container.querySelectorAll('.marp-slide-wrapper');
        const total = wrappers.length;
        if (total === 0) return;

        const clampedIndex = Math.max(0, Math.min(index, total - 1));

        // 切換 active class
        wrappers.forEach((w, i) => {
            w.classList.toggle('slide-active', i === clampedIndex);
        });

        currentSlideIndexRef.current = clampedIndex;
        setCurrentSlideIndex(clampedIndex);
    }, []);

    const handlePrevSlide = useCallback(() => {
        navigateToSlide(currentSlideIndexRef.current - 1);
    }, [navigateToSlide]);

    const handleNextSlide = useCallback(() => {
        navigateToSlide(currentSlideIndexRef.current + 1);
    }, [navigateToSlide]);

    // ─── 點擊翻頁：左 1/3 = 上一頁、右 1/3 = 下一頁 ─────────────────────────────
    const handleSlideClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // 不在互動元素上觸發翻頁
        if (target.closest('.slide-hud') || target.closest('a') || target.closest('button') ||
            target.closest('code') || target.closest('pre') || target.closest('input') ||
            target.closest('textarea')) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 3) {
            handlePrevSlide();
        } else if (x > rect.width * 2 / 3) {
            handleNextSlide();
        }
    }, [handlePrevSlide, handleNextSlide]);

    // ─── 簡報長寬比狀態 (16:9 / 16:10 / 4:3) ──────────────────────────────────
    const [slideRatio, setSlideRatio] = useState<SlideAspectRatio>(() => {
        try {
            return (localStorage.getItem('slide_aspect_ratio') as SlideAspectRatio) || '16:9';
        } catch {
            return '16:9';
        }
    });

    const handleSlideRatioChange = useCallback((ratio: SlideAspectRatio) => {
        setSlideRatio(ratio);
        try {
            localStorage.setItem('slide_aspect_ratio', ratio);
        } catch { }
    }, []);

    const SLIDE_RATIO_CONFIGS: Record<SlideAspectRatio, { width: number; height: number }> = {
        '16:9': { width: 1920, height: 1080 },
        '16:10': { width: 1920, height: 1200 },
        '4:3': { width: 1440, height: 1080 },
    };

    // ─── ResizeObserver：計算縮放比（依長寬比填滿視窗）─────────────────────────
    useEffect(() => {
        if (!isSlideMode) return;

        const ratioConfig = SLIDE_RATIO_CONFIGS[slideRatio] || SLIDE_RATIO_CONFIGS['16:9'];
        const designWidth = ratioConfig.width;
        const designHeight = ratioConfig.height;
        const container = slideContainerRef.current;
        if (!container) return;

        let debounceTimer: ReturnType<typeof setTimeout>;

        const updateScale = () => {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            // 填滿視窗，維持比例，自適應貼齊邊界
            let scale = Math.min(containerWidth / designWidth, containerHeight / designHeight);
            // 響應式保護：小螢幕 (如手機、極窄視窗) 時維持最低可讀 scale
            if (containerWidth < 640) {
                scale = Math.max(0.28, scale);
            }
            container.style.setProperty('--slide-scale', String(scale));
            container.style.setProperty('--slide-width', `${designWidth}px`);
            container.style.setProperty('--slide-height', `${designHeight}px`);
        };

        const debouncedUpdate = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateScale, 60);
        };

        const ro = new ResizeObserver(debouncedUpdate);
        ro.observe(container);
        updateScale();

        return () => {
            ro.disconnect();
            clearTimeout(debounceTimer);
        };
    }, [isSlideMode, slideRatio]);

    // ─── 投影片後處理：active class + 內容自動縮放 ───────────────────────────────
    useEffect(() => {
        if (!isSlideMode) return;

        const ratioConfig = SLIDE_RATIO_CONFIGS[slideRatio] || SLIDE_RATIO_CONFIGS['16:9'];
        const designWidth = ratioConfig.width;
        const designHeight = ratioConfig.height;

        const container = slideContainerRef.current;
        if (!container) return;

        const raf = requestAnimationFrame(() => {
            const wrappers = container.querySelectorAll('.marp-slide-wrapper');
            const count = wrappers.length;

            // 更新投影片總數
            setTotalSlides(count);

            // Clamp 目前頁碼（可能因內容變更而超出範圍）
            const clampedIndex = Math.max(0, Math.min(currentSlideIndexRef.current, count - 1));

            // 套用 active class
            wrappers.forEach((w, i) => {
                w.classList.toggle('slide-active', i === clampedIndex);
            });

            if (clampedIndex !== currentSlideIndexRef.current) {
                currentSlideIndexRef.current = clampedIndex;
                setCurrentSlideIndex(clampedIndex);
            }

            // ─── 內容自動縮放（Auto-fit）────────────────────────────────
            // 若投影片內容超出畫布（減去上下 padding 各 80px = designHeight - 160 可用），
            // 則自動等比縮小內容使其完整顯示。
            wrappers.forEach(w => {
                const inner = w.querySelector('.marp-slide-inner') as HTMLElement;
                if (!inner) return;
                const availableHeight = designHeight - 160;
                const contentHeight = inner.scrollHeight;
                if (contentHeight > availableHeight) {
                    const fitScale = Math.max(0.45, availableHeight / contentHeight);
                    inner.style.transform = `scale(${fitScale})`;
                    inner.style.transformOrigin = 'top left';
                    inner.style.width = `${(designWidth - 240) / fitScale}px`;
                } else {
                    inner.style.transform = '';
                    inner.style.transformOrigin = '';
                    inner.style.width = '';
                }
            });
        });

        return () => cancelAnimationFrame(raf);
    }, [isSlideMode, content, slideRatio]);

    // ─── 鍵盤導航 ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isSlideMode) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

            if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) {
                e.preventDefault();
                handleNextSlide();
            } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
                e.preventDefault();
                handlePrevSlide();
            } else if (e.key === 'Home') {
                e.preventDefault();
                navigateToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                navigateToSlide(totalSlidesRef.current - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSlideMode, handleNextSlide, handlePrevSlide, navigateToSlide]);

    // ─── 滾輪翻頁（帶 debounce 防止連續觸發）────────────────────────────────────
    useEffect(() => {
        if (!isSlideMode) return;

        const container = slideContainerRef.current;
        if (!container) return;

        let wheelCooldown = false;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (wheelCooldown) return;

            wheelCooldown = true;
            setTimeout(() => { wheelCooldown = false; }, 450);

            if (e.deltaY > 0) {
                handleNextSlide();
            } else if (e.deltaY < 0) {
                handlePrevSlide();
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, [isSlideMode, handleNextSlide, handlePrevSlide]);


    const typographyContextValue = useMemo(() => ({
        activeLine: (typographyState.isOpen && !isSlideMode) ? typographyState.targetLine : null,
        onOpenTypography: handleOpenTypography,
    }), [typographyState.isOpen, typographyState.targetLine, isSlideMode, handleOpenTypography]);

    return (
        <PreviewRenderContext.Provider value={renderContextRef}>
            <CommentProvider>
                <TypographyContext.Provider value={typographyContextValue}>
            <div
                ref={isSlideMode ? slideContainerRef : undefined}
                className={`relative w-full h-full min-h-[500px] print:h-auto print:min-h-0 ${isSlideMode ? 'slide-mode-container' : 'document-mode-container'}`}
                onClick={isSlideMode ? handleSlideClick : undefined}
            >
                <div ref={previewRootRef} className={`prose max-w-none ${isSlideMode ? '' : 'px-8 pb-4'} ${previewTheme && previewTheme !== 'default' ? `theme-${previewTheme}` : ''} ${shouldShowDark ? 'prose-invert' : 'prose-slate'} prose-headings:font-bold prose-a:text-brand-primary prose-img:rounded-xl print:p-0 print:max-w-none print:bg-white relative z-10`}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath, remarkGithubAlerts, remarkWikiLink, remarkPageBreak, remarkDirective, remarkGridDirective, remarkTypography]}
                        rehypePlugins={[rehypeRaw, [rehypeSlideScaleInlineStyles, { isSlideMode }], [rehypeSlideGenerator, { isSlideMode }]]}
                        remarkRehypeOptions={remarkRehypeOptions}
                        components={components}
                        urlTransform={urlTransform}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
                {isSlideMode && (
                    <SlideHUD
                        currentSlide={currentSlideIndex}
                        totalSlides={totalSlides}
                        slideRatio={slideRatio}
                        onChangeSlideRatio={handleSlideRatioChange}
                        onPrev={handlePrevSlide}
                        onNext={handleNextSlide}
                    />
                )}
            </div>

            {/* ─── 雙邊排版微調 Inspector 浮動控制面板 ──────────────────────── */}
            <TypographyInspector
                isOpen={typographyState.isOpen}
                onClose={() => setTypographyState(prev => ({ ...prev, isOpen: false, targetElement: null }))}
                targetLine={typographyState.targetLine}
                tagName={typographyState.tagName}
                targetRect={typographyState.targetRect}
                targetElement={typographyState.targetElement}
                initialAttrs={typographyState.initialAttrs}
                lineContent={
                    typographyState.tagName === '選取文字'
                        ? typographyState.lineContent
                        : (typographyState.isOpen && typographyState.targetLine
                            ? ((renderContextRef.current?.content || content)?.split('\n')?.[typographyState.targetLine - 1] ?? typographyState.lineContent)
                            : typographyState.lineContent)
                }
                onApply={handleApplyTypography}
                onReset={handleResetTypography}
            />

            {/* ─── 行內文字選取排版 Floating Selection Toolbar (Word 模式) ──── */}
            <FloatingSelectionToolbar
                isOpen={inlineSelectionState.isOpen}
                position={inlineSelectionState.position}
                selectionRect={inlineSelectionState.selectionRect}
                containerRect={inlineSelectionState.containerRect}
                selectedText={inlineSelectionState.selectedText}
                targetLine={inlineSelectionState.targetLine}
                currentAttrs={inlineSelectionState.currentAttrs}
                onApplyAttrs={handleApplyInlineTypography}
                onClearFormat={handleClearInlineTypography}
                onOpenFullInspector={handleOpenFullInspectorFromInline}
                onClose={() => setInlineSelectionState(prev => ({ ...prev, isOpen: false }))}
            />
        </TypographyContext.Provider>
            </CommentProvider>
        </PreviewRenderContext.Provider>
    );
};

export default MarkdownPreview;
