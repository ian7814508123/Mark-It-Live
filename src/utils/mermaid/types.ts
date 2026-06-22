// 共用 Mermaid 型別與介面
// 所有圖類型的 Manipulator 與工具列元件共享這些定義

/** Mermaid 圖表類型，用於驅動對應的工具列內容 */
export type MermaidDiagramType =
    | 'flowchart'     // flowchart / graph
    | 'sequence'      // sequenceDiagram
    | 'class'         // classDiagram
    | 'er'            // erDiagram
    | 'gantt'         // gantt
    | 'pie'           // pie chart
    | 'gitgraph'      // gitGraph
    | 'mindmap'       // mindmap
    | 'timeline'      // timeline
    | 'quadrant'      // quadrantChart
    | 'architecture'  // architecture (v11+)
    | 'xychart'       // xychart-beta
    | 'unknown';

/** Flowchart 節點的內嵌樣式 */
export interface MermaidNodeStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    color?: string;
}

/** Sequence Diagram 中被選取的元素資訊 */
export interface SequenceElement {
    type: 'actor' | 'message';
    /** actor 顯示名稱 / 訊息標籤文字 */
    name: string;
    /** 僅用於 message：目前箭頭語法（如 '->>'） */
    arrowType?: string;
}
