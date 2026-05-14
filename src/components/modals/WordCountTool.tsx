import React, { useState, useMemo } from 'react';
import { BarChart2, Copy, Check, ChevronDown, ChevronUp, FileText, ClipboardPaste } from 'lucide-react';
import RippleButton from '../ui/RippleButton';
import GlassRailSelector from '../ui/GlassRailSelector';

// ── 特殊區塊的偵測 Regex ─────────────────────────────────────────────

/** 偵測 fenced code blocks（含 mermaid、vega、vega-lite、一般程式碼） */
const RE_FENCED_BLOCK = /^```([\w-]*)\s*\n([\s\S]*?)^```\s*$/gm;

/** 偵測 LaTeX block（$$ ... $$） */
const RE_LATEX_BLOCK = /\$\$([\s\S]+?)\$\$/g;

/** 偵測 LaTeX inline（$ ... $），避開貨幣情境（前後不接空白+數字） */
const RE_LATEX_INLINE = /\$([^$\n]+?)\$/g;

/** 偵測 mhchem 化學式（\ce{...}，可出現在 LaTeX 中） */
const RE_CHEM = /\\ce\{[^}]+\}/g;

/** 偵測 Markdown 語法符號（標題#、粗斜體*_、行內code`、連結圖片等） */
const RE_MD_SYNTAX = /!\[.*?\]\(.*?\)|(?<!!)\[.*?\]\(.*?\)|`[^`]+`|#{1,6}\s|[*_~>|\\]/g;

/** 偵測多餘空白行 */
const RE_EXTRA_WHITESPACE = /\s+/g;

// ── 特殊區塊分類名稱 ────────────────────────────────────────────────

const SPECIAL_LANG_LABELS: Record<string, string> = {
    mermaid: 'Mermaid 圖',
    vega: 'Vega 圖',
    'vega-lite': 'Vega-Lite 圖',
    math: '數學區塊',
    tikz: 'TikZ 圖',
    '': '程式碼區塊',
};

function getLangLabel(lang: string): string {
    return SPECIAL_LANG_LABELS[lang.toLowerCase()] ?? `程式碼區塊（${lang}）`;
}

// ── 統計核心函式 ─────────────────────────────────────────────────────

interface SkippedBlock {
    label: string;
    count: number;
}

interface Stats {
    /** 純文字字數（CJK 每字算 1，英文以空白分詞） */
    words: number;
    /** 字元數（含空白） */
    chars: number;
    /** 字元數（不含空白） */
    charsNoSpace: number;
    /** 段落數 */
    paragraphs: number;
    /** 預估閱讀時間（分鐘）—— 中文 300 字/分、英文 200 字/分 */
    readingMinutes: number;
    /** 略過的特殊區塊 */
    skipped: SkippedBlock[];
}

/**
 * 分析 Markdown 原始文字，回傳字數統計與略過的特殊區塊清單。
 *
 * 過濾順序（越早移除越不會影響後續 regex）：
 * 1. Fenced code blocks（mermaid / vega / 一般程式碼）
 * 2. LaTeX block（$$ ... $$）
 * 3. mhchem 化學式（\ce{...}）
 * 4. LaTeX inline（$ ... $）
 * 5. Markdown 語法符號
 * 6. 剩餘文字計字
 */
function analyzeMarkdown(raw: string): Stats {
    let text = raw;
    const skippedMap: Record<string, number> = {};

    const addSkipped = (label: string) => {
        skippedMap[label] = (skippedMap[label] ?? 0) + 1;
    };

    // 1. Fenced code blocks
    text = text.replace(RE_FENCED_BLOCK, (_match, lang: string) => {
        addSkipped(getLangLabel(lang ?? ''));
        return '';
    });

    // 2. LaTeX block
    text = text.replace(RE_LATEX_BLOCK, (_match) => {
        addSkipped('數學公式（區塊）');
        return '';
    });

    // 3. mhchem 化學式
    text = text.replace(RE_CHEM, (_match) => {
        addSkipped('化學式');
        return '';
    });

    // 4. LaTeX inline
    text = text.replace(RE_LATEX_INLINE, (_match) => {
        addSkipped('數學公式（行內）');
        return '';
    });

    // 5. Markdown 語法符號
    text = text.replace(RE_MD_SYNTAX, ' ');

    // ── 計算段落數（連續非空行組成一段） ──
    const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 0).length;

    // ── 字元數 ──
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;

    // ── 字數（CJK + 英文分詞） ──
    const cjkMatches = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? [];
    const withoutCJK = text.replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ');
    const englishWords = withoutCJK.split(RE_EXTRA_WHITESPACE).filter(w => /[a-zA-Z0-9]/.test(w));
    const words = cjkMatches.length + englishWords.length;

    // ── 閱讀時間 ──
    const cjkRatio = words > 0 ? cjkMatches.length / words : 0;
    const wpm = cjkRatio > 0.5 ? 300 : 200;
    const readingMinutes = Math.max(1, Math.round(words / wpm));

    // ── 整理略過清單 ──
    const skipped: SkippedBlock[] = Object.entries(skippedMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return { words, chars, charsNoSpace, paragraphs, readingMinutes, skipped };
}

// ── 元件 ──────────────────────────────────────────────────────────

interface WordCountToolProps {
    /** 目前在編輯器中開啟的文檔內容（由 App.tsx 透過 props 鏈傳入） */
    currentDocContent: string;
}

type CountMode = 'current-doc' | 'paste';

const PASTE_PLACEHOLDER = `在此貼上 Markdown 內容…

