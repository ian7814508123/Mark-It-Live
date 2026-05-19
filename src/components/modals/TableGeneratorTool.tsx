import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Table, Copy, Check, AlignLeft, AlignCenter, AlignRight,
    Plus, Minus, FileInput, AlertTriangle, ClipboardPaste, ArrowRight, Info
} from 'lucide-react';
import RippleButton from '../ui/RippleButton';
import GlassRailSelector from '../ui/GlassRailSelector';
import ToolGuide from '../ui/ToolGuide';

// ─────────────────────────────────────────────────────────────
// 型別定義
// ─────────────────────────────────────────────────────────────
type Align = 'left' | 'center' | 'right';
type FormatType = 'html' | 'markdown' | 'tsv' | 'csv' | 'unknown';

interface ParsedTable {
    headers: string[];
    rows: string[][];
}

// ─────────────────────────────────────────────────────────────
// 常數（取消舊的 8x10 上限，放寬至 20x30）
// ─────────────────────────────────────────────────────────────
const MIN_COLS = 1, MAX_COLS = 20;
const MIN_ROWS = 1, MAX_ROWS = 30;
const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 3;

const ALIGN_SEPARATOR: Record<Align, string> = {
    left: ':---',
    center: ':---:',
    right: '---:',
};

const FORMAT_META: Record<FormatType, { label: string; color: string }> = {
    html: { label: 'HTML 表格', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    markdown: { label: 'Markdown', color: 'bg-brand-secondary text-brand-primary dark:bg-brand-primary/30 dark:text-brand-primary' },
    tsv: { label: 'TSV 試算表', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    csv: { label: 'CSV', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    unknown: { label: '無法識別', color: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' },
};

// ─────────────────────────────────────────────────────────────
// 工具函式
// ─────────────────────────────────────────────────────────────
function makeGrid(cols: number, rows: number): string[][] {
    return Array.from({ length: rows + 1 }, () => Array(cols).fill(''));
}
function makeAligns(cols: number): Align[] {
    return Array<Align>(cols).fill('left');
}
/** 將不等寬的 grid 補齊至最大欄數 */
function normalizeGrid(grid: string[][]): string[][] {
    const maxCols = Math.max(...grid.map(r => r.length), 1);
    return grid.map(r => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy;
    });
}

// ─────────────────────────────────────────────────────────────
// 解析器
// ─────────────────────────────────────────────────────────────
function parseHTMLTable(html: string): ParsedTable | null {
    try {
        const div = document.createElement('div');
        div.innerHTML = html;
        const table = div.querySelector('table');
        if (!table) return null;
        const rawGrid: string[][] = Array.from(table.querySelectorAll('tr')).map(tr =>
            Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent?.trim() ?? '')
        );
        if (rawGrid.length === 0) return null;
        const norm = normalizeGrid(rawGrid);
        return { headers: norm[0], rows: norm.slice(1) };
    } catch { return null; }
}

// 解析 TSV
function parseTSV(text: string): ParsedTable | null {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return null;
    const norm = normalizeGrid(lines.map(l => l.split('\t').map(c => c.trim())));
    return { headers: norm[0], rows: norm.slice(1) };
}

// 解析 CSV Line
function parseCSVLine(line: string): string[] {
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
        else cur += c;
    }
    cells.push(cur.trim());
    return cells;
}
function parseCSV(text: string): ParsedTable | null {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return null;
    const norm = normalizeGrid(lines.map(parseCSVLine));
    return { headers: norm[0], rows: norm.slice(1) };
}

const MD_SEP_RE = /^\|?[\s|:=-]+\|[\s|:=-]*\|?\s*$/;
function parseMarkdownTable(text: string): ParsedTable | null {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2 || !lines[0].includes('|') || !MD_SEP_RE.test(lines[1])) return null;
    const parseRow = (l: string) => {
        let s = l.trim();
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|')) s = s.slice(0, -1);
        return s.split('|').map(c => c.trim());
    };
    return { headers: parseRow(lines[0]), rows: lines.slice(2).map(parseRow) };
}

