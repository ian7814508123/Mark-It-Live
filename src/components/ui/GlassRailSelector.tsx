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
            style={{ userSelect: 'none', cursor: 'pointer' }}
            className={[
                // 軌道：磨砂玻璃底板
                'relative flex rounded-2xl p-1 select-none',
                'bg-slate-100/30 dark:bg-slate-950/20',
                'border border-white/40 dark:border-white/10',
                'backdrop-blur-md',
                className,
            ].join(' ')}
        >
            <div className="relative flex w-full h-full">
                {/* 玻璃滑塊：用 animate 驅動 spring 位移 */}
                <motion.div
                    className="absolute top-0 bottom-0 px-1 py-0.5 rounded-xl pointer-events-none z-0"
                    animate={{ left: `${currentLeft}%` }}
                    style={{ width: `${sliderWidthPercent}%` }}
                    transition={
                        dragLeftPercent !== null
                            ? { duration: 0 } // 拖曳中：0 秒過渡，100% 即時跟手，無任何延遲
                            : { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 } // 放手吸附：Apple 風格彈性回彈
                    }
                >
                    {/* 玻璃質感：模擬 Apple Liquid Glass 的多層光影 */}
                    <div className={`
                        w-full h-full rounded-xl transition-all duration-300
                        bg-white/85 dark:bg-white/10 
                        backdrop-blur-xl
                        border border-white/60 dark:border-white/25
                        ring-1 ring-inset ring-white/50 dark:ring-white/10
                        ${isPressed
                            ? 'shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.02)] scale-[0.98]'
                            : 'shadow-[0_2px_4px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.01)] scale-100'
                        }
                    `} />
                </motion.div>

                {/* 選項文字層 */}
                {options.map((opt) => {
                    const isActive = opt.value === value;
                    return (
                        <div
                            key={String(opt.value)}
                            className="relative z-10 flex-1 flex flex-col items-center justify-center py-2 px-1 gap-0.5"
                        >
                            {opt.icon && (
                                <span className={`transition-colors duration-200 ${isActive
                                    ? 'text-brand-primary'
                                    : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    {opt.icon}
                                </span>
                            )}
                            <span className={[
                                'text-xs font-black tracking-wide leading-none transition-colors duration-200',
                                isActive
                                    ? 'text-brand-primary'
                                    : 'text-slate-500 dark:text-slate-400',
                            ].join(' ')}>
                                {opt.label}
                            </span>
                            {opt.hint && (
                                <span className={[
                                    'text-[9px] font-medium leading-none transition-colors duration-200',
                                    isActive
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
        </div>
    );
}

export default GlassRailSelector;
