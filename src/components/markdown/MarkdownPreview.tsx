import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { MathJax } from 'better-react-mathjax';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import embed from 'vega-embed';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import SmilesDrawer from 'smiles-drawer';
import { remarkGithubAlerts } from './remarkGithubAlerts';
import { remarkWikiLink } from './remarkWikiLink';
import { remarkPageBreak } from './remarkPageBreak';
import { useImageStorage } from '../../hooks/useImageStorage';
import DiagramBlock from './DiagramBlock';
import { ResizableWrapper } from '../ui/ResizableWrapper';
import { hashString } from '../../utils';
import { useDebounce } from '../../hooks/useDebounce';
import { usePersistentCanvasSettings } from '../../hooks/usePersistentCanvasSettings';
import { WrapText, Info, AlertCircle, AlertTriangle, Lightbulb, Ban } from 'lucide-react';
import LineCommentItem from './LineCommentItem';
import { CommentProvider } from './CommentContext';
import MagneticButton from '../ui/MagneticButton';
import { CodeBlockHeader } from './CodeBlockHeader';

interface MarkdownPreviewProps {
    content: string;
    theme?: 'default' | 'neutral' | 'dark' | 'forest';
    isDarkMode: boolean;
    documents?: any[];
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    currentDocId?: string | null;
    isPrinting?: boolean;
    printSessionId?: number;
    isMergedPrint?: boolean;
    previewTheme?: 'default' | 'academic' | 'minimal' | 'developer' | 'implementation-plan';
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

const MermaidBlock: React.FC<{ code: string; isDarkMode: boolean; isPrinting?: boolean; printSessionId?: number }> = React.memo(({ code, isDarkMode, isPrinting, printSessionId = 0 }) => {
    const render = useCallback(async (container: HTMLDivElement, renderCode: string, isDark: boolean) => {
        mermaid.initialize({
            theme: isDark ? 'dark' : 'neutral',
            fontFamily: 'Inter, system-ui, sans-serif',
            securityLevel: 'loose'
        });

        const id = `mermaid-${hashString(renderCode + (isDark ? 'dark' : 'light'))}`;

        // 1. 先進行語法檢查，避免 mermaid.render 回傳 "Syntax error in text" 的 SVG
        await mermaid.parse(renderCode, { suppressErrors: false });

        // 2. 只有語法正確才會執行到這裡
        const { svg: renderedSvg } = await mermaid.render(id, renderCode);
        container.innerHTML = cleanMermaidSvg(renderedSvg);
    }, []);

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
        const spec = JSON.parse(renderCode);

        container.innerHTML = '';
        await embed(container, spec, {
            actions: false,
            theme: isDark ? 'dark' : 'vox',
            renderer: 'svg',
            loader: {
                // 1. 覆寫同步過濾器：對所有協定（包含 data-local://）同步放行，徹底消除 Sanitize failure 錯誤！
                sanitize: (uri: string) => {
                    return { href: uri };
                },
                // 2. 覆寫非同步載入器：在載入數據時進行攔截
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

// ─── GitHub-style Alert 標註解析輔助 ──────────────────────────────────────────
const alertConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    note: {
        icon: <Info size={14} className="inline mr-1.5 shrink-0" />,
        label: 'Note',
        className: 'markdown-alert-note'
    },
    important: {
        icon: <AlertCircle size={14} className="inline mr-1.5 shrink-0" />,
        label: 'Important',
        className: 'markdown-alert-important'
    },
    warning: {
        icon: <AlertTriangle size={14} className="inline mr-1.5 shrink-0" />,
        label: 'Warning',
        className: 'markdown-alert-warning'
    },
    caution: {
        icon: <Ban size={14} className="inline mr-1.5 shrink-0" />,
        label: 'Caution',
        className: 'markdown-alert-caution'
    },
    tip: {
        icon: <Lightbulb size={14} className="inline mr-1.5 shrink-0" />,
        label: 'Tip',
        className: 'markdown-alert-tip'
    }
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

// ─── 可縮放圖片元件：整合 ResizableWrapper ───────────────────────────────────────────
interface ResizableImageProps {
    src: string;
    alt?: string;
    line?: number;
    currentDocId?: string | null;
    getImage: (id: string) => Promise<string | null>;
    isDarkMode: boolean;
}

const ResizableImage: React.FC<ResizableImageProps> = ({ src, alt, line, currentDocId, getImage, isDarkMode }) => {
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
                className={`relative rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/20 flex w-full justify-${align === 'left' ? 'start' : align === 'right' ? 'end' : 'center'}`}
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

// ─── 數學與化學元件 (Memoized) ────────────────────────────────────────────────
interface MemoizedMathJaxProps {
    content: string;
    inline?: boolean;
    isDarkMode: boolean;
}

const MemoizedMathJax: React.FC<MemoizedMathJaxProps> = React.memo(({ content, inline, isDarkMode }) => {
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

// ─── 增強型程式碼區塊 (智能斷行、懸掛縮排與列印控制) ────────────────────────────────────────────────
interface EnhancedCodeBlockProps {
    language: string;
    codeString: string;
    stableKey: string;
    isActuallyPrinting: boolean;
    shouldShowDark: boolean;
}

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

    const handleScroll = useCallback((e: React.UIEvent<HTMLPreElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        setIsScrolled(scrollLeft > 0);
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
                    preTagProps={{
                        onScroll: handleScroll
                    }}
                >
                    {codeString}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

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
    const debouncedContent = useDebounce(content, 200);
    const { getImage } = useImageStorage();

    const currentDoc = useMemo(() => documents.find(d => d.id === currentDocId), [documents, currentDocId]);
    const lineComments = currentDoc?.lineComments || {};

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
                if (language === 'mermaid') return wrapWithComment(node, <div key={stableKey} className="not-prose"><MermaidBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'vega' || language === 'vega-lite') return wrapWithComment(node, <div key={stableKey} className="not-prose"><VegaBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'smiles') return wrapWithComment(node, <div key={stableKey} className="not-prose"><SmilesBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div>);
                if (language === 'abc') return wrapWithComment(node, <React.Suspense key={stableKey} fallback={<div className="p-4 flex justify-center items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">樂譜加載中...</div>}><div className="not-prose"><AbcBlock code={codeString} isDarkMode={ctx.shouldShowDark} isPrinting={ctx.isPrinting} /></div></React.Suspense>);

                return wrapWithComment(node, (
                    <div key={stableKey} className="code-block-wrapper not-prose">
                        <EnhancedCodeBlock
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
            const alertType = node?.data?.alertType;

            if (alertType) {
                const config = alertConfig[alertType] || alertConfig.note;
                return wrapWithComment(node, (
                    <blockquote
                        {...props}
                        className={`markdown-alert ${config.className}`}
                        data-line={line}
                    >
                        <div className="markdown-alert-title">
                            {config.icon}
                            <span>{config.label}</span>
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
                        <MemoizedMathJax content={mathContent} isDarkMode={ctx.shouldShowDark} />
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
                        <MemoizedMathJax content={mathContent} inline isDarkMode={ctx.shouldShowDark} />
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
                />
            );
        },
    }), [wrapWithComment, urlTransform]);

    // 監聽圖片載入完成，若有必要可觸發同步刷新
    useEffect(() => {
        const container = document.querySelector('.prose');
        if (!container) return;

        const handleImageLoad = () => {
            window.dispatchEvent(new CustomEvent('preview-content-height-change'));
        };

        container.addEventListener('load', handleImageLoad, true);
        return () => container.removeEventListener('load', handleImageLoad, true);
    }, [debouncedContent]);

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
                        {debouncedContent}
                    </ReactMarkdown>
                </div>
            </div>
        </CommentProvider>
    );
};

export default MarkdownPreview;
