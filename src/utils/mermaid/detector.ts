import type { MermaidDiagramType } from './types';
import { SequenceManipulator } from './sequenceManipulator';

/**
 * 偵測 Mermaid 程式碼的圖表類型
 * 透過解析第一行有效宣告（略過 YAML frontmatter 與注解）來判斷
 * 獨立函式，不屬於 any 具體圖類型的 Manipulator
 */
export function detectDiagramType(code: string): MermaidDiagramType {
    if (!code || !code.trim()) return 'flowchart'; // 空白預設 flowchart
    const lines = code.split('\n').map(l => l.trim());

    // 略過 YAML frontmatter（由 --- 包著的區塊）
    let i = 0;
    if (lines[i] === '---') {
        i++;
        while (i < lines.length && lines[i] !== '---') i++;
        i++; // 跳過結尾的 '---'
    }

    // 尋找第一行非空白、非注解的圖表宣告
    while (i < lines.length) {
        const line = lines[i];
        if (!line || line.startsWith('%%')) { i++; continue; }
        if (/^(flowchart|graph)\s/i.test(line))   return 'flowchart';
        if (/^sequenceDiagram/i.test(line))         return 'sequence';
        if (/^classDiagram/i.test(line))            return 'class';
        if (/^erDiagram/i.test(line))               return 'er';
        if (/^gantt/i.test(line))                   return 'gantt';
        if (/^pie/i.test(line))                     return 'pie';
        if (/^gitGraph/i.test(line))                return 'gitgraph';
        if (/^mindmap/i.test(line))                 return 'mindmap';
        if (/^timeline/i.test(line))                return 'timeline';
        if (/^quadrantChart/i.test(line))           return 'quadrant';
        if (/^architecture/i.test(line))            return 'architecture';
        if (/^xychart-beta/i.test(line))            return 'xychart';
        return 'unknown';
    }
    return 'flowchart';
}

/**
 * 依據圖表類型與選中節點 ID/名稱，在 raw code 中尋找對應的行號 (1-indexed)
 */
export function findNodeLine(code: string, idOrName: string, diagramType: MermaidDiagramType): number | null {
    if (!code || !idOrName) return null;

    switch (diagramType) {
        case 'flowchart': {
            const flowLines = code.split('\n');
            const escapedId = idOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const flowRegex = new RegExp(`(^|\\s)${escapedId}(\\s|$|@|\\[|\\(|\\{|\\>|\\/)`);
            for (let idx = 0; idx < flowLines.length; idx++) {
                const line = flowLines[idx];
                const isStyleOrClass = new RegExp(`^\\s*(style|class|classDef)\\s+${escapedId}\\b`, 'i').test(line);
                if (flowRegex.test(line) && !isStyleOrClass) {
                    return idx + 1;
                }
            }
            return null;
        }
        case 'sequence': {
            return SequenceManipulator.findActorLine(code, idOrName) || 
                   SequenceManipulator.findMessageLine(code, idOrName);
        }
        default:
            return null;
    }
}

