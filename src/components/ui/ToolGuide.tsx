import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ToolGuideProps {
    /** 指南標題 */
    title: string;
    /** 英文副標題 */
    subtitle?: string;
    /** 返回/關閉按鈕的回呼 */
    onClose: () => void;
    /** 內部卡片 Section 內容 */
    children: React.ReactNode;
}

interface ToolGuideSectionProps {
    /** 區塊標題 */
    title: string;
    /** 區塊圖示，可為文字 Emoji 或 ReactNode */
    icon?: React.ReactNode;
    /** 內容 */
    children: React.ReactNode;
}

/** 
 * 通用工具使用指南組件 - 提供大氣、清爽、支援滾動與統一排版的切換式說明介面。
 * 支援 Glassmorphism 夜間模式與滑入動畫。
 */
const ToolGuide: React.FC<ToolGuideProps> & {
    Section: React.FC<ToolGuideSectionProps>;
} = ({ title, subtitle, onClose, children }) => {
    return (
        <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-200 bg-white dark:bg-slate-900">
            {/* ── 指南頂部導航列 ── */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-brand-primary transition-all active:scale-90"
                        title="返回"
                    >
                        <ArrowLeft size={15} />
                    </button>
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            {title}
                        </h3>
                        {subtitle && (
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 指南滾動內容區 ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {children}
            </div>
        </div>
    );
};

/** 指南區塊卡片元件 */
const ToolGuideSection: React.FC<ToolGuideSectionProps> = ({ title, icon, children }) => {
    return (
        <div className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/70 dark:border-slate-800/40">
            <h4 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                {icon && typeof icon === 'string' ? (
                    <span className="text-sm">{icon}</span>
                ) : (
                    icon
                )}
                {title}
            </h4>
            {children}
        </div>
    );
};

// 掛載子元件
ToolGuide.Section = ToolGuideSection;

export default ToolGuide;
