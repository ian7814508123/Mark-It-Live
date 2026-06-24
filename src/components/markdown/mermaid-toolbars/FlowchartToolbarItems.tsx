import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trash2, Network, BoxSelect, ChevronRight2, Palette, Square, RectangleHorizontal, Capsule, Cylinder, Circle, Diamond, Hexagon, Flag } from '../../ui/Icons';
import { FlowchartManipulator } from '../../../utils/mermaid';
import { useDynamicMenuPosition } from '../../../hooks/useDynamicMenuPosition';

interface FlowchartToolbarItemsProps {
    nodeId: string;
    rawCode: string;
    onUpdateCode: (newCode: string) => void;
    onStartConnect?: () => void;
    onClose?: () => void;
}

const FlowchartToolbarItems: React.FC<FlowchartToolbarItemsProps> = ({
    nodeId,
    rawCode,
    onUpdateCode,
    onStartConnect,
    onClose
}) => {
    const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

    const shapeMenuRef = useRef<HTMLDivElement>(null);
    const colorMenuRef = useRef<HTMLDivElement>(null);

    const { menuRef: shapeDropdownRef, positionClass: shapePositionClass } = useDynamicMenuPosition(isShapeMenuOpen, 'horizontal');
    const { menuRef: colorDropdownRef, positionClass: colorPositionClass } = useDynamicMenuPosition(isColorMenuOpen, 'horizontal');

    // 點擊選單外部時自動關閉
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
                setIsShapeMenuOpen(false);
            }
            if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
                setIsColorMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 解析當前節點所設定的樣式，以供顏色選擇器預填
    const nodeStyles = useMemo(() => {
        return FlowchartManipulator.getNodeStyle(rawCode, nodeId);
    }, [rawCode, nodeId]);

    const handleStyleChange = (key: 'fill' | 'stroke' | 'color', value: string) => {
        const newCode = FlowchartManipulator.changeNodeStyle(rawCode, nodeId, { [key]: value });
        onUpdateCode(newCode);
    };

    return (
        <>
            {/* 形狀選單 */}
            <div className="relative flex items-center" ref={shapeMenuRef}>
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
                        ref={shapeDropdownRef}
                        className={`absolute w-[140px] bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 grid grid-cols-4 gap-1 z-50 animate-in fade-in zoom-in-95 ${shapePositionClass}`}
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
                                        const newCode = FlowchartManipulator.changeNodeShape(rawCode, nodeId, shape.id);
                                        onUpdateCode(newCode);
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

            {/* 連線按鈕 */}
            <button
                onClick={onStartConnect}
                className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-all font-semibold text-xs"
                title="連線至其他節點"
            >
                <Network size={14} />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* 顏色選擇選單 */}
            <div className="relative flex items-center" ref={colorMenuRef}>
                <button
                    onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
                    className={`flex items-center gap-1 p-1.5 rounded-lg transition-all ${isColorMenuOpen ? 'bg-slate-100 dark:bg-slate-700 text-brand-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-primary'}`}
                    title="自訂樣式顏色"
                >
                    <Palette size={14} />
                    <ChevronRight2 size={12} className={`transition-transform duration-200 ${isColorMenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {isColorMenuOpen && (
                    <div
                        ref={colorDropdownRef}
                        className={`absolute w-[170px] bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 ${colorPositionClass}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                            節點樣式設定
                        </div>

                        {/* 1. 背景顏色 */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <span>背景 (Fill)</span>
                            <div
                                className="relative w-6 h-6 rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm active:scale-95 transition-transform"
                                style={{ backgroundColor: nodeStyles.fill || '#ececff' }}
                            >
                                <input
                                    type="color"
                                    value={nodeStyles.fill || '#ececff'}
                                    onChange={(e) => handleStyleChange('fill', e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150"
                                />
                            </div>
                        </div>

                        {/* 2. 邊框顏色 */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <span>邊框 (Stroke)</span>
                            <div
                                className="relative w-6 h-6 rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm active:scale-95 transition-transform"
                                style={{ backgroundColor: nodeStyles.stroke || '#9370db' }}
                            >
                                <input
                                    type="color"
                                    value={nodeStyles.stroke || '#9370db'}
                                    onChange={(e) => handleStyleChange('stroke', e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150"
                                />
                            </div>
                        </div>

                        {/* 3. 字體顏色 */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <span>字體 (Color)</span>
                            <div
                                className="relative w-6 h-6 rounded-md border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm active:scale-95 transition-transform"
                                style={{ backgroundColor: nodeStyles.color || '#333333' }}
                            >
                                <input
                                    type="color"
                                    value={nodeStyles.color || '#333333'}
                                    onChange={(e) => handleStyleChange('color', e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* 刪除按鈕 */}
            <button
                onClick={() => {
                    const newCode = FlowchartManipulator.deleteNode(rawCode, nodeId);
                    onUpdateCode(newCode);
                    onClose?.();
                }}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-500 transition-all"
                title="刪除節點"
            >
                <Trash2 size={14} />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        </>
    );
};

export default FlowchartToolbarItems;
