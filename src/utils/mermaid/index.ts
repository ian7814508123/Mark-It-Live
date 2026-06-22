/**
 * 統一匯出入口 (src/utils/mermaid/index.ts)
 *
 * 所有元件只需 import { ... } from '../../utils/mermaid' 即可取得：
 *   - 共用型別（MermaidDiagramType、MermaidNodeStyle、SequenceElement 等）
 *   - 圖類型偵測函式（detectDiagramType）
 *   - FlowchartManipulator
 *   - SequenceManipulator
 *
 * 未來新增圖類型只需：
 *   1. 建立 xxxManipulator.ts
 *   2. 在此 export 它
 */

// 共用型別
export * from './types';

// 通用偵測與定位函式
export { detectDiagramType, findNodeLine } from './detector';

// 各圖類型 Manipulator
export { FlowchartManipulator } from './flowchartManipulator';
export { SequenceManipulator }  from './sequenceManipulator';
