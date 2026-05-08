import React from 'react';
import { createPortal } from 'react-dom';
import {
    X, MousePointer2, StickyNote, Square, Circle,
    Minus, Plus, Type, AlignLeft, AlignCenter,
    AlignRight, Copy, Layers, Sun, Trash2
} from 'lucide-react';

import { Annotation, AnnotationColor } from '../../types';
import { ANNOTATION_COLORS } from '../../constants/annotationColors';

interface AnnotationToolbarProps {
    isVisible: boolean;
    isActuallyPrinting: boolean;
    activeTool: 'sticky' | 'rect' | 'circle';
    setActiveTool: (tool: 'sticky' | 'rect' | 'circle') => void;
    activeColor: AnnotationColor;
    setActiveColor: (color: AnnotationColor) => void;
    selectedAnnotationId: string | null;
    setSelectedAnnotationId: (id: string | null) => void;
    annotations: any[];
    onUpdateAnnotation: (id: string, updates: any) => void;
    onAddAnnotation: (annotation: any) => void;
    onRemoveAnnotation: (id: string) => void;
    onBringToFront: (id: string) => void;
    onExitMode: () => void;
}

// ─── 標註工具按鈕元件 ──────────────────────────────────────────────────────

interface ToolButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    title?: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, label, title }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${active
            ? 'bg-brand-primary text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.5)] scale-110 font-bold'
            : 'text-slate-400 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white'
            }`}
        aria-label={label}
        title={title}
    >
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </button>
);



/**
 * 全局標註工具列組件
 * 提供標註工具切換、顏色選擇以及選中物件的屬性編輯
 */
const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
    isVisible,
    isActuallyPrinting,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    selectedAnnotationId,
    setSelectedAnnotationId,
    annotations,
    onUpdateAnnotation,
    onAddAnnotation,
    onRemoveAnnotation,
    onBringToFront,
}) => {
    if (!isVisible || isActuallyPrinting) return null;

    // 使用 Portal 渲染到 document.body，繞過 print-paper 的 CSS transform stacking context
    // position:fixed 在有 transform 的祖先元素中會失去 viewport 定位，Portal 是最乾淨的解法
    return createPortal(
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[9900] animate-in slide-in-from-bottom-8 fade-in duration-500 print:hidden">
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-2 p-1.5 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-white rounded-full border border-slate-300 dark:border-white/20 backdrop-blur-3xl transition-all duration-300"
            >
                {/* 條件式工具列內容 */}
                {!selectedAnnotationId ? (
                    /* 畫布工具模式 (Canvas Tools) */
                    <div className="flex items-center gap-1.5 px-2 animate-in fade-in slide-in-from-left-4 duration-300">
                        <ToolButton
                            active={activeTool === 'sticky'}
                            onClick={() => setActiveTool('sticky')}
                            icon={<StickyNote size={15} />}
                            label="便利貼"
                        />
                        <ToolButton
                            active={activeTool === 'rect'}
                            onClick={() => setActiveTool('rect')}
                            icon={<Square size={15} />}
                            label="矩形"
                        />
                        <ToolButton
                            active={activeTool === 'circle'}
                            onClick={() => setActiveTool('circle')}
                            icon={<Circle size={15} />}
                            label="圓形"
                        />
                        <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
                        <div className="flex items-center gap-1.5 px-1">
                            {ANNOTATION_COLORS.map(c => (
                                <button
                                    key={c.name}
                                    onClick={() => setActiveColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-125 ${activeColor.name === c.name ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                                    style={{ backgroundColor: c.border }}
                                    title={`預設顏色: ${c.name}`}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    /* 物件屬性模式 (Property Editor) */
                    <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        {(() => {
                            const selectedAnn = annotations.find(a => a.id === selectedAnnotationId);
                            if (!selectedAnn) return null;

                            return (
                                <>
                                    <div className="flex items-center gap-1 px-1 bg-slate-100 dark:bg-white/5 rounded-full p-1">
                                        {ANNOTATION_COLORS.map(c => (
                                            <button
                                                key={c.name}
                                                onClick={() => onUpdateAnnotation(selectedAnnotationId, {
                                                    style: { ...selectedAnn.style, backgroundColor: c.bg, borderColor: c.border, color: c.text }
                                                })}
                                                className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-125 ${selectedAnn.style.backgroundColor === c.bg ? 'border-brand-primary scale-110 shadow-lg' : 'border-transparent opacity-50'}`}
                                                style={{ backgroundColor: c.border }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>

                                    <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1" />

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                const currentSize = parseInt(selectedAnn.style.fontSize || '13px');
                                                onUpdateAnnotation(selectedAnnotationId, { style: { ...selectedAnn.style, fontSize: `${Math.max(10, currentSize - 2)}px` } });
                                            }}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white"
                                            title="縮小字體"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <div className="flex items-center gap-1 px-2 text-[10px] font-bold min-w-[30px] justify-center text-brand-primary">
                                            <Type size={12} />
                                            {selectedAnn.style.fontSize || '13px'}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const currentSize = parseInt(selectedAnn.style.fontSize || '13px');
                                                onUpdateAnnotation(selectedAnnotationId, { style: { ...selectedAnn.style, fontSize: `${Math.min(32, currentSize + 2)}px` } });
                                            }}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white"
                                            title="放大字體"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1" />

                                    {/* 對齊方式 */}
                                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 rounded-full p-1">
                                        {[
                                            { val: 'left', icon: <AlignLeft size={14} /> },
                                            { val: 'center', icon: <AlignCenter size={14} /> },
                                            { val: 'right', icon: <AlignRight size={14} /> }
                                        ].map(align => (
                                            <button
                                                key={align.val}
                                                onClick={() => onUpdateAnnotation(selectedAnnotationId, {
                                                    style: { ...selectedAnn.style, textAlign: align.val as any }
                                                })}
                                                className={`p-1.5 rounded-full transition-all ${selectedAnn.style.textAlign === align.val || (!selectedAnn.style.textAlign && align.val === 'left') ? 'bg-brand-primary text-white shadow-lg' : 'text-slate-400 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                                title={`對齊: ${align.val}`}
                                            >
                                                {align.icon}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1" />

                                    {/* 邊框樣式與複製 */}
                                    <div className="flex items-center gap-1.5 px-1">
                                        <button
                                            onClick={() => onUpdateAnnotation(selectedAnnotationId, {
                                                style: { ...selectedAnn.style, borderStyle: selectedAnn.style.borderStyle === 'dashed' ? 'solid' : 'dashed' }
                                            })}
                                            className={`p-2 rounded-xl border transition-all ${selectedAnn.style.borderStyle === 'dashed' ? 'border-brand-primary text-brand-primary bg-brand-primary/10 shadow-lg' : 'border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                            title="切換虛線/實線邊框"
                                        >
                                            <div className={`w-3.5 h-3.5 rounded-sm border-2 ${selectedAnn.style.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'}`} />
                                        </button>

                                        <button
                                            onClick={() => {
                                                const newAnn = { ...selectedAnn };
                                                // @ts-ignore
                                                delete newAnn.id;
                                                newAnn.x += 2;
                                                newAnn.y += 2;
                                                onAddAnnotation(newAnn);
                                            }}
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white transition-all hover:scale-110 active:scale-90"
                                            title="複製標註"
                                        >
                                            <Copy size={15} />
                                        </button>

                                        <button
                                            onClick={() => onBringToFront(selectedAnnotationId)}
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white transition-all hover:scale-110 active:scale-90"
                                            title="置於頂層"
                                        >
                                            <Layers size={15} />
                                        </button>

                                        <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1" />

                                        {/* 透明度與圓角 */}
                                        <button
                                            onClick={() => {
                                                const nextOpacity = selectedAnn.style.opacity === 0.4 ? 1 : selectedAnn.style.opacity === 0.7 ? 0.4 : 0.7;
                                                onUpdateAnnotation(selectedAnnotationId, {
                                                    style: { ...selectedAnn.style, opacity: nextOpacity }
                                                });
                                            }}
                                            className={`p-2 rounded-xl transition-all ${selectedAnn.style.opacity && selectedAnn.style.opacity < 1 ? 'text-brand-primary bg-brand-primary/10' : 'text-slate-500 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                            title={`切換透明度 (目前: ${Math.round((selectedAnn.style.opacity || 1) * 100)}%)`}
                                        >
                                            <Sun size={15} className={selectedAnn.style.opacity && selectedAnn.style.opacity < 1 ? 'animate-pulse' : ''} />
                                        </button>

                                        <button
                                            onClick={() => {
                                                const isCircle = selectedAnn.style.borderRadius === '50%';
                                                const isSharp = selectedAnn.style.borderRadius === '0px';
                                                let nextRadius = '8px';
                                                if (!isCircle && !isSharp) nextRadius = '50%';
                                                else if (isCircle) nextRadius = '0px';
                                                else nextRadius = '8px';

                                                onUpdateAnnotation(selectedAnnotationId, {
                                                    style: { ...selectedAnn.style, borderRadius: nextRadius }
                                                });
                                            }}
                                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-white/70 hover:text-slate-800 dark:hover:text-white transition-all"
                                            title="切換形狀 (方/圓/角)"
                                        >
                                            {selectedAnn.style.borderRadius === '50%' ? <Circle size={15} /> : selectedAnn.style.borderRadius === '0px' ? <Square size={15} /> : <div className="w-3.5 h-3.5 border-2 border-current rounded-[4px]" />}
                                        </button>
                                    </div>

                                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />

                                    <button
                                        onClick={() => {
                                            onRemoveAnnotation(selectedAnnotationId);
                                            setSelectedAnnotationId(null);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-full transition-all text-[10px] font-bold uppercase tracking-wider"
                                        title="刪除"
                                        aria-label="刪除"
                                    >
                                        <Trash2 size={14} />

                                    </button>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* 操作提示 */}
            {!selectedAnnotationId && (
                <p className="text-center mt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-in fade-in duration-700 delay-300">
                    在畫面上點擊並拖曳以開始繪製
                </p>
            )}
        </div>
        , document.body);
};

export default AnnotationToolbar;
