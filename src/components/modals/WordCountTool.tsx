import React, { useState, useMemo } from 'react';
import { BarChart2, Copy, Check, ChevronDown, ChevronUp, FileText, ClipboardPaste, Info } from 'lucide-react';
import RippleButton from '../ui/RippleButton';
import GlassRailSelector from '../ui/GlassRailSelector';
import ToolGuide from '../ui/ToolGuide';

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

自動略過特殊語法：
- 數學公式：$E=mc^2$ 或 $$\\int_0^\\infty$$
- 化學式：$\\ce{H2SO4}$
- Mermaid 圖、Vega 圖、程式碼區塊`;

const WordCountTool: React.FC<WordCountToolProps> = ({ currentDocContent }) => {
    const [mode, setMode] = useState<CountMode>('current-doc');
    const [pasteText, setPasteText] = useState('');
    const [showSkipped, setShowSkipped] = useState(false);
    const [copied, setCopied] = useState(false);

    // 指南頁面切換狀態
    const [showInfoPopover, setShowInfoPopover] = useState(false);

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

    // ── 指南分流渲染 ──
    if (showInfoPopover) {
        return (
            <ToolGuide
                title="字數統計 使用指南"
                subtitle="USER GUIDE FOR WORD COUNT ENGINE"
                onClose={() => setShowInfoPopover(false)}
            >
                {/* 1. 分析核心 */}
                <ToolGuide.Section title="1. 專門為 Markdown 設計的計字引擎" icon="">
                    <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        <p>
                            有別於一般的線上字數統計，本引擎採用針對 Markdown 所定制的混合計字算法：
                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                <li><strong>中日韓文字 (CJK)：</strong>每個中文字元、假名、諺文皆會獨立計算為 1 個字。</li>
                                <li><strong>英文單字：</strong>會自動以空白分詞，而非按字元數來算。</li>
                            </ul>
                        </p>
                    </div>
                </ToolGuide.Section>

                {/* 2. 略過區塊 */}
                <ToolGuide.Section title="2. 自動化雜訊與公式過濾" icon="">
                    <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        <p>
                            為了反映出文檔最真實的純文字字數，本工具在分析時會自動濾除並<strong>不計入</strong>以下區塊：
                        </p>
                        <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5 mt-1.5">
                            <ul className="list-disc pl-4 space-y-0.5">
                                <li>數學區塊 <code>$$ ... $$</code> 與行內公式 <code>$ ... $</code></li>
                                <li>mhchem 化學式</li>
                                <li>Mermaid 結構圖與 Vega/Vega-Lite 圖表 Spec</li>
                                <li>Markdown 專屬的標題標籤、引號、外鏈路徑、表格分隔符等</li>
                            </ul>
                        </p>
                        <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5">
                            被略過的區塊數量將顯示在底部的黃色卡片中，您可以隨時點選展開查看詳細分類。
                        </p>
                    </div>
                </ToolGuide.Section>

                {/* 3. 多功能模式 */}
                <ToolGuide.Section title="3. 混合式讀取與一鍵摘要" icon="">
                    <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        <p>
                            <strong>混合式讀取：</strong>
                            可在「目前文檔」分頁中即時串接主編輯器中的文字，亦可切換到「貼上文字」分頁，直接將外部的草稿貼入進行一次性分析。
                        </p>
                        <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5 mt-1.5">
                            <strong>一鍵摘要複製：</strong>
                            點擊底部的「複製統計摘要」，即可將精簡版的統計結果寫入剪貼簿，這在您需要向主管回報文檔進度或社群媒體發文計字時非常便利。
                        </p>
                    </div>
                </ToolGuide.Section>
            </ToolGuide>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden p-3 min-h-0 bg-white dark:bg-slate-900">
            {/* ── 標題與分頁切換區 ── */}
            <div className="shrink-0 space-y-2 mb-2">
                <div className="px-4 pt-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                                <BarChart2 size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">字數統計</h3>
                                    <button
                                        onClick={() => setShowInfoPopover(true)}
                                        className="p-0.5 rounded-md transition-colors text-slate-400 hover:text-brand-primary hover:bg-slate-50 dark:hover:bg-slate-850"
                                        title="顯示字數統計說明"
                                    >
                                        <Info size={15} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                                    統計編輯字數
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 中間可滾動內容區 ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-3 min-h-0">
                {/* ── 模式說明 / 輸入區 ── */}
                <GlassRailSelector
                    options={[
                        { label: '目前文檔', value: 'current-doc', icon: <FileText size={14} /> },
                        { label: '貼上文字', value: 'paste', icon: <ClipboardPaste size={14} /> },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as 'current-doc' | 'paste')}
                />
                {mode === 'current-doc' ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-brand-secondary dark:bg-brand-primary/15 border border-brand-primary/20 dark:border-brand-primary/40">
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
                            'w-full h-24 resize-none rounded-2xl text-[12px] leading-relaxed shrink-0',
                            'px-3 py-2.5 font-mono',
                            'text-slate-650 dark:text-slate-300',
                            'bg-slate-50 dark:bg-slate-800/60',
                            'border-slate-200 dark:border-slate-700',
                            'placeholder:text-slate-300 dark:placeholder:text-slate-600',
                            'focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary',
                            'transition-colors custom-scrollbar',
                        ].join(' ')}
                    />
                )}

                {/* ── 統計數據卡片 ── */}
                <div className="grid grid-cols-2 gap-2">
                    <StatCard label="字數" value={isEmpty ? '—' : stats.words.toLocaleString()} unit="字" accent />
                    <StatCard label="預估閱讀" value={isEmpty ? '—' : `${stats.readingMinutes}`} unit="分鐘" />
                    <StatCard label="字元（含空白）" value={isEmpty ? '—' : stats.chars.toLocaleString()} unit="" small />
                    <StatCard label="字元（不含空白）" value={isEmpty ? '—' : stats.charsNoSpace.toLocaleString()} unit="" small />
                    <StatCard label="段落數" value={isEmpty ? '—' : `${stats.paragraphs}`} unit="段" small />
                </div>

                {/* ── 略過的特殊區塊 ── */}
                {!isEmpty && stats.skipped.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
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
                            <div className="px-3 pb-2 flex flex-col gap-0.5 animate-in fade-in duration-200">
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
            </div>

            {/* ── 底部操作區 ── */}
            <div className="pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800/50 mt-1">
                <RippleButton
                    variant="filled"
                    onClick={handleCopySummary}
                    disabled={isEmpty}
                    className={[
                        'w-full justify-center text-[11px] h-9 gap-1.5 transition-all',
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
        </div>
    );
};

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
        <span className={`text-[9px] uppercase tracking-wide font-semibold leading-tight ${accent ? 'text-brand-primary' : 'text-slate-400 dark:text-slate-550'}`}>
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
