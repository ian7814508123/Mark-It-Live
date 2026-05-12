
import React, { useCallback, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { mermaid } from 'codemirror-lang-mermaid';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { searchKeymap, search } from '@codemirror/search';

/**
 * 修正 PageUp/PageDown 導致底部被擠壓的問題。
 *
 * 根本原因：CodeMirror 的 page 捲動指令透過 `scrollDOM.clientHeight` 計算
 * 「一頁」的距離。當 `.cm-scroller` 有 `min-height: 100%` 時，在某些佈局條件下
 * clientHeight 會因為 reflow 時機而回傳不穩定的值，造成捲動位置過衝。
 *
 * 解法：在每次 update 時，強制將 `.cm-scroller` 的 `min-height` 設為 `0`，
 * 讓 clientHeight 永遠只反映真實可視高度，而非被 min-height 撐大的假高度。
 * 父容器的 `overflow: hidden` 加上 `flex: 1` 已負責限制可見範圍，
 * 所以視覺上不受影響。
 */
const stableViewportExtension = EditorView.updateListener.of((update) => {
    const scroller = update.view.scrollDOM;
    // 只在第一次或尺寸改變時修正，避免每個 keystroke 都強制 reflow
    if (scroller && scroller.style.minHeight !== '0px') {
        scroller.style.minHeight = '0px';
    }
});

interface CodeMirrorEditorProps {
    mode: 'mermaid' | 'markdown';
    code: string;
    setCode: (code: string) => void;
    isDarkMode: boolean;
    onScroll?: (e: any) => void;
    placeholder?: string;
}

const CodeMirrorEditor = React.forwardRef<ReactCodeMirrorRef, CodeMirrorEditorProps>((props, ref) => {
    const { mode, code, setCode, isDarkMode, onScroll, placeholder } = props;

    const extensions = useMemo(() => {
        const exts = [
            EditorView.lineWrapping,
            EditorState.tabSize.of(2),
            EditorView.theme({
                // 確保 cm-editor 自身不主動撐高父容器
                '&': {
                    height: '100%',
                    overflow: 'hidden',
                },
                // scroller 負責實際滾動，min-height 由 stableViewportExtension 動態清除
                '.cm-scroller': {
                    overflow: 'auto',
                },
                '.cm-content, .cm-gutter': {
                    lineHeight: '1.5',
                },
                '.cm-gutterElement': {
                    fontStyle: 'italic',
                },
            }),
            mode === 'mermaid' ? mermaid() : markdown({ base: markdownLanguage, codeLanguages: languages }),
            // 搜尋擴充與快速鍵
            search({ top: true }),
            keymap.of(searchKeymap),
            // 修正 PageUp/PageDown viewport 計算不穩定的問題
            stableViewportExtension,
            // 透過 domEventHandlers 確保監聽到 scroller 的捲動事件
            EditorView.domEventHandlers({
                scroll: (event, _view) => {
                    if (onScroll) onScroll(event);
                }
            })
        ];
        return exts;
    }, [mode, onScroll]);

    const theme = isDarkMode ? vscodeDark : vscodeLight;

    const handleChange = useCallback((value: string) => {
        setCode(value);
    }, [setCode]);

    // Handle scroll synchronization
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        if (onScroll) {
            onScroll(event);
        }
    }, [onScroll]);

    return (
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
            aria-label={mode === 'mermaid' ? 'Mermaid 圖表代碼編輯器' : 'Markdown 內容編輯器'}
        />
    );
});

export default CodeMirrorEditor;
