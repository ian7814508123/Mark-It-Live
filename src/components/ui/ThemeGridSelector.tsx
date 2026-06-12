import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Layout, Star } from './Icons';

export interface ThemeOption {
    label: string;
    value: string;
    hint: string;
    description?: string;
    icon?: React.ReactNode;
    color: string;
    previewImg?: string;
    category: 'minimal' | 'tech' | 'creative' | 'limited';
}

interface ThemeGridSelectorProps {
    options: ThemeOption[];
    value: string;
    onChange: (value: string) => void;
    favoriteValues: string[];
    onToggleFavorite: (value: string) => void;
}

const ThemeGridSelector: React.FC<ThemeGridSelectorProps> = ({
    options,
    value,
    onChange,
    favoriteValues,
    onToggleFavorite
}) => {
    const [hoveredOption, setHoveredOption] = useState<ThemeOption | null>(null);
    const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
    const [activeCategory, setActiveCategory] = useState<'favorite' | 'minimal' | 'tech' | 'creative' | 'limited'>('favorite');
    const containerRef = useRef<HTMLDivElement>(null);

    const categories = [
        { label: '常用', value: 'favorite' },
        { label: '簡約', value: 'minimal' },
        { label: '專業', value: 'tech' },
        { label: '創意', value: 'creative' },
        { label: '限時', value: 'limited' }
    ] as const;

    const filteredOptions = activeCategory === 'favorite'
        ? options.filter(opt => favoriteValues.includes(opt.value))
        : options.filter(opt => opt.category === activeCategory);

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
            {/* 極簡無邊框底線分類 Tab */}
            <div className="flex items-center gap-5 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3 px-1">
                {categories.map((cat) => {
                    const isActive = activeCategory === cat.value;
                    return (
                        <button
                            key={cat.value}
                            type="button"
                            onClick={() => setActiveCategory(cat.value)}
                            className={`
                                relative text-[10px] font-black uppercase tracking-widest pb-1 transition-all duration-300
                                ${isActive
                                    ? 'text-brand-primary dark:text-brand-primary'
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }
                            `}
                        >
                            {cat.label}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary rounded-full animate-in fade-in duration-300" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 常用主題為空時的溫馨提示 */}
            {activeCategory === 'favorite' && filteredOptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 min-h-[140px] max-w-[440px] mt-2 animate-in fade-in duration-300">
                    <Star size={20} className="text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                        目前尚無常用主題
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 max-w-[260px] leading-relaxed">
                        在其他風格頁籤中點擊按鈕右側的星星，即可快速收藏至此！
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 max-w-[440px] mt-2">
                    {filteredOptions.map((option) => {
                        const isSelected = value === option.value;
                        const isFavorite = favoriteValues.includes(option.value);

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
                                <div className="flex-1 text-left flex flex-col justify-center min-w-0 pr-1">
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

                                {/* 右側星星收藏區 */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation(); // 阻止切換主題
                                        onToggleFavorite(option.value);
                                    }}
                                    className="flex-shrink-0 flex items-center justify-center w-5 h-5 cursor-pointer hover:scale-125 active:scale-95 transition-all text-slate-300 dark:text-slate-600 hover:text-yellow-500 dark:hover:text-yellow-400"
                                >
                                    {isFavorite ? (
                                        <Star size={14} className="fill-yellow-400 text-yellow-400 animate-in zoom-in duration-300" />
                                    ) : (
                                        <Star size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

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