支援的特殊語法（自動略過）：
- 數學公式：$E=mc^2$ 或 $$\\int_0^\\infty$$
- 化學式：$\\ce{H2SO4}$
- Mermaid 圖、Vega 圖、程式碼區塊`;

const WordCountTool: React.FC<WordCountToolProps> = ({ currentDocContent }) => {
    const [mode, setMode] = useState<CountMode>('current-doc');
    const [pasteText, setPasteText] = useState('');
    const [showSkipped, setShowSkipped] = useState(false);
    const [copied, setCopied] = useState(false);

    // 根據模式選擇統計來源
    const sourceText = mode === 'current-doc' ? currentDocContent : pasteText;
    const stats = useMemo(() => analyzeMarkdown(sourceText), [sourceText]);
    const isEmpty = sourceText.trim().length === 0;

    const handleCopySummary = () => {
        const summary = [
            `字數：${stats.words.toLocaleString()}`,
            `字元數：${stats.chars.toLocaleString()}（不含空白：${stats.charsNoSpace.toLocaleString()}）`,
            `段落數：${stats.paragraphs}`,
            `預估閱讀時間：約 ${stats.readingMinutes} 分鐘`,
        ].join('\n');
        navigator.clipboard.writeText(summary).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col gap-3 p-3 min-h-0">
            {/* ── 標題 ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                        <BarChart2 size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">字數統計</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                            自動略過公式、圖表等特殊區塊
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 模式切換 Tab ── */}

            <div className=" relative shrink-0 px-1 py-0.5 text-center overflow-hidden [&_*]:whitespace-nowrap">
                {/* Tab 導航：玻璃滑軌，支援拖曳切換分頁 */}
                <GlassRailSelector
                    options={[
                        { label: '目前文檔', value: 'current-doc', icon: <FileText size={14} /> }, { label: '貼上文字', value: 'paste', icon: <ClipboardPaste size={14} /> },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as 'current-doc' | 'paste')}
                />
            </div>


            {/* ── 模式說明 / 輸入區 ── */}
            {mode === 'current-doc' ? (
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl bg-brand-secondary dark:bg-brand-primary/15 border border-brand-primary/20 dark:border-brand-primary/40">
                    <FileText size={13} className="text-brand-primary shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-brand-primary">
                            即時讀取編輯器內容
                        </p>
                        <p className="text-[10px] text-brand-primary/80 truncate">
                            {isEmpty ? '目前文檔為空' : `已讀取 ${currentDocContent.length.toLocaleString()} 字元`}
                        </p>
                    </div>
                </div>
            ) : (
                <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={PASTE_PLACEHOLDER}
                    spellCheck={false}
                    className={[
                        'w-full h-24 resize-none rounded-2xl border text-[12px] leading-relaxed shrink-0',
                        'px-3 py-2.5 font-mono',
                        'text-slate-600 dark:text-slate-300',
                        'bg-slate-50 dark:bg-slate-800/60',
                        'border-slate-200 dark:border-slate-700',
                        'placeholder:text-slate-300 dark:placeholder:text-slate-600',
                        'focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary',
                        'transition-colors custom-scrollbar',
                    ].join(' ')}
                />
            )}

            {/* ── 統計數據卡片 ── */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
                <StatCard label="字數" value={isEmpty ? '—' : stats.words.toLocaleString()} unit="字" accent />
                <StatCard label="預估閱讀" value={isEmpty ? '—' : `${stats.readingMinutes}`} unit="分鐘" />
                <StatCard label="字元（含空白）" value={isEmpty ? '—' : stats.chars.toLocaleString()} unit="" small />
                <StatCard label="字元（不含空白）" value={isEmpty ? '—' : stats.charsNoSpace.toLocaleString()} unit="" small />
                <StatCard label="段落數" value={isEmpty ? '—' : `${stats.paragraphs}`} unit="段" small />
            </div>

            {/* ── 略過的特殊區塊 ── */}
            {!isEmpty && stats.skipped.length > 0 && (
                <div className="shrink-0 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
                    <button
                        onClick={() => setShowSkipped(v => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-amber-100/50 dark:hover:bg-amber-800/20 transition-colors"
                    >
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                            已略過 {stats.skipped.reduce((s, b) => s + b.count, 0)} 個特殊區塊（未計入字數）
                        </span>
                        {showSkipped
                            ? <ChevronUp size={12} className="text-amber-500" />
                            : <ChevronDown size={12} className="text-amber-500" />
                        }
                    </button>

                    {showSkipped && (
                        <div className="px-3 pb-2 flex flex-col gap-0.5">
                            {stats.skipped.map(block => (
                                <div key={block.label} className="flex items-center justify-between">
                                    <span className="text-[10px] text-amber-700 dark:text-amber-300">{block.label}</span>
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{block.count} 個</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── 複製摘要 ── */}
            <RippleButton
                variant="filled"
                onClick={handleCopySummary}
                disabled={isEmpty}
                className={[
                    'w-full justify-center text-[11px] h-8 gap-1.5 transition-all shrink-0',
                    copied
                        ? 'bg-emerald-500 hover:bg-emerald-500'
                        : 'bg-brand-primary hover:bg-brand-primary/90',
                    isEmpty ? 'opacity-40 pointer-events-none' : '',
                ].join(' ')}
            >
                {copied
                    ? <><Check size={13} />已複製統計摘要</>
                    : <><Copy size={13} />複製統計摘要</>
                }
            </RippleButton>

        </div>
    );
};

// ── 子元件：模式切換 Tab ─────────────────────────────────────────────

interface ModeTabProps {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const ModeTab: React.FC<ModeTabProps> = ({ active, icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={[
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150',
            active
                ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-brand-primary',
        ].join(' ')}
    >
        {icon}
        {label}
    </button>
);

// ── 子元件：統計數據卡片 ─────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
    unit: string;
    accent?: boolean;
    small?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, accent, small }) => (
    <div className={[
        'flex flex-col rounded-2xl px-3 py-2',
        accent
            ? 'bg-brand-secondary dark:bg-brand-primary/20 border border-brand-primary/20 dark:border-brand-primary/40'
            : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50',
    ].join(' ')}>
        <span className={`text-[9px] uppercase tracking-wide font-semibold leading-tight ${accent ? 'text-brand-primary' : 'text-slate-400 dark:text-slate-500'}`}>
            {label}
        </span>
        <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`font-bold tabular-nums ${small ? 'text-sm' : 'text-xl'} ${accent ? 'text-brand-primary' : 'text-slate-700 dark:text-slate-200'}`}>
                {value}
            </span>
            {unit && <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-none">{unit}</span>}
        </div>
    </div>
);

export default WordCountTool;
