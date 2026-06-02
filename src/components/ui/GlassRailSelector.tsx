import React, { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimationControls } from 'framer-motion';

export interface GlassRailOption<T> {
    /** 顯示文字 */
    label: string;
    /** 選項值 */
    value: T;
    /** 選項下方的小提示文字（可選） */
    hint?: string;
    /** 選項左側圖示（可選） */
    icon?: React.ReactNode;
}

export interface GlassRailSelectorProps<T extends string | number> {
    options: GlassRailOption<T>[];
    value: T;
    onChange: (v: T) => void;
    /** 額外 className（套用到最外層容器） */
    className?: string;
}

/**
 * GlassRailSelector — 無邊光玻璃滑軌選擇器。
 *
 * 視覺設計：
 *  - 半透明磨砂玻璃軌道（backdrop-blur）
 *  - 選中的玻璃滑塊（白色半透明 + shadow）在選項間平滑滑動
 *
 * 互動設計：
 *  - **點擊**：直接跳到該選項
 *  - **mousedown + 拖曳**：滑塊即時跟隨游標滑過選項（連續拖曳感）
 *  - 基於「游標落在哪個格子」計算選項，非像素精確距離
 *
 * 技術重點：
 *  - `useRef` 追蹤 isDragging，避免 re-render 中斷拖曳
 *  - `animate={{ left }}` 驅動滑塊 spring 位移
 *  - 全域 mousemove/mouseup 確保拖出容器外也能繼續追蹤
 *
 * @example
 * ```tsx
 * // 頁面設定用
 * <GlassRailSelector
 *   options={[
 *     { label: 'A4', value: 'A4', hint: '預設' },
 *     { label: 'A3', value: 'A3', hint: '大圖' },
 *   ]}
 *   value={settings.paperSize}
 *   onChange={(v) => onChange({ paperSize: v })}
 * />
 *
 * // 導航 Tab 用（帶圖示）
 * <GlassRailSelector
 *   options={[
 *     { label: '編輯器', value: 'editor', icon: <Box size={14} /> },
 *   ]}
 *   value={activeTab}
 *   onChange={setActiveTab}
 * />
 * ```
 */
