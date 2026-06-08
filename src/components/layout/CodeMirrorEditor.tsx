import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { mermaid } from 'codemirror-lang-mermaid';
import { vscodeDarkInit, vscodeLightInit } from '@uiw/codemirror-theme-vscode';
import { EditorView, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { searchKeymap, search } from '@codemirror/search';

// ─── 型別定義 ─────────────────────────────────────────────────────────────────

interface CodeMirrorEditorProps {
    mode: 'mermaid' | 'markdown';
    code: string;
    setCode: (code: string) => void;
    isDarkMode: boolean;
    onScroll?: (e: any) => void;
    placeholder?: string;
    ariaLabel?: string;
}

interface StickyHeaderNode {
    level: number;  // 1 = H1 … 6 = H6
    text: string;  // 去除 # 符號後的純文字
    pos: number;  // 在 CM 文件中的字元起始位置
}

// ─── 工具：比較兩組 headers ───────────────────────────────────────────────────
function headersEqual(a: StickyHeaderNode[], b: StickyHeaderNode[]): boolean {
    return a.length === b.length && a.every((h, i) =>
        h.pos === b[i].pos &&
        h.text === b[i].text &&
        h.level === b[i].level
    );
}

// ─── Sticky Scroll Extension Builder ─────────────────────────────────────────
// 輕量化的 ViewPlugin：僅用於監聽滾動與文件變化，計算標題鏈，並直接透過 callback 回傳給 React。
// 採用 mapPos 解決打字時頻繁觸發 DOM 重新渲染的效能問題，並改善邊界判斷以完美貼合 VS Code 滾動體驗。
function buildStickyExtension(
    onHeadersChange: (headers: StickyHeaderNode[]) => void
) {
    return ViewPlugin.fromClass(
        class {
            private last: StickyHeaderNode[] = [];
            private scrollListener: () => void;

            constructor(readonly view: EditorView) {
                this.scrollListener = () => {
                    this.checkScroll(this.view);
                };
                // 監聽滾動容器的滾動事件，確保即時響應每一像素的滾動
                this.view.scrollDOM.addEventListener('scroll', this.scrollListener, { passive: true });
            }

            destroy() {
                this.view.scrollDOM.removeEventListener('scroll', this.scrollListener);
            }

            update(update: ViewUpdate) {
                // 當文件內容改變時，將上一組 headers 的 pos 映射到新文件的座標系中
                if (update.docChanged && this.last.length > 0) {
                    this.last = this.last.map(h => ({
                        ...h,
                        pos: update.changes.mapPos(h.pos)
                    }));
                }

                // 當文件內容、高度或視口改變時，必須透過 requestMeasure() 延遲到
                // CodeMirror 安全的 layout 讀取階段才執行，避免在 update 週期中
                // 直接呼叫 lineBlockAtHeight() 等 measured 方法觸發「layout thrashing」錯誤
                if (update.docChanged || update.heightChanged || update.viewportChanged) {
                    update.view.requestMeasure({
                        read: (view) => {
                            this.checkScroll(view);
                            return null;
                        },
                    });
                }
            }

            private checkScroll(view: EditorView) {
                const scrollTop = view.scrollDOM.scrollTop;
                const next: StickyHeaderNode[] = [];

                if (scrollTop > 4) {
                    try {
                        // 取得可視區頂端的行塊
                        const lineBlock = view.lineBlockAtHeight(scrollTop);
                        const topLineNum = view.state.doc.lineAt(lineBlock.from).number;
                        let minLvl = Infinity;

                        // 從頂端行往上回溯，建立由外到內的標題鏈
                        for (let i = topLineNum; i >= 1; i--) {
                            const line = view.state.doc.line(i);
                            const m = line.text.match(/^(#{1,6})\s+(.+)$/);
                            if (m) {
                                const lvl = m[1].length;
                                if (lvl < minLvl) {
                                    // 檢查此標題行是否完全在可視區內
                                    const isTopLine = i === topLineNum;
                                    if (isTopLine) {
                                        // 如果頂端行是標題，且它的 top >= scrollTop，代表完全可見，還沒開始滾出，不納入 sticky scroll
                                        if (lineBlock.top >= scrollTop) {
                                            continue;
                                        }
                                    }

                                    next.unshift({ level: lvl, text: m[2].trim(), pos: line.from });
                                    minLvl = lvl;
                                }
                                if (lvl === 1) break; // H1 是最頂層，找到即停
                            }
                        }
                    } catch (e) {
                        // 避免極端邊界情況下 lineAt 報錯
                        console.error('Sticky Scroll error:', e);
                    }
                }

                // 只在真正有變化時才觸發 React 更新，避免不必要的渲染
                if (!headersEqual(this.last, next)) {
                    this.last = next;
                    onHeadersChange(next);
                }
            }
        }
    );
}

// ─── 主元件 ──────────────────────────────────────────────────────────────────
const CodeMirrorEditor = React.forwardRef<ReactCodeMirrorRef, CodeMirrorEditorProps>((props, ref) => {
    const { mode, code, setCode, isDarkMode, onScroll, placeholder, ariaLabel } = props;
    const wrapperRef = useRef<HTMLDivElement>(null);
    const scrollWrapperRef = useRef<HTMLDivElement>(null);

    // ─── 狀態管理 ───
    const [stickyHeaders, setStickyHeaders] = useState<StickyHeaderNode[]>([]);
    const stickyHeadersRef = useRef<StickyHeaderNode[]>([]);

    useEffect(() => {
        stickyHeadersRef.current = stickyHeaders;
    }, [stickyHeaders]);

    // ─── 測量 CodeMirror 的實際邊界與捲軸寬度，並動態設定為 CSS 變數 ───
    const measure = useCallback(() => {
        if (!wrapperRef.current) return;
        const el = wrapperRef.current.querySelector('.cm-gutters') as HTMLElement | null;
        if (el) {
            wrapperRef.current.style.setProperty('--gutter-w', el.offsetWidth + 'px');
        }
        const scroller = wrapperRef.current.querySelector('.cm-scroller') as HTMLElement | null;
        if (scroller) {
            const scrollbarW = scroller.offsetWidth - scroller.clientWidth;
            wrapperRef.current.style.setProperty('--scrollbar-w', scrollbarW + 'px');
        }
    }, []);

    // 監聽容器大小變化，確保在視窗或外層容器 Resize 時仍能正確測量
    useEffect(() => {
        if (!wrapperRef.current) return;
        measure();
        const obs = new ResizeObserver(measure);
        obs.observe(wrapperRef.current);
        return () => obs.disconnect();
    }, [mode, measure]);

    // 當 stickyHeaders 改變時，自動向右滾動 scrollWrapper 以聚焦最新標題
    useEffect(() => {
        if (scrollWrapperRef.current) {
            const scrollWrapper = scrollWrapperRef.current;
            requestAnimationFrame(() => {
                scrollWrapper.scrollLeft = scrollWrapper.scrollWidth;
            });
        }
    }, [stickyHeaders]);

    // ─── Sticky Scroll Extension（markdown 模式才建立）────────────────────────
    const stickyExtension = useMemo(() => {
        if (mode !== 'markdown') return [];
        return [buildStickyExtension(setStickyHeaders)];
    }, [mode]);

    // ─── Extensions 組裝 ──────────────────────────────────────────────────────
    const extensions = useMemo(() => [
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        EditorView.theme({
            '&': { height: '100%', overflow: 'hidden' },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-content, .cm-gutter': { lineHeight: '1.5' },
            '.cm-gutterElement': { fontStyle: 'italic' },
        }),
        mode === 'mermaid'
            ? mermaid()
            : markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.contentAttributes.of({
            'aria-label': ariaLabel || (mode === 'mermaid' ? 'Mermaid 圖表代碼編輯器' : 'Markdown 內容編輯器'),
        }),
        search({ top: true }),
        keymap.of(searchKeymap),
        EditorView.scrollMargins.of(() => {
            return {
                top: stickyHeadersRef.current.length > 0 ? 22 : 0
            };
        }),
        EditorView.domEventHandlers({
            scroll: (event) => { if (onScroll) onScroll(event); }
        }),
        // 核心：透過 CodeMirror 的更新監聽器 (updateListener) 捕捉 DOM 重建與 geometry 改變，即時同步 gutter 寬度
        EditorView.updateListener.of((update) => {
            if (update.geometryChanged || update.docChanged || update.viewportChanged) {
                measure();
            }
        }),
        ...stickyExtension,
    ], [mode, onScroll, ariaLabel, stickyExtension, measure]);

    const theme = useMemo(() => {
        if (isDarkMode) {
            return vscodeDarkInit({
                settings: {
                    background: '#0F172A',
                    gutterBackground: '#0F172A',
                }
            });
        } else {
            return vscodeLightInit({
                settings: {
                    background: '#ffffff',
                    gutterBackground: '#f5f5f5',
                }
            });
        }
    }, [isDarkMode]);
    const handleChange = useCallback((value: string) => setCode(value), [setCode]);
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        if (onScroll) onScroll(event);
    }, [onScroll]);

    // 點擊麵包屑標題 → 跳回該標題在編輯器的位置
    const handleHeaderClick = useCallback((pos: number) => {
        const cmRef = ref as React.RefObject<ReactCodeMirrorRef>;
        if (cmRef?.current?.view) {
            const view = cmRef.current.view;
            view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 0 }) });
            view.focus();
        }
    }, [ref]);

    // ─── 智能收折演算法與 node 渲染資料計算 ───
    type RenderNode = { type: 'ellipsis' } | { type: 'header'; node: StickyHeaderNode };

    const displayNodes = useMemo<RenderNode[]>(() => {
        const nodes: RenderNode[] = [];
        if (stickyHeaders.length > 4) {
            nodes.push({ type: 'header', node: stickyHeaders[0] });
            nodes.push({ type: 'ellipsis' });
            nodes.push({ type: 'header', node: stickyHeaders[stickyHeaders.length - 3] });
            nodes.push({ type: 'header', node: stickyHeaders[stickyHeaders.length - 2] });
            nodes.push({ type: 'header', node: stickyHeaders[stickyHeaders.length - 1] });
        } else {
            stickyHeaders.forEach(h => nodes.push({ type: 'header', node: h }));
        }
        return nodes;
    }, [stickyHeaders]);

    const collapsedTooltip = useMemo(() => {
        if (stickyHeaders.length <= 4) return '';
        const collapsedList = stickyHeaders.slice(1, -3);
        return `已收折中間層級：` + collapsedList.map(h => `${'#'.repeat(h.level)} ${h.text}`).join(' › ');
    }, [stickyHeaders]);

    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'relative',
                height: '100%',
                width: '100%',
                // VS Code 明/暗主題色票
                ['--sg-bg' as string]: isDarkMode ? '#0F172A' : '#ffffff',
                ['--sg-gutter' as string]: isDarkMode ? '#0F172A' : '#f5f5f5',
                ['--sg-border' as string]: isDarkMode ? '#404040' : '#e0e0e0',
                ['--sg-link' as string]: isDarkMode ? '#9cdcfe' : '#0070c1',
                ['--sg-muted' as string]: isDarkMode ? '#808080' : '#888888',
                ['--sg-active' as string]: isDarkMode ? '#cccccc' : '#1e1e1e',
                ['--sg-sep' as string]: isDarkMode ? '#555555' : '#bbbbbb',
            }}
        >
            {/* React 絕對定位懸浮 Overlay 麵包屑導覽 */}
            {mode === 'markdown' && stickyHeaders.length > 0 && (
                <div
                    className="cm-sticky-scroll-overlay"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 'var(--scrollbar-w, 8px)',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        height: '22px',
                        fontSize: '11px',
                        background: 'var(--sg-bg)',
                        borderBottom: '1px solid var(--sg-border)',
                        boxShadow: '0px 0px 0px rgba(0,0,0,0.12)',
                        fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
                    }}
                >
                    {/* 左側 gutter 佔位塊，完美對齊行號 */}
                    <div
                        style={{
                            flexShrink: 0,
                            width: 'var(--gutter-w, 40px)',
                            height: '100%',
                            background: 'var(--sg-gutter)',
                            borderRight: '0px solid var(--sg-border)',
                            marginRight: '4px',
                        }}
                    />

                    {/* 滾動包裹器，隱藏捲軸且套用右側漸層遮罩 */}
                    <div
                        ref={scrollWrapperRef}
                        className="cm-sticky-scroll-wrapper"
                        style={{
                            flexGrow: 1,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            whiteSpace: 'nowrap',
                            scrollBehavior: 'smooth',
                            paddingRight: '12px',
                            maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent 100%)',
                        }}
                    >
                        {displayNodes.map((node, index) => {
                            const isLast = index === displayNodes.length - 1;

                            if (node.type === 'ellipsis') {
                                return (
                                    <React.Fragment key={index}>
                                        {/* 麵包屑分隔符 › */}
                                        {index > 0 && (
                                            <span
                                                style={{
                                                    color: 'var(--sg-sep)',
                                                    padding: '0 3px',
                                                    flexShrink: 0,
                                                    lineHeight: '22px',
                                                }}
                                            >
                                                ›
                                            </span>
                                        )}
                                        {/* 渲染收折的 ellipsis ... 並提供完整的 hover tooltip 提示 */}
                                        <span
                                            title={collapsedTooltip}
                                            style={{
                                                color: 'var(--sg-muted)',
                                                padding: '0 4px',
                                                fontSize: '11px',
                                                lineHeight: '22px',
                                                cursor: 'default',
                                                userSelect: 'none',
                                                fontWeight: 600,
                                            }}
                                        >
                                            ...
                                        </span>
                                    </React.Fragment>
                                );
                            }

                            // 這裡透過明確的 type 判斷，確保型別收窄為 { type: 'header'; node: StickyHeaderNode }
                            if (node.type === 'header') {
                                const headerNode = node.node;

                                return (
                                    <React.Fragment key={index}>
                                        {/* 麵包屑分隔符 › */}
                                        {index > 0 && (
                                            <span
                                                style={{
                                                    color: 'var(--sg-sep)',
                                                    padding: '0 1px',
                                                    flexShrink: 0,
                                                    lineHeight: '22px',
                                                }}
                                            >
                                                ›
                                            </span>
                                        )}
                                        {/* 可點擊的標題按鈕 */}
                                        <button
                                            type="button"
                                            onClick={() => handleHeaderClick(headerNode.pos)}
                                            className="cm-sticky-scroll-btn"
                                            style={{
                                                color: isLast ? 'var(--sg-link)' : 'var(--sg-muted)',
                                                fontWeight: isLast ? 600 : 400,
                                            }}
                                        >
                                            {/* # 前綴 */}
                                            <span
                                                style={{
                                                    opacity: 0.45,
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    letterSpacing: '-0.02em',
                                                    marginRight: '1px',
                                                }}
                                            >
                                                {'#'.repeat(headerNode.level)}
                                            </span>
                                            {headerNode.text}
                                        </button>
                                    </React.Fragment>
                                );
                            }

                            return null;
                        })}
                    </div>
                </div>
            )}

            <CodeMirror
                ref={ref}
                value={code}
                height="100%"
                theme={theme}
                extensions={extensions}
                onChange={handleChange}
                onScroll={handleScroll}
                placeholder={placeholder}
                basicSetup={{
                    lineNumbers: true,
                    highlightActiveLine: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                }}
                style={{
                    fontSize: '14px',
                    height: '100%',
                    width: '100%',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
                className="codemirror-editor-container"
            />
        </div>
    );
});
export default CodeMirrorEditor;