import { useRef, useState, useEffect } from 'react';
import { Download, ChevronDown, Image as ImageIcon, FileImage, FileJson, FileText, Printer, Sun, Moon, FileUp, Settings, Box, MessageSquare } from '../ui/Icons';
import RippleButton from '../ui/RippleButton';
import MagneticButton from '../ui/MagneticButton';
import InteractiveLogo from '../ui/InteractiveLogo';
import DraggableSwitch from '../ui/DraggableSwitch';
interface HeaderProps {
    mode: 'mermaid' | 'markdown';
    isDarkMode: boolean;
    toggleDarkMode: (event?: React.MouseEvent) => void;
    onDownloadMarkdown: () => void;
    onExportImage: (format: 'png' | 'svg' | 'jpg') => void;
    isSyncScroll: boolean;
    setIsSyncScroll: (isSync: boolean) => void;
    onInsertCode: (code: string) => void;
    onOpenSettings: () => void;
    /** 統一列印 / PDF 呼叫 */
    onPrint: () => void;
    /** 是否正處於資料夾中（資料夾模式） */
    isInFolder?: boolean;
    /** 列印與合併設定 */
    printSettings?: any;
    /** 更新設定的回呼 */
    onUpdatePrintSettings?: (patch: any) => void;
    isCommentMode?: boolean;
    setIsCommentMode?: (isMode: boolean) => void;
    /** 是否有任何文件被打開 */
    hasOpenDocuments?: boolean;
}

