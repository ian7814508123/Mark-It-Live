import React, { useState } from 'react';
import InteractiveLogo from '../ui/InteractiveLogo';

interface LayoutSplitterProps {
    onMouseDown: (e: React.MouseEvent) => void;
    isResizing: boolean;
    isDarkMode: boolean;
}

const LayoutSplitter: React.FC<LayoutSplitterProps> = ({ onMouseDown, isResizing, isDarkMode }) => {
    return (
        <div
            className={`group relative w-0.5 hover:w-1 transition-all cursor-col-resize z-48 flex items-center justify-center ${isResizing ? 'w-1' : ''
                }`}
            onMouseDown={onMouseDown}
        >
            {/* 隱形擴大點擊區域：向右邊（預覽側）延伸，避開左邊（編輯器側）緊貼邊緣的垂直捲軸點擊範圍 */}
            <div className="absolute inset-y-0 left-0 -right-2 cursor-col-resize" />

            {/* 拖動線本體 */}
            <div
                className={`w-full h-full transition-colors duration-200 z-48 ${isResizing
                    ? 'bg-brand-primary'
                    : isDarkMode
                        ? 'bg-slate-800 group-hover:bg-brand-primary/50'
                        : 'bg-slate-200 group-hover:bg-brand-primary/50'
                    }`}
            />
            {/* 拖動手柄：小圓形 + 品牌 M */}
            <div
                className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border transition-all flex items-center justify-center pointer-events-none duration-300 font-bold text-[11px] z-49
                    ${isResizing
                        ? 'scale-110 opacity-100 bg-brand-primary border-brand-accent text-white'
                        : `opacity-0 scale-90 group-hover:scale-100 group-hover:opacity-100 group-hover:bg-brand-primary group-hover:border-brand-accent group-hover:text-white ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'
                        }`
                    }`}
            >
                <InteractiveLogo size={20} variant={'v2'} showBg={true} />
            </div>
        </div >
    );
};

export default LayoutSplitter;
