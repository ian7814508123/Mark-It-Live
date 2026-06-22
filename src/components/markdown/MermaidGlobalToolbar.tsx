import React from 'react';
import { MousePointer2, Hand, ZoomIn, ZoomOut, Maximize, Undo2, Redo2 } from '../ui/Icons';
import { MermaidDiagramType } from '../../utils/mermaid';
import FlowchartGlobalItems from './mermaid-toolbars/FlowchartGlobalItems';
import SequenceGlobalItems from './mermaid-toolbars/SequenceGlobalItems';

interface MermaidGlobalToolbarProps {
    isTextEmpty: boolean;
    isPanMode: boolean;
    setIsPanMode: (isPan: boolean) => void;
    zoom: number;
    onZoom: (delta: number) => void;
    onSetZoom: (zoom: number) => void;
    onResetNav: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    /** 目前圖表類型，用於顯示對應的工具區塊 */
    diagramType?: MermaidDiagramType;
    
    // 新增：用於內部子元件操作 Manipulator 的 code 與修改 callback
    rawCode: string;
    onUpdateCode: (newCode: string) => void;
    
    // Flowchart 專屬方向狀態
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
    onUndo,
    onRedo,
    diagramType = 'flowchart',
    rawCode,
    onUpdateCode,
    currentDirection
}) => {
    return (
        <div className={`
            absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center h-12 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            bg-white/10 dark:bg-slate-900/10 px-2 rounded-full border border-slate-300/20 dark:border-white/20
            ${isTextEmpty ? 'opacity-40 pointer-events-none select-none border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/20' : 'backdrop-blur-3xl'}
        `}>
            {/* Pan / Edit 切換 - 全域皆可使用 (非對稱設計) */}
            <div className="flex items-center pr-3 border-r border-slate-200 dark:border-white/10">
                <button
                    onClick={() => setIsPanMode(!isPanMode)}
                    className={`flex items-center gap-2 w-[72px] justify-center py-1.5 rounded-full transition-all text-xs font-bold active:scale-95 ${!isPanMode
                        ? 'bg-brand-primary text-white shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                        : 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-md'
                        }`}
                    title={isPanMode ? "切換至選取模式" : "切換至拖曳模式"}
                >
                    {!isPanMode ? (
                        <><MousePointer2 size={14} /> {diagramType === 'flowchart' ? 'Edit' : 'Select'}</>
                    ) : (
                        <><Hand size={14} /> Pan</>
                    )}
                </button>
            </div>

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

            {/* === Flowchart 專屬工具 === */}
            {diagramType === 'flowchart' && (
                <FlowchartGlobalItems
                    rawCode={rawCode}
                    onUpdateCode={onUpdateCode}
                    currentDirection={currentDirection ?? null}
                />
            )}

            {/* === Sequence 專屬工具 === */}
            {diagramType === 'sequence' && (
                <SequenceGlobalItems
                    rawCode={rawCode}
                    onUpdateCode={onUpdateCode}
                />
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
