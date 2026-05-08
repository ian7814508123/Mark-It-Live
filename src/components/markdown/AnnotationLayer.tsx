import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Annotation } from '../../types';
import { Type, GripVertical } from 'lucide-react';
import { ANNOTATION_COLORS, DEFAULT_ANNOTATION_COLOR } from '../../constants/annotationColors';

interface AnnotationLayerProps {
    annotations: Annotation[];
    onUpdate: (id: string, updates: Partial<Annotation>) => void;
    onRemove: (id: string) => void;
    isEditable: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    scale?: number; // 傳入目前的縮放比例，解決 react-rnd offset 計算錯誤
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
    annotations,
    onUpdate,
    onRemove,
    isEditable,
    containerRef,
    selectedId,
    onSelect,
    scale = 1
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);

    if (!isEditable && annotations.length === 0) return null;

    return (
        <div className="annotation-layer-root absolute inset-0 pointer-events-none z-20">
            {annotations.map((ann) => (
                <AnnotationItem
                    key={ann.id}
                    annotation={ann}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    isEditable={isEditable}
                    isSelected={selectedId === ann.id}
                    onSelect={() => onSelect(ann.id)}
                    isEditingText={editingId === ann.id}
                    setEditingText={(editing) => setEditingId(editing ? ann.id : null)}
                    containerRef={containerRef}
                    scale={scale}
                />
            ))}
        </div>
    );
};

interface AnnotationItemProps {
    annotation: Annotation;
    onUpdate: (id: string, updates: Partial<Annotation>) => void;
    onRemove: (id: string) => void;
    isEditable: boolean;
    isSelected: boolean;
    onSelect: () => void;
    isEditingText: boolean;
    setEditingText: (editing: boolean) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    scale: number;
}