const Header: React.FC<HeaderProps> = ({
    mode,
    isDarkMode,
    toggleDarkMode,
    onDownloadMarkdown,
    onExportImage,
    isSyncScroll,
    setIsSyncScroll,
    onInsertCode,
    onOpenSettings,
    onPrint,
    isInFolder,
    printSettings,
    onUpdatePrintSettings,
    isCommentMode,
    setIsCommentMode,
    hasOpenDocuments = false,
}) => {
    const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const [logoVariant, setLogoVariant] = useState<'v1' | 'v2'>('v1');

    const [hasPushedAd, setHasPushedAd] = useState(false);
    const adContainerRef = useRef<HTMLDivElement>(null);

    const [syncScrollDelay, setSyncScrollDelay] = useState<string>('0ms');
    const [commentModeDelay, setCommentModeDelay] = useState<string>('0ms');

    // ── 同步多個呼吸燈按鈕時間軸的負延遲補償 ──
    useEffect(() => {
        if (isSyncScroll && hasOpenDocuments) {
            const offset = Math.round(performance.now() % 3000);
            setSyncScrollDelay(`-${offset}ms`);
        }
    }, [isSyncScroll, hasOpenDocuments]);

    useEffect(() => {
        if (isCommentMode && hasOpenDocuments) {
            const offset = Math.round(performance.now() % 3000);
            setCommentModeDelay(`-${offset}ms`);
        }
    }, [isCommentMode, hasOpenDocuments]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setIsDownloadMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 當選單打開時初始化 AdSense
    useEffect(() => {
        if (isDownloadMenuOpen && !hasPushedAd) {
            let retryCount = 0;
            const maxRetries = 10;

            const tryPushAd = () => {
                // 確保組件仍掛載且選單仍開啟
                if (!isDownloadMenuOpen) return;

                if (adContainerRef.current && adContainerRef.current.clientWidth > 0) {
                    try {
                        if (typeof window !== 'undefined') {
                            const adsbygoogle = (window as any).adsbygoogle || [];
                            adsbygoogle.push({});
                            setHasPushedAd(true);
                        }
                    } catch (e) {
                        console.error('AdSense Header error:', e);
                    }
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(tryPushAd, 200);
                }
            };

            const timer = setTimeout(tryPushAd, 600); // 初始延遲略大於動畫時間 (250ms)
            return () => clearTimeout(timer);
        }
    }, [isDownloadMenuOpen, hasPushedAd]);

    const handleExport = (action: () => void) => {
        action();
        setIsDownloadMenuOpen(false);
    }


    // ── 下載選單項目的共用樣式 ──────────────────────────────
    const menuItem = (onClick: () => void, icon: React.ReactNode, label: string, sub: string) => (
        <button
            onClick={onClick}
            style={{ position: 'relative', overflow: 'hidden' }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent hover:border-slate-200 dark:hover:border-white/15 transition-all"
        >
            {icon}
            <div className="flex flex-col items-start">
                <span className="font-bold">{label}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{sub}</span>
            </div>
        </button>
    );

    return (
        <header className="h-15 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 shrink-0 shadow-sm transition-colors duration-200 select-none print:hidden">

            {/* Logo + 標題 */}
            <div className="flex items-center gap-3">
                <button
                    title='Brand Logo'
                    aria-label='Brand Logo'
                    onClick={() => setLogoVariant(prev => prev === 'v1' ? 'v2' : 'v1')}
                    className="cursor-pointer"
                >
                    <InteractiveLogo size={40} variant={logoVariant} />
                </button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Markdown Live Previewer</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">專業的線上編輯器 給 標註掉落</p>
                </div>
            </div>


            {/* 右側工具列 */}
            <div className="flex items-center gap-1">

                {/* 分隔線元件（共用） */}
                {/* const Sep = () => <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" /> */}

                {/* ── Mermaid 模式工具列 ─────────────────────────────────────── */}
                {mode === 'mermaid' && (<>

                    {/* 深色模式（微磁力：提示使用者此按鈕可互動） */}
                    <MagneticButton variant="icon" onClick={(e) => toggleDarkMode(e)}
                        aria-label={isDarkMode ? '切換到亮色模式' : '切換到深色模式'}
                        title={isDarkMode ? '切換 到 亮色模式' : '切換 到 深色模式'}
                        className="text-slate-500 dark:text-slate-400 hover:text-brand-primary"
                        magneticOptions={{ maxOffset: 6, radius: 45 }}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </MagneticButton>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* 設定（Mermaid → PDF 版面設定，微磁力） */}
                    <MagneticButton variant="icon" onClick={onOpenSettings}
                        aria-label="PDF 版面設定"
                        title="PDF 版面設定"
                        className="text-slate-500 dark:text-slate-400 hover:text-brand-primary"
                        disabled={!hasOpenDocuments}
                        magneticOptions={{ maxOffset: 6, radius: 45 }}>
                        <Settings size={20} />
                    </MagneticButton>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* 下載選單（Mermaid）：主要 CTA，使用較強磁力吸引使用者點擊 */}
                    <div className="relative" ref={downloadMenuRef}>
                        <MagneticButton variant="filled" onClick={() => hasOpenDocuments && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                            aria-label="開啟導出選單"
                            disabled={!hasOpenDocuments}
                            className={`text-sm pr-3 ${hasOpenDocuments ? 'animate-cta-glow' : ''}`}
                            magneticOptions={{ maxOffset: 14, radius: 70, stiffness: 250, damping: 18 }}>
                            <Download size={16} />
                            <span>下載</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
                        </MagneticButton>
                        <div style={{
                            position: 'absolute', right: 0, marginTop: '0.5rem', width: '18rem',
                            opacity: isDownloadMenuOpen ? 1 : 0,
                            transform: isDownloadMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
                            pointerEvents: isDownloadMenuOpen ? 'auto' : 'none',
                            transition: 'opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                            transformOrigin: 'top right',
                        }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl py-2 px-2 z-50 ring-1 ring-black/5">
                            {menuItem(() => handleExport(() => onExportImage('png')),
                                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center"><ImageIcon size={18} /></div>,
                                'PNG 圖片', '高保真')}
                            {menuItem(() => handleExport(() => onExportImage('jpg')),
                                <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center"><FileImage size={18} /></div>,
                                'JPG 圖片', '壓縮')}
                            <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700" />
                            {menuItem(() => handleExport(() => onExportImage('svg')),
                                <div className="w-9 h-9 bg-brand-secondary/60 dark:bg-brand-primary/30 text-brand-primary rounded-lg flex items-center justify-center"><FileJson size={18} /></div>,
                                'SVG 向量', '解析度獨立')}
                            <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700" />
                            {menuItem(() => handleExport(onDownloadMarkdown),
                                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center"><FileText size={18} /></div>,
                                'Mermaid 原始碼', '.md 源碼')}
                            <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700" />
                            {menuItem(() => handleExport(onPrint),
                                <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center"><Printer size={18} /></div>,
                                '列印 / PDF', '套用 PDF 版面設定')}

                            {/* 資料夾合併快捷開關 - 扁平化精緻設計 */}
                            {isInFolder && onUpdatePrintSettings && printSettings && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-500">
                                    <div className="px-3 flex items-center gap-2 mb-1 opacity-60">
                                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500"><Box size={14} /></div>
                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">資料夾合併選項</p>
                                    </div>



                                    <div className="px-1 space-y-1">
                                        <label className="flex items-center justify-between px-3 py-2 cursor-pointer group hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">合併下載 (Markdown)</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">自動合併同資料夾下所有 .md 原始碼</span>
                                            </div>
                                            <DraggableSwitch
                                                checked={printSettings.mergeVaultOnMdExport}
                                                onChange={(val) => onUpdatePrintSettings({ mergeVaultOnMdExport: val })}
                                            />
                                        </label>

                                        <label className="flex items-center justify-between px-3 py-2 cursor-pointer group hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">合併列印 (PDF)</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">將資料夾內容合併為單一 PDF 匯出</span>
                                            </div>
                                            <DraggableSwitch
                                                checked={printSettings.mergeVaultOnPdfExport}
                                                onChange={(val) => onUpdatePrintSettings({ mergeVaultOnPdfExport: val })}
                                            />
                                        </label>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>

                </>)}

                {/* ── Markdown 模式工具列 ────────────────────────────────────── */}
                {mode === 'markdown' && (<>

                    {/* 深色模式（微磁力：提示使用者此按鈕可互動） */}
                    <MagneticButton variant="icon" onClick={(e) => toggleDarkMode(e)}
                        aria-label={isDarkMode ? '切換到亮色模式' : '切換到深色模式'}
                        title={isDarkMode ? '切換 到 亮色模式' : '切換 到 深色模式'}
                        className="text-slate-500 dark:text-slate-400 hover:text-brand-primary"
                        magneticOptions={{ maxOffset: 6, radius: 45 }}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </MagneticButton>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* 設定（Markdown → MathJax 巨集，微磁力） */}
                    <MagneticButton variant="icon" onClick={onOpenSettings}
                        aria-label="偏好設定"
                        title="偏好設定"
                        className="text-slate-500 dark:text-slate-400 hover:text-brand-primary"
                        disabled={!hasOpenDocuments}
                        magneticOptions={{ maxOffset: 6, radius: 45 }}>
                        <Settings size={20} />
                    </MagneticButton>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* 同步滾動 */}
                    <MagneticButton onClick={() => hasOpenDocuments && setIsSyncScroll(!isSyncScroll)} title="同步滾動"
                        disabled={!hasOpenDocuments}
                        style={{ position: 'relative', overflow: 'hidden', animationDelay: isSyncScroll && hasOpenDocuments ? syncScrollDelay : undefined }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-all select-none
                            ${isSyncScroll && hasOpenDocuments
                                ? 'animate-status-glow text-brand-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isSyncScroll && hasOpenDocuments ? 'bg-brand-primary animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span>同步滾動</span>
                    </MagneticButton>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* 註解模式開關：註解不隨文檔導出 */}
                    <MagneticButton
                        onClick={() => hasOpenDocuments && setIsCommentMode?.(!isCommentMode)}
                        title={!hasOpenDocuments ? '請先開啟文件以使用註解模式' : '開啟/關閉行號註解模式'}
                        disabled={!hasOpenDocuments}
                        style={{ position: 'relative', overflow: 'hidden', animationDelay: isCommentMode && hasOpenDocuments ? commentModeDelay : undefined }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all select-none
                            ${!hasOpenDocuments
                                ? 'opacity-35 text-slate-400 dark:text-slate-600'
                                : isCommentMode
                                    ? 'animate-status-glow text-brand-primary shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}>
                        <MessageSquare size={14} className={isCommentMode && hasOpenDocuments ? '' : ''} />
                        <span>註解模式</span>
                    </MagneticButton>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* 下載選單（Markdown）：主要 CTA，使用較強磁力吸引使用者點擊 */}
                    <div className="relative" ref={downloadMenuRef}>
                        <MagneticButton variant="filled" onClick={() => hasOpenDocuments && setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                            aria-label="開啟導出選單"
                            disabled={!hasOpenDocuments}
                            className={`text-sm pr-3 ${hasOpenDocuments ? 'animate-cta-glow' : ''}`}
                            magneticOptions={{ maxOffset: 14, radius: 70, stiffness: 250, damping: 18 }}>
                            <Download size={16} />
                            <span>下載</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isDownloadMenuOpen ? 'rotate-180' : ''}`} />
                        </MagneticButton>
                        <div style={{
                            position: 'absolute', right: 0, marginTop: '0.5rem', width: '18rem',
                            opacity: isDownloadMenuOpen ? 1 : 0,
                            transform: isDownloadMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
                            pointerEvents: isDownloadMenuOpen ? 'auto' : 'none',
                            transition: 'opacity 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                            transformOrigin: 'top right',
                        }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl py-2 px-2 z-50 ring-1 ring-black/5">
                            {menuItem(() => handleExport(onDownloadMarkdown),
                                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center"><FileText size={18} /></div>,
                                'Markdown 檔案', '.md 源碼')}
                            <div className="mx-4 my-1 border-t border-slate-100 dark:border-slate-700" />
                            {menuItem(() => handleExport(onPrint),
                                <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center"><Printer size={18} /></div>,
                                '列印 / PDF', '套用 PDF 版面設定')}

                            {/* 資料夾合併快捷開關 - 扁平化精緻設計 */}
                            {isInFolder && onUpdatePrintSettings && printSettings && (
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-500">
                                    <div className="px-3 flex items-center gap-2 mb-1 opacity-60">
                                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500"><Box size={14} /></div>
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-200 uppercase tracking-widest">資料夾合併選項</p>
                                    </div>

                                    <div className="px-1 space-y-1">
                                        <label className="flex items-center justify-between px-3 py-2 cursor-pointer group hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">合併下載 (Markdown)</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">自動合併同資料夾下所有 .md 原始碼</span>
                                            </div>
                                            <DraggableSwitch
                                                checked={printSettings.mergeVaultOnMdExport}
                                                onChange={(val) => onUpdatePrintSettings({ mergeVaultOnMdExport: val })}
                                            />
                                        </label>

                                        <label className="flex items-center justify-between px-3 py-2 cursor-pointer group hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">合併列印 (PDF)</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">將資料夾內容合併為單一 PDF 匯出</span>
                                            </div>
                                            <DraggableSwitch
                                                checked={printSettings.mergeVaultOnPdfExport}
                                                onChange={(val) => onUpdatePrintSettings({ mergeVaultOnPdfExport: val })}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </>)}

            </div>
        </header>
    );
};

export default Header;

