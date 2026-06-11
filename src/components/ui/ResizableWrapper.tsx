import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, RotateCcw } from './Icons';

/**
 * ResizableWrapper: 可調整寬度的容器組件
 * 提供交互式的寬度與對齊工具面板
 */
export const ResizableWrapper: React.FC<{
    children: React.ReactNode;
    width: string;
    align: string;
    onWidthChange: (width: string) => void;
    onAlignChange: (align: string) => void;
    onReset: () => void;
    isDarkMode: boolean;
    extraControls?: React.ReactNode;
}> = ({ children, width, align, onWidthChange, onAlignChange, onReset, isDarkMode, extraControls }) => {

    return (
        <div
            className={`chart-wrapper relative group/resizable print:p-0 flex w-full align-${align}`}
        >
            <div
                className="transition-all duration-300 ease-in-out relative chart-content"
                style={{ width }}
            >
                {children}
            </div>

            {/* 調整大小的 UI 面板 - 懸浮顯示 (列印時隱藏) */}
            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/resizable:opacity-100 transition-all duration-300 z-30 pointer-events-none group-hover/resizable:translate-y-0 translate-y-2 print:hidden`}>
                <div className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl ${isDarkMode
                    ? 'bg-slate-800/95 border-slate-700 text-slate-200'
                    : 'bg-white/95 border-slate-200 text-slate-600'
                    }`}>

                    {/* Width Control */}
                    <div className="flex items-center gap-1.5 border-r border-slate-200/20 pr-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider select-none opacity-50">Width</span>
                        <input
                            type="range" min="30" max="100" step="5"
                            value={parseInt(width) || 100}
                            onChange={(e) => onWidthChange(`${e.target.value}%`)}
                            className={`w-24 h-1 rounded-lg appearance-none cursor-pointer accent-brand-primary bg-slate-200 dark:bg-slate-700`}
                        />
                        <span className="text-[10px] font-mono min-w-[2.2rem] opacity-70 text-right">{width}</span>
                    </div>

                    {/* Alignment Control */}
                    <div className="flex items-center gap-1 px-1 border-r border-slate-200/20 pr-2.5">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAlignChange('left');
                            }}
                            className={`p-1 rounded-md transition-colors ${align === 'left' ? 'bg-brand-primary/20 text-brand-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Align Left"
                        >
                            <AlignLeft size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAlignChange('center');
                            }}
                            className={`p-1 rounded-md transition-colors ${align === 'center' ? 'bg-brand-primary/20 text-brand-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Align Center"
                        >
                            <AlignCenter size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAlignChange('right');
                            }}
                            className={`p-1 rounded-md transition-colors ${align === 'right' ? 'bg-brand-primary/20 text-brand-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title="Align Right"
                        >
                            <AlignRight size={14} />
                        </button>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReset();
                        }}
                        className={`p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-brand-primary hover:text-white transition-colors duration-200`}
                        title="Reset Settings"
                    >
                        <RotateCcw size={12} />
                    </button>


                </div>
            </div>
        </div>
    );
};

export default ResizableWrapper;
