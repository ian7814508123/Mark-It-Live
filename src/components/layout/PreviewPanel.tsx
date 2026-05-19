import React, { forwardRef, useState, useEffect, useRef, useMemo } from 'react';
import { AlertCircle, Trash2, RefreshCw, Sparkles, ZoomIn, ZoomOut, Maximize, Hand, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import MarkdownPreview from '../markdown/MarkdownPreview';

// ── PrintPaper ──────────────────────────────────────────────────────────────
// 封裝每份紙張的渲染邏輯
interface PrintPaperProps {
    docId: string;
    doc: any;
    paperPx: { w: number, h: number };
    paperSize: string;
    orientation: string;
    margin: string;
    isActive: boolean;
    isVisibleOnScreen: boolean;
    isVisibleInPrint: boolean;
    isPrinting: boolean;
    printSessionId: number;
    isMergedPrint: boolean;
    previewTheme: 'default' | 'academic' | 'minimal' | 'developer' | 'implementation-plan';
    theme: any;
    isDarkMode: boolean;
    documents: any[];
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    scrollRef?: React.Ref<HTMLDivElement>;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
    activeScale?: number;
}

const PrintPaper: React.FC<PrintPaperProps> = ({
    docId,
    doc,
    paperPx,
    paperSize,
    orientation,
    margin,
    isActive,
    isVisibleOnScreen,
    isVisibleInPrint,
    isPrinting,
    printSessionId,
    isMergedPrint,
    previewTheme,
    theme,
    isDarkMode,
    documents,
    onSelectDocument,
    onCreateMissing,
    onScroll,
    scrollRef,
    isCommentMode,
    setIsCommentMode,
    onUpdateLineComment,
    activeScale = 1,
}) => {
    const paperRef = useRef<HTMLDivElement>(null);

    return (
        <div
            id={`wikilink-${encodeURIComponent(doc?.name || '')}`}
            data-doc-id={docId}
            ref={node => {
                (paperRef as any).current = node;
                if (isActive) {
                    if (typeof scrollRef === 'function') scrollRef(node);
                    else if (scrollRef) (scrollRef as any).current = node;
                }
            }}
            onScroll={isActive ? onScroll : undefined}
            className={`
                ${isPrinting
                    ? `print-paper bg-white shadow-2xl mx-auto paper-${paperSize.toLowerCase()} paper-${orientation} margin-${margin} relative`
                    : `flex-1 w-full h-full overflow-auto print:overflow-visible custom-scrollbar bg-white dark:bg-slate-900 transition-colors duration-200`}
                ${isVisibleOnScreen ? 'block' : 'hidden'} 
                ${!isVisibleOnScreen && isVisibleInPrint ? 'print:block' : 'print:hidden'} 
                ${!isActive && !isVisibleInPrint ? 'tab-inactive' : ''} 
                print:static print:p-0 print:shadow-none print:ring-0
            `}
        >
            <div className={isPrinting ? 'prose-container relative h-full min-h-full' : 'max-w-4xl mx-auto px-8 pb-4 lg:pt-12 lg:px-12 lg:pb-6 min-h-full print:p-0'}>
                <MarkdownPreview
                    content={doc?.mode === 'mermaid' ? `\`\`\`mermaid\n${doc.content}\n\`\`\`` : (doc?.content ?? '')}
                    previewTheme={previewTheme}
                    isDarkMode={isDarkMode}
                    documents={documents}
                    onSelectDocument={onSelectDocument}
                    onCreateMissing={onCreateMissing}
                    currentDocId={docId}
                    isPrinting={isPrinting}
                    printSessionId={printSessionId}
                    isMergedPrint={isMergedPrint}
                    isCommentMode={isCommentMode}
                    setIsCommentMode={setIsCommentMode}
                    onUpdateLineComment={onUpdateLineComment}
                    activeScale={activeScale}
                />
            </div>
        </div>
    );
};

// 導入獨立元件避免在 forwardRef 內部的條件分支中呼叫 hooks（違反 Rules of Hooks）
// activatedDocIds 追蹤「已被用戶訪問過的 tab」，尚未訪問的 tab 不會在背景被渲染
// 這就消除了 MathJax 在 display:none 容器中渲染時發生的 null DOM 錯誤
interface MarkdownPreviewSectionProps {
    markdownDocIds: string[];
    currentDocId?: string | null;
    documents?: any[];
    theme: any;
    isDarkMode: boolean;
    code: string;
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    scrollRef: React.Ref<HTMLDivElement>;
    printSettings: any;
    isPrinting?: boolean;
    printSessionId?: number;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
}

const MarkdownPreviewSection: React.FC<MarkdownPreviewSectionProps> = ({
    markdownDocIds,
    currentDocId,
    documents,
    theme,
    isDarkMode,
    code,
    onSelectDocument,
    onCreateMissing,
    onScroll,
    onMouseEnter,
    onMouseLeave,
    scrollRef,
    printSettings,
    isPrinting = false,
    printSessionId = 0,
    isCommentMode,
    setIsCommentMode,
    onUpdateLineComment,
}) => {
    // 當前文件物件
    const currentDoc = documents?.find((d: any) => d.id === currentDocId);
    const { mergeVaultOnPdfExport, paperSize, orientation, margin } = printSettings;

    // 計算紙張的原始寬高 (px)
    const getPaperSizePx = () => {
        let w = 210, h = 297;
        if (paperSize === 'A3') { w = 297; h = 420; }
        else if (paperSize === 'Letter') { w = 215.9; h = 279.4; }

        if (orientation === 'landscape') [w, h] = [h, w];
        return { w: w * 3.7795, h: h * 3.7795 };
    };
    const paperPx = getPaperSizePx();

    // 「已啟動 docId」：記錄曾被訪問過的 tab，只為它們渲染 MarkdownPreview
    const [activatedDocIds, setActivatedDocIds] = useState<Set<string>>(() => {
        const init = new Set<string>();
        if (currentDocId) init.add(currentDocId);
        return init;
    });

    useEffect(() => {
        if (!currentDocId) return;
        setActivatedDocIds(prev => {
            if (prev.has(currentDocId)) return prev;
            const next = new Set(prev);
            next.add(currentDocId);
            return next;
        });
    }, [currentDocId]);

    // 決定要渲染的文件列表
    const docsToRenderIds = useMemo(() => {
        const isMergedActive = isPrinting && mergeVaultOnPdfExport && currentDoc?.folderId;

        // 修正：只有當開啟了「合併列印 (PDF)」且處於列印狀態時，才讀取整個資料夾的文件
        if (isMergedActive) {
            return (documents ?? [])
                .filter((d: any) => d.folderId === currentDoc.folderId && (d.mode === 'markdown' || d.mode === 'mermaid'))
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.updatedAt - b.updatedAt)
                .map((d: any) => d.id);
        }

        // 如果正在列印，且非合併模式，則只渲染當前文件
        if (isPrinting) {
            return [currentDocId].filter(Boolean) as string[];
        }

        // 否則，渲染所有已啟動的分頁（背景快取用）
        return markdownDocIds.filter(id => activatedDocIds.has(id));
    }, [mergeVaultOnPdfExport, currentDoc?.folderId, documents, markdownDocIds, activatedDocIds, isPrinting, currentDocId]);

    return (
        <>
            {isPrinting && (
                <style>
                    {`
                    @media print {
                        @page {
                            size: ${paperSize.toLowerCase()} ${orientation};
                            margin: 0 !important;
                        }
                    }
                    `}
                </style>
            )}
            <section
                className="flex-1 min-w-0 flex flex-col bg-slate-100 dark:bg-slate-950 relative overflow-hidden group/preview transition-colors duration-200 preview-panel print:overflow-visible print:bg-white print:h-auto"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div
                    className={`flex-1 relative ${isPrinting ? 'overflow-auto' : 'overflow-hidden'} print:overflow-visible print:h-auto print:static print:p-0`}
                >
                    <div className="w-full h-full">
                        <div className={isPrinting ? 'print-preview-container flex flex-col gap-8 print:block print:h-auto' : 'w-full h-full'}>
                            {docsToRenderIds.map(docId => {
                                const doc = documents?.find((d: any) => d.id === docId);
                                const isActive = docId === currentDocId;
                                const isMergedMode = mergeVaultOnPdfExport && currentDoc?.folderId;
                                const isVisibleOnScreen = isActive;
                                const isVisibleInPrint = isMergedMode || isActive;

                                return (
                                    <PrintPaper
                                        key={docId}
                                        docId={docId}
                                        doc={doc}
                                        paperPx={paperPx}
                                        paperSize={paperSize}
                                        orientation={orientation}
                                        margin={margin}
                                        isActive={isActive}
                                        isVisibleOnScreen={isVisibleOnScreen}
                                        isVisibleInPrint={isVisibleInPrint}
                                        isPrinting={isPrinting}
                                        printSessionId={printSessionId}
                                        isMergedPrint={isMergedMode}
                                        previewTheme={printSettings.previewTheme}
                                        theme={theme}
                                        isDarkMode={isDarkMode}
                                        documents={documents}
                                        onSelectDocument={onSelectDocument}
                                        onCreateMissing={onCreateMissing}
                                        onScroll={onScroll}
                                        scrollRef={scrollRef}
                                        isCommentMode={isCommentMode}
                                        setIsCommentMode={setIsCommentMode}
                                        onUpdateLineComment={onUpdateLineComment}
                                        activeScale={1}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

interface PreviewPanelProps {
    mode: 'mermaid' | 'markdown';
    error: string | null;
    setError: (error: string | null) => void;
    svgContent: string;
    zoom: number;
    position: { x: number; y: number };
    isDragging: boolean;
    onZoom: (delta: number) => void;
    onSetZoom: (zoom: number) => void;
    onResetNav: () => void;
    // Mouse event handlers passed from parent hook
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onWheel: (e: React.WheelEvent) => void;
    code: string;
    theme: any; // Needed for markdown
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    isDarkMode: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    documents?: any[];
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    currentDocId?: string | null;
    // CSS 快取渲染用：所有已開啟分頁的 id 列表
    openDocIds?: string[];
    printSettings: any;
    isPrinting?: boolean;
    printSessionId?: number;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
}

const PreviewPanel = forwardRef<HTMLDivElement, PreviewPanelProps>(({
    mode,
    error,
    setError,
    svgContent,
    zoom,
    position,
    isDragging,
    onZoom,
    onSetZoom,
    onResetNav,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    code,
    theme,
    onScroll,
    isDarkMode,
    onMouseEnter,
    onMouseLeave,
    documents,
    onSelectDocument,
    onCreateMissing,
    currentDocId,
    openDocIds,
    printSettings,
    isPrinting,
    printSessionId,
    isCommentMode,
    setIsCommentMode,
    onUpdateLineComment,
}, ref) => {
    const [isHUDExpanded, setIsHUDExpanded] = useState(false);
    const hudRef = useRef<HTMLDivElement>(null);

    // 處理點擊外部收合
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (hudRef.current && !hudRef.current.contains(event.target as Node)) {
                setIsHUDExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // DIFFERENT LAYOUT STRATEGY BASED ON MODE
    // 只有在「列印中」時，才允許 Mermaid 模式進入合併文件佈局
    const isMergedMode = isPrinting && printSettings.mergeVaultOnPdfExport && !!currentDocId && !!documents?.find((d: any) => d.id === currentDocId)?.folderId;

    if (mode === 'markdown' || isMergedMode) {
        const markdownDocIds = (openDocIds ?? [currentDocId].filter(Boolean) as string[])
            .filter(id => {
                const doc = documents?.find((d: any) => d.id === id);
                return doc?.mode === 'markdown' || (isMergedMode && doc?.mode === 'mermaid');
            });

        return (
            <MarkdownPreviewSection
                markdownDocIds={markdownDocIds}
                currentDocId={currentDocId}
                documents={documents}
                theme={theme}
                isDarkMode={isDarkMode}
                code={code}
                onSelectDocument={onSelectDocument}
                onCreateMissing={onCreateMissing}
                onScroll={onScroll}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                scrollRef={ref}
                printSettings={printSettings}
                isPrinting={isPrinting}
                printSessionId={printSessionId}
                isCommentMode={isCommentMode}
                setIsCommentMode={setIsCommentMode}
                onUpdateLineComment={onUpdateLineComment}
            />
        );
    }

    return (
        <section
            className={`flex-1 min-w-0 flex flex-col ${isDarkMode ? 'bg-black' : 'bg-white'} relative overflow-hidden group/preview transition-colors duration-500 preview-panel`}
            onWheel={onWheel}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {error && (
                <div className="absolute top-6 left-6 right-6 z-40 flex flex-col gap-3 p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-800 dark:text-red-200 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle size={20} /></div>
                        <div className="text-xs flex-1">
                            <p className="font-black text-sm mb-1 uppercase tracking-tight">Syntax Error Detected</p>
                            <p className="opacity-80 leading-relaxed font-mono whitespace-pre-wrap break-all">{error}</p>
                        </div>
                        <button onClick={() => setError(null)}
                            aria-label="清除錯誤提示"
                            className="shrink-0 text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Smart HUD Control Hub (精緻優化版 - 固定高度與品牌化深色模式) */}
            <div
                ref={hudRef}
                className={`
                    absolute bottom-10 right-8 z-30 flex items-center h-12 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isHUDExpanded
                        ? 'bg-white/95 dark:bg-slate-900/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),0_0_30px_rgba(14,165,233,0.1)] px-3 rounded-full border border-slate-300 dark:border-white/20'
                        : 'bg-white/60 dark:bg-slate-950/40 shadow-xl p-1.5 rounded-full border border-white/30 dark:border-white/10'
                    }
                    backdrop-blur-3xl group/hud-container
                `}
            >
                {/* 1. 呼吸燈 (觸發源) */}
                <button
                    onClick={() => setIsHUDExpanded(!isHUDExpanded)}
                    className={`
                        relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300
                        ${isHUDExpanded ? 'bg-slate-100/80 dark:bg-slate-800/80' : 'hover:bg-white/80 dark:hover:bg-slate-700/50'}
                    `}
                    title={isHUDExpanded ? "收合資訊" : "顯示詳情"}
                >
                    <div className={`
                        w-2.5 h-2.5 rounded-full transition-all duration-500
                        ${error
                            ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse'
                            : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)] animate-pulse'
                        }
                    `} />
                </button>

                {/* 按鈕組 (放大/縮小/重置) - 始終顯示，排列穩定 */}
                <div className={`flex items-center gap-0.5 ${isHUDExpanded ? 'ml-1 pr-3 border-r border-slate-200 dark:border-white/10' : 'ml-0.5'}`}>
                    <button onClick={() => onZoom(25)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-100 hover:text-brand-primary dark:hover:text-brand-primary transition-all active:scale-90"
                        title="放大"><ZoomIn size={18} /></button>
                    <button onClick={() => onZoom(-25)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-100 hover:text-brand-primary dark:hover:text-brand-primary transition-all active:scale-90"
                        title="縮小"><ZoomOut size={18} /></button>
                    <button onClick={onResetNav}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-100 hover:text-brand-primary dark:hover:text-brand-primary transition-all active:scale-90"
                        title="跳轉至中心"><Maximize size={18} /></button>
                </div>

                {/* 2. 展開區域 (純水平展開，維持高度穩定) */}
                <div className={`
                    flex items-center gap-5 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isHUDExpanded ? 'max-w-md opacity-100 ml-4 mr-2' : 'max-w-0 opacity-0'}
                `}>
                    {/* Zoom Input */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Zoom</span>
                        <div className="relative">
                            <input
                                type="text"
                                value={`${Math.round(zoom)}%`}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val) onSetZoom(Math.min(Math.max(parseInt(val), 5), 1000));
                                }}
                                className="w-16 bg-slate-100 dark:bg-white/10 text-brand-primary font-bold text-[11px] px-2 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-brand-primary/30 text-center transition-all tabular-nums placeholder:opacity-30"
                            />
                        </div>
                    </div>

                    {/* Position Display */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Cursor</span>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-50 tabular-nums bg-slate-100 dark:bg-white/10 px-2.5 py-1.5 rounded-lg">
                            <span className="opacity-30">X</span>
                            <span className="min-w-[2.2rem] text-right font-bold">{Math.round(position.x)}</span>
                            <span className="w-px h-2 bg-slate-400 dark:bg-white/20 mx-1"></span>
                            <span className="opacity-30">Y</span>
                            <span className="min-w-[2.2rem] text-right font-bold">{Math.round(position.y)}</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Main Viewport */}
            <div
                className={`flex-1 overflow-hidden relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                style={{
                    backgroundColor: isDarkMode ? 'var(--brand-surface)' : '#ffffff',
                    backgroundImage: isDarkMode
                        ? `linear-gradient(rgba(56, 189, 248, 0.15) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(56, 189, 248, 0.15) 1px, transparent 1px)`
                        : `linear-gradient(rgba(0, 0, 0, 0.07) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(0, 0, 0, 0.07) 1px, transparent 1px)`,
                    backgroundSize: '32px 32px'
                }}
            >
                <div
                    ref={ref}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    {/* Mermaid Preview */}
                    {svgContent ? (
                        <div
                            className="bg-white dark:bg-slate-900/95 p-16 rounded-[2.5rem] shadow-2xl dark:shadow-[0_0_100px_rgba(56,189,248,0.15),0_0_1px_rgba(56,189,248,0.2)] border border-slate-200/50 dark:border-white/5 transition-all duration-300 ease-out pointer-events-auto print:p-0 print:rounded-none print:shadow-none print:border-none print:bg-transparent print:dark:bg-transparent"
                            style={{ transform: `scale(${zoom / 100})` }}
                            dangerouslySetInnerHTML={{ __html: svgContent }}
                        />
                    ) : !error && (
                        <div className="text-slate-400 text-center flex flex-col items-center">
                            <div className="relative mb-6">
                                <RefreshCw size={64} className="opacity-10 animate-spin duration-[3s]" />
                                <Sparkles size={32} className="absolute inset-0 m-auto text-brand-primary/30 animate-pulse" />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-40">編譯圖表</p>
                        </div>
                    )}

                    {error && !svgContent && (
                        <div className="text-slate-300 text-center flex flex-col items-center max-w-sm">
                            <AlertCircle size={80} className="mb-6 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-40">Awaiting Valid Syntax</p>
                            <p className="text-xs mt-2 font-medium opacity-30">The editor will refresh automatically once errors are resolved.</p>
                        </div>
                    )}
                </div>
            </div>


        </section>
    );
});

export default PreviewPanel;
