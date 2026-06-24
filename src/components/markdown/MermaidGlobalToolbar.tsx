import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { motion, PanInfo, useMotionValue, animate, useDragControls } from 'framer-motion';
import { MousePointer2, Hand, ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Pen } from '../ui/Icons';
import { MermaidDiagramType } from '../../utils/mermaid';
import FlowchartGlobalItems from './mermaid-toolbars/FlowchartGlobalItems';
import SequenceGlobalItems from './mermaid-toolbars/SequenceGlobalItems';
import { useMagneticEffect } from '../../hooks/useMagneticEffect';

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

    // 拖曳邊界參考
    constraintsRef?: React.RefObject<HTMLDivElement>;
}

type ToolbarPosition = 'TL' | 'TC' | 'TR' | 'LC' | 'RC' | 'BL' | 'BC' | 'BR';

const positionClasses: Record<ToolbarPosition, string> = {
    TL: 'top-5 left-5',
    TC: 'top-5 left-1/2 -translate-x-1/2 w-max',
    TR: 'top-5 right-5',
    LC: 'top-1/2 left-5 -translate-y-1/2 h-max',
    RC: 'top-1/2 right-5 -translate-y-1/2 h-max',
    BL: 'bottom-5 left-5',
    BC: 'bottom-5 left-1/2 -translate-x-1/2 w-max',
    BR: 'bottom-5 right-5',
};

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
    currentDirection,
    constraintsRef
}) => {
    const dragControls = useDragControls();
    const [dockPosition, setDockPosition] = useState<ToolbarPosition>('BC');
    const [dragState, setDragState] = useState<'idle' | 'dragging' | 'docking'>('idle');
    const [layoutEnabled, setLayoutEnabled] = useState(false);
    const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pointerDownPosRef = useRef({ x: 0, y: 0 });

    const { x: magX, y: magY, handlers: magHandlers } = useMagneticEffect({ maxOffset: 8, radius: 50 });

    const enableLayoutForAnimation = (durationMs: number = 600) => {
        setLayoutEnabled(true);
        if (layoutTimeoutRef.current) clearTimeout(layoutTimeoutRef.current);
        layoutTimeoutRef.current = setTimeout(() => {
            setLayoutEnabled(false);
        }, durationMs);
    };

    const orientation = ['LC', 'RC'].includes(dockPosition) ? 'vertical' : 'horizontal';

    const getTargetCorner = (side: 'start' | 'end'): ToolbarPosition => {
        if (orientation === 'horizontal') {
            const isTop = ['TL', 'TC', 'TR'].includes(dockPosition);
            if (side === 'start') return isTop ? 'TL' : 'BL';
            if (side === 'end') return isTop ? 'TR' : 'BR';
        } else {
            const isLeft = ['TL', 'LC', 'BL'].includes(dockPosition);
            if (side === 'start') return isLeft ? 'TL' : 'TR';
            if (side === 'end') return isLeft ? 'BL' : 'BR';
        }
        return 'TL';
    };

    const collapseTo = (corner: ToolbarPosition, e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setDockPosition(corner);
        setDragState('docking');
        enableLayoutForAnimation(1200);

        const springConfig = { type: 'spring' as const, bounce: 0, duration: 0.5 };
        animate(x, 0, springConfig);
        animate(y, 0, springConfig);

        setTimeout(() => {
            setDragState('idle');
        }, 500);
    };

    // 監聽 isTextEmpty 造成的收合改變，給予展開/收合動畫
    const prevTextEmpty = useRef(isTextEmpty);
    useEffect(() => {
        if (prevTextEmpty.current !== isTextEmpty) {
            enableLayoutForAnimation(600);
        }
        prevTextEmpty.current = isTextEmpty;
    }, [isTextEmpty]);

    // 用於手動控制拖曳位移，以避免 dragSnapToOrigin 與 layout 產生動畫衝突
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // 當處於四個角落時收合；或是正在拖曳、停靠飛行中時也保持收合
    const isCorner = ['TL', 'TR', 'BL', 'BR'].includes(dockPosition);
    const isCollapsed = dragState !== 'idle' || isCorner || isTextEmpty;

    const handleDragEnd = (e: any, info: PanInfo) => {

        if (!constraintsRef?.current) return;

        let clientX = info.point.x;
        let clientY = info.point.y;

        // Framer Motion 在某些 tap 的情況下 info.point 可能會是 (0,0)
        // 所以優先從 native event 取得座標
        if (e && 'clientX' in e) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e && 'changedTouches' in e && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        const containerRect = constraintsRef.current.getBoundingClientRect();

        const px = clientX - containerRect.left;
        const py = clientY - containerRect.top;
        const W = containerRect.width;
        const H = containerRect.height;

        const marginX = 8;
        const marginY = 8;

        // 定義 8 個停靠點的座標
        const points: Record<ToolbarPosition, { x: number, y: number }> = {
            TL: { x: marginX, y: marginY },
            TC: { x: W / 2, y: marginY },
            TR: { x: W - marginX, y: marginY },
            LC: { x: marginX, y: H / 2 },
            RC: { x: W - marginX, y: H / 2 },
            BL: { x: marginX, y: H - marginY },
            BC: { x: W / 2, y: H - marginY },
            BR: { x: W - marginX, y: H - marginY },
        };

        let minDist = Infinity;
        let closestPos: ToolbarPosition = dockPosition;

        for (const [pos, pt] of Object.entries(points)) {
            const dist = Math.hypot(px - pt.x, py - pt.y);
            if (dist < minDist) {
                minDist = dist;
                closestPos = pos as ToolbarPosition;
            }
        }

        setDockPosition(closestPos);
        setDragState('docking');

        // 開啟 layout 動畫：500ms 飛行 + 500ms 展開 = 給予 1200ms 的緩衝
        enableLayoutForAnimation(1200);

        // 使用與 layout 動畫完全一致的彈簧參數，達成完美的防抖動飛行動畫
        const springConfig = { type: 'spring' as const, bounce: 0, duration: 0.5 };
        animate(x, 0, springConfig);
        animate(y, 0, springConfig);

        // 等待飛行結束後，才解除 docking 狀態讓元件原地展開
        setTimeout(() => {
            setDragState('idle');
        }, 500);
    };

    return (
        <motion.div
            layout={layoutEnabled}
            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
            drag={isCollapsed}
            onDragStart={() => setDragState('dragging')}
            style={{ x, y }}
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.05 }}
            className={`
            absolute z-30 flex transition-colors duration-200 ${isCollapsed ? 'cursor-grab active:cursor-grabbing' : ''}
            ${positionClasses[dockPosition]}
            ${orientation === 'horizontal' ? 'items-center flex-row' : 'flex-col items-center'}
            ${isCollapsed
                    ? 'bg-transparent border-transparent'
                    : `${orientation === 'horizontal' ? 'h-12 px-2' : 'w-12 py-2'} bg-white/10 dark:bg-slate-900/10 rounded-full border border-slate-300/20 dark:border-white/20 ${isTextEmpty ? 'opacity-40 pointer-events-none select-none border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/20' : 'backdrop-blur-3xl shadow-2xl'}`
                }
            ${isCollapsed && isTextEmpty ? 'opacity-40 pointer-events-none select-none' : ''}
        `}>
            {isCollapsed ? (
                <motion.div
                    layoutId="toolbar-container"
                    layout={layoutEnabled}
                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                    style={{ x: magX, y: magY }}
                    {...magHandlers}
                    onTap={() => {
                        if (['TL', 'TR'].includes(dockPosition)) {
                            setDockPosition('TC');
                        } else if (['BL', 'BR'].includes(dockPosition)) {
                            setDockPosition('BC');
                        }
                        enableLayoutForAnimation(600);
                        setDragState('idle');
                        const springConfig = { type: 'spring' as const, bounce: 0, duration: 0.3 };
                        animate(x, 0, springConfig);
                        animate(y, 0, springConfig);
                    }}
                    className={`flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md w-12 h-12 rounded-full border border-slate-300/20 dark:border-white/10 pointer-events-auto ${isCorner && dragState === 'idle' ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-brand-primary' : ''}`}
                    title={isCorner && dragState === 'idle' ? "展開工具列" : ""}
                >
                    <MousePointer2 size={20} className='rotate-45' />
                </motion.div>
            ) : (
                <motion.div layoutId="toolbar-container" layout={layoutEnabled} transition={{ type: 'spring', bounce: 0, duration: 0.5 }} className={`flex items-center justify-center w-full h-full pointer-events-auto ${orientation === 'vertical' ? 'flex-col gap-0' : 'flex-row gap-0'}`}>

                    {/* 收合桿 (Start Handle) */}
                    <div
                        className={`group flex items-center justify-center cursor-pointer transition-colors
                            ${orientation === 'horizontal' ? 'w-4 h-full rounded-l-full' : 'h-4 w-full rounded-t-full'}`}
                        onClick={(e) => collapseTo(getTargetCorner('start'), e)}
                        onPointerDown={(e) => e.stopPropagation()}
                        title={orientation === 'horizontal' ? "收合至左側" : "收合至上方"}
                    >
                        <div className={`${orientation === 'horizontal' ? 'w-[3px] h-5' : 'h-[3px] w-5'} bg-slate-400 dark:bg-slate-500 group-hover:bg-brand-primary rounded-full transition-colors`} />
                    </div>

                    {/* Pan / Edit 切換 - 全域皆可使用 (非對稱設計) */}
                    <div className={`flex items-center ${orientation === 'vertical' ? 'pb-2 border-b flex-col mt-1' : 'pr-2 pl-1 border-r flex-row ml-1'} border-slate-200 dark:border-white/10`}>
                        <button
                            onClick={() => setIsPanMode(!isPanMode)}
                            className={`flex items-center justify-center transition-all text-xs font-bold active:scale-95 ${!isPanMode
                                ? 'bg-brand-primary text-white shadow-[0_0_5px_rgba(14,165,233,0.5)]'
                                : 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                                } ${orientation === 'horizontal' ? 'gap-2 w-[72px] py-1.5 rounded-full' : 'w-8 h-8 rounded-full'}`}
                            title={isPanMode ? "切換至選取模式" : "切換至拖曳模式"}
                        >
                            {!isPanMode ? (
                                <><Pen size={14} /> {orientation === 'horizontal' && (diagramType === 'flowchart' ? 'Edit' : 'Select')}</>
                            ) : (
                                <><Hand size={14} /> {orientation === 'horizontal' && 'Pan'}</>
                            )}
                        </button>
                    </div>

                    {/* Undo / Redo */}
                    <div className={`flex items-center gap-1 ${orientation === 'vertical' ? 'flex-col py-2 border-b' : 'px-2 border-r'} border-slate-200 dark:border-white/10`}>
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
                            orientation={orientation}
                        />
                    )}

                    {/* === Sequence 專屬工具 === */}
                    {diagramType === 'sequence' && (
                        <SequenceGlobalItems
                            rawCode={rawCode}
                            onUpdateCode={onUpdateCode}
                            orientation={orientation}
                        />
                    )}

                    {/* 導覽與縮放 */}
                    <div className={`flex items-center gap-1 ${orientation === 'vertical' ? 'flex-col pt-2' : 'pl-2'}`}>
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

                    {/* 收合桿 (End Handle) */}
                    <div
                        className={`group flex items-center justify-center cursor-pointer transition-colors
                            ${orientation === 'horizontal' ? 'w-4 h-full rounded-r-full ml-1' : 'h-4 w-full rounded-b-full mt-1'}`}
                        onClick={(e) => collapseTo(getTargetCorner('end'), e)}
                        onPointerDown={(e) => e.stopPropagation()}
                        title={orientation === 'horizontal' ? "收合至右側" : "收合至下方"}
                    >
                        <div className={`${orientation === 'horizontal' ? 'w-[3px] h-5' : 'h-[3px] w-5'} bg-slate-400 dark:bg-slate-500 group-hover:bg-brand-primary rounded-full transition-colors`} />
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default MermaidGlobalToolbar;
