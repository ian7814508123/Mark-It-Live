import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, Layout } from 'lucide-react';

export interface ThemeOption {
    label: string;
    value: string;
    hint: string;
    description?: string;
    icon?: React.ReactNode;
    color: string;
    previewImg?: string;
}

interface ThemeGridSelectorProps {
    options: ThemeOption[];
    value: string;
    onChange: (value: string) => void;
}

const ThemeGridSelector: React.FC<ThemeGridSelectorProps> = ({ options, value, onChange }) => {
    const [hoveredOption, setHoveredOption] = useState<ThemeOption | null>(null);
    const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = (e: React.MouseEvent, option: ThemeOption) => {
        setHoveredOption(option);

        const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        // 預估預覽視窗的尺寸 (確保不會超出螢幕)
        const PREVIEW_WIDTH = 320;
        const PREVIEW_HEIGHT = 280; // 大約高度：包含標題、16:9圖片、描述文字
        const PADDING = 24; // 距離螢幕邊緣的緩衝空間

        // X 軸邏輯：優先放在卡片右側，若螢幕右方空間不足則改放左側
        let x = buttonRect.right + PADDING;
        if (x + PREVIEW_WIDTH > window.innerWidth) {
            x = buttonRect.left - PREVIEW_WIDTH - PADDING;
        }

        // Y 軸邏輯：預設與卡片頂部水平對齊
        let y = buttonRect.top;

        // 【下邊界碰撞偵測】如果預覽窗底部會超出螢幕，就強制把它往上推
        if (y + PREVIEW_HEIGHT > window.innerHeight - PADDING) {
            y = window.innerHeight - PREVIEW_HEIGHT - PADDING;
        }

        // 【上邊界碰撞偵測】如果往上推過頭，超出螢幕頂部，則強制往下壓
        if (y < PADDING) {
            y = PADDING;
        }

        setPreviewPos({ x, y });
    };

    return (
        <div
            ref={containerRef}
            className="relative"
            onMouseLeave={() => setHoveredOption(null)}
        >
            <div className="grid grid-cols-2 gap-3 mt-2">
                {options.map((option) => {
                    const isSelected = value === option.value;

                    return (
                        <button
                            key={option.value}
                            onClick={() => onChange(option.value)}
                            onMouseEnter={(e) => handleMouseEnter(e, option)}
                            style={isSelected ? {
                                borderColor: option.color,
                                backgroundColor: `${option.color}15`, // 15% 透明度的背景
                                boxShadow: `0 4px 15px ${option.color}20`
                            } : {}}
                            className={`
                                relative flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all duration-300 group
                                ${!isSelected && 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80'}
                            `}
                        >
                            {/* 圖標 (縮小並改為並排) */}
                            <div 
                                className={`p-1.5 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors ${!isSelected ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300' : ''}`}
                                style={isSelected ? { backgroundColor: option.color, color: 'white' } : {}}
                            >
                                {option.icon || <Layout size={14} />}
                            </div>

                            {/* 標籤文字 (改為緊湊排版) */}
                            <div className="flex-1 text-left flex flex-col justify-center min-w-0">
                                <span 
                                    className={`block text-[11px] font-black tracking-tight truncate ${!isSelected ? 'text-slate-800 dark:text-slate-100' : ''}`}
                                    style={isSelected ? { color: option.color } : {}}
                                >
                                    {option.label}
                                </span>
                                <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5 truncate">
                                    {option.hint}
                                </span>
                            </div>

                            {/* 右側狀態 (Check 或 Info 提示) */}
                            <div className="flex-shrink-0 flex items-center justify-center w-4">
                                {isSelected ? (
                                    <div className="animate-in zoom-in-50 duration-300" style={{ color: option.color }}>
                                        <Check size={14} strokeWidth={3.5} />
                                    </div>
                                ) : (
                                    <div className="opacity-0 group-hover:opacity-40 transition-opacity">
                                        <Info size={14} className="text-slate-400" />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 使用 createPortal 將預覽視窗渲染到 body，徹底脫離 Modal 的 overflow 限制 */}
            {hoveredOption && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-300"
                    style={{
                        left: `${previewPos.x}px`,
                        top: `${previewPos.y}px`,
                        width: '320px' // 固定較為寬敞的預覽寬度
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700 overflow-hidden backdrop-blur-xl">
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredOption.color }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    {hoveredOption.label} 預覽
                                </span>
                            </div>
                        </div>

                        <div className="aspect-video w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative">
                            {hoveredOption.previewImg ? (
                                <img
                                    src={hoveredOption.previewImg}
                                    alt={hoveredOption.label}
                                    className="w-full h-full object-cover border-b border-slate-100 dark:border-slate-800"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 opacity-20">
                                    <Layout size={32} className="text-slate-400" />
                                    <span className="text-[8px] font-bold tracking-tighter uppercase">預覽圖片準備中...</span>
                                </div>
                            )}

                            {/* 漸層遮罩 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                        </div>

                        {hoveredOption.description && (
                            <div className="p-4 bg-white dark:bg-slate-900">
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    {hoveredOption.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ThemeGridSelector;

