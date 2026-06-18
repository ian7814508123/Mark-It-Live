import React, { useState } from 'react';
import { Trash2, Network, Circle, Square, Diamond, RectangleHorizontal, DatabaseIcon, Hexagon, Flag, BoxSelect, ChevronRight2, Code, Cylinder, Capsule, Parallelogram, RParallelogram, Trapezoid, RTrapezoid, Palette } from '../ui/Icons';

interface MermaidContextToolbarProps {
    nodeId: string | null;
    position: { x: number, y: number, isNearTop?: boolean } | null;
    zoom: number;
    onChangeShape?: (shape: string) => void;
    onChangeColor?: (color: string) => void;
    onStartConnect?: () => void;
    onGoToCode?: () => void;
    onDelete?: () => void;
    onClose?: () => void;
}

const MermaidContextToolbar: React.FC<MermaidContextToolbarProps> = ({
    nodeId,
    position,
    zoom,
    onChangeShape,
    onChangeColor,
    onStartConnect,
    onGoToCode,
    onDelete,
    onClose
}) => {
    const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

    if (!nodeId || !position) return null;

    // 依據 zoom 調整位置與比例
    const scale = Math.max(0.7, Math.min(1.2, zoom / 100));

    return (
        <div
            className="absolute z-40 flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 animate-in fade-in zoom-in-95"
            style={{
                left: position.x,
                top: position.y + (position.isNearTop ? 10 : -10),
                transform: `translate(-50%, ${position.isNearTop ? '0' : '-100%'}) scale(${scale})`,
                transformOrigin: position.isNearTop ? 'top center' : 'bottom center'
            }}
            onClick={(e) => e.stopPropagation()} // 避免觸發畫布的點擊事件
        >
            <div className="flex items-center px-2 border-r border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 max-w-[80px] truncate" title={nodeId}>
                    {nodeId}
                </span>
            </div>

            <div className="relative flex items-center">
                <button
                    onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
                    className={`flex items-center gap-1 p-1.5 rounded-lg transition-all ${isShapeMenuOpen ? 'bg-slate-100 dark:bg-slate-700 text-brand-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-primary'}`}
                    title="選擇形狀"
                    aria-label="選擇形狀"
                >
                    <BoxSelect size={14} />
                    <ChevronRight2 size={12} className={`transition-transform duration-200 ${isShapeMenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {isShapeMenuOpen && (
                    <div
                        className={`absolute left-0 w-[140px] bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 grid grid-cols-4 gap-1 z-50 animate-in fade-in zoom-in-95 ${position.isNearTop ? 'top-full mt-2' : 'bottom-full mb-2'}`}
                    >
                        {[
                            { id: 'rect', icon: Square, title: '方形' },
                            { id: 'round', icon: RectangleHorizontal, title: '圓角' },
                            { id: 'stadium', icon: Capsule, title: '體育場' },
                            { id: 'cylinder', icon: Cylinder, title: '資料庫' },
                            { id: 'circle', icon: Circle, title: '圓形' },
                            { id: 'diamond', icon: Diamond, title: '菱形' },
                            { id: 'hexagon', icon: Hexagon, title: '六邊形' },
                            { id: 'asymmetric', icon: Flag, title: '旗幟' },
                        ].map((shape) => {
                            const Icon = shape.icon;
                            return (
                                <button
                                    key={shape.id}
                                    onClick={() => {
                                        onChangeShape?.(shape.id);
                                        setIsShapeMenuOpen(false);
                                    }}
                                    className="p-1.5 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-all"
                                    title={shape.title}
                                >
                                    <Icon size={14} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
                onClick={() => onStartConnect?.()}
                className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400 transition-all font-semibold text-xs"
                title="連線至其他節點"
            >
                <Network size={14} />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* 顏色選擇器 */}
            <div 
                className="relative flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-all"
                title="自訂顏色"
            >
                <Palette size={14} />
                <input
                    type="color"
                    onChange={(e) => onChangeColor?.(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>

            <button
                onClick={() => onGoToCode?.()}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-all"
                title="跳至原始碼 (Go To Code)"          >
                <Code size={14} />
            </button>


            <button
                onClick={() => {
                    onDelete?.();
                    onClose?.();
                }}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-500 transition-all"
                title="刪除節點"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

export default MermaidContextToolbar;
