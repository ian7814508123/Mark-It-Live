import React, { forwardRef, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AlertCircle, Trash2, RefreshCw } from '../ui/Icons';
import MarkdownPreview from '../markdown/MarkdownPreview';
import InteractiveLogo from '../ui/InteractiveLogo';
import MermaidGlobalToolbar from '../markdown/MermaidGlobalToolbar';
import MermaidContextToolbar from '../markdown/MermaidContextToolbar';
import { MermaidDiagramType, SequenceElement, FlowchartManipulator, SequenceManipulator, detectDiagramType, findNodeLine } from '../../utils/mermaid';

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
    previewTheme: import('../../config/previewThemes').PreviewTheme;
    isDarkMode: boolean;
    documents: any[];
    onSelectDocument?: (docId: string) => void;
    onCreateMissing?: (name: string) => void;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    scrollRef?: React.Ref<HTMLDivElement>;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
    onUpdateContent?: (docId: string, content: string) => void;
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
    isDarkMode,
    documents,
    onSelectDocument,
    onCreateMissing,
    onScroll,
    scrollRef,
    isCommentMode,
    setIsCommentMode,
    onUpdateLineComment,
    onUpdateContent,
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
            <div className={isPrinting ? 'prose-container relative h-auto' : 'max-w-5xl mx-auto px-4 pb-2 lg:pt-1 lg:px-1 lg:pb-2 min-h-full print:p-0'}>
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
                    onUpdateContent={onUpdateContent}
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
    onUpdateContent?: (docId: string, content: string) => void;
}

