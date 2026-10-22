import React from 'react';
import { Type } from '../ui/Icons';
import { TypographyAttrs } from '../../utils/typographyUtils';

export interface TypographyButtonProps {
    /** 當前目標行號 */
    line: number;
    /** 當前 HTML 標籤名稱 (h1, h2, ..., p) */
    tagName: string;
    /** 當前已儲存的自訂排版屬性 */
    typographyData?: TypographyAttrs;
    /** 排版面板是否正開啟並指向此行 */
    isActive: boolean;
    /** 該行是否已有註解（用於 hover 顯隱邏輯） */
    hasComment?: boolean;
    /** 開啟排版微調面板的回調函式 */
    onOpen: (line: number, tagName: string, targetEl: HTMLElement, existingAttrs?: TypographyAttrs) => void;
    /** 額外的樣式類名 */
    className?: string;
}

/**
 * 行內排版微調按鈕元件。
 *
 * 顯示於 Markdown 預覽區每行區塊動作列，提供針對該行文字 (h1-h6, p) 的樣式自訂功能。
 * 陰影、外框與 hover 背景均採用圓形設計 (rounded-full)。
 */
export const TypographyButton: React.FC<TypographyButtonProps> = ({
    line,
    tagName,
    typographyData,
    isActive,
    hasComment = false,
    onOpen,
    className = '',
}) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const target = (e.currentTarget.closest('[data-line]')?.querySelector('h1, h2, h3, h4, h5, h6, div, p') || e.currentTarget) as HTMLElement;
        onOpen(line, tagName, target, typographyData);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-xs border shadow-xs hover:shadow text-[10px] font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-all select-none ${
                isActive
                    ? 'bg-brand-primary text-white border-brand-primary shadow-brand-primary/25 ring-2 ring-brand-primary/30'
                    : `${hasComment ? 'opacity-0 group-hover/line:opacity-100' : ''} bg-white/95 dark:bg-slate-800/95 border-slate-200/90 dark:border-slate-700/90 text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary`
            } ${className}`}
            title="調整排版 (字體/字號/間距)"
            aria-label={`調整第 #${line} 行排版`}
        >
            <Type size={11} className={isActive ? 'text-white' : 'text-brand-primary'} />
        </button>
    );
};

export default TypographyButton;
