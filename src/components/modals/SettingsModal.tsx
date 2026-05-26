import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, RotateCcw, AlertCircle, Check, FileText, Printer, Box, PackagePlus, ChevronLeft, Palette, MessageSquare, Zap, BookOpen, Feather, Code, ClipboardList, CircleX, GraduationCap, Scroll, Newspaper, Leaf, Orbit, Sunset, CloudRain } from 'lucide-react';
import RippleButton from '../ui/RippleButton';
import MagneticButton from '../ui/MagneticButton';
import DraggableSwitch from '../ui/DraggableSwitch';
import GlassRailSelector from '../ui/GlassRailSelector';
import { PrintSettings } from '../../hooks/useAppSettings';
import pkg from '../../../package.json';
import InteractiveLogo from '../ui/InteractiveLogo';
import ThemeGridSelector, { ThemeOption } from '../ui/ThemeGridSelector';
import { CHANGELOG_CARDS } from '../../data/changelogData';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 根據當前模式決定顯示哪組設定（markdown → 巨集；mermaid → PDF 版面） */
    mode: 'markdown' | 'mermaid';
    currentMacros: Record<string, string | [string, number]>;
    onSaveMacros: (macros: Record<string, string | [string, number]>) => void;
    onRestoreDefaults: () => void;
    currentPrintSettings: PrintSettings;
    onSavePrintSettings: (patch: Partial<PrintSettings>) => void;
    isStandalone?: boolean;
    onOpenIntro?: () => void;
    favoriteThemes: string[];
    onToggleFavoriteTheme: (themeValue: string) => void;
}

