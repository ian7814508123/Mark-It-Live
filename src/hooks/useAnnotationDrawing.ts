import React, { useState, useCallback } from 'react';
import { Annotation, AnnotationColor } from '../types';

interface UseAnnotationDrawingOptions {
    containerRef: React.RefObject<HTMLDivElement | null>;
    isActive: boolean;
    activeTool: 'sticky' | 'rect' | 'circle';
    activeColor: AnnotationColor;
    onAdd: (annotation: Omit<Annotation, 'id'>) => void;
    isReallyPrinting?: boolean;
}

export function useAnnotationDrawing({
    containerRef,
    isActive,
    activeTool,
    activeColor,
    onAdd,
    isReallyPrinting = false
}: UseAnnotationDrawingOptions) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number, y: number } | null>(null);
    const [drawRect, setDrawRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isActive || isReallyPrinting) return;

        // 如果點擊的是現有的標註（RnD 元件），設定選中並不觸發繪製
        const draggable = (e.target as HTMLElement).closest('.react-draggable');
        if (draggable) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawRect({ x, y, w: 0, h: 0 });
    }, [isActive, isReallyPrinting, containerRef]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDrawing || !drawStart) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const currentX = ((e.clientX - rect.left) / rect.width) * 100;
        const currentY = ((e.clientY - rect.top) / rect.height) * 100;

        setDrawRect({
            x: Math.min(drawStart.x, currentX),
            y: Math.min(drawStart.y, currentY),
            w: Math.abs(currentX - drawStart.x),
            h: Math.abs(currentY - drawStart.y)
        });
    }, [isDrawing, drawStart, containerRef]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !drawRect) return;

        // 只有當面積夠大時才新增
        if (drawRect.w > 1 && drawRect.h > 1) {
            // ⭐ 修正 Bug 3: 繪製預覽框與實際尺寸不一
            // 使用 containerRef.current?.offsetWidth/offsetHeight 計算 layout px
            // 而非使用 getBoundingClientRect() 計算的視覺 px
            // 這樣才能與 react-rnd 要求的 size (layout px) 對齊
            const layoutWidth = containerRef.current?.offsetWidth || 800; // fallback
            const layoutHeight = containerRef.current?.offsetHeight || 600;

            const widthPx = (drawRect.w / 100) * layoutWidth;
            const heightPx = (drawRect.h / 100) * layoutHeight;

            onAdd({
                type: activeTool,
                content: '',
                x: drawRect.x,
                y: drawRect.y,
                width: widthPx,
                height: heightPx,
                style: {
                    backgroundColor: activeColor.bg,
                    borderColor: activeColor.border,
                    color: activeColor.text,
                    borderRadius: activeTool === 'circle' ? '50%' : activeTool === 'rect' ? '4px' : '0px'
                }
            });
        }

        setIsDrawing(false);
        setDrawStart(null);
        setDrawRect(null);
    }, [isDrawing, drawRect, containerRef, activeTool, activeColor, onAdd]);

    return {
        isDrawing,
        drawRect,
        handlers: {
            onMouseDown: handleMouseDown,
            onMouseMove: handleMouseMove,
            onMouseUp: handleMouseUp,
        }
    };
}
