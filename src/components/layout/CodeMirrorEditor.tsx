import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { mermaid } from 'codemirror-lang-mermaid';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { EditorView, ViewPlugin, ViewUpdate, keymap, showPanel, panels } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
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

// ─── StateEffect：通知 StateField 更新 headers ────────────────────────────────
const updateStickyEffect = StateEffect.define<StickyHeaderNode[]>();

// ─── 工具：比較兩組 headers（用 pos 比對即可，避免不必要的 dispatch）────────────
function headersEqual(a: StickyHeaderNode[], b: StickyHeaderNode[]): boolean {
    return a.length === b.length && a.every((h, i) => h.pos === b[i].pos);
}

// ─── Panel DOM 渲染（原地更新，不重建 DOM 元素，避免閃爍）────────────────────────
function renderStickyBar(
    container: HTMLDivElement,
    headers: StickyHeaderNode[],
    clickRef: React.MutableRefObject<((pos: number) => void) | null>
): void {
    container.innerHTML = '';

    // 左側 gutter 佔位塊，寬度由 React 透過 CSS variable 動態寫入
    const gutterBlock = document.createElement('div');
    gutterBlock.style.cssText =
        'flex-shrink:0;' +
        'width:var(--gutter-w,44px);' +
        'height:100%;' +
        'background:var(--sg-gutter);' +
        'border-right:1px solid var(--sg-border);' +
        'margin-right:8px';
    container.appendChild(gutterBlock);

    headers.forEach((header, index) => {
        // 麵包屑分隔符 ›
        if (index > 0) {
            const sep = document.createElement('span');
            sep.textContent = '›';
            sep.style.cssText = 'color:var(--sg-sep);padding:0 3px;flex-shrink:0;line-height:22px';
            container.appendChild(sep);
        }

        const isLast = index === headers.length - 1;

        // 可點擊的標題按鈕
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText =
            'background:none;border:none;padding:0 2px;margin:0;font:inherit;font-size:12px;' +
            'line-height:22px;cursor:pointer;white-space:nowrap;flex-shrink:0;' +
            `color:${isLast ? 'var(--sg-link)' : 'var(--sg-muted)'};` +
            `font-weight:${isLast ? 600 : 400}`;
        // # 前綴（顯示層級深度）
        const hashPfx = document.createElement('span');
        hashPfx.textContent = '#'.repeat(header.level) + ' ';
        hashPfx.style.cssText = 'opacity:0.45;font-size:10px;font-weight:700;letter-spacing:-0.02em';
        btn.appendChild(hashPfx);
        btn.appendChild(document.createTextNode(header.text));

        btn.addEventListener('click', () => clickRef.current?.(header.pos));
        btn.addEventListener('mouseenter', () => {
            btn.style.textDecoration = 'underline';
            btn.style.color = 'var(--sg-active)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.textDecoration = 'none';
            btn.style.color = isLast ? 'var(--sg-link)' : 'var(--sg-muted)';
        });

        container.appendChild(btn);
    });
}