const AnnotationItem: React.FC<AnnotationItemProps> = ({
    annotation,
    onUpdate,
    onRemove,
    isEditable,
    isSelected,
    onSelect,
    isEditingText,
    setEditingText,
    containerRef,
    scale
}) => {
    const [tempContent, setTempContent] = useState(annotation.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ─── 拖曳期間的本地像素位置快取 ────────────────────────────────────────
    // 核心修正：避免 controlled mode 在每次 re-render 時重置 Rnd 座標造成「瞬移」
    // null = 使用 annotation.x/y 計算；非 null = 拖曳中，使用本地快取
    const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

    // 外部 annotation.x/y 更新後（通常是 onDragStop 寫回後），清除本地快取
    useEffect(() => {
        setDragPos(null);
    }, [annotation.x, annotation.y]);

    // 外部內容改變時更新暫存
    useEffect(() => {
        setTempContent(annotation.content);
    }, [annotation.content]);

    // 取得容器的 CSS layout 尺寸（與 Rnd 的 d.x/d.y 同一座標系）
    // 回傳 null 而非 {1,1}，避免 fallback 造成便利貼飛到原點
    const getContainerSize = (): { width: number; height: number } | null => {
        if (containerRef.current) {
            return {
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
            };
        }
        return null;
    };

    // 百分比 → CSS layout 像素（供 Rnd position prop 使用）
    const getPxPosition = () => {
        const size = getContainerSize();
        if (!size) return { x: 0, y: 0 };
        return {
            x: (annotation.x / 100) * size.width,
            y: (annotation.y / 100) * size.height,
        };
    };

    // 拖曳中：只更新本地快取，不觸發全局狀態更新
    // 這樣即使父元件因其他原因 re-render，Rnd 也不會跳回舊座標
    const handleDrag = (_e: any, d: any) => {
        setDragPos({ x: d.x, y: d.y });
    };

    // 拖曳結束：計算百分比並寫回父元件（dragPos 由 useEffect 自動清除）
    const handleDragStop = (_e: any, d: any) => {
        const size = getContainerSize();
        if (!size) return;
        onUpdate(annotation.id, {
            x: (d.x / size.width) * 100,
            y: (d.y / size.height) * 100
        });
    };

    const handleResizeStop = (_e: any, _direction: any, ref: any, _delta: any, position: any) => {
        const size = getContainerSize();
        if (!size) return;
        onUpdate(annotation.id, {
            width: parseInt(ref.style.width, 10),
            height: parseInt(ref.style.height, 10),
            x: (position.x / size.width) * 100,
            y: (position.y / size.height) * 100
        });
    };

    // 顯示位置：拖曳中用本地快取，靜止時從 annotation 百分比計算
    const displayPos = dragPos ?? getPxPosition();
    const isCircle = annotation.style.borderRadius === '50%';

    return (
        <Rnd
            scale={scale} // ⭐ 核心解法：告訴 react-rnd 目前的 CSS 縮放比例，修正 d.x 和 offset 計算！
            size={{ width: annotation.width, height: annotation.height }}
            position={displayPos}
            onDrag={handleDrag}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
            disableDragging={!isEditable || isEditingText}
            enableResizing={isEditable && !isEditingText}
            // 指定拖曳 handle：整個便利貼都可拖曳，但 click/dblclick 事件獨立處理
            dragHandleClassName="annotation-drag-handle"
            bounds="parent"
            className="pointer-events-auto group/memo"
            style={{ zIndex: isEditingText ? 50 : isSelected ? 40 : 10 }}
        >
            {/* annotation-drag-handle 類別讓 react-rnd 正確識別拖曳起始區域 */}
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    if (isEditable) onSelect();
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (isEditable) setEditingText(true);
                }}
                className={`annotation-drag-handle w-full h-full p-3 rounded-lg shadow-lg border-2 relative flex flex-col
                    transition-shadow duration-200
                    ${isEditable && !isEditingText ? 'cursor-move' : 'cursor-default'}
                    ${isSelected
                        ? 'ring-4 ring-brand-primary/40 shadow-2xl'
                        : 'hover:shadow-xl'
                    }`}
                style={{
                    backgroundColor: annotation.style.backgroundColor || DEFAULT_ANNOTATION_COLOR.bg,
                    borderColor: isSelected ? 'var(--brand-primary)' : (annotation.style.borderColor || DEFAULT_ANNOTATION_COLOR.border),
                    color: annotation.style.color || DEFAULT_ANNOTATION_COLOR.text,
                    fontSize: annotation.style.fontSize || '13px',
                    borderRadius: annotation.style.borderRadius || '8px',
                    textAlign: annotation.style.textAlign || 'left',
                    opacity: annotation.style.opacity ?? 1,
                    borderStyle: annotation.style.borderStyle || 'solid'
                }}
            >
                {/* 選中狀態指示器（純視覺，不影響拖曳） */}
                {isEditable && isSelected && (
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200 print:hidden pointer-events-none">
                        <Type size={12} />
                    </div>
                )}

                {/* 拖動手柄圖示（pointer-events-none，純視覺提示） */}
                {isEditable && !isEditingText && (
                    <div className="absolute top-1 left-1 opacity-0 group-hover/memo:opacity-40 transition-opacity print:hidden pointer-events-none">
                        <GripVertical size={12} />
                    </div>
                )}

                {/* 內容區 */}
                <div className={`flex-1 overflow-hidden font-medium leading-relaxed flex items-center justify-center ${isCircle ? 'relative' : ''}`}>
                    <div
                        className={isCircle ? 'absolute' : 'w-full h-full'}
                        style={isCircle ? {
                            width: '70.7%',
                            height: '70.7%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        } : {
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {isEditingText ? (
                            <textarea
                                ref={textareaRef}
                                autoFocus
                                value={tempContent}
                                onChange={(e) => setTempContent(e.target.value)}
                                onBlur={() => {
                                    onUpdate(annotation.id, { content: tempContent });
                                    setEditingText(false);
                                }}
                                // stopPropagation 防止文字輸入時誤觸拖曳
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full h-full bg-transparent border-none outline-none resize-none focus:ring-0 p-0 overflow-hidden cursor-text"
                                style={{ color: 'inherit', fontSize: 'inherit', textAlign: 'inherit' }}
                            />
                        ) : (
                            <div
                                onDoubleClick={() => isEditable && setEditingText(true)}
                                className="whitespace-pre-wrap break-words w-full overflow-y-auto custom-scrollbar no-scrollbar"
                            >
                                {annotation.content || (isEditable ? '點擊編輯文字...' : '')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Rnd>
    );
};
