/**
 * Annotation 便利貼顏色清單（唯一來源）
 * 取代 AnnotationLayer.tsx 和 MarkdownPreview.tsx 中各自定義的版本
 */
export const ANNOTATION_COLORS = [
    { name: 'Yellow', bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
    { name: 'Blue',   bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' },
    { name: 'Green',  bg: '#dcfce7', border: '#86efac', text: '#166534' },
    { name: 'Red',    bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    { name: 'Purple', bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8' },
] as const;

export type AnnotationColor = {
    name: string;
    bg: string;
    border: string;
    text: string;
};

/** 預設顏色（Yellow） */
export const DEFAULT_ANNOTATION_COLOR: AnnotationColor = ANNOTATION_COLORS[0];