// ─── Sticky Scroll Extension Builder ─────────────────────────────────────────
// 使用 showPanel（CodeMirror 原生 Panel API），讓 sticky bar 真正佔據高度，
// 而非 position:absolute 蓋在內容上。這才是 VS Code 的正確行為。
function buildStickyExtension(
    clickRef: React.MutableRefObject<((pos: number) => void) | null>
) {
    // StateField：維護 panel DOM + 目前 headers + 穩定的 PanelConstructor
    // DOM 只建立一次，ctor 函數也只建立一次，後續重用同一個 reference，避免 panel 被銷毀重建造成閃爍
    const panelField = StateField.define<{
        headers: StickyHeaderNode[];
        dom: HTMLDivElement;
        ctor: (view: EditorView) => { dom: HTMLDivElement; top: boolean };
    }>({
        create: () => {
            const dom = document.createElement('div');
            dom.className = 'cm-sticky-scroll';
            dom.style.cssText =
                'display:flex;align-items:center;overflow:hidden;height:22px;' +
                'background:var(--sg-bg);border-bottom:1px solid var(--sg-border);' +
                'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,' +
                '"Liberation Mono","Courier New",monospace';
            // ctor 只建立一次，showPanel 每次看到相同 reference 就不重建 panel DOM
            const ctor = (_view: EditorView) => ({ dom, top: true });
            return { headers: [], dom, ctor };
        },

        update: (state, tr) => {
            for (const effect of tr.effects) {
                if (effect.is(updateStickyEffect)) {
                    // 原地更新 DOM 內容，保留同一個 dom 與 ctor 實例避免重建
                    renderStickyBar(state.dom, effect.value, clickRef);
                    return { headers: effect.value, dom: state.dom, ctor: state.ctor };
                }
            }
            return state;
        },

        // 當 headers 不為空時，回傳 ctor（PanelConstructor），showPanel 會呼叫它取得 Panel
        // 此 panel 真正佔據高度，內容被往下推 — 這就是「黏住」的感覺
        provide: (field) =>
            showPanel.from(field, (s) =>
                s.headers.length > 0 ? s.ctor : null
            ),
    });

    // ViewPlugin：監聽滾動與文件變化，計算麵包屑鏈並派發 Effect
    const scrollPlugin = ViewPlugin.fromClass(
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
                // 當文件內容改變時，也需要重新檢查與計算標題鏈
                if (update.docChanged) {
                    this.checkScroll(update.view);
                }
            }

            private checkScroll(view: EditorView) {
                const scrollTop = view.scrollDOM.scrollTop;
                const next: StickyHeaderNode[] = [];

                if (scrollTop > 4) {
                    // 取得可視區頂端的行號
                    try {
                        // 取得可視區頂端的行號
                        const topLineNum = view.state.doc.lineAt(
                            view.lineBlockAtHeight(scrollTop).from
                        ).number;
                        let minLvl = Infinity;

                        // 從頂端行往上回溯，建立由外到內的標題鏈
                        for (let i = topLineNum; i >= 1; i--) {
                            const line = view.state.doc.line(i);
                            const m = line.text.match(/^(#{1,6})\s+(.+)$/);
                            if (m) {
                                const lvl = m[1].length;
                                if (lvl < minLvl) {
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
                // 只在真正有變化時才 dispatch，避免不必要的狀態更新
                if (!headersEqual(this.last, next)) {
                    this.last = next;
                    view.dispatch({ effects: updateStickyEffect.of(next) });
                }
            }
        }
    );
    return [panelField, scrollPlugin];
}
// ─── PageUp/PageDown viewport 穩定修正 ───────────────────────────────────────
const stableViewportExtension = EditorView.updateListener.of((update) => {
    const scroller = update.view.scrollDOM;
    if (scroller && scroller.style.minHeight !== '0px') {
        scroller.style.minHeight = '0px';
    }
});
// ─── 主元件 ──────────────────────────────────────────────────────────────────
const CodeMirrorEditor = React.forwardRef<ReactCodeMirrorRef, CodeMirrorEditorProps>((props, ref) => {
    const { mode, code, setCode, isDarkMode, onScroll, placeholder, ariaLabel } = props;
    const wrapperRef = useRef<HTMLDivElement>(null);
    // clickRef 永遠指向最新的 handleHeaderClick，讓 extension 的閉包不會失效
    const clickRef = useRef<((pos: number) => void) | null>(null);
    // ─── 偵測 CM gutter 實際寬度，透過 CSS variable 傳給 panel DOM ────────────
    // 確保 sticky bar 左側 gutter 欄與行號欄完美對齊
    useEffect(() => {
        if (!wrapperRef.current) return;
        const measure = () => {
            const el = wrapperRef.current?.querySelector('.cm-gutters') as HTMLElement | null;
            if (el) {
                wrapperRef.current!.style.setProperty('--gutter-w', el.offsetWidth + 'px');
            }
        };
        measure();
        const obs = new ResizeObserver(measure);
        obs.observe(wrapperRef.current);
        return () => obs.disconnect();
    }, [mode]);
    // ─── Sticky Scroll Extension（markdown 模式才建立）────────────────────────
    const stickyExtension = useMemo(() => {
        if (mode !== 'markdown') return [];
        return buildStickyExtension(clickRef);
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
            // Sticky panel 的底部陰影，讓它視覺上「懸浮」在內容之上
            '.cm-panels-top': { boxShadow: '0 2px 6px rgba(0,0,0,0.12)' },
        }),
        mode === 'mermaid'
            ? mermaid()
            : markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.contentAttributes.of({
            'aria-label': ariaLabel || (mode === 'mermaid' ? 'Mermaid 圖表代碼編輯器' : 'Markdown 內容編輯器'),
        }),
        search({ top: true }),
        keymap.of(searchKeymap),
        stableViewportExtension,
        EditorView.domEventHandlers({
            scroll: (event) => { if (onScroll) onScroll(event); }
        }),
        // showPanel 需要 panels() 提供底層支援
        panels(),
        // Sticky Scroll（markdown 模式）
        ...stickyExtension,
    ], [mode, onScroll, ariaLabel, stickyExtension]);
    const theme = isDarkMode ? vscodeDark : vscodeLight;
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
    // 每次 render 都把最新的 callback 同步到 clickRef，讓 extension 的 DOM 事件用到最新版
    clickRef.current = handleHeaderClick;
    // ─── CSS Variables：隨 isDarkMode 即時切換顏色，不需重建 extension ─────────
    // panel DOM 用 var(--sg-*) 引用，React 只需更新 wrapper 的 CSS variable 即可
    return (
        <div
            ref={wrapperRef}
            style={{
                position: 'relative',
                height: '100%',
                width: '100%',
                // VS Code 明/暗主題色票
                ['--sg-bg' as string]: isDarkMode ? '#1e1e1e' : '#ffffff',
                ['--sg-gutter' as string]: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                ['--sg-border' as string]: isDarkMode ? '#404040' : '#e0e0e0',
                ['--sg-link' as string]: isDarkMode ? '#9cdcfe' : '#0070c1',
                ['--sg-muted' as string]: isDarkMode ? '#808080' : '#888888',
                ['--sg-active' as string]: isDarkMode ? '#cccccc' : '#1e1e1e',
                ['--sg-sep' as string]: isDarkMode ? '#555555' : '#bbbbbb',
            }}
        >
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