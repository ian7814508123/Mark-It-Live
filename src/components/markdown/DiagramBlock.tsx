import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { hashString } from '../../utils';
import { usePersistentCanvasSettings } from '../../hooks/usePersistentCanvasSettings';
import { useDebounce } from '../../hooks/useDebounce';
import { ResizableWrapper } from '../ui/ResizableWrapper';

interface DiagramBlockProps {
    code: string;
    type: string;
    isDarkMode: boolean;
    isPrinting?: boolean;
    printSessionId?: number;
    /** 渲染函數：由具體圖表類型提供，可選返回清理函數以釋放資源 */
    render: (container: HTMLDivElement, code: string, isDark: boolean) => Promise<(() => void) | void> | ((() => void) | void);
    /** 渲染完成後附加互動事件的 callback（不觸發重新渲染） */
    attachInteractivity?: (container: HTMLDivElement) => void;
    /** 錯誤訊息標題 */
    errorTitle?: string;
    /** 容器類名 (可選) */
    containerClassName?: string;
}

/**
 * DiagramBlock: 統一的圖表容器組件
 */
const DiagramBlock: React.FC<DiagramBlockProps> = React.memo(({
    code,
    type,
    isDarkMode,
    isPrinting,
    printSessionId = 0,
    render,
    attachInteractivity,
    errorTitle = 'Rendering Error',
    containerClassName = ''
}) => {
    const isActuallyPrinting = !!isPrinting;
    const isDark = isDarkMode && !isActuallyPrinting;

    const containerRef = useRef<HTMLDivElement>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastValidHtml = useRef<string | null>(null);
    const isMounted = useRef(true);

    const initialWidth = useMemo(() => {
        const widthMatch = code.match(/%%\s*width:\s*(\d+)%/i);
        return widthMatch ? `${widthMatch[1]}%` : '100%';
    }, [code]);

    const initialAlign = useMemo(() => {
        const alignMatch = code.match(/%%\s*align:\s*(left|center|right)/i);
        return alignMatch ? alignMatch[1] : 'center';
    }, [code]);

    const storageKey = useMemo(() => `chart-size-${type}:${hashString(code)}`, [type, code]);

    const {
        width,
        align,
        updateWidth,
        updateAlign,
        reset
    } = usePersistentCanvasSettings(storageKey, initialWidth, initialAlign);

    const debouncedCode = useDebounce(code, 400);
    const renderCode = isPrinting ? code : debouncedCode;

    const storageKeyRef = useRef(storageKey);
    storageKeyRef.current = storageKey;
    const printSessionIdRef = useRef(printSessionId);
    printSessionIdRef.current = printSessionId;

    const notifyReady = useCallback(() => {
        window.dispatchEvent(new CustomEvent('content-layout-ready'));
        window.dispatchEvent(new CustomEvent('diagram-render-complete', {
            detail: { blockId: storageKeyRef.current, printSessionId: printSessionIdRef.current }
        }));
    }, []);

    // 使用 Ref 儲存 render 與 attachInteractivity 函數，避免 callback 參考漂移觸發重繪
    const renderRef = useRef(render);
    renderRef.current = render;
    const attachInteractivityRef = useRef(attachInteractivity);
    attachInteractivityRef.current = attachInteractivity;

    useEffect(() => {
        if (!renderCode) return;

        setIsPending(true);
        setError(null);

        // 儲存渲染產生的清理函數（如 Vega view.finalize()）
        let cleanupFn: (() => void) | undefined;

        const timer = setTimeout(async () => {
            if (!containerRef.current) return;
            isMounted.current = true;
            try {
                const result = await renderRef.current(containerRef.current, renderCode, isDark);
                // 如果 render 函數返回了清理函數，儲存起來供 useEffect cleanup 使用
                if (typeof result === 'function') {
                    cleanupFn = result;
                }
                if (isMounted.current) {
                    lastValidHtml.current = containerRef.current.innerHTML;
                    setError(null);
                    // 渲染完成後，呼叫互動事件附加函數（不受 renderCode 快取影響）
                    if (containerRef.current) {
                        attachInteractivityRef.current?.(containerRef.current);
                    }
                    notifyReady();
                }
            } catch (err: any) {
                console.error(`${type} render error:`, err);
                if (isMounted.current) {
                    setError(err.message || 'Syntax Error');
                    if (containerRef.current && containerRef.current.innerHTML === '' && lastValidHtml.current) {
                        containerRef.current.innerHTML = lastValidHtml.current;
                    }
                    notifyReady();
                }
            } finally {
                if (isMounted.current) {
                    setIsPending(false);
                }
            }
        }, 50);

        return () => {
            isMounted.current = false;
            clearTimeout(timer);
            // 執行渲染器提供的清理函數（例如 Vega view.finalize()），防止記憶體洩漏
            cleanupFn?.();
        };
    }, [renderCode, isDark, type, notifyReady, isActuallyPrinting]);

    // 列印模式：套用使用者調整的 width 與 align，確保列印結果與預覽一致
    if (isActuallyPrinting) {
        return (
            <div
                className={`chart-wrapper align-${align} ${containerClassName} relative ${error ? 'print:hidden' : ''}`}
            >
                <div
                    className="chart-content"
                    style={{ width }}
                >
                    <div
                        data-diagram-id={storageKey}
                        className="diagram-block-container flex p-6 rounded-2xl border border-slate-200 relative flex-col gap-4"
                        style={{
                            backgroundColor: 'var(--code-bg)',
                            justifyContent: 'center',
                            printColorAdjust: 'exact',
                            WebkitPrintColorAdjust: 'exact'
                        } as any}
                    >
                        <div ref={containerRef} className={`w-full h-full flex justify-center ${error ? 'hidden' : ''}`} />
                        {error && (
                            <div className="p-3 bg-red-50/95 dark:bg-red-900/60 rounded-xl border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[11px] font-mono shadow-sm w-full">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                                    <span className="font-bold uppercase tracking-wider">{errorTitle}</span>
                                </div>
                                <div className="opacity-90 whitespace-pre-wrap">
                                    {error}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={`group/diagram-wrapper w-full ${error ? 'print:hidden' : ''}`}>
            <ResizableWrapper
                width={width}
                align={align}
                onWidthChange={updateWidth}
                onAlignChange={updateAlign}
                onReset={reset}
                isDarkMode={isDarkMode}
            >
                <div
                    data-diagram-id={storageKey}
                    className={`diagram-block-container flex p-6 rounded-2xl shadow-sm border overflow-hidden transition-opacity duration-300 relative ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'} ${isPending ? 'opacity-50' : 'opacity-100'} ${containerClassName}`}
                    style={{
                        width: '100%',
                        height: 'auto',
                        backgroundColor: 'var(--code-bg)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div ref={containerRef} className={`w-full h-full flex justify-center ${error ? 'hidden' : ''}`} />
                </div>
                {isPending && (
                    <div className="absolute top-2 right-2">
                        <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </ResizableWrapper>

            {error && (
                <div className="-mt-4 mx-4 mb-2 p-3 bg-red-50/95 dark:bg-red-900/60 backdrop-blur-md rounded-xl border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[11px] font-mono shadow-xl animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-bold uppercase tracking-wider">{errorTitle}</span>
                    </div>
                    <div className="opacity-90 line-clamp-3 hover:line-clamp-none transition-all cursor-default whitespace-pre-wrap">
                        {error}
                    </div>
                </div>
            )}
        </div>
    );
});

export default DiagramBlock;
