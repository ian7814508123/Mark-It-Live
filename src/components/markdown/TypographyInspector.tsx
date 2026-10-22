import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Type, X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Palette, RefreshCw, Check, Highlighter
} from '../ui/Icons';
import {
    TypographyAttrs,
    FONT_FAMILY_PRESETS,
    PRESET_COLORS,
    HIGHLIGHT_COLORS,
    typographyAttrsToStyle,
    getElementComputedTypography
} from '../../utils/typographyUtils';

import MagneticButton from '../ui/MagneticButton';

interface TypographyInspectorProps {
    isOpen: boolean;
    onClose: () => void;
    targetLine: number;
    tagName: string;
    targetRect?: DOMRect | null;
    targetElement?: HTMLElement | null;
    initialAttrs: TypographyAttrs;
    lineContent?: string;
    onApply: (attrs: TypographyAttrs, targetFormat?: 'directive' | 'html') => void;
    onReset: () => void;
}

const FONT_SIZE_PRESETS = [
    { label: '小', value: '14px' },
    { label: '常規', value: '16px' },
    { label: '中', value: '20px' },
    { label: '大', value: '24px' },
    { label: '主標', value: '32px' },
    { label: '特大', value: '42px' },
];

export const TypographyInspector: React.FC<TypographyInspectorProps> = ({
    isOpen,
    onClose,
    targetLine,
    tagName,
    targetRect,
    targetElement,
    initialAttrs,
    lineContent,
    onApply,
    onReset,
}) => {
    const [attrs, setAttrs] = useState<TypographyAttrs>(initialAttrs);
    const panelRef = useRef<HTMLDivElement>(null);
    const debounceTimerRef = useRef<any>(null);

    // 預覽文字：若為「選取文字」模式，優先呈現精確的反白文字；一般行模式則展示前綴清理後的文字
    const previewText = React.useMemo(() => {
        if (tagName === '選取文字' && lineContent) {
            return lineContent.length > 20 ? `${lineContent.slice(0, 20)}...` : lineContent;
        }
        const raw = lineContent || targetElement?.textContent || '';
        const clean = raw
            .replace(/<[^>]+>/g, '')
            .replace(/^#{1,6}\s+/, '')
            .replace(/:(?:font|style|typography)\{[^}]+\}/g, '')
            .replace(/^>+\s*/, '')
            .replace(/^\[![a-zA-Z0-9_-]+\](?:\((.*?)\))?/, '$1')
            .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/, '')
            .trim();

        if (!clean) return 'Mark It Live';
        return clean.length > 15 ? `${clean.slice(0, 15)}...` : clean;
    }, [lineContent, targetElement, tagName]);
    const latestAttrsRef = useRef<TypographyAttrs>(initialAttrs);
    latestAttrsRef.current = attrs;

    // 視窗邊界安全座標狀態
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 120, left: 20 });

    // 嚴密動態視窗邊界偵測：水平置中於 Editor，垂直自動對齊目標元素
    const calculateSafePosition = useCallback(() => {
        const rect = targetElement ? targetElement.getBoundingClientRect() : targetRect;

        const panelEl = panelRef.current;
        const panelWidth = panelEl?.offsetWidth || 360;
        const panelHeight = panelEl?.offsetHeight || 500;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 16;
        const topBarSafeHeight = 64; // 頂部導航欄安全高度避免遮蔽

        // 1. 水平位置計算：展開位置直接置於 Editor 的水平正中間，完全不遮擋 Preview 右側預覽成果
        let left: number;
        const editorEl = (document.querySelector('.cm-editor') ||
            document.querySelector('.layout-main-content > div:first-child') ||
            document.querySelector('section[class*="min-w-[300px]"]') ||
            document.querySelector('section[class*="border-r"]')) as HTMLElement | null;

        if (editorEl) {
            const editorRect = editorEl.getBoundingClientRect();
            // 若 Editor 寬度正常可視（非完全隱藏或列印）
            if (editorRect.width > 220) {
                const editorCenterX = editorRect.left + (editorRect.width / 2);
                left = editorCenterX - (panelWidth / 2);
            } else {
                left = (viewportWidth - panelWidth) / 2;
            }
        } else {
            // Fallback: 視窗左半部或中央
            left = Math.max(margin, (viewportWidth * 0.25) - (panelWidth / 2));
        }

        // 雙重 Clamp 水平邊界，確保不溢出螢幕邊界
        left = Math.max(margin, Math.min(viewportWidth - panelWidth - margin, left));

        // 2. 垂直自動對齊計算：展開時與目標元素 (標題/段落) 自動垂直視覺對齊
        let top: number;
        if (rect) {
            // 將面板適度上移，使面板的即時預覽區/控制區與目標元素中心保持在同一個水平視覺線上
            const targetCenterY = rect.top + (rect.height / 2);
            top = targetCenterY - 110;
        } else {
            top = (viewportHeight - panelHeight) / 2;
        }

        // 自動邊界 Clamp (防止面板頂部衝出頂部導航列 64px，或底部沉入螢幕底部)
        top = Math.max(topBarSafeHeight, Math.min(viewportHeight - panelHeight - margin, top));

        return { top, left };
    }, [targetElement, targetRect]);

    // 當開啟時同步 initialAttrs 並即時定位
    useEffect(() => {
        if (isOpen) {
            setAttrs(initialAttrs);
            latestAttrsRef.current = initialAttrs;

            const updatePos = () => {
                setCoords(calculateSafePosition());
            };
            updatePos();
            const raf = requestAnimationFrame(updatePos);
            window.addEventListener('resize', updatePos);
            window.addEventListener('scroll', updatePos, true);
            return () => {
                cancelAnimationFrame(raf);
                window.removeEventListener('resize', updatePos);
                window.removeEventListener('scroll', updatePos, true);
            };
        }
    }, [isOpen, initialAttrs, calculateSafePosition]);

    // 關閉時若有待寫入的防抖立即 flush 寫回 Markdown (直接以 HTML 語法)
    const handleClose = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
            onApply(latestAttrsRef.current, 'html');
        }
        onClose();
    }, [onApply, onClose]);

    // 鍵盤 ESC 關閉
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    // 點擊面板外部時自動關閉
    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (panelRef.current && !panelRef.current.contains(target)) {
                if (target.closest('[data-typography-trigger]') || target.closest('[data-floating-toolbar]')) return;
                handleClose();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleOutsideClick);
        }, 50);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, handleClose]);

    // 屬性更新：本地 DOM 零延遲即時反饋 + 600ms 等待渲染寫回 HTML
    const updateAttr = useCallback(<K extends keyof TypographyAttrs>(key: K, val: TypographyAttrs[K]) => {
        setAttrs(prev => {
            const next = { ...prev, [key]: val || undefined };
            if (val === '' || val === undefined) {
                delete next[key];
            }
            latestAttrsRef.current = next;

            // 1. 本地 DOM 零延遲即時樣式更新 (Direct fast-path) - 100% 不觸發 ReactMarkdown AST 解析或圖表重繪
            if (targetElement) {
                const isInlineTextMode = tagName === '選取文字';
                const canDirectApplyToDom = !isInlineTextMode || targetElement.tagName === 'SPAN';

                if (canDirectApplyToDom) {
                    const liveStyle = typographyAttrsToStyle(next);
                    targetElement.style.fontSize = liveStyle.fontSize ? String(liveStyle.fontSize) : '';
                    targetElement.style.fontFamily = liveStyle.fontFamily ? String(liveStyle.fontFamily) : '';
                    targetElement.style.color = liveStyle.color ? String(liveStyle.color) : '';
                    targetElement.style.letterSpacing = liveStyle.letterSpacing ? String(liveStyle.letterSpacing) : '';
                    targetElement.style.lineHeight = liveStyle.lineHeight ? String(liveStyle.lineHeight) : '';
                    targetElement.style.fontWeight = liveStyle.fontWeight ? String(liveStyle.fontWeight) : '';
                    targetElement.style.textAlign = liveStyle.textAlign ? String(liveStyle.textAlign) : '';
                    targetElement.style.backgroundColor = liveStyle.backgroundColor ? String(liveStyle.backgroundColor) : '';
                    if (next.bg && next.bg !== 'transparent') {
                        targetElement.style.padding = '0.1em 0.3em';
                        targetElement.style.borderRadius = '0.25em';
                    } else {
                        targetElement.style.padding = '';
                        targetElement.style.borderRadius = '';
                    }
                }
            }

            // 2. 600ms 防抖寫回 Markdown 原始碼（直接以原生 HTML 語法），停止滑動後才觸發一次圖表重新解析
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                onApply(next, 'html');
                debounceTimerRef.current = null;
            }, 600);

            return next;
        });
    }, [onApply, targetElement, tagName]);

    const handleReset = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (targetElement && (tagName !== '選取文字' || targetElement.tagName === 'SPAN')) {
            targetElement.style.fontSize = '';
            targetElement.style.fontFamily = '';
            targetElement.style.color = '';
            targetElement.style.letterSpacing = '';
            targetElement.style.lineHeight = '';
            targetElement.style.fontWeight = '';
            targetElement.style.textAlign = '';
            targetElement.style.backgroundColor = '';
            targetElement.style.padding = '';
            targetElement.style.borderRadius = '';
        }
        setAttrs({});
        latestAttrsRef.current = {};
        onReset();
    }, [onReset, targetElement, tagName]);

    if (!isOpen) return null;

    const computedAttrs = targetElement ? getElementComputedTypography(targetElement) : {};

    const currentSizeNum = parseInt(attrs.size || computedAttrs.size || '16', 10) || 16;
    const currentLsNum = parseFloat(attrs.ls || computedAttrs.ls || '0') || 0;
    const currentLhNum = parseFloat(attrs.lh || computedAttrs.lh || '1.6') || 1.6;
    const currentColor = attrs.color || computedAttrs.color || '';
    const currentWeight = attrs.weight || computedAttrs.weight || 'normal';
    const currentAlign = attrs.align || computedAttrs.align || 'left';

    const isWeightActive = (wVal: string) => {
        if (attrs.weight) return attrs.weight === wVal;
        return currentWeight === wVal;
    };

    const isAlignActive = (id: string) => {
        if (attrs.align) return attrs.align === id;
        return currentAlign === id;
    };

    const isColorActive = (cVal: string) => {
        if (attrs.color) return attrs.color.toLowerCase() === cVal.toLowerCase();
        if (!cVal) return !attrs.color && !currentColor;
        return currentColor.toLowerCase() === cVal.toLowerCase();
    };

    return (
        <div
            className="fixed inset-0 z-50 pointer-events-none"
            aria-modal="true"
            role="dialog"
        >
            {/* 背景遮罩 (Overlay) */}
            <div
                className={`fixed inset-0 duration-300 z-51 `}
                onClick={onClose}
            />
            <div
                ref={panelRef}
                style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
                className="
                    pointer-events-auto absolute w-[360px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-80px)]
                    flex flex-col overflow-hidden rounded-[2rem]
                    bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                    border border-slate-200/90 dark:border-slate-800/90
                    shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]
                    text-slate-800 dark:text-slate-100 text-xs
                    animate-in fade-in zoom-in-95 duration-150 select-none
                "
            >
                {/* ─── 頂部 Header ────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-xl bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary">
                            <Type size={16} />
                        </span>
                        <div>
                            <div className="flex items-center gap-1.5 font-bold text-sm leading-none">
                                <span>排版微調</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-200/70 dark:bg-slate-800 text-brand-primary font-bold">
                                    {tagName}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                第 #{targetLine} 行
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <MagneticButton
                            variant="icon"
                            onClick={handleClose}
                            className="w-8 h-8 rounded-full text-slate-500 dark:text-slate-400 hover:text-brand-primary"
                            aria-label="完成並關閉"
                            title="完成並關閉 (Esc)"
                            magneticOptions={{ maxOffset: 6, radius: 45 }}
                        >
                            <X size={18} />
                        </MagneticButton>
                    </div>
                </div>

                {/* ─── 即時字體預覽卡片 ──────────────────────────────────── */}
                <div className="mx-4 mt-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden text-center transition-all">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                        即時預覽
                    </span>
                    <div
                        style={{
                            ...typographyAttrsToStyle(computedAttrs),
                            ...typographyAttrsToStyle(attrs),
                            fontSize: `${Math.min(28, Math.max(14, Math.round(currentSizeNum * 0.7)))}px`
                        }}
                        title={lineContent || targetElement?.textContent || previewText}
                    >
                        {previewText}
                    </div>
                </div>

                {/* ─── 控制面板本體（可滾動） ──────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">

                    {/* 1. 字型族群 (Font Family) */}
                    <div>
                        <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                            字型風格 (Font Family)
                        </label>
                        <select
                            value={attrs.family || ''}
                            onChange={(e) => updateAttr('family', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand-primary/40 outline-none transition-all cursor-pointer"
                        >
                            {FONT_FAMILY_PRESETS.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 2. 字級大小 (Font Size) */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="font-semibold text-slate-600 dark:text-slate-300">
                                字級大小 (Font Size)
                            </label>
                            <div className="flex items-center bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/20">
                                <input
                                    type="number"
                                    min="8"
                                    max="160"
                                    value={currentSizeNum}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val > 0) updateAttr('size', `${val}px`);
                                    }}
                                    className="w-9 text-right bg-transparent font-mono text-brand-primary font-bold text-xs outline-none focus:ring-0 p-0"
                                />
                                <span className="text-[10px] font-mono text-brand-primary font-bold ml-0.5">px</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="12"
                            max={Math.max(96, currentSizeNum + 12)}
                            step="1"
                            value={currentSizeNum}
                            onChange={(e) => updateAttr('size', `${e.target.value}px`)}
                            className="w-full accent-brand-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between gap-1 mt-1.5">
                            {FONT_SIZE_PRESETS.map(preset => (
                                <button
                                    key={preset.value}
                                    onClick={() => updateAttr('size', preset.value)}
                                    className={`
                                        flex-1 py-1 rounded text-[10px] font-mono transition-all
                                        ${attrs.size === preset.value || (!attrs.size && currentSizeNum === parseInt(preset.value, 10))
                                            ? 'bg-brand-primary text-white font-bold shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. 字重與間距 (Weight & Letter Spacing) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                                字重 (Weight)
                            </label>
                            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80">
                                {[
                                    { label: '正常', val: 'normal' },
                                    { label: '中等', val: '600' },
                                    { label: '粗體', val: 'bold' }
                                ].map(w => (
                                    <button
                                        key={w.val}
                                        onClick={() => updateAttr('weight', w.val === 'normal' ? undefined : w.val)}
                                        className={`flex-1 py-1 rounded text-[10px] transition-all ${isWeightActive(w.val)
                                            ? 'bg-white dark:bg-slate-700 text-brand-primary font-bold shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        {w.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="font-semibold text-slate-600 dark:text-slate-300">
                                    字距 (Spacing)
                                </label>
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80">
                                    <input
                                        type="number"
                                        min="-5"
                                        max="30"
                                        step="0.5"
                                        value={currentLsNum}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) updateAttr('ls', val === 0 ? undefined : `${val}px`);
                                        }}
                                        className="w-8 text-right bg-transparent font-mono text-slate-600 dark:text-slate-300 font-bold text-xs outline-none focus:ring-0 p-0"
                                    />
                                    <span className="text-[10px] font-mono text-slate-400 ml-0.5">px</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="-1"
                                max="8"
                                step="0.5"
                                value={currentLsNum}
                                onChange={(e) => updateAttr('ls', e.target.value === '0' ? undefined : `${e.target.value}px`)}
                                className="w-full accent-brand-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                            />
                        </div>
                    </div>

                    {/* 4. 行高與對齊 (Line Height & Alignment) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="font-semibold text-slate-600 dark:text-slate-300">
                                    行高 (Leading)
                                </label>
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80">
                                    <input
                                        type="number"
                                        min="0.8"
                                        max="3.5"
                                        step="0.1"
                                        value={currentLhNum}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val > 0) updateAttr('lh', String(val));
                                        }}
                                        className="w-9 text-right bg-transparent font-mono text-slate-600 dark:text-slate-300 font-bold text-xs outline-none focus:ring-0 p-0"
                                    />
                                </div>
                            </div>
                            <input
                                type="range"
                                min="1.0"
                                max="2.4"
                                step="0.1"
                                value={currentLhNum}
                                onChange={(e) => updateAttr('lh', e.target.value)}
                                className="w-full accent-brand-primary cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                                對齊 (Alignment)
                            </label>
                            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/80">
                                {[
                                    { id: 'left', Icon: AlignLeft, title: '靠左' },
                                    { id: 'center', Icon: AlignCenter, title: '置中' },
                                    { id: 'right', Icon: AlignRight, title: '靠右' },
                                    { id: 'justify', Icon: AlignJustify, title: '兩端' }
                                ].map(({ id, Icon, title }) => (
                                    <button
                                        key={id}
                                        onClick={() => updateAttr('align', id === 'left' ? undefined : (id as any))}
                                        title={title}
                                        className={`flex-1 py-1 flex items-center justify-center rounded transition-all ${isAlignActive(id)
                                            ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-xs'
                                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        <Icon size={13} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 5. 色彩挑選 (Color Picker) */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <Palette size={13} className="text-brand-primary" />
                                <span>文字顏色 (Color)</span>
                            </label>
                            {(attrs.color || currentColor) && (
                                <span className="font-mono text-[10px] text-slate-400">{attrs.color || currentColor}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {PRESET_COLORS.map(c => {
                                const isSelected = isColorActive(c.value);
                                return (
                                    <button
                                        key={c.label}
                                        onClick={() => updateAttr('color', c.value)}
                                        title={c.label}
                                        className={`
                                            w-6 h-6 rounded-full border transition-all flex items-center justify-center relative
                                            ${isSelected ? 'ring-2 ring-brand-primary ring-offset-1 scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'}
                                            ${!c.value ? 'bg-slate-300 dark:bg-slate-700 border-slate-400' : ''}
                                        `}
                                        style={c.value ? { backgroundColor: c.value, borderColor: 'rgba(0,0,0,0.15)' } : {}}
                                    >
                                        {!c.value && <span className="text-[8px] font-bold text-slate-600 dark:text-slate-300">原</span>}
                                        {isSelected && c.value && (
                                            <Check size={11} className={c.value === '#f8fafc' ? 'text-slate-900' : 'text-white'} />
                                        )}
                                    </button>
                                );
                            })}
                            {/* 自訂顏色輸入 */}
                            <label
                                className="w-6 h-6 rounded-full border border-dashed border-slate-400 dark:border-slate-600 hover:border-brand-primary flex items-center justify-center cursor-pointer transition-all ml-auto shrink-0"
                                title="選擇自訂顏色"
                            >
                                <input
                                    type="color"
                                    value={attrs.color || '#3b82f6'}
                                    onChange={(e) => updateAttr('color', e.target.value)}
                                    className="opacity-0 w-0 h-0 absolute pointer-events-none"
                                />
                                <span className="text-[10px] text-slate-500">🎨</span>
                            </label>
                        </div>
                    </div>

                    {/* 6. 螢光筆標記 (Highlight / Background) */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <Highlighter size={13} className="text-amber-500" />
                                <span>螢光筆標記 (Highlight)</span>
                            </label>
                            {attrs.bg && attrs.bg !== 'transparent' && (
                                <span className="font-mono text-[10px] text-slate-400">{attrs.bg}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {HIGHLIGHT_COLORS.map(h => {
                                const isSelected = (!attrs.bg && h.value === 'transparent') || attrs.bg === h.value;
                                return (
                                    <button
                                        key={h.label}
                                        type="button"
                                        onClick={() => updateAttr('bg', h.value === 'transparent' ? undefined : h.value)}
                                        title={h.label}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${h.colorClass} ${
                                            isSelected ? 'ring-2 ring-brand-primary ring-offset-1 scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
                                        }`}
                                        style={h.value !== 'transparent' ? { backgroundColor: h.value } : {}}
                                    >
                                        {h.value === 'transparent' && <span className="text-[8px] text-slate-400">無</span>}
                                        {isSelected && h.value !== 'transparent' && (
                                            <Check size={11} className="text-slate-800" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ─── 底部操作 Footer ────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all font-medium text-xs cursor-pointer"
                    >
                        <RefreshCw size={12} />
                        <span>重設預設</span>
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-4 py-1.5 rounded-lg bg-brand-primary text-white font-bold hover:brightness-110 shadow-xs hover:shadow transition-all text-xs cursor-pointer active:scale-95"
                    >
                        完成
                    </button>
                </div>
            </div>
        </div>
    );
};
