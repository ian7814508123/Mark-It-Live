import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Bold, Palette, Highlighter, Eraser, Type, ChevronDown, Check
} from '../ui/Icons';
import { TypographyAttrs, PRESET_COLORS, HIGHLIGHT_COLORS } from '../../utils/typographyUtils';

export interface FloatingSelectionToolbarProps {
    isOpen: boolean;
    position: { top: number; left: number };
    selectionRect?: DOMRect | null;
    containerRect?: DOMRect | null;
    selectedText: string;
    targetLine: number;
    currentAttrs?: TypographyAttrs;
    onApplyAttrs: (attrs: Partial<TypographyAttrs>) => void;
    onClearFormat: () => void;
    onOpenFullInspector: () => void;
    onClose: () => void;
}

const QUICK_FONT_SIZES = [
    { label: '小 (14px)', value: '14px' },
    { label: '常規 (16px)', value: '16px' },
    { label: '中 (18px)', value: '18px' },
    { label: '大 (20px)', value: '20px' },
    { label: '主標 (24px)', value: '24px' },
    { label: '特大 (32px)', value: '32px' },
];

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
    isOpen,
    position,
    selectionRect,
    containerRect,
    selectedText,
    targetLine,
    currentAttrs = {},
    onApplyAttrs,
    onClearFormat,
    onOpenFullInspector,
    onClose,
}) => {
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [activePopup, setActivePopup] = useState<'size' | 'color' | 'highlight' | null>(null);

    // 關閉浮出選單時重設內部子彈窗
    useEffect(() => {
        if (!isOpen) {
            setActivePopup(null);
        }
    }, [isOpen]);

    // 點擊工具列外時關閉子彈窗
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setActivePopup(null);
            }
        };
        if (activePopup) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [activePopup]);

    // ─── 容器與視窗邊界感應計算（自動避讓容器頂部與兩側） ─────────────────────────
    const layout = useMemo(() => {
        if (!isOpen) return { top: position.top, left: position.left, transform: 'translate(-50%, -100%)', popupDirection: 'up' as const };

        const TOOLBAR_WIDTH = 290;
        const TOOLBAR_HEIGHT = 42;
        const POPUP_HEIGHT = 220; // 字級/顏色選單預估高度
        const GAP = 10;
        const TOP_SAFE_MARGIN = 62; // 避開頂部導航列

        // 取得預覽容器與視窗的有效邊界
        const cTop = Math.max(TOP_SAFE_MARGIN, containerRect?.top ?? TOP_SAFE_MARGIN);
        const cBottom = containerRect ? Math.min(window.innerHeight, containerRect.bottom) : window.innerHeight;
        const cLeft = containerRect?.left ?? 0;
        const cRight = containerRect ? Math.min(window.innerWidth, containerRect.right) : window.innerWidth;

        // 1. 垂直避讓：判斷上方是否有足夠空間容納工具列本體
        const selTop = selectionRect ? selectionRect.top : position.top;
        const selBottom = selectionRect ? selectionRect.bottom : position.top + 20;

        const spaceAbove = selTop - cTop;
        const placeAbove = spaceAbove >= (TOOLBAR_HEIGHT + GAP);

        let finalTop: number;
        let transform: string;

        if (placeAbove) {
            // 工具列置於文字上方
            finalTop = selTop - GAP;
            transform = 'translate(-50%, -100%)';
        } else {
            // 工具列翻轉至文字下方（避免衝出預覽容器頂端）
            finalTop = Math.min(cBottom - TOOLBAR_HEIGHT, selBottom + GAP);
            transform = 'translate(-50%, 0)';
        }

        // 2. 水平避讓：嚴格 Clamp 在預覽容器左右邊框之內
        const halfWidth = TOOLBAR_WIDTH / 2;
        const minX = cLeft + halfWidth + 8;
        const maxX = cRight - halfWidth - 8;

        const targetX = selectionRect ? (selectionRect.left + selectionRect.width / 2) : position.left;
        const finalLeft = minX <= maxX ? Math.max(minX, Math.min(maxX, targetX)) : (cLeft + (cRight - cLeft) / 2);

        // 3. 子選單（字級、顏色、螢光筆）彈出方向智能偵測
        // 算出工具列本身最終在視窗中的絕對頂部 Y 座標
        const toolbarActualTop = placeAbove ? (finalTop - TOOLBAR_HEIGHT) : finalTop;
        const spaceAboveToolbar = toolbarActualTop - cTop;

        // 若工具列上方空間不足以展開 220px 的選單，子選單改為「向下彈出」
        const popupDirection = spaceAboveToolbar >= POPUP_HEIGHT ? 'up' : 'down';

        return {
            top: finalTop,
            left: finalLeft,
            transform,
            popupDirection,
        };
    }, [isOpen, position, selectionRect, containerRect]);

    if (!isOpen) return null;

    const isBold = currentAttrs.weight === 'bold' || currentAttrs.weight === '700';

    return (
        <div
            ref={toolbarRef}
            data-floating-toolbar="true"
            className="fixed z-50 flex items-center gap-0.5 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-xl shadow-xl shadow-slate-900/15 text-slate-700 dark:text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{
                top: `${layout.top}px`,
                left: `${layout.left}px`,
                transform: layout.transform,
            }}
            onMouseDown={(e) => {
                // 關鍵：阻止 mousedown 預設行為，保留預覽區文字反白選取狀態
                e.preventDefault();
            }}
        >
            {/* 1. 字級下拉快捷 */}
            <div className="relative">
                <button
                    type="button"
                    title="字級大小"
                    onClick={() => setActivePopup(p => p === 'size' ? null : 'size')}
                    className={`h-7 px-2 flex items-center gap-1 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        activePopup === 'size' ? 'bg-slate-100 dark:bg-slate-800 text-brand-primary' : ''
                    }`}
                >
                    <span>{currentAttrs.size || '字級'}</span>
                    <ChevronDown size={12} className="opacity-60" />
                </button>

                {activePopup === 'size' && (
                    <div
                        className={`absolute left-0 ${
                            layout.popupDirection === 'down'
                                ? 'top-full mt-1.5'
                                : 'bottom-full mb-1.5'
                        } w-28 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in duration-100 max-h-56 overflow-y-auto`}
                    >
                        {QUICK_FONT_SIZES.map((sz) => (
                            <button
                                key={sz.value}
                                type="button"
                                onClick={() => {
                                    onApplyAttrs({ size: sz.value });
                                    setActivePopup(null);
                                }}
                                className="w-full px-2.5 py-1 text-left hover:bg-brand-primary/10 hover:text-brand-primary flex items-center justify-between text-xs transition-colors"
                            >
                                <span>{sz.label}</span>
                                {currentAttrs.size === sz.value && <Check size={12} className="text-brand-primary" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. 粗體切換 */}
            <button
                type="button"
                title="粗體 (Bold)"
                onClick={() => {
                    onApplyAttrs({ weight: isBold ? 'normal' : 'bold' });
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                    isBold
                        ? 'bg-brand-primary/15 text-brand-primary font-black'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
            >
                <Bold size={14} />
            </button>

            {/* 3. 文字顏色 */}
            <div className="relative">
                <button
                    type="button"
                    title="文字顏色"
                    onClick={() => setActivePopup(p => p === 'color' ? null : 'color')}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        activePopup === 'color'
                            ? 'bg-slate-100 dark:bg-slate-800 text-brand-primary'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                >
                    <div className="relative">
                        <Palette size={14} />
                        {currentAttrs.color && (
                            <span
                                className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900"
                                style={{ backgroundColor: currentAttrs.color }}
                            />
                        )}
                    </div>
                </button>

                {activePopup === 'color' && (
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 ${
                            layout.popupDirection === 'down'
                                ? 'top-full mt-1.5'
                                : 'bottom-full mb-1.5'
                        } p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in duration-100`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 mb-1.5">文字色彩</div>
                        <div className="grid grid-cols-5 gap-1.5 w-36">
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c.label}
                                    type="button"
                                    title={c.label}
                                    onClick={() => {
                                        onApplyAttrs({ color: c.value });
                                        setActivePopup(null);
                                    }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-transform hover:scale-110"
                                    style={{ backgroundColor: c.value || 'transparent' }}
                                >
                                    {!c.value && <span className="text-[9px] text-slate-400">無</span>}
                                    {currentAttrs.color === c.value && (
                                        <Check size={12} className={c.value === '#f8fafc' || c.value === '#ffffff' ? 'text-slate-800' : 'text-white'} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 4. 螢光筆背景色 (Highlight) */}
            <div className="relative">
                <button
                    type="button"
                    title="螢光筆標記 (Highlight)"
                    onClick={() => setActivePopup(p => p === 'highlight' ? null : 'highlight')}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        activePopup === 'highlight' || (currentAttrs.bg && currentAttrs.bg !== 'transparent')
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                >
                    <Highlighter size={14} />
                </button>

                {activePopup === 'highlight' && (
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 ${
                            layout.popupDirection === 'down'
                                ? 'top-full mt-1.5'
                                : 'bottom-full mb-1.5'
                        } p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in duration-100`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 mb-1.5">螢光筆色彩</div>
                        <div className="flex items-center gap-1.5">
                            {HIGHLIGHT_COLORS.map((h) => (
                                <button
                                    key={h.label}
                                    type="button"
                                    title={h.label}
                                    onClick={() => {
                                        onApplyAttrs({ bg: h.value });
                                        setActivePopup(null);
                                    }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${h.colorClass}`}
                                    style={h.value !== 'transparent' ? { backgroundColor: h.value } : {}}
                                >
                                    {h.value === 'transparent' && <span className="text-[8px] text-slate-400">無</span>}
                                    {currentAttrs.bg === h.value && (
                                        <Check size={12} className="text-slate-800" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 分隔線 */}
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* 5. 清除格式 */}
            <button
                type="button"
                title="清除格式 (Clear Format)"
                onClick={onClearFormat}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
            >
                <Eraser size={14} />
            </button>

            {/* 6. 開啟完整排版面板 */}
            <button
                type="button"
                title="進階排版設定"
                onClick={onOpenFullInspector}
                className="h-7 px-1.5 flex items-center gap-1 rounded-lg hover:bg-brand-primary/10 hover:text-brand-primary text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-medium"
            >
                <Type size={13} />
                <span>進階</span>
            </button>
        </div>
    );
};

export default FloatingSelectionToolbar;