function detectAndParse(text: string): { format: FormatType; result: ParsedTable | null } {
    const t = text.trim();
    if (!t) return { format: 'unknown', result: null };
    const lo = t.toLowerCase();
    if (lo.includes('<table') || lo.includes('<tr') || lo.includes('<td') || lo.includes('<th'))
        return { format: 'html', result: parseHTMLTable(t) };
    if (t.includes('|')) {
        const lines = t.split('\n').map(l => l.trim());
        if (lines.length >= 2 && MD_SEP_RE.test(lines[1]))
            return { format: 'markdown', result: parseMarkdownTable(t) };
    }
    if (t.includes('\t')) return { format: 'tsv', result: parseTSV(t) };
    if (t.includes(',')) return { format: 'csv', result: parseCSV(t) };
    return { format: 'unknown', result: null };
}

function tableToMarkdown(parsed: ParsedTable, aligns: Align[]): string {
    const pad = (s: string) => ` ${s} `;
    const effectiveAligns: Align[] = Array.from({ length: parsed.headers.length }, (_, i) => aligns[i] ?? 'left');
    return [
        `|${parsed.headers.map((h, i) => pad(h || `欄位 ${i + 1}`)).join('|')}|`,
        `|${effectiveAligns.map(a => ` ${ALIGN_SEPARATOR[a]} `).join('|')}|`,
        ...parsed.rows.map(row => `|${row.map(c => pad(c)).join('|')}|`),
    ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface TableGeneratorToolProps {
    onInsertIntoDoc: (text: string) => void;
    currentDocMode: 'markdown' | 'mermaid';
}

// ─────────────────────────────────────────────────────────────
// 主元件
// ─────────────────────────────────────────────────────────────
const TableGeneratorTool: React.FC<TableGeneratorToolProps> = ({ onInsertIntoDoc, currentDocMode }) => {
    // ── Tab 狀態 ────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'manual' | 'paste'>('manual');

    // 指南頁面切換狀態
    const [showInfoPopover, setShowInfoPopover] = useState(false);

    // ── 手動建立 狀態 ───────────────────────────────────────
    const [cols, setCols] = useState(DEFAULT_COLS);
    const [rows, setRows] = useState(DEFAULT_ROWS);
    const [grid, setGrid] = useState<string[][]>(() => makeGrid(DEFAULT_COLS, DEFAULT_ROWS));
    const [aligns, setAligns] = useState<Align[]>(() => makeAligns(DEFAULT_COLS));
    const [copied, setCopied] = useState(false);
    const [inserted, setInserted] = useState(false);

    // ── 貼上匯入 狀態 ───────────────────────────────────────
    const [pasteInput, setPasteInput] = useState('');
    const [pasteAligns, setPasteAligns] = useState<Align[]>([]);
    const [pasteCopied, setPasteCopied] = useState(false);
    const [pasteInserted, setPasteInserted] = useState(false);

    const { format, result: parsedTable } = useMemo(() => detectAndParse(pasteInput), [pasteInput]);

    // 同步 pasteAligns 欄數與解析結果一致
    useEffect(() => {
        const colCount = parsedTable?.headers.length ?? 0;
        setPasteAligns(prev => {
            if (prev.length === colCount) return prev;
            const next = makeAligns(colCount);
            prev.forEach((a, i) => { if (i < colCount) next[i] = a; });
            return next;
        });
    }, [parsedTable]);

    const pastedMarkdown = useMemo(
        () => parsedTable ? tableToMarkdown(parsedTable, pasteAligns) : '',
        [parsedTable, pasteAligns]
    );

    // ── 手動模式 Handlers ────────────────────────────────────
    const handleColChange = useCallback((delta: number) => {
        const next = Math.min(MAX_COLS, Math.max(MIN_COLS, cols + delta));
        if (next === cols) return;
        setCols(next);
        setGrid(prev => prev.map(row => {
            const r = [...row];
            if (next > cols) for (let i = cols; i < next; i++) r.push('');
            else r.length = next;
            return r;
        }));
        setAligns(prev => {
            const a = [...prev];
            if (next > cols) for (let i = cols; i < next; i++) a.push('left');
            else a.length = next;
            return a;
        });
    }, [cols]);

    const handleRowChange = useCallback((delta: number) => {
        const next = Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows + delta));
        if (next === rows) return;
        setRows(next);
        setGrid(prev => {
            const header = prev[0];
            let dataRows = prev.slice(1);
            if (next > rows) for (let i = rows; i < next; i++) dataRows.push(Array(cols).fill(''));
            else dataRows = dataRows.slice(0, next);
            return [header, ...dataRows];
        });
    }, [rows, cols]);

    const handleCellChange = useCallback((rowIdx: number, colIdx: number, value: string) => {
        setGrid(prev => {
            const next = prev.map(r => [...r]);
            next[rowIdx][colIdx] = value;
            return next;
        });
    }, []);

    const cycleAlign = useCallback((colIdx: number) => {
        const order: Align[] = ['left', 'center', 'right'];
        setAligns(prev => {
            const next = [...prev];
            next[colIdx] = order[(order.indexOf(next[colIdx]) + 1) % 3];
            return next;
        });
    }, []);

    const markdown = useMemo(() => {
        const pad = (s: string) => ` ${s} `;
        return [
            `|${grid[0].map((h, i) => pad(h || `欄位 ${i + 1}`)).join('|')}|`,
            `|${aligns.map(a => ` ${ALIGN_SEPARATOR[a]} `).join('|')}|`,
            ...grid.slice(1).map(row => `|${row.map(c => pad(c || '')).join('|')}|`),
        ].join('\n');
    }, [grid, aligns]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(markdown).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        });
    }, [markdown]);

    const handleInsert = useCallback(() => {
        onInsertIntoDoc(markdown);
        setInserted(true); setTimeout(() => setInserted(false), 2000);
    }, [markdown, onInsertIntoDoc]);

    // ── 貼上模式 Handlers ────────────────────────────────────
    const handlePasteCopy = useCallback(() => {
        if (!pastedMarkdown) return;
        navigator.clipboard.writeText(pastedMarkdown).then(() => {
            setPasteCopied(true); setTimeout(() => setPasteCopied(false), 2000);
        });
    }, [pastedMarkdown]);

    const handlePasteInsert = useCallback(() => {
        if (!pastedMarkdown) return;
        onInsertIntoDoc(pastedMarkdown);
        setPasteInserted(true); setTimeout(() => setPasteInserted(false), 2000);
    }, [pastedMarkdown, onInsertIntoDoc]);

    /** 將解析結果載入手動編輯器並切換 Tab */
    const handleLoadToEditor = useCallback(() => {
        if (!parsedTable) return;
        const newCols = parsedTable.headers.length;
        const newRows = parsedTable.rows.length;
        setCols(newCols);
        setRows(newRows);
        setAligns(makeAligns(newCols));
        setGrid([parsedTable.headers, ...parsedTable.rows]);
        setActiveTab('manual');
    }, [parsedTable]);

    // ── 共用子元件 ───────────────────────────────────────────
    const AlignIcon = ({ align }: { align: Align }) => {
        if (align === 'center') return <AlignCenter size={11} />;
        if (align === 'right') return <AlignRight size={11} />;
        return <AlignLeft size={11} />;
    };

    // ── 指南分流渲染 ──
    if (showInfoPopover) {
        return (
            <ToolGuide
                title="MD 表格產生器 使用指南"
                subtitle="USER GUIDE FOR MARKDOWN TABLE GENERATOR"
                onClose={() => setShowInfoPopover(false)}
            >
                {/* 1. 視覺化建立 */}
                <ToolGuide.Section title="1. 視覺化互動建立" icon="🎨">
                    <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        <p>
                            在<strong>「建立」</strong>分頁中，您可以透過加減按鈕彈性微調表格的<strong>欄數 (最寬 20)</strong> 與 <strong>列數 (最長 30)</strong>。
                        </p>
                        <p>
                            點擊表頭上方的對齊按鈕，可一鍵循環切換該欄文字為 <strong>靠左、置中、或靠右對齊</strong>，底下的輸出框將為您即時生成對應的 Markdown 表格分隔符。
                        </p>
                    </div>
                </ToolGuide.Section>

                {/* 2. 貼上即轉換 */}
                <ToolGuide.Section title="2. 智能外部表格轉換" icon="📋">
                    <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        <p>
                            切換至<strong>「貼上」</strong>分頁，您可以將從網頁、Word 或 <strong>Excel / Google Sheets</strong> 中複製的表格直接貼上。
                        </p>
                        <p>
                            系統具備極佳的探測引擎，能自動識別 <strong>HTML 表格、TSV（以 Tab 分隔）與 CSV（以逗號分隔）</strong> 並瞬間將其解析重組為標準 Markdown，省去您手動重新打字的時間。
                        </p>
                    </div>
                </ToolGuide.Section>

                {/* 3. 混合式精細調整 */}
                <ToolGuide.Section title="3. 載入編輯器二次精修" icon="🔄">
                    <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        <p>
                            當您貼上並成功解析表格後，除了可以直接「複製」或「插入」Markdown，還可以點擊<strong>「載入至編輯器」</strong>。
                        </p>
                        <p>
                            這會將解析結果自動載入到手動「建立」的網格編輯器中，讓您可以繼續新增欄位、填補空白儲存格或調整欄位對齊方式，實現無縫的混合工作流程。
                        </p>
                    </div>
                </ToolGuide.Section>
            </ToolGuide>
        );
    }

    // ── Render ───────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-2 p-3 min-h-0 h-full">

            {/* ── 標題 ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                            <Table size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Markdown 表格產生器</h3>
                                <button
                                    onClick={() => setShowInfoPopover(true)}
                                    className="p-0.5 rounded-md transition-colors text-slate-400 hover:text-brand-primary hover:bg-slate-50 dark:hover:bg-slate-850"
                                    title="顯示表格工具說明"
                                >
                                    <Info size={15} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                                視覺化編輯，或貼上外部表格自動轉換
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mermaid 模式警告 */}
            {currentDocMode === 'mermaid' ? (
                <div className="flex flex-col items-center justify-center gap-3 flex-1 py-8 px-4 rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/10">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">Mermaid 模式不支援 Markdown 表格</p>
                        <p className="text-[12px] text-amber-600/80 dark:text-amber-300/80 leading-relaxed">
                            目前文檔為 <span className="font-semibold">Mermaid 圖表</span> 模式。<br />
                            請切換到 <span className="font-semibold">Markdown</span> 文檔後再使用表格產生器。
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Tab 切換列 */}
                    <div className=" relative shrink-0 px-1 py-0.5 text-center overflow-hidden ">
                        {/* Tab 導航：玻璃滑軌，支援拖曳切換分頁 */}
                        <GlassRailSelector
                            options={[
                                { label: '建立', value: 'manual', icon: <Table size={14} /> }, { label: '貼上', value: 'paste', icon: <ClipboardPaste size={14} /> },
                            ]}
                            value={activeTab}
                            onChange={(v) => setActiveTab(v as 'manual' | 'paste')}
                        />
                    </div>


                    {/* ═══ 手動建立 Tab ═══ */}
                    {activeTab === 'manual' && (
                        <>
                            {/* 欄 / 列數調整置中中*/}
                            <div className="flex items-center justify-center gap-4 shrink-0">
                                {/* 欄數 */}
                                <div className="flex items-center gap-1.5 justify-center">
                                    <span className="text-[10px] font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-wide w-5">欄</span>
                                    <button onClick={() => handleColChange(-1)} disabled={cols <= MIN_COLS} aria-label="減少欄數"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-brand-secondary dark:hover:bg-brand-primary/30 hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none transition-colors">
                                        <Minus size={11} />
                                    </button>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-6 text-center tabular-nums">{cols}</span>
                                    <button onClick={() => handleColChange(1)} disabled={cols >= MAX_COLS} aria-label="增加欄數"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-brand-secondary dark:hover:bg-brand-primary/30 hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none transition-colors">
                                        <Plus size={11} />
                                    </button>
                                </div>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                                {/* 列數 */}
                                <div className="flex items-center gap-1.5 justify-center">
                                    <span className="text-[10px] font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-wide w-5">列</span>
                                    <button onClick={() => handleRowChange(-1)} disabled={rows <= MIN_ROWS} aria-label="減少列數"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-brand-secondary dark:hover:bg-brand-primary/30 hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none transition-colors">
                                        <Minus size={11} />
                                    </button>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-6 text-center tabular-nums">{rows}</span>
                                    <button onClick={() => handleRowChange(1)} disabled={rows >= MAX_ROWS} aria-label="增加列數"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-brand-secondary dark:hover:bg-brand-primary/30 hover:text-brand-primary disabled:opacity-30 disabled:pointer-events-none transition-colors">
                                        <Plus size={11} />
                                    </button>
                                </div>
                            </div>

                            {/* 視覺化表格編輯區 */}
                            <div className="flex-1 min-h-[160px] max-h-[260px] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                                <div className="absolute inset-0 overflow-auto custom-scrollbar">
                                    <table className="w-full border-collapse text-[11px]" style={{ minWidth: `${cols * 90}px` }}>
                                        <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900">
                                            {/* 對齊按鈕列 */}
                                            <tr className="bg-slate-50 dark:bg-slate-800/60">
                                                {aligns.map((align, ci) => (
                                                    <th key={ci} className="border-b border-slate-200 dark:border-slate-700 px-0 py-1 font-normal">
                                                        <button onClick={() => cycleAlign(ci)}
                                                            title={`切換對齊（目前：${align}）`}
                                                            aria-label={`切換第 ${ci + 1} 欄對齊`}
                                                            className="flex items-center justify-center gap-1 mx-auto px-2 py-0.5 rounded-md text-slate-400 hover:text-brand-primary hover:bg-brand-secondary dark:hover:bg-brand-primary/20 transition-colors">
                                                            <AlignIcon align={align} />
                                                            <span className="text-[9px] capitalize">{align}</span>
                                                        </button>
                                                    </th>
                                                ))}
                                            </tr>
                                            {/* Header 輸入列 */}
                                            <tr className="bg-brand-secondary/60 dark:bg-brand-primary/10 border-b border-slate-200 dark:border-slate-700">
                                                {grid[0].map((val, ci) => (
                                                    <th key={ci} className="p-0 font-normal">
                                                        <input type="text" value={val} placeholder={`欄位 ${ci + 1}`}
                                                            onChange={e => handleCellChange(0, ci, e.target.value)}
                                                            className="w-full px-2 py-1.5 text-[11px] font-semibold text-brand-primary dark:text-brand-primary bg-transparent placeholder:text-slate-350 dark:placeholder:text-slate-600 focus:outline-none focus:bg-brand-secondary/40 dark:focus:bg-brand-primary/20 transition-colors" />
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grid.slice(1).map((row, ri) => (
                                                <tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    {row.map((val, ci) => (
                                                        <td key={ci} className={`p-0 ${ci < cols - 1 ? 'border-r border-slate-100 dark:border-slate-800' : ''} ${ri < rows - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                                                            <input type="text" value={val} placeholder="—"
                                                                onChange={e => handleCellChange(ri + 1, ci, e.target.value)}
                                                                className="w-full px-2 py-1.5 text-[11px] text-slate-650 dark:text-slate-300 bg-transparent placeholder:text-slate-200 dark:placeholder:text-slate-750 focus:outline-none focus:bg-brand-secondary/40 dark:focus:bg-brand-primary/20 transition-colors" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Markdown 輸出 */}
                            <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">Markdown 輸出</span>
                                    <div className="flex items-center gap-1.5">
                                        <RippleButton variant="filled" onClick={handleInsert}
                                            className={`text-[11px] h-7 px-2.5 gap-1 transition-all ${inserted ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-brand-primary hover:bg-brand-primary/90'}`}>
                                            {inserted ? <><Check size={12} />已插入！</> : <><FileInput size={12} />插入文件</>}
                                        </RippleButton>
                                        <RippleButton variant="tonal" onClick={handleCopy}
                                            className={`text-[11px] h-7 px-2.5 gap-1 transition-all ${copied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-655 dark:text-slate-300'}`}>
                                            {copied ? <><Check size={12} />已複製</> : <><Copy size={12} />複製</>}
                                        </RippleButton>
                                    </div>
                                </div>
                                <div className="min-h-[100px] max-h-[160px] rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden relative">
                                    <pre className="absolute inset-0 text-[10.5px] leading-relaxed font-mono text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 overflow-auto custom-scrollbar whitespace-pre">
                                        {markdown}
                                    </pre>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ═══ 貼上匯入 Tab ═══ */}
                    {activeTab === 'paste' && (
                        <div className="flex flex-col gap-2 flex-1 min-h-0">

                            {/* 貼上輸入區 */}
                            <div className="relative flex-1 min-h-[130px]">
                                <textarea
                                    value={pasteInput}
                                    onChange={e => setPasteInput(e.target.value)}
                                    placeholder={`在此貼上表格內容，自動識別以下格式：\n\n• HTML 表格（從網頁 / Word / Excel 複製）\n• TSV（從 Excel / Google Sheets 複製）\n• CSV（逗號分隔文字）\n• Markdown 表格語法`}
                                    className="w-full h-full min-h-[130px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-mono text-slate-650 dark:text-slate-300 p-3 pr-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 transition-all custom-scrollbar placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:font-sans"
                                    spellCheck={false}
                                />
                                {/* 格式徽章 */}
                                {pasteInput.trim() && (
                                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold pointer-events-none ${FORMAT_META[format].color}`}>
                                        {FORMAT_META[format].label}
                                    </span>
                                )}
                            </div>

                            {/* 無法識別提示 */}
                            {pasteInput.trim() && format === 'unknown' && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 shrink-0">
                                    <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300">無法識別格式，請確認貼入有效的表格內容。</p>
                                </div>
                            )}

                            {/* 解析成功：顯示統計 + 輸出 + 操作 */}
                            {parsedTable && (
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    {/* 統計 */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">預覽輸出</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                            {parsedTable.headers.length} 欄 × {parsedTable.rows.length + 1} 列（含標題）
                                        </span>
                                    </div>

                                    {/* Markdown 預覽 */}
                                    <div className="min-h-[80px] max-h-[150px] rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden relative">
                                        <pre className="absolute inset-0 text-[10.5px] leading-relaxed font-mono text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 overflow-auto custom-scrollbar whitespace-pre">
                                            {pastedMarkdown}
                                        </pre>
                                    </div>

                                    {/* 操作按鈕 */}
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <RippleButton variant="tonal" onClick={handleLoadToEditor}
                                            className="text-[11px] h-7 px-2.5 gap-1 text-slate-650 dark:text-slate-300"
                                            title="載入至手動編輯器後可進一步調整">
                                            <ArrowRight size={12} />載入至編輯器
                                        </RippleButton>
                                        <RippleButton variant="filled" onClick={handlePasteInsert}
                                            className={`text-[11px] h-7 px-2.5 gap-1 transition-all ${pasteInserted ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-brand-primary hover:bg-brand-primary/90'}`}>
                                            {pasteInserted ? <><Check size={12} />已插入！</> : <><FileInput size={12} />插入文件</>}
                                        </RippleButton>
                                        <RippleButton variant="tonal" onClick={handlePasteCopy}
                                            className={`text-[11px] h-7 px-2.5 gap-1 transition-all ${pasteCopied ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-655 dark:text-slate-300'}`}>
                                            {pasteCopied ? <><Check size={12} />已複製</> : <><Copy size={12} />複製</>}
                                        </RippleButton>
                                    </div>
                                </div>
                            )}

                            {/* 空白狀態引導提示 */}
                            {!pasteInput.trim() && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-3 text-center">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                                        <ClipboardPaste size={18} />
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                                        支援從 <span className="font-semibold text-slate-500">Excel</span>、
                                        <span className="font-semibold text-slate-500">Google Sheets</span>、
                                        <span className="font-semibold text-slate-500">網頁</span> 複製的表格<br />
                                        自動識別格式並轉換為 Markdown
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
};

export default TableGeneratorTool;
