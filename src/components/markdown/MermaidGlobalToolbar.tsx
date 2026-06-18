import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Hand, ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Network, MoveRight, MoveDown, MoveLeft, MoveUp, Plus } from '../ui/Icons';

interface MermaidGlobalToolbarProps {
    isTextEmpty: boolean;
    isPanMode: boolean;
    setIsPanMode: (isPan: boolean) => void;
    zoom: number;
    onZoom: (delta: number) => void;
    onSetZoom: (zoom: number) => void;
    onResetNav: () => void;
    onAddIsolatedNode?: () => void;
    onChangeDirection?: (dir: 'TD' | 'LR' | 'BT' | 'RL') => void;
    onUndo?: () => void;
    onRedo?: () => void;
    isFlowchart?: boolean;
    currentDirection?: 'TD' | 'LR' | 'BT' | 'RL' | 'TB' | null;
}

const MermaidGlobalToolbar: React.FC<MermaidGlobalToolbarProps> = ({
    isTextEmpty,
    isPanMode,
    setIsPanMode,
    zoom,
    onZoom,
    onSetZoom,
    onResetNav,
    onAddIsolatedNode,
    onChangeDirection,
    onUndo,
    onRedo,
    isFlowchart = true,
    currentDirection
}) => {
    const [isDirectionMenuOpen, setIsDirectionMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDirectionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCurrentDirectionIcon = () => {
        switch (currentDirection) {
            case 'BT': return <MoveUp size={14} />;
            case 'LR': return <MoveRight size={14} />;
            case 'RL': return <MoveLeft size={14} />;
            case 'TD':
            case 'TB':
            default: return <MoveDown size={14} />;
        }
    };

    return (
        <div className={`
            absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center h-12 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            bg-white/10 dark:bg-slate-900/10  px-2 rounded-full border border-slate-300/20 dark:border-white/20
            ${isTextEmpty ? 'opacity-40 pointer-events-none select-none border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/20' : 'backdrop-blur-3xl'}
        `}>
            {/* Pan / Edit 切換 - 僅在 flowchart 模式顯示 */}
            {isFlowchart && (
                <div className="flex items-center pr-3 border-r border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => setIsPanMode(!isPanMode)}
                        className={`flex items-center gap-2 w-[72px] justify-center py-1.5 rounded-full transition-all text-xs font-bold active:scale-95 ${!isPanMode
                            ? 'bg-brand-primary text-white shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                            : 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-md'
                            }`}
                        title={isPanMode ? "切換至編輯模式" : "切換至拖曳模式"}
                    >
                        {!isPanMode ? (
                            <><MousePointer2 size={14} /> Edit</>
                        ) : (
                            <><Hand size={14} /> Pan</>
                        )}
                    </button>
                </div>
            )}

            {/* Undo / Redo */}
            <div className="flex items-center gap-1 px-2 border-r border-slate-200 dark:border-white/10">
                <button
                    onClick={() => !isTextEmpty && onUndo?.()}
                    disabled={isTextEmpty}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-brand-primary transition-all active:scale-90"
                    title="復原 (Undo)"
                >
                    <Undo2 size={16} />
                </button>
                <button
                    onClick={() => !isTextEmpty && onRedo?.()}
                    disabled={isTextEmpty}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-brand-primary transition-all active:scale-90"
                    title="重做 (Redo)"
                >
                    <Redo2 size={16} />
                </button>
            </div>

            {/* 新增工具 - 僅在 flowchart 模式顯示 */}
            {isFlowchart && (
                <div className="flex items-center gap-1 px-2 border-r border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => !isTextEmpty && onAddIsolatedNode?.()}
                        disabled={isTextEmpty}
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition-all active:scale-90 text-xs font-semibold"
                        title="新增節點"
                    >
                        <Plus size={14} /> Node
                    </button>
                    <div className="relative flex items-center gap-1 p-1 rounded-full" ref={dropdownRef}>
                        <button
                            onClick={() => !isTextEmpty && setIsDirectionMenuOpen(!isDirectionMenuOpen)}
                            className={`p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all shadow-sm ${isDirectionMenuOpen
                                ? 'bg-white dark:bg-slate-700 text-brand-primary'
                                : 'text-slate-500 dark:text-slate-400 hover:text-brand-primary'
                                }`}
                            title="變更排版方向 (Change Direction)"
                        >
                            {getCurrentDirectionIcon()}
                        </button>

                        {isDirectionMenuOpen && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700/50 flex flex-col z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">
                                    排版方向
                                </div>
                                <button
                                    onClick={() => { onChangeDirection?.('TD'); setIsDirectionMenuOpen(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'TD' || currentDirection === 'TB' || !currentDirection ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                                >
                                    <MoveDown size={14} className="shrink-0" /> 由上往下
                                </button>
                                <button
                                    onClick={() => { onChangeDirection?.('BT'); setIsDirectionMenuOpen(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'BT' ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                                >
                                    <MoveUp size={14} className="shrink-0" /> 由下往上
                                </button>
                                <button
                                    onClick={() => { onChangeDirection?.('LR'); setIsDirectionMenuOpen(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'LR' ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                                >
                                    <MoveRight size={14} className="shrink-0" /> 由左往右
                                </button>
                                <button
                                    onClick={() => { onChangeDirection?.('RL'); setIsDirectionMenuOpen(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'RL' ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                                >
                                    <MoveLeft size={14} className="shrink-0" /> 由右往左
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 導覽與縮放 */}
            <div className="flex items-center gap-1 pl-2">
                <button
                    onClick={() => !isTextEmpty && onZoom(-25)}
                    disabled={isTextEmpty}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-brand-primary transition-all active:scale-90"
                    title="縮小"
                >
                    <ZoomOut size={16} />
                </button>
                <input
                    type="text"
                    disabled={isTextEmpty}
                    value={`${Math.round(zoom)}%`}
                    onChange={(e) => {
                        if (isTextEmpty) return;
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val) onSetZoom(Math.min(Math.max(parseInt(val), 5), 1000));
                    }}
                    className="w-12 bg-transparent text-slate-700 dark:text-slate-300 font-bold text-xs p-0 border-none focus:ring-0 text-center transition-all tabular-nums"
                />
                <button
                    onClick={() => !isTextEmpty && onZoom(25)}
                    disabled={isTextEmpty}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-brand-primary transition-all active:scale-90"
                    title="放大"
                >
                    <ZoomIn size={16} />
                </button>
                <button
                    onClick={() => !isTextEmpty && onResetNav()}
                    disabled={isTextEmpty}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-brand-primary transition-all active:scale-90"
                    title="置中"
                >
                    <Maximize size={16} />
                </button>
            </div>
        </div>
    );
};

export default MermaidGlobalToolbar;
