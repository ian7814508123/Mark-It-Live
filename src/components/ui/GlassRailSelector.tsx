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
    // 紀錄 pointer down 的初始 X 座標，用於判定是否超過拖曳閾值
    const dragStartXRef = useRef<number | null>(null);
    const [isPressed, setIsPressed] = useState(false);

    // 新增：紀錄目前滑鼠 Hover 懸停的選項索引
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // 新增：optimistic value 解決 value 更新延遲導致的閃爍
    const [optimisticValue, setOptimisticValue] = useState<T>(value);
    useEffect(() => {
        setOptimisticValue(value);
    }, [value]);

    // 新增：動態偵測系統與主題的深色模式狀態，以確保色彩與動畫的平滑過渡
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const checkDarkMode = () => {
            const hasDark = document.documentElement.classList.contains('dark') ||
                document.body.classList.contains('dark');
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDark(hasDark || prefersDark);
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

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const mediaListener = () => checkDarkMode();
        mediaQuery.addEventListener('change', mediaListener);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', mediaListener);
        };
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

    // 新增：動態測量滑塊實際寬高比，用於在 Canvas 中進行圓角矩形 SDF（Signed Distance Field）繪製
    // 透過 Pre-deformation（反向預比例化）來抵消 SVG `preserveAspectRatio="none"` 造成的橫向拉伸，重現蘋果圓角矩形光學折射
    const [aspect, setAspect] = useState(2.5);
    useEffect(() => {
        if (!trackRef.current) return;
        
        let timeoutId: number;
        const updateAspect = () => {
            if (trackRef.current) {
                const rect = trackRef.current.getBoundingClientRect();
                const sliderWidth = rect.width / options.length;
                const sliderHeight = rect.height;
                if (sliderHeight > 0) {
                    setAspect(sliderWidth / sliderHeight);
                }
            }
        };

        const observer = new ResizeObserver(() => {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(updateAspect, 100);
        });

        observer.observe(trackRef.current);
        updateAspect();

        return () => {
            observer.disconnect();
            window.clearTimeout(timeoutId);
        };
    }, [options.length]);

    /**
     * lensMapUrl：在 Canvas 上繪製一張 256×256 的「圓角矩形方向貼圖」。
     * 為了防止滑塊拉伸後折射變形，本算法在歸一化的 [-aspect, aspect] × [-1, 1] 空間中計算有符號距離場（SDF）。
     * 內部區間 ($dist < 0$) 產生向圓角矩形中心骨架收縮的「均勻縮小鏡」向量；
     * 外圍區間 ($dist \ge 0$) 產生垂直於圓角矩形邊緣向內的「邊緣折射」向量，且橫向 $nx$ 向量除以 aspect 以抵消拉伸。
     */
    const [lensMapUrl, setLensMapUrl] = useState('');

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = ctx.createImageData(size, size);

        // 圓角矩形半徑設定在 y 軸 -1 ~ 1 空間中（0.8 代表滑塊大部分為圓角）
        const R = 0.8;
        // 邊緣折射影響的半寬度
        const w_e = 0.2;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // 歸一化到 [-aspect, aspect] x [-1, 1] 的比例空間
                const px = ((x / size) * 2 - 1) * aspect;
                const py = (y / size) * 2 - 1;

                // 矩形的半寬高 (不含圓角)
                const bx = Math.max(0, aspect - R);
                const by = Math.max(0, 1.0 - R);

                // 計算到圓角矩形邊緣最近點的距離向量
                const qx = Math.max(0, Math.abs(px) - bx);
                const qy = Math.max(0, Math.abs(py) - by);
                const len = Math.sqrt(qx * qx + qy * qy);

                // 精確 2D 圓角矩形有符號距離場 (SDF)：dist < 0 為內，dist > 0 為外
                const dist = len - R + Math.min(Math.max(Math.abs(px) - bx, Math.abs(py) - by), 0);

                let nx = 0;
                let ny = 0;

                if (dist > w_e) {
                    // ── 1. 外部無影響區 ──
                    nx = 0;
                    ny = 0;
                } else if (dist >= -w_e && dist <= w_e) {
                    // ── 2. 邊緣折射區間 ──
                    // 計算邊緣法線方向，折射偏折向量指向內部（-dnx, -dny）
                    let dnx = 0;
                    let dny = 0;

                    if (len > 0.001) {
                        dnx = (qx / len) * Math.sign(px);
                        dny = (qy / len) * Math.sign(py);
                    } else {
                        if (Math.abs(px) - bx > Math.abs(py) - by) {
                            dnx = Math.sign(px);
                            dny = 0;
                        } else {
                            dnx = 0;
                            dny = Math.sign(py);
                        }
                    }

                    // 抵消橫向拉伸，確保偏折率與折射寬度一致
                    dnx = dnx / aspect;

                    // 用對稱的 smoothstep 鐘形曲線控制折射強度 (在 dist = 0 處為 1，在 dist = ±w_e 處為 0)
                    const u = 1.0 - Math.abs(dist) / w_e;
                    const factor = 3 * u * u - 2 * u * u * u;

                    const strength = 0.8;
                    nx = -dnx * strength * factor;
                    ny = -dny * strength * factor;
                } else {
                    // ── 3. 內部縮小鏡區 (dist < -w_e) ──
                    // 縮小鏡朝向圓角矩形中心骨架收縮，在 dist = -w_e 處強度平滑為 0 以銜接邊緣折射
                    const maxDepth = R - w_e;
                    const depth = -dist - w_e;
                    const t = Math.min(1.0, depth / maxDepth);
                    const factor = 3 * t * t - 2 * t * t * t; // smoothstep

                    // 朝向中心縮小，nx 除以 aspect 抵消橫向拉伸
                    const strength = 0.45;
                    nx = -(px / aspect) * strength * factor;
                    ny = -py * strength * factor;
                }

                const i = (y * size + x) * 4;
                img.data[i] = Math.max(0, Math.min(255, Math.round(128 + nx * 110)));
                img.data[i + 1] = Math.max(0, Math.min(255, Math.round(128 + ny * 110)));
                img.data[i + 2] = 128;
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        setLensMapUrl(canvas.toDataURL());
    }, [aspect]);

    const activeIndex = Math.max(0, options.findIndex(o => o.value === optimisticValue));
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
     * 按壓（拿起）：scale → 12（邊緣折射與縮小鏡效果出現）
     */
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

    // Pointer Events: 處理拖曳移動與放開吸附
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPressed) return;
        
        // 檢查是否超過拖曳閾值 (5px)
        if (!isDraggingRef.current && dragStartXRef.current !== null) {
            if (Math.abs(e.clientX - dragStartXRef.current) > 5) {
                isDraggingRef.current = true;
                const startLeft = getLeftPercentByX(e.clientX);
                dragLeftPercentRef.current = startLeft;
                setDragLeftPercent(startLeft);
            }
        }

        if (isDraggingRef.current) {
            const leftPercent = getLeftPercentByX(e.clientX);
            dragLeftPercentRef.current = leftPercent;
            setDragLeftPercent(leftPercent);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isPressed) return;
        
        const track = e.currentTarget;
        track.releasePointerCapture(e.pointerId);

        const wasDragging = isDraggingRef.current;
        isDraggingRef.current = false;
        dragStartXRef.current = null;
        setIsPressed(false);

        let closestIdx = activeIndex;

        if (wasDragging && totalOptions > 1 && dragLeftPercentRef.current !== null) {
            // 根據最後放開的百分比位置，計算最靠近的選項 index
            closestIdx = Math.round((dragLeftPercentRef.current / maxLeftPercent) * (totalOptions - 1));
            closestIdx = Math.max(0, Math.min(totalOptions - 1, closestIdx));
        } else if (trackRef.current) {
            // 如果只是點擊（沒有觸發 move），直接計算滑鼠點擊位置的最近 index
            const leftPercent = getLeftPercentByX(e.clientX);
            closestIdx = Math.round((leftPercent / maxLeftPercent) * (totalOptions - 1));
            closestIdx = Math.max(0, Math.min(totalOptions - 1, closestIdx));
        }

        // 觸發外部狀態更新並即時更新 optimisticValue
        const newValue = options[closestIdx].value;
        setOptimisticValue(newValue);
        onChange(newValue);

        // 清除拖曳狀態，滑塊會重新由 staticLeftPercent 接管並透過 spring 平滑回彈
        dragLeftPercentRef.current = null;
        setDragLeftPercent(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = Math.min(totalOptions - 1, activeIndex + 1);
            const newValue = options[nextIdx].value;
            setOptimisticValue(newValue);
            onChange(newValue);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIdx = Math.max(0, activeIndex - 1);
            const newValue = options[prevIdx].value;
            setOptimisticValue(newValue);
            onChange(newValue);
        }
    };

    return (
        <div
            role="radiogroup"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            ref={trackRef}
            onPointerDown={(e) => {
                e.preventDefault(); // 防止文字選取
                e.currentTarget.setPointerCapture(e.pointerId);
                dragStartXRef.current = e.clientX;
                setIsPressed(true);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ userSelect: 'none', cursor: 'pointer', perspective: 1000, transformStyle: 'preserve-3d' }}
            className={[
                // 軌道：磨砂玻璃底板
                'relative flex rounded-2xl p-1 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
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
                    {/* x/y/width/height 設為元素邊界，使貼圖尺寸能自動隨 preserveAspectRatio 完美拉伸適應 */}
                    <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
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
                            top: isPressed ? -4 : 2,
                            bottom: isPressed ? -4 : 2,
                            left: isPressed ? -4 : 4,
                            right: isPressed ? -4 : 4,
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
                            role="radio"
                            aria-checked={idx === activeIndex}
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
