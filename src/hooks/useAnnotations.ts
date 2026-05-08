import { useState, useEffect, useCallback } from 'react';
import { Annotation } from '../types';

/**
 * useAnnotations: 管理特定區塊的視覺標註
 * @param blockId 區塊唯一識別碼 (通常是 hashString(code))
 */
export function useAnnotations(blockId: string) {
    // 增加版本號以強制清除舊版不相容的座標資料
    const storageKey = `annotations:v2:${blockId}`;
    
    const [annotations, setAnnotations] = useState<Annotation[]>(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    // 當 annotations 改變時存入 localStorage
    useEffect(() => {
        // 清除舊版的資料 (可選)
        localStorage.removeItem(`annotations:${blockId}`);

        if (annotations.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(annotations));
        } else {
            localStorage.removeItem(storageKey);
        }
    }, [annotations, storageKey]);

    const addAnnotation = useCallback((annotation: Omit<Annotation, 'id'>) => {
        const newAnnotation: Annotation = {
            ...annotation,
            id: `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
        setAnnotations(prev => [...prev, newAnnotation]);
    }, []);

    const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
        setAnnotations(prev => prev.map(ann => ann.id === id ? { ...ann, ...updates } : ann));
    }, []);

    const removeAnnotation = useCallback((id: string) => {
        setAnnotations(prev => prev.filter(ann => ann.id !== id));
    }, []);

    const clearAnnotations = useCallback(() => {
        setAnnotations([]);
    }, []);

    const bringToFront = useCallback((id: string) => {
        setAnnotations(prev => {
            const index = prev.findIndex(ann => ann.id === id);
            if (index === -1) return prev;
            const newArr = [...prev];
            const [item] = newArr.splice(index, 1);
            newArr.push(item);
            return newArr;
        });
    }, []);

    return {
        annotations,
        addAnnotation,
        updateAnnotation,
        removeAnnotation,
        bringToFront,
        clearAnnotations
    };
}