function GlassRailSelector<T extends string | number>({
    options,
    value,
    onChange,
    className = '',
}: GlassRailSelectorProps<T>) {
    const trackRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const [isPressed, setIsPressed] = useState(false);

    // 新增：紀錄目前滑鼠 Hover 懸停的選項索引
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // 內部暫存的拖曳位置百分比（當為 null 時表示處於靜態或已放手吸附）
    const [dragLeftPercent, setDragLeftPercent] = useState<number | null>(null);
    // 用 ref 存儲即時百分比，避免 useEffect 中的事件監聽頻繁重新綁定
    const dragLeftPercentRef = useRef<number | null>(null);

    const activeIndex = Math.max(0, options.findIndex(o => o.value === value));
    const totalOptions = options.length;

    // 滑塊寬度百分比
    const sliderWidthPercent = 100 / totalOptions;
    // 滑塊可移動的最大 left 百分比
    const maxLeftPercent = 100 - sliderWidthPercent;

    // 靜態（選中）狀態下的 left 百分比位置
    const staticLeftPercent = totalOptions > 1
        ? (activeIndex / (totalOptions - 1)) * maxLeftPercent
        : 0;

    // 目前渲染使用的 left 百分比（拖曳中用拖曳位置，平時用選中位置）
    const currentLeft = dragLeftPercent !== null ? dragLeftPercent : staticLeftPercent;

    // 當拖曳中，即時計算最靠近的 index；若非拖曳中則為 null
    const dragIndex = dragLeftPercent !== null && totalOptions > 1
        ? Math.max(0, Math.min(totalOptions - 1, Math.round((currentLeft / maxLeftPercent) * (totalOptions - 1))))
        : null;

    // 目前正在接近（即將高亮）的選項索引：拖曳中的 index 優先，再來是滑鼠 hover 懸停的 index，最後才是當前實際選中的 activeIndex
    const approachingIndex = dragIndex !== null
        ? dragIndex
        : (hoveredIndex !== null ? hoveredIndex : activeIndex);

    /** 根據滑鼠 X 座標，計算滑塊應該在的百分比位置（讓滑塊中心對齊游標） */
    const getLeftPercentByX = (clientX: number) => {
        if (!trackRef.current) return 0;
        const rect = trackRef.current.getBoundingClientRect();
        // 游標在軌道內的比例 (0 ~ 1)
        const cursorRatio = (clientX - rect.left) / rect.width;
        // 計算滑塊 left 百分比，使其中心對準游標
        const targetPercent = (cursorRatio * 100) - (sliderWidthPercent / 2);
        // 限制在合法移動邊界內
        return Math.max(0, Math.min(maxLeftPercent, targetPercent));
    };

    // 全域事件監聽：處理拖曳移動與放開吸附
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            const leftPercent = getLeftPercentByX(e.clientX);
            dragLeftPercentRef.current = leftPercent;
            setDragLeftPercent(leftPercent);
        };

        const onUp = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            setIsPressed(false);

            const lastLeft = dragLeftPercentRef.current;
            let closestIdx = activeIndex;

            if (totalOptions > 1 && lastLeft !== null) {
                // 根據最後放開的百分比位置，計算最靠近的選項 index
                closestIdx = Math.round((lastLeft / maxLeftPercent) * (totalOptions - 1));
                closestIdx = Math.max(0, Math.min(totalOptions - 1, closestIdx));
            } else if (trackRef.current) {
                // 如果只是點擊（沒有觸發 move），直接計算滑鼠點擊位置的最近 index
                const leftPercent = getLeftPercentByX(e.clientX);
                closestIdx = Math.round((leftPercent / maxLeftPercent) * (totalOptions - 1));
                closestIdx = Math.max(0, Math.min(totalOptions - 1, closestIdx));
            }

            // 觸發外部狀態更新
            const newValue = options[closestIdx].value;
            onChange(newValue);

            // 清除拖曳狀態，滑塊會重新由 staticLeftPercent 接管並透過 spring 平滑回彈
            dragLeftPercentRef.current = null;
            setDragLeftPercent(null);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [totalOptions, maxLeftPercent, sliderWidthPercent, options, onChange, activeIndex]);

    return (
        <div
            ref={trackRef}
            onMouseDown={(e) => {
                e.preventDefault(); // 防止文字選取
                isDraggingRef.current = true;
                setIsPressed(true);

                const startLeft = getLeftPercentByX(e.clientX);
                dragLeftPercentRef.current = startLeft;
                setDragLeftPercent(startLeft);
            }}
            style={{ userSelect: 'none', cursor: 'pointer', perspective: 1000, transformStyle: 'preserve-3d' }}
            className={[
                // 軌道：磨砂玻璃底板
                'relative flex rounded-2xl p-1 select-none',
                'bg-transparent dark:bg-slate-900',
                'border border-black/10 dark:border-white/10',
                'backdrop-blur-md',
                className,
            ].join(' ')}
        >
            <div className="relative flex w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                {/* 玻璃滑塊定位外層 */}
                <motion.div
                    className="absolute top-0 bottom-0 px-1 py-0.5 pointer-events-none z-0"
                    animate={{ left: `${currentLeft}%` }}
                    style={{ width: `${sliderWidthPercent}%`, transformStyle: 'preserve-3d' }}
                    transition={
                        dragLeftPercent !== null
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }
                    }
                >
                    {/* 玻璃質感滑塊本體：負責 3D 浮起與縮放，使用 framer-motion 來獲得彈簧過衝效果 */}
                    <motion.div
                        className="relative w-full h-full rounded-xl"
                        animate={{
                            scale: isPressed ? 1.12 : 1.0,
                            // 利用 translateZ 來產生 3D 位移，這需要父容器有 perspective
                            z: isPressed ? 15 : 0,
                            rotateX: isPressed ? -2 : 0, // 微小的俯仰角，增強 3D 光影變化
                            boxShadow: isPressed
                                ? '0 8px 16px -4px rgba(0,0,0,0.12),0 2px 6px - 1px rgba(0, 0, 0, 0.05),inset 0 0 0 1px rgba(255,255,255,0.4),inset 0 -3px 6px -1px rgba(0,0,0,0.04)'
                                : '0 2px 4px -1px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.01)',
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 18,
                            mass: 0.8
                        }}
                        style={{
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        {/* 1. 材質底層 (霧面 vs 玻璃) */}
                        {/* 平時：高不透明度霧面 (bg-white/90)。拿起來：低不透明度 + 高強度模糊 (bg-white/30 + blur) */}
                        <div className={`absolute inset-0 rounded-xl transition-all duration-300 
                            ${isPressed
                                ? 'bg-white/20 border-slate-100/20 dark:bg-white/10 '
                                : 'bg-slate-100/80 dark:bg-slate-700/60'
                            }
                        `} />
                    </motion.div>
                </motion.div>

                {/* 選項文字層 */}
                {options.map((opt, idx) => {
                    const isHighlighted = idx === approachingIndex;
                    return (
                        <div
                            key={String(opt.value)}
                            className="relative z-10 flex-1 flex flex-col items-center justify-center py-2 px-1 gap-0.5 cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {opt.icon && (
                                <span className={`transition-colors duration-200 ${isHighlighted
                                    ? 'text-brand-primary'
                                    : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    {opt.icon}
                                </span>
                            )}
                            <span className={[
                                'text-xs font-black tracking-wide leading-none transition-colors duration-200',
                                isHighlighted
                                    ? 'text-brand-primary'
                                    : 'text-slate-500 dark:text-slate-400',
                            ].join(' ')}>
                                {opt.label}
                            </span>
                            {opt.hint && (
                                <span className={[
                                    'text-[9px] font-medium leading-none transition-colors duration-200',
                                    isHighlighted
                                        ? 'text-brand-primary/60'
                                        : 'text-slate-400 dark:text-slate-500',
                                ].join(' ')}>
                                    {opt.hint}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div >
    );
}

export default GlassRailSelector;
