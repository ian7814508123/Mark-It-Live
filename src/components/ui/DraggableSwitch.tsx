import React, { useRef, useEffect, useState, useMemo, useId } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface DraggableSwitchProps {
    /** 當前開關狀態 */
    checked: boolean;
    /**
     * 狀態變更回呼。
     * 點擊 → toggle；拖曳超過 40% 行程 → 依方向 toggle。
     */
    onChange: (newValue: boolean) => void;
    /** 額外的 className（套用到外層 track div） */
    className?: string;
}

/**
 * DraggableSwitch — 同時支援「點擊切換」與「拖曳切換」的 Toggle Switch。
 *
 * 視覺與互動設計：
 *  - **玻璃滑塊**：與選擇器共享的 Liquid Glass 水晶玻璃質感（SVG 邊緣折射濾鏡）。
 *  - **物理膨脹**：按壓或拖曳時，滑塊圓點以物理定位向外膨脹，使 backdrop-filter 感知區完美擴展。
 *  - **提前回饋**：拖曳行程超過 40% 閥值時，軌道背景色提前切換。
 */
const DraggableSwitch: React.FC<DraggableSwitchProps> = ({
    checked,
    onChange,
    className = '',
}) => {
    // w-11(44px) track，w-4(16px) thumb，各 4px padding
    // OFF: left=4px, ON: left=24px → TRAVEL = 20px
    const TRAVEL = 20;
    const THRESHOLD = TRAVEL * 0.4; // 40% 行程觸發切換

    const isDraggingRef = useRef(false);
    const hasDraggedRef = useRef(false); // 是否有位移 > 3px
    const startXRef = useRef(0);
    const thumbDxRef = useRef(0); // 拖曳中的即時偏移量（用於 mouseup 判斷）

    const [isPressed, setIsPressed] = useState(false);
    // 新增：拖曳過程中提前改變軌道背景色狀態
    const [dragChecked, setDragChecked] = useState<boolean | null>(null);

    // thumbX 驅動 thumb 的 transform:translateX，與 `left` 疊加
    // 平常為 0（由 left 決定位置），拖曳中實時反映偏移
    const thumbX = useMotionValue(0);

    // ── 主題偵測與 SVG 濾鏡相關 ──
    const filterId = `switch-filter-${useId().replace(/:/g, '')}`;
    const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
    const rafRef = useRef<number>(0);

    // 偵測主題深色模式
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDarkMode = () => {
            const hasDark = document.documentElement.classList.contains('dark') ||
                document.body.classList.contains('dark');
            setIsDark(hasDark);
        };
        checkDarkMode();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    checkDarkMode();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        observer.observe(document.body, { attributes: true });
        return () => observer.disconnect();
    }, []);

    // 徑向貼圖生成 (融合：中心均勻縮小 + 最外圍 15% 強烈邊緣折射)
    const lensMapUrl = useMemo(() => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        const img = ctx.createImageData(size, size);
        const c = size / 2;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = (c - x) / c; // -1 ~ 1
                const dy = (c - y) / c;
                const r = Math.sqrt(dx * dx + dy * dy);

                let nx = 0;
                let ny = 0;

                if (r > 0.001) {
                    if (r < 0.85) {
                        // 中心區域 (r < 0.85)：均勻縮小鏡效果 (反向 dx/dy，強度 0.45)
                        nx = -dx * 0.45;
                        ny = -dy * 0.45;
                    } else {
                        // 邊緣區域 (r >= 0.85)：厚玻璃強烈邊緣折射 (正向歸一化向量，強度 1.0)
                        nx = dx / r;
                        ny = dy / r;
                    }
                }
                const i = (y * size + x) * 4;
                img.data[i] = Math.max(0, Math.min(255, Math.round(128 + nx * 110)));
                img.data[i + 1] = Math.max(0, Math.min(255, Math.round(128 + ny * 110)));
                img.data[i + 2] = 128;
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL();
    }, []);

    // 驅動 SVG 濾鏡折射量
    useEffect(() => {
        const target = isPressed ? 12 : 0;
        const lerpFactor = 0.13;
        const tick = () => {
            if (!displacementRef.current) return;
            const cur = parseFloat(displacementRef.current.getAttribute('scale') ?? '0');
            const next = cur + (target - cur) * lerpFactor;
            if (Math.abs(next - target) < 0.04) {
                displacementRef.current.setAttribute('scale', String(target));
                return;
            }
            displacementRef.current.setAttribute('scale', String(next));
            rafRef.current = requestAnimationFrame(tick);
        };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isPressed]);

    // 全域 mousemove / mouseup（確保游標拖出元素外也能正常工作）
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return;

            // 限制 thumb 在合理範圍：OFF 時只能向右；ON 時只能向左
            const minDx = checked ? -TRAVEL : 0;
            const maxDx = checked ? 0 : TRAVEL;

            let dx = e.clientX - startXRef.current;

            // 動態基準點追蹤（Dynamic Anchor Tracking）：
            // 當滑鼠移動超出圓點可滑動的物理邊界時，動態更新 startXRef，
            // 消除滑鼠移出開關範圍後的「回彈死區」，實現滑鼠往回拉時圓點立即百分之百跟手。
            if (dx < minDx) {
                startXRef.current = e.clientX - minDx;
                dx = minDx;
            } else if (dx > maxDx) {
                startXRef.current = e.clientX - maxDx;
                dx = maxDx;
            }

            if (Math.abs(dx) > 3) hasDraggedRef.current = true;

            thumbDxRef.current = dx;
            thumbX.set(dx);

            // 提前改變軌道背景色回饋
            const shouldBeChecked = checked
                ? (dx >= -THRESHOLD)
                : (dx >= THRESHOLD);
            setDragChecked(shouldBeChecked);
        };

        const handleMouseUp = () => {
            if (!isDraggingRef.current) return;
            isDraggingRef.current = false;
            setIsPressed(false);
            setDragChecked(null);

            if (!hasDraggedRef.current) {
                // 點擊（位移極小）→ 直接 toggle
                onChange(!checked);
            } else {
                // 拖曳結束：判斷是否超過閾值
                const shouldToggle =
                    (!checked && thumbDxRef.current > THRESHOLD) ||
                    (checked && thumbDxRef.current < -THRESHOLD);

                if (shouldToggle) onChange(!checked);
            }

            // 無論結果如何，讓 thumb spring 歸位（left 由 checked 決定，thumbX 歸 0）
            animate(thumbX, 0, { type: 'spring', stiffness: 500, damping: 30 });

            hasDraggedRef.current = false;
            thumbDxRef.current = 0;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [checked, onChange, thumbX, THRESHOLD]);

    const activeChecked = dragChecked !== null ? dragChecked : checked;

    return (
        <div
            onMouseDown={(e) => {
                e.preventDefault(); // 防止文字選取
                isDraggingRef.current = true;
                hasDraggedRef.current = false;
                setIsPressed(true);
                startXRef.current = e.clientX;
                thumbDxRef.current = 0;
                thumbX.set(0);
            }}
            style={{ userSelect: 'none', perspective: 1000, transformStyle: 'preserve-3d' }}
            className={[
                'w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer select-none',
                activeChecked
                    ? 'bg-brand-primary hover:bg-brand-primary/95'
                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
                className,
            ].join(' ')}
        >
            {/* SVG 向量折射濾鏡 */}
            <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                <defs>
                    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                        <feImage href={lensMapUrl} preserveAspectRatio="none" result="dirMap" />
                        <feDisplacementMap
                            ref={displacementRef}
                            in="SourceGraphic"
                            in2="dirMap"
                            scale="0"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            {/* 玻璃質感滑塊 thumb 定位外層 */}
            <motion.div
                className="absolute top-1 w-4 h-4 pointer-events-none z-10"
                // `left` 決定 OFF/ON 基礎位置，`x` 疊加拖曳的即時偏移，並加上 3D 景深浮起
                animate={{
                    left: checked ? '1.5rem' : '0.25rem',
                    z: isPressed ? 10 : 0,
                    rotateX: isPressed ? -1.5 : 0,
                }}
                style={{ x: thumbX, cursor: 'grab', transformStyle: 'preserve-3d' }}
                transition={{
                    left: { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 },
                    z: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                    rotateX: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                }}
            >
                {/* 玻璃滑塊外觀本體：拿起後透過物理膨脹（非 scale）擴大，解決 SVG 折射濾鏡邊界問題 */}
                <motion.div
                    className="absolute rounded-full"
                    animate={{
                        top: isPressed ? -7 : 0,
                        bottom: isPressed ? -7 : 0,
                        left: isPressed ? -14 : 0,
                        right: isPressed ? -14 : 0,
                        // boxShadow 留在內層，讓它跟隨視覺邊緣渲染
                        boxShadow: isPressed
                            ? '0 10px 24px -4px rgba(0,0,0,0.14), 0 3px 8px -1px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.75), inset 0 -1px 0 0 rgba(0,0,0,0.04)'
                            : '0 1px 3.5px -0.5px rgba(0,0,0,0.12), 0 0.5px 1px 0 rgba(0,0,0,0.08)',
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 18,
                        mass: 0.8,
                        top: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                        bottom: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                        left: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                        right: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                        boxShadow: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                    }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* ── 層 1：玻璃材質（邊緣折射 + 中心乾淨） ── */}
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{
                            backgroundColor: isPressed
                                ? 'rgba(255, 255, 255, 0)' // 抓起時：完全透明，透出濾鏡折射
                                : (isDark ? 'rgba(241, 245, 249, 0.95)' : 'rgba(255, 255, 255, 1)'), // 靜止時：不透明亮色圓點
                            border: isDark
                                ? (isPressed ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.15)')
                                : (isPressed ? '1px solid rgba(0, 0, 0, 0.16)' : '1px solid rgba(0, 0, 0, 0.06)'),
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{
                            backdropFilter: `url("#${filterId}")`,
                            // @ts-ignore
                            WebkitBackdropFilter: `url("#${filterId}")`,
                        }}
                    />

                    {/* ── 層 2：頂部高光邊（Specular Rim） ── */}
                    {/* 在深色模式下隱藏，且靜止時完全不透明圓點狀態下不顯現 */}
                    <motion.div
                        className="absolute inset-x-0 top-0 rounded-t-full pointer-events-none"
                        style={{ height: '40%' }}
                        animate={{
                            opacity: isDark ? 0 : (isPressed ? 0.9 : 0),
                            background: isPressed
                                ? 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%)'
                                : 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 100%)',
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    />

                    {/* ── 層 3：底部漸層陰影（景深感） ── */}
                    {/* 模擬厚玻璃底部的暗色漸變，靜止狀態下隱藏 */}
                    <motion.div
                        className="absolute inset-x-0 bottom-0 rounded-b-full pointer-events-none"
                        style={{ height: '30%' }}
                        animate={{
                            opacity: isDark ? 0 : (isPressed ? 0.18 : 0),
                            background: 'linear-gradient(0deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 100%)',
                        }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                </motion.div>
            </motion.div>
        </div>
    );
};

export default DraggableSwitch;