// ── PDF 設定面板 ────────────────────────────────────────────────────────────
const PdfSettingsPanel: React.FC<{
    settings: PrintSettings;
    onChange: (patch: Partial<PrintSettings>) => void;
    isStandalone?: boolean;
    favoriteThemes: string[];
    onToggleFavoriteTheme: (themeValue: string) => void;
}> = ({ settings, onChange, isStandalone, favoriteThemes, onToggleFavoriteTheme }) => {
    const [customScale, setCustomScale] = useState<number>(
        typeof settings.scale === 'number' ? settings.scale : 100
    );
    // 將 settings.scale 映射為字串鍵供 GlassRailSelector 使用
    const scaleKey = typeof settings.scale === 'number' ? 'custom' : settings.scale;

    return (
        <div className="px-6 py-4 space-y-6 bg-slate-50/30 dark:bg-slate-900/30">
            {/* 分組 A：視覺化預覽 */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-brand-secondary/60 dark:bg-brand-primary/30 rounded-lg text-brand-primary"><Palette size={16} /></div>
                    <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">預覽風格 (Theme)</p>
                </div>

                {/* Markdown 主題選擇 */}
                <div className="space-y-3">
                    <ThemeGridSelector
                        options={[
                            {
                                label: '預設', value: 'default', hint: 'default',
                                icon: <Zap size={16} />, color: '#000000',
                                previewImg: '/image/themes/default.png',
                                description: '最均衡的排版，適合一般技術文件。',
                                category: 'minimal'
                            },
                            {
                                label: '學術', value: 'academic', hint: 'academic',
                                icon: <GraduationCap size={16} />, color: '#78350f',
                                previewImg: '/image/themes/academic.png',
                                description: '使用襯線字體，模擬學術期刊與論文排版。',
                                category: 'minimal'
                            },
                            {
                                label: '極簡', value: 'minimal', hint: 'minimal',
                                icon: <Feather size={16} />, color: '#cece91ff',
                                previewImg: '/image/themes/minimal.png',
                                description: '極大的白留與現代字體，適合詩歌或文學創作。',
                                category: 'minimal'
                            },
                            {
                                label: '工程師', value: 'developer', hint: 'developer',
                                icon: <Code size={16} />, color: '#059669',
                                previewImg: '/image/themes/developer.png',
                                description: '全等寬字體與終端機風格，技術感滿滿。',
                                category: 'tech'
                            },
                            {
                                label: '實作計畫', value: 'implementation-plan', hint: 'Plan',
                                icon: <ClipboardList size={16} />, color: '#005B94',
                                previewImg: '/image/themes/plan.png',
                                description: '工業化結構設計，適合展示開發方案與進度。',
                                category: 'tech'
                            },
                            {
                                label: '古典宣紙', value: 'classical', hint: 'Classical',
                                icon: <Scroll size={16} />, color: '#b22222',
                                previewImg: '/image/themes/classical.png',
                                description: '模擬宣紙底色，徽墨與硃砂紅點綴，帶有古典三線表，充滿人文古意。',
                                category: 'creative'
                            },
                            {
                                label: '復古報紙', value: 'newspaper', hint: 'Newspaper',
                                icon: <Newspaper size={16} />, color: '#111111',
                                previewImg: '/image/themes/newspaper.png',
                                description: '高度還原 20 世紀實體報紙印刷質感，擁有經典首字放大 (Drop Cap) 與社論雙線排版。',
                                category: 'creative'
                            },
                            {
                                label: '北歐森林', value: 'nordicforest', hint: 'Nordic Forest',
                                icon: <Leaf size={16} />, color: '#2d4a36',
                                previewImg: '/image/themes/nordicforest.png',
                                description: '清晨薄霧林地、松針陰影、鼠尾草綠，適合心流寫作與睡前日記。',
                                category: 'creative'
                            },
                            {
                                label: '潛境太空', value: 'cosmic', hint: 'Cosmic Voyage',
                                icon: <Orbit size={16} />, color: '#a855f7',
                                previewImg: '/image/themes/cosmic.png',
                                description: '冷冽太空艙與螢光霓虹霓彩，搭配硬核科技等寬字體與星芒點綴，極具未來張力。',
                                category: 'tech'
                            },
                            {
                                label: '落日餘暉', value: 'sunsetglow', hint: 'Sunset Glow',
                                icon: <Sunset size={16} />, color: '#ea580c',
                                previewImg: '/image/themes/sunsetglow.png',
                                description: '溫暖暖沙黃底色與黃昏引言，烘托出極具故事溫度與情感包容力的慢活隨筆意境。',
                                category: 'creative'
                            },
                            {
                                label: '霓虹雨夜', value: 'neonrain', hint: 'Neon Rain',
                                icon: <CloudRain size={16} />, color: '#ec4899',
                                previewImg: '/image/themes/neonrain.png',
                                description: '高飽和粉紅與深紫雨夜黑擦出賽博火花，伴隨電晶外發光，點燃深夜寫作黑客心流。',
                                category: 'creative'
                            },
                        ]}
                        value={settings.previewTheme}
                        onChange={(v) => onChange({ previewTheme: v as any })}
                        favoriteValues={favoriteThemes}
                        onToggleFavorite={onToggleFavoriteTheme}
                    />
                </div>
            </div>


            {/* 分組 C：頁面配置 */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-500"><Printer size={16} /></div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">頁面佈局參數</p>
                </div>

                {/* GlassRailSelector: 紙張尺寸 */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">紙張尺寸</p>
                    <GlassRailSelector
                        options={[
                            { label: 'A4', value: 'A4', hint: '預設' },
                            { label: 'A3', value: 'A3', hint: '大圖' },
                            { label: 'Letter', value: 'Letter', hint: '美制' },
                        ]}
                        value={settings.paperSize}
                        onChange={(v) => onChange({ paperSize: v as PrintSettings['paperSize'] })}
                    />
                </div>

                {/* GlassRailSelector: 方向 */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">方向</p>
                    <GlassRailSelector
                        options={[
                            { label: '橫向 ↔', value: 'landscape', hint: 'Landscape' },
                            { label: '直向 ↕', value: 'portrait', hint: 'Portrait' },
                        ]}
                        value={settings.orientation}
                        onChange={(v) => onChange({ orientation: v as PrintSettings['orientation'] })}
                    />
                </div>

                {/* GlassRailSelector: 比例縮放 */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">比例縮放</p>
                    <GlassRailSelector
                        options={[
                            { label: '符合', value: 'fit', hint: 'Fit' },
                            { label: '100%', value: 'actual', hint: 'Actual' },
                            { label: '自訂', value: 'custom', hint: `${customScale}%` },
                        ]}
                        value={scaleKey}
                        onChange={(v) => {
                            if (v === 'custom') onChange({ scale: customScale });
                            else onChange({ scale: v as 'fit' | 'actual' });
                        }}
                    />
                    {/* 自訂比例時顯示滑桿 */}
                    {scaleKey === 'custom' && (
                        <div className="flex items-center gap-4 pt-1 px-1">
                            <input type="range" min={10} max={200} step={5} value={customScale}
                                onChange={(e) => { const v = Number(e.target.value); setCustomScale(v); onChange({ scale: v }); }}
                                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                            />
                            <span className="text-xs font-mono font-bold w-12 text-brand-primary">{customScale}%</span>
                        </div>
                    )}
                </div>

                {/* GlassRailSelector: 邊距 */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">邊距 (Margins)</p>
                    <GlassRailSelector
                        options={[
                            { label: '標準', value: 'normal', hint: '1.5cm' },
                            { label: '緊湊', value: 'narrow', hint: '0.5cm' },
                            { label: '無', value: 'none', hint: '0' },
                        ]}
                        value={settings.margin}
                        onChange={(v) => onChange({ margin: v as PrintSettings['margin'] })}
                    />
                </div>
            </div>

            <div className="rounded-2xl bg-brand-secondary/30 dark:bg-brand-primary/10 px-5 py-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border border-brand-primary/15 dark:border-brand-primary/30">
                <span className="font-bold text-brand-primary">TIPS:</span> 設定即時生效。當您點選「下載 → 列印」時會套用此配置。匯出大型 Mermaid 圖表時，建議優先嘗試 <strong>A3 橫向 + 符合頁面</strong> 選項。
            </div>
        </div>
    );
};

// ── SettingsModal 主體 ──────────────────────────────────────────────────────
const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    mode,
    currentMacros,
    onSaveMacros,
    onRestoreDefaults,
    currentPrintSettings,
    onSavePrintSettings,
    isStandalone = false,
    onOpenIntro,
    favoriteThemes,
    onToggleFavoriteTheme,
}) => {
    const [activeTab, setActiveTab] = useState<'editor' | 'print' | 'about'>('editor');
    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [logoVariant, setLogoVariant] = useState<'v1' | 'v2'>('v1');
    const version = pkg.version;

    useEffect(() => {
        if (isOpen) {
            setJsonInput(JSON.stringify(currentMacros, null, 4));
            setError(null);
            setSuccess(false);
            // 預設切換到與當前模式最相關的分頁（雖然現在兩者都可用）
            // 如果是 Mermaid 模式，直接切換到列印設定可能更直觀
            if (mode === 'mermaid') setActiveTab('print');
            else setActiveTab('editor');
        }
    }, [isOpen, currentMacros, mode]);

    const handleSaveMacros = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (typeof parsed !== 'object' || parsed === null) throw new Error('Root must be an object');
            onSaveMacros(parsed);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 1500);
            setTimeout(() => onClose(), 1500);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Invalid JSON format');
            setSuccess(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[2px]" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800/80 z-[101] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-300">

                {/* Header & Tabs */}
                <div className="px-8 pt-6 pb-2 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">偏好設定</h2>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Application Configuration</p>
                        </div>
                        <MagneticButton variant="icon" onClick={onClose}
                            aria-label="關閉偏好設定"
                            className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-all">
                            <X size={20} />
                        </MagneticButton>
                    </div>

                    {/* Tab 導航：玻璃滑軌，支援拖曳切換分頁 */}
                    <GlassRailSelector
                        options={[
                            { label: '編輯器設定', value: 'editor', icon: <Box size={13} /> },
                            { label: '列印與匯出', value: 'print', icon: <Printer size={13} /> },
                            { label: '關於', value: 'about', icon: <AlertCircle size={13} /> },
                        ]}
                        value={activeTab}
                        onChange={(v) => setActiveTab(v as 'editor' | 'print' | 'about')}
                    />
                </div>

                {/* 內容區 */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {activeTab === 'about' ? (
                        showChangelog ? (
                            <div key="about-changelog" className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <MagneticButton variant="icon" onClick={() => setShowChangelog(false)} className="w-8 h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full">
                                        <ChevronLeft size={20} />
                                    </MagneticButton>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">發行內容 (What's New)</h3>
                                        <p className="text-[10px] font-bold text-brand-primary lowercase tracking-widest mt-0.5">Version {version}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {CHANGELOG_CARDS.map((card, idx) => {
                                        const CardIcon = card.icon;
                                        return (
                                            <div key={idx} className={`p-5 bg-gradient-to-br ${card.cardBgGradient} rounded-2xl border ${card.cardBorderColor} shadow-sm`}>
                                                {card.subSections ? (
                                                    card.subSections.map((sub, sIdx) => {
                                                        const SubIcon = sub.icon;
                                                        return (
                                                            <div key={sIdx} className="mb-5 last:mb-0">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className={`p-2 ${card.iconBgColor} ${card.iconTextColor} rounded-2xl`}>
                                                                        <SubIcon size={18} />
                                                                    </div>
                                                                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{sub.title}</h4>
                                                                </div>
                                                                {sub.details.map((detail, dIdx) => (
                                                                    <p key={dIdx} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed ml-11 mb-2 last:mb-0">
                                                                        {detail}
                                                                    </p>
                                                                ))}
                                                                {sIdx < card.subSections.length - 1 && (
                                                                    <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-5 ml-11" />
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className={`p-2 ${card.iconBgColor} ${card.iconTextColor} rounded-2xl`}>
                                                                <CardIcon size={18} />
                                                            </div>
                                                            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{card.title}</h4>
                                                        </div>
                                                        {card.bullets && (
                                                            <ul className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed ml-11 list-disc list-outside space-y-1.5 pl-4 opacity-90">
                                                                {card.bullets.map((bullet, bIdx) => (
                                                                    <li key={bIdx}>{bullet}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div key="about-main" className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex flex-col items-center text-center space-y-6">
                                    <div
                                        onClick={() => setLogoVariant(prev => prev === 'v1' ? 'v2' : 'v1')}
                                    >
                                        <InteractiveLogo size={60} variant={logoVariant} />
                                    </div>
                                    <div className="pt-0">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Markdown Live Previewer</h3>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <p className="text-1xl font-bold text-slate-600 dark:text-slate-300 capitalize tracking-widest">Version {version}</p>
                                            <button
                                                onClick={() => setShowChangelog(true)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F0F9FF] dark:bg-[#0C4A6E]/40 text-[#005B94] dark:text-[#0284C7] rounded-lg text-[13px] font-black hover:bg-[#E0F2FE] dark:hover:bg-[#0C4A6E]/60 transition-colors"



                                            >
                                                發行內容
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <FileText size={24} className="text-brand-primary/50 mb-3" />
                                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">想了解更多功能細節？</h5>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4 text-center max-w-[250px]">前往功能導覽，學習如何使用快捷鍵、資料夾管理及更多高階與隱藏技巧。</p>
                                        <MagneticButton
                                            variant="outlined"
                                            className="px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-brand-primary"
                                            onClick={() => {
                                                if (onOpenIntro) onOpenIntro();
                                                onClose();
                                            }}
                                        >
                                            打開完整使用手冊
                                        </MagneticButton>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        <Box size={16} className="text-brand-primary opacity-80" />
                                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">第三方套件與致謝 (Credits)</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { name: 'React', license: 'MIT', url: 'https://react.dev' },
                                            { name: 'CodeMirror', license: 'MIT', url: 'https://codemirror.net' },
                                            { name: 'Mermaid', license: 'MIT', url: 'https://mermaid.js.org' },
                                            { name: 'MathJax', license: 'Apache-2.0', url: 'https://www.mathjax.org' },
                                            { name: 'Lucide Icons', license: 'ISC', url: 'https://lucide.dev' },
                                            { name: 'Vega / Vega-Lite', license: 'BSD-3-Clause', url: 'https://vega.github.io' },
                                            { name: 'SheetJS', license: 'Apache-2.0', url: 'https://sheetjs.com' },
                                            { name: 'PDF-lib', license: 'MIT', url: 'https://pdf-lib.js.org' },
                                            { name: 'abcjs', license: 'MIT', url: 'https://paulrosen.github.io/abcjs/' },
                                            { name: 'SmilesDrawer', license: 'MIT', url: 'https://github.com/reymendes/smilesDrawer' },
                                            { name: 'Vite', license: 'MIT', url: 'https://vitejs.dev' },
                                            { name: 'Tailwind CSS', license: 'MIT', url: 'https://tailwindcss.com' },
                                        ].map((pkg) => (
                                            <div key={pkg.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-primary/20 dark:hover:border-brand-primary/40 transition-colors text-left">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.name}</span>
                                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-tighter">{pkg.license} License</span>
                                                </div>
                                                <a href={pkg.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-brand-primary hover:text-brand-accent transition-colors uppercase tracking-widest">網站</a>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-brand-secondary/30 dark:bg-brand-primary/10 px-5 py-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border border-brand-primary/15 dark:border-brand-primary/30 text-center">
                                    © 2026 HUANGJYUNYING. 授權：MIT 開源協議。使用本軟體即代表您同意其<a href="/privacy.html" className="mx-1 underline">隱私政策</a>與<a href="/terms.html" className="mx-1 underline">服務條款</a>。
                                </div>

                            </div>
                        )
                    ) : activeTab === 'print' ? (
                        <PdfSettingsPanel
                            key="print"
                            settings={currentPrintSettings}
                            onChange={onSavePrintSettings}
                            isStandalone={isStandalone}
                            favoriteThemes={favoriteThemes}
                            onToggleFavoriteTheme={onToggleFavoriteTheme}
                        />
                    ) : (
                        <div key="editor" className="flex flex-col">
                            {mode === 'markdown' ? (
                                <div className="flex flex-col p-8 pt-0">
                                    <div className="mb-4">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">MathJax 自定義巨集 (JSON)</p>
                                        <div className="relative">
                                            <textarea
                                                value={jsonInput}
                                                onChange={(e) => setJsonInput(e.target.value)}
                                                className={`w-full min-h-[320px] p-5 font-mono text-xs bg-slate-50 dark:bg-slate-950 border-2 rounded-2xl resize-none focus:outline-none focus:ring-4 transition-all
                                                    ? 'border-red-200 focus:ring-red-100 dark:border-red-900/40'
                                                        : 'border-slate-100 dark:border-slate-800 focus:ring-brand-secondary dark:focus:ring-brand-primary/20'
                                                    }
                                                    text-slate-700 dark:text-slate-300 custom-scrollbar shadow-inner`}
                                                spellCheck={false}
                                            />
                                            {error && (
                                                <div className="absolute top-4 right-4 bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 text-[10px] px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-in fade-in duration-300 backdrop-blur-sm">
                                                    <AlertCircle size={12} />
                                                    {error}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pb-8">
                                        <RippleButton variant="text" onClick={() => confirm('確定要還原預設巨集設定嗎?') && onRestoreDefaults()} className="text-slate-400 hover:text-brand-primary text-[10px] font-black uppercase tracking-widest">
                                            <RotateCcw size={14} />
                                            還原預設
                                        </RippleButton>
                                        <div className="flex items-center gap-4">
                                            <RippleButton variant="outlined" onClick={onClose} className="px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest">取消</RippleButton>
                                            <RippleButton variant="filled" onClick={handleSaveMacros} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${success ? 'bg-green-500 shadow-green-500/20' : 'bg-brand-primary hover:bg-brand-primary/90 shadow-brand-primary/20'}`}>
                                                {success ? <Check size={16} /> : <Save size={16} />}
                                                {success ? '已儲存' : '儲存變更'}
                                            </RippleButton>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                                    <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] mb-6">
                                        <Box size={48} className="text-slate-400" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mermaid 模式</p>
                                    <p className="text-[10px] font-medium text-slate-400 mt-2 max-w-[200px]">目前尚無可自定義的編輯器選項。請切換至「列印與匯出」進行版面配置。</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
};

export default SettingsModal;
