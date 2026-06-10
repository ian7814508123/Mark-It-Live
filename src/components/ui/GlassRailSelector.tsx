import React, { useRef, useEffect, useState, useMemo, useId } from 'react';
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

    // 新增：紀錄目前滑鼠 Hover 懸停的選項索引
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // 新增：動態偵測系統與主題的深色模式狀態，以確保色彩與動畫的平滑過渡
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

    // 內部暫存的拖曳位置百分比（當為 null 時表示處於靜態或已放手吸附）
    const [dragLeftPercent, setDragLeftPercent] = useState<number | null>(null);
    // 用 ref 存儲即時百分比，避免 useEffect 中的事件監聽頻繁重新綁定
    const dragLeftPercentRef = useRef<number | null>(null);

    // ── SVG 邊緣折射濾鏡相關 ──
    // 每個實例的唯一 filter ID，避免同頁多個元件 ID 衝突
    const filterId = `glass-rail-${useId().replace(/:/g, '')}`;
    // SVG feDisplacementMap 節點 ref：用 rAF lerp 直接操作 scale 屬性
    const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
    const rafRef = useRef<number>(0);

    /**
     * lensMapUrl：在 Canvas 上繪製一張 256×256 的「徑向方向貼圖」。
     * 每個像素編碼「從該點指向元素中心」的單位向量：
     *   R channel (0-255)：X 位移方向（128 = 無位移，>128 = 往右）
     *   G channel (0-255)：Y 位移方向（128 = 無位移，>128 = 往下）
     * 此貼圖搭配 feDisplacementMap，確保邊緣折射是乾淨的「向內彎曲」，而非隨機雜訊。
     * useMemo 確保只在元件掛載時生成一次。
     */
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
                // 從 (x, y) 指向中心的向量（正值 = 往中心方向）
                const dx = (c - x) / c; // -1 ~ 1
                const dy = (c - y) / c;
                const r = Math.sqrt(dx * dx + dy * dy);
                // 正規化為單位向量
                const nx = r > 0.001 ? dx / r : 0;
                const ny = r > 0.001 ? dy / r : 0;
                // 編碼到 0-255（128 = 無位移）
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

    /**
     * rAF lerp 動畫：平滑驅動 SVG feDisplacementMap 的 scale 值。
     * 靜止：scale → 0（無折射，玻璃面乾淨）
     * 按壓（拿起）：scale → 10（邊緣折射出現，強化「真實玻璃」的光學質感）
     * 只有 2px 邊緣被 feMorphology 遮罩允許折射，中心永遠不受影響。
     */
    useEffect(() => {
        const target = isPressed ? 10 : 0;
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
                'bg-transparent dark:bg-transparent',
                'border border-black/10 dark:border-white/10',
                'backdrop-blur-md',
                className,
            ].join(' ')}
        >
            {/* ── SVG 邊緣折射濾鏡 ──
             filter pipeline：
             1. feImage 載入 canvas 徑向方向貼圖 → feDisplacementMap 折射 backdrop
             2. feGaussianBlur → 霧面化 backdrop（中心用）
             3. feFlood + feMorphology(erode 2px) + feComposite → 製作精確 2px 邊緣遮罩
             4. feComposite(in) + feComposite(out) + feBlend → 邊緣折射 ∪ 中心霧面 */}
            <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                <defs>
                    {/* x/y/width/height 設為元素邊界，讓 feMorphology erode 從元素真實邊緣計算 */}
                    <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                        {/* Step 1a: 載入 canvas 徑向向量貼圖 */}
                        <feImage href={lensMapUrl} preserveAspectRatio="none" result="dirMap" />
                        {/* Step 1b: 用徑向方向貼圖折射 backdrop（產生「光線向內彎曲」效果） */}
                        <feDisplacementMap
                            ref={displacementRef}
                            in="SourceGraphic"
                            in2="dirMap"
                            scale="0"
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="displaced"
                        />

                        {/* Step 2: 製作邊緣遮罩 */}
                        {/* feFlood 填滿整個 filter 區域（等同元素邊界）*/}
                        <feFlood floodColor="white" floodOpacity="1" result="fullWhite" />
                        {/* erode 侵蝕：x-radius=左右折射，y-radius=上下折射*/}
                        <feMorphology in="fullWhite" operator="erode" radius="12 5" result="innerRegion" />
                        {/* out = fullWhite × (1 - innerRegion_alpha) → 只剩邊緣 2px 白色 */}
                        <feComposite in="fullWhite" in2="innerRegion" operator="out" result="edgeMask" />

                        {/* Step 3a: 折射的 backdrop，只保留邊緣 2px */}
                        <feComposite in="displaced" in2="edgeMask" operator="in" result="refractedEdge" />
                        {/* Step 3b: 乾淨的 backdrop，只保留中心（排除邊緣 2px） */}
                        <feComposite in="SourceGraphic" in2="edgeMask" operator="out" result="cleanCenter" />
                        {/* Step 3c: 合成：邊緣折射 + 中心乾淨 = 完整玻璃效果 */}
                        <feBlend in="refractedEdge" in2="cleanCenter" mode="normal" />
                    </filter>
                </defs>
            </svg>

            <div className="relative flex w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                {/* 玻璃滑塊定位外層 */}
                {/* ⚠️ 座標系關鍵：scale/z/rotateX 必須在此層（外層）處理，而非內層。
                     CSS transform scale 不改變元素的 layout box，
                     如果在內層 scale，backdropFilter 的過濾區域仍是原始大小，
                     導致玻璃邊緣材質的計算基準與視覺邊緣錯位。
                     將 scale 放在外層後，整個元素（含 backdrop-filter 感知區）一起縮放。 */}
                <motion.div
                    className="absolute top-0 bottom-0 px-1 py-0.5 pointer-events-none z-0"
                    animate={{
                        left: `${currentLeft}%`,
                        // 「被拿起來」的 3D 浮起效果，與 left 分離獨立動畫
                        z: isPressed ? 12 : 0,
                        rotateX: isPressed ? -1.5 : 0,
                    }}
                    style={{ width: `${sliderWidthPercent}%`, transformStyle: 'preserve-3d' }}
                    transition={{
                        // per-property transition：left 各自獨立控制
                        left: dragLeftPercent !== null
                            // 拖曳中：left 即時跟隨（無延遲）
                            ? { duration: 0 }
                            // 靜止吸附：left 使用較硬的 spring（快速對齊）
                            : { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 },
                        // z/rotateX 永遠使用柔軟 spring（拖曳中也保持彈性手感）
                        z: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                        rotateX: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                    }}
                >
                    {/* 玻璃質感滑塊本體：
                         這裡使用絕對定位的 top/bottom/left/right 進行物理膨脹（而非 CSS scale），
                         當 isPressed 時，將 top/bottom/left/right 從 padding 值變為 0，
                         藉此擴大 DOM 元素的實際 layout box，進而擴展 backdrop-filter 的剪裁邊界，
                         從根本上解決 SVG 邊緣折射濾鏡留在原始大小的 bug。 */}
                    <motion.div
                        className="absolute rounded-xl"
                        animate={{
                            top: isPressed ? 0 : 2,
                            bottom: isPressed ? 0 : 2,
                            left: isPressed ? 0 : 4,
                            right: isPressed ? 0 : 4,
                            boxShadow: isPressed
                                ? '0 10px 24px -4px rgba(0,0,0,0.14), 0 3px 8px -1px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.75), inset 0 -1px 0 0 rgba(0,0,0,0.04)'
                                : '0 1px 4px -1px rgba(0,0,0,0.08), 0 0.5px 1px 0 rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.6)',
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 350,
                            damping: 18,
                            mass: 0.8,
                            // 確保 top/bottom/left/right 與 boxShadow 一同流暢過渡
                            top: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                            bottom: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                            left: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                            right: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                            boxShadow: { type: 'spring', stiffness: 350, damping: 18, mass: 0.8 },
                        }}
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* ── 層 1：玻璃材質（邊緣折射 + 中心乾淨） ── */}
                        {/* SVG filter 處理兩件事：
                             - 邊緣 2px：backdrop 折射（feDisplacementMap + 徑向方向貼圖）
                             - 中心區域：乾淨的背景（直接穿透，無 blur）
                             Chromium：完整效果。非 Chromium：降級為純半透明玻璃（無 backdrop-blur）*/}
                        <motion.div
                            className="absolute inset-0 rounded-xl"
                            animate={{
                                backgroundColor: isPressed
                                    ? 'rgba(255, 255, 255, 0)'
                                    : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.35)'),
                                border: isDark
                                    ? (isPressed ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.12)')
                                    : (isPressed ? '1px solid rgba(0, 0, 0, 0.16)' : '1px solid rgba(0, 0, 0, 0.08)'),
                            }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            style={{
                                // 套用 SVG 邊緣折射濾鏡（Chromium only）
                                // 非 Chromium 此屬性被忽略，無模糊降級
                                backdropFilter: `url("#${filterId}")`,
                                // @ts-ignore
                                WebkitBackdropFilter: `url("#${filterId}")`,
                            }}
                        />

                        {/* ── 層 2：頂部高光邊（Specular Rim） ── */}
                        {/* 模擬鏡片頂緣的強反射光，是 Liquid Glass 乾淨感的關鍵。在深色模式下，由於光源垂直射入螢幕，故不渲染上到下方向的高光。 */}
                        <motion.div
                            className="absolute inset-x-0 top-0 rounded-t-xl pointer-events-none"
                            style={{ height: '40%' }}
                            animate={{
                                opacity: isDark ? 0 : (isPressed ? 0.9 : 0.55),
                                background: isPressed
                                    ? 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%)'
                                    : 'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 100%)',
                            }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        />

                        {/* ── 層 3：底部漸層陰影（景深感） ── */}
                        {/* 模擬光穿透玻璃後在底部形成的細微暗角，增加厚度感。在深色模式下，同理不渲染此由上而下的陰影。 */}
                        <motion.div
                            className="absolute inset-x-0 bottom-0 rounded-b-xl pointer-events-none"
                            style={{ height: '30%' }}
                            animate={{
                                opacity: isDark ? 0 : (isPressed ? 0.18 : 0.08),
                                background: 'linear-gradient(0deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 100%)',
                            }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        />
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
