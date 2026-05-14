import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

    // 計算當前選中 index（找不到時預設 0）
    const activeIndex = Math.max(0, options.findIndex(o => o.value === value));
    // 滑塊寬度與左側位置（皆用百分比，Framer Motion 可插值）
    const sliderWidth = `${100 / options.length}%`;
    const sliderLeft = `${(activeIndex / options.length) * 100}%`;

    /** 根據游標 X 座標計算對應選項並觸發 onChange */
    const selectByX = (clientX: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const idx = Math.min(options.length - 1, Math.floor(ratio * options.length));
        const newValue = options[idx].value;
        if (newValue !== value) onChange(newValue);
    };

    // 全域事件：確保拖曳到容器外也能持續追蹤
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;
            selectByX(e.clientX);
        };
        const onUp = () => { 
            isDraggingRef.current = false; 
            setIsPressed(false);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    });

    return (
        <div
            ref={trackRef}
            onMouseDown={(e) => {
                e.preventDefault(); // 防止文字選取
                isDraggingRef.current = true;
                setIsPressed(true);
                selectByX(e.clientX);
            }}
            style={{ userSelect: 'none', cursor: 'pointer' }}
            className={[
                // 軌道：磨砂玻璃底板
                'relative flex rounded-2xl p-1 select-none',
                'bg-slate-100/70 dark:bg-slate-800/60',
                'border border-slate-200/80 dark:border-slate-700/50',
                'backdrop-blur-sm',
                className,
            ].join(' ')}
        >
            <div className="relative flex w-full h-full">
                {/* 玻璃滑塊：用 animate 驅動 spring 位移 */}
                <motion.div
                    className="absolute top-0 bottom-0 px-1 py-0.5 rounded-xl pointer-events-none z-0"
                    animate={{ left: sliderLeft }}
                    style={{ width: sliderWidth }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                >
                    {/* 玻璃質感：模擬 Apple Liquid Glass 的多層光影 */}
                    <div className={`
                        w-full h-full rounded-xl transition-all duration-300
                        bg-white/80 dark:bg-white/15 
                        backdrop-blur-md
                        border border-white/40 dark:border-white/20
                        ring-1 ring-inset ring-white/50 dark:ring-white/10
                        ${isPressed 
                            ? 'shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.02)] scale-[0.98]' 
                            : 'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.02)]'
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