const MarkdownPreviewSection: React.FC<MarkdownPreviewSectionProps> = ({
    markdownDocIds,
    currentDocId,
    documents,
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
    onUpdateContent,
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
                className={`min-w-[300px] flex flex-col bg-slate-100 dark:bg-slate-950 relative group/preview transition-colors duration-200 preview-panel print:overflow-visible print:bg-white print:h-auto print:block print:static ${isPrinting ? 'w-full' : 'flex-1 overflow-hidden'}`}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <div
                    className={`relative flex-1 print:overflow-visible print:h-auto print:static print:p-0 ${isPrinting ? 'block' : 'overflow-hidden'}`}
                >
                    <div className={`w-full print:h-auto ${isPrinting ? 'h-auto block' : 'h-full'}`}>
                        <div className={isPrinting ? 'print-preview-container flex flex-col gap-8 print:block print:h-auto' : 'w-full h-full'}>
                            {docsToRenderIds.map(docId => {
                                const doc = documents?.find((d: any) => d.id === docId);
                                const isActive = docId === currentDocId;
                                const isMergedMode = isPrinting && mergeVaultOnPdfExport && currentDoc?.folderId;
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
                                        isDarkMode={isDarkMode}
                                        documents={documents}
                                        onSelectDocument={onSelectDocument}
                                        onCreateMissing={onCreateMissing}
                                        onScroll={onScroll}
                                        scrollRef={scrollRef}
                                        isCommentMode={isCommentMode}
                                        setIsCommentMode={setIsCommentMode}
                                        onUpdateLineComment={onUpdateLineComment}
                                        onUpdateContent={onUpdateContent}
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
    /** Markdown 預覽主題，用於 Mermaid 模式下將主題 class 注入至 SVG 容器 */
    previewTheme?: import('../../config/previewThemes').PreviewTheme;
    isPrinting?: boolean;
    printSessionId?: number;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
    onUpdateContent?: (docId: string, content: string) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onGoToLine?: (line: number) => void;
    activeScale?: number;
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
    previewTheme = 'default',
    isPrinting,
    printSessionId,
    isCommentMode,
    setIsCommentMode,
    onUpdateLineComment,
    onUpdateContent,
    onUndo,
    onRedo,
    onGoToLine,
    activeScale = 1,
}, ref) => {
    // 編輯器狀態
    const [isPanMode, setIsPanMode] = useState(false);
    const isPanModeRef = useRef(isPanMode);
    isPanModeRef.current = isPanMode;

    // 節點選取、連線、以及 Sequence 元素選取狀態
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedNodePos, setSelectedNodePos] = useState<{ x: number, y: number, isNearTop?: boolean } | null>(null);
    const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
    const [sequenceElement, setSequenceElement] = useState<SequenceElement | null>(null);
    const connectingRef = useRef(connectingFromNodeId);
    connectingRef.current = connectingFromNodeId;

    const svgContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 判斷當前編輯器是否為空狀態（無文字內容）
    const isTextEmpty = !code || code.trim() === '';

    // 取消選取（清除所有圖類型的選取狀態）
    const clearSelection = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedNodePos(null);
        setConnectingFromNodeId(null);
        setSequenceElement(null);
    }, []);

    // 當模式改變或內容為空時，清除選取
    useEffect(() => {
        if (isTextEmpty || isPanMode) {
            clearSelection();
        }
    }, [isTextEmpty, isPanMode, clearSelection]);

    // 偵測目前 Mermaid 圖表類型（驅動對應的工具列內容）
    const diagramType = useMemo<MermaidDiagramType>(
        () => detectDiagramType(code),
        [code]
    );
    // 向下相容：click handler 與 Context Toolbar 仍只對 flowchart 啟用節點編輯
    const isFlowchart = diagramType === 'flowchart';

    const currentDirection = useMemo(() => FlowchartManipulator.getDirection(code), [code]);

    // 用 ref 確保事件代理中永遠能讀取到最新的屬性，避免 stale closures
    const mermaidContextRef = useRef({ code, currentDocId, onUpdateContent, zoom, position, diagramType });
    useEffect(() => {
        mermaidContextRef.current = { code, currentDocId, onUpdateContent, zoom, position, diagramType };
    }, [code, currentDocId, onUpdateContent, zoom, position, diagramType]);

    // ─── Mermaid 模式：事件代理 ──────────────────────────────────────────────────
    // 綁定在 svgContainerRef 上，避免因 Mermaid 重新渲染而遺失綁定的事件，也解決 stale closures
    useEffect(() => {
        const container = svgContainerRef.current;
        if (!container || mode !== 'mermaid') return;

        const getTargetNode = (e: MouseEvent) => (e.target as Element).closest('g.node') as HTMLElement | null;

        const extractNodeId = (rawId: string) => {
            const match = rawId.match(/^flowchart-([^-]+)-/);
            if (match) return match[1];
            if (rawId.startsWith('flowchart-')) return rawId.split('-')[1];
            return rawId;
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (isPanModeRef.current) return;
            const { diagramType: dt } = mermaidContextRef.current;
            if (dt === 'flowchart') {
                const nodeEl = getTargetNode(e);
                if (nodeEl) e.stopPropagation();
            } else if (dt === 'sequence') {
                const actorEl = (e.target as Element).closest('g.actor');
                const msgEl = (e.target as Element).closest('text.messageText');
                if (actorEl || msgEl) e.stopPropagation();
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (isPanModeRef.current) return;
            const { diagramType: dt } = mermaidContextRef.current;
            if (dt === 'flowchart') {
                const nodeEl = getTargetNode(e);
                if (nodeEl) {
                    e.stopPropagation();
                    const rawId = nodeEl.id;
                    const nodeId = extractNodeId(rawId);
                    if (connectingRef.current) {
                        // 連線模式：建立連線
                        if (onUpdateContent && currentDocId && connectingRef.current !== nodeId) {
                            const newCode = FlowchartManipulator.addLink(code, connectingRef.current, nodeId);
                            onUpdateContent(currentDocId, newCode);
                        }
                        setConnectingFromNodeId(null);
                        setSelectedNodeId(null);
                        setSelectedNodePos(null);
                    } else {
                        // 一般點擊：選取節點
                        setSelectedNodeId(nodeId);

                        // 計算節點位置，用於顯示 Context Toolbar
                        const rect = nodeEl.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();

                        // 判斷是否太靠近畫布頂部（包含全局工具列的高度與間距，約 100px）
                        // 我們以整個編輯區塊 viewportRect 為基準
                        const viewportEl = container.closest('.relative.flex-1') as HTMLElement;
                        const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : containerRect;
                        const isNearTop = (rect.top - viewportRect.top) < 100;

                        // 由於外層有 zoom (transform: scale)，需要還原成相對於 SVG 容器的真實座標
                        const scale = zoom / 100;
                        setSelectedNodePos({
                            x: (rect.left - containerRect.left + rect.width / 2) / scale,
                            y: isNearTop
                                ? (rect.bottom - containerRect.top) / scale // 靠近頂部，放在節點下方
                                : (rect.top - containerRect.top) / scale,   // 正常，放在節點上方
                            isNearTop
                        });
                    }
                } else {
                    clearSelection();
                }
            } else if (dt === 'sequence') {
                const actorEl = (e.target as Element).closest('g.actor') as HTMLElement | null;
                const msgEl = (e.target as Element).closest('text.messageText') as SVGElement | null;

                if (actorEl) {
                    e.stopPropagation();
                    // 解析 actor 名稱
                    const textEl = actorEl.querySelector('text.actor');
                    const actorName = textEl?.textContent?.trim() || '';
                    if (actorName) {
                        setSequenceElement({ type: 'actor', name: actorName });

                        // 計算定位
                        const rect = actorEl.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const viewportEl = container.closest('.relative.flex-1') as HTMLElement;
                        const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : containerRect;
                        const isNearTop = (rect.top - viewportRect.top) < 100;
                        const scale = zoom / 100;

                        setSelectedNodePos({
                            x: (rect.left - containerRect.left + rect.width / 2) / scale,
                            y: isNearTop
                                ? (rect.bottom - containerRect.top) / scale
                                : (rect.top - containerRect.top) / scale,
                            isNearTop
                        });
                    }
                } else if (msgEl) {
                    e.stopPropagation();
                    // 解析 message 內容
                    const msgText = msgEl.textContent?.trim() || '';
                    if (msgText) {
                        // 找到這個 message 在 sequence 中的箭頭類型
                        const arrowType = SequenceManipulator.findMessageArrow(code, msgText) || undefined;
                        setSequenceElement({ type: 'message', name: msgText, arrowType });

                        // 計算定位
                        const rect = msgEl.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const viewportEl = container.closest('.relative.flex-1') as HTMLElement;
                        const viewportRect = viewportEl ? viewportEl.getBoundingClientRect() : containerRect;
                        const isNearTop = (rect.top - viewportRect.top) < 100;
                        const scale = zoom / 100;

                        setSelectedNodePos({
                            x: (rect.left - containerRect.left + rect.width / 2) / scale,
                            y: isNearTop
                                ? (rect.bottom - containerRect.top) / scale
                                : (rect.top - containerRect.top) / scale,
                            isNearTop
                        });
                    }
                } else {
                    clearSelection();
                }
            }
        };

        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('click', handleClick);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('click', handleClick);
        };
    }, [mode, !!svgContent, clearSelection]); // 當 svgContent 首次出現時 (從 null 變有值) 需要重新綁定

    // ─── 選中狀態 DOM 類別同步 ──────────────────────────────────────────────────
    useEffect(() => {
        const container = svgContainerRef.current;
        if (!container || mode !== 'mermaid') return;

        // 清除所有舊的選中狀態
        container.querySelectorAll('.node, .actor, text.messageText').forEach(el => {
            el.classList.remove('selected-node');
        });

        if (selectedNodeId && diagramType === 'flowchart') {
            container.querySelectorAll('g.node').forEach(el => {
                const rawId = el.id;
                const match = rawId.match(/^flowchart-([^-]+)-/);
                const id = match ? match[1] : (rawId.startsWith('flowchart-') ? rawId.split('-')[1] : rawId);
                if (id === selectedNodeId) {
                    el.classList.add('selected-node');
                }
            });
        } else if (sequenceElement && diagramType === 'sequence') {
            if (sequenceElement.type === 'actor') {
                container.querySelectorAll('g.actor').forEach(el => {
                    const textEl = el.querySelector('text.actor');
                    const actorName = textEl?.textContent?.trim() || '';
                    if (actorName === sequenceElement.name) {
                        el.classList.add('selected-node');
                    }
                });
            } else if (sequenceElement.type === 'message') {
                container.querySelectorAll('text.messageText').forEach(el => {
                    const msgText = el.textContent?.trim() || '';
                    if (msgText === sequenceElement.name) {
                        el.classList.add('selected-node');
                    }
                });
            }
        }
    }, [selectedNodeId, sequenceElement, diagramType, svgContent, mode]);

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
                onUpdateContent={onUpdateContent}
            />
        );
    }

    return (
        <section
            ref={containerRef}
            className={`min-w-[300px] flex flex-col flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'} relative group/preview transition-colors duration-500 preview-panel print:block print:overflow-visible print:bg-white print:static print:h-auto ${isPrinting ? '' : 'overflow-hidden'}`}
            onWheel={onWheel}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Mermaid Global Toolbar */}
            {mode === 'mermaid' && (
                <MermaidGlobalToolbar
                    constraintsRef={containerRef}
                    isTextEmpty={isTextEmpty}
                    isPanMode={isPanMode}
                    setIsPanMode={setIsPanMode}
                    zoom={zoom}
                    onZoom={onZoom}
                    onSetZoom={onSetZoom}
                    onResetNav={onResetNav}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    diagramType={diagramType}
                    rawCode={code}
                    onUpdateCode={(newCode) => {
                        if (onUpdateContent && currentDocId) {
                            onUpdateContent(currentDocId, newCode);
                        }
                    }}
                    currentDirection={currentDirection}
                />
            )}
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


            {/* Main Viewport */}
            <div
                className={`relative flex-1 ${!isPanMode
                    ? 'cursor-default'
                    : isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    } print:static print:block print:overflow-visible print:h-auto ${isPrinting ? '' : 'overflow-hidden'}`}
                onMouseDown={isPanMode ? onMouseDown : undefined}
                onMouseMove={isPanMode ? onMouseMove : undefined}
                onMouseUp={isPanMode ? onMouseUp : undefined}
                onMouseLeave={isPanMode ? onMouseUp : undefined}
                onClick={clearSelection}
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
                    className="absolute inset-0 flex items-center justify-center pointer-events-none print:static print:transform-none print:h-auto print:block print:overflow-visible"
                    style={{
                        transform: isPrinting ? 'none' : `translate(${position.x}px, ${position.y}px)`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    {/* Mermaid Preview */}
                    {svgContent ? (
                        <div className="relative pointer-events-auto">
                            {mode === 'mermaid' && (isFlowchart || diagramType === 'sequence') && (
                                <MermaidContextToolbar
                                    diagramType={diagramType}
                                    nodeId={selectedNodeId}
                                    sequenceElement={sequenceElement}
                                    position={selectedNodePos}
                                    zoom={zoom}
                                    onClose={() => clearSelection()}
                                    rawCode={code}
                                    onUpdateCode={(newCode) => {
                                        if (onUpdateContent && currentDocId) {
                                            onUpdateContent(currentDocId, newCode);
                                        }
                                    }}
                                    onStartConnect={() => {
                                        setConnectingFromNodeId(selectedNodeId);
                                    }}
                                    onGoToCode={() => {
                                        if (!onGoToLine || !code) return;
                                        const target = diagramType === 'sequence'
                                            ? sequenceElement?.name
                                            : selectedNodeId;
                                        if (target) {
                                            const lineNum = findNodeLine(code, target, diagramType);
                                            if (lineNum) onGoToLine(lineNum);
                                        }
                                    }}
                                    onUpdateSequenceElement={(elem) => {
                                        setSequenceElement(elem);
                                    }}
                                />
                            )}
                            <div
                                ref={svgContainerRef}
                                className={`prose max-w-none transition-all duration-300 ease-out print:static print:transform-none print:block print:max-w-full print:h-auto print:overflow-visible ${previewTheme && previewTheme !== 'default' ? `theme-${previewTheme}` : ''} ${!isPanMode ? 'mermaid-edit-mode' : ''} ${connectingFromNodeId ? 'mermaid-connecting-mode cursor-crosshair' : ''}`}
                                style={{ transform: isPrinting ? 'none' : `scale(${zoom / 100})` }}
                                dangerouslySetInnerHTML={{ __html: svgContent }}
                            />
                        </div>

                    ) : !error && (
                        <div className="text-slate-400 text-center flex flex-col items-center">
                            {/* 保持相對定位，並用 grid 或 flex 讓子元件重疊 */}
                            <div className="relative mb-6 grid place-items-center">
                                {/* 旋轉的重新整理圖示（統一為品牌主色 text-brand-primary，並在深淺色模式下微調 opacity 以獲得最佳對比度） */}
                                <RefreshCw
                                    size={75}
                                    className="text-brand-primary opacity-[0.12] dark:opacity-[0.18] animate-spin col-start-1 row-start-1"
                                    style={{ animationDuration: '2s', animationTimingFunction: 'cubic-bezier(0,.7,1,.66)' }}
                                />

                                {/* 內層的 Logo（統一為品牌主色，增強透明度以形成具深度的視覺焦點） */}
                                <InteractiveLogo
                                    size={40}
                                    showBg={false}
                                    loading={true}
                                    className="opacity-[0.25] dark:opacity-[0.35] pointer-events-none col-start-1 row-start-1"
                                />
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
