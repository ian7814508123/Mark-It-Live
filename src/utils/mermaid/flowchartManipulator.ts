import type { MermaidNodeStyle } from './types';

/**
 * Flowchart / Graph 圖表操作工具
 * 包含方向變更、節點增刪、連線、形狀、樣式等功能
 */
export class FlowchartManipulator {

    /** 讀取目前流程圖的排版方向 */
    static getDirection(code: string): 'TD' | 'LR' | 'BT' | 'RL' | 'TB' | null {
        if (!code) return null;
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(graph|flowchart)\s+(TD|LR|BT|RL|TB)/i);
            if (match) {
                return match[2].toUpperCase() as 'TD' | 'LR' | 'BT' | 'RL' | 'TB';
            }
        }
        return null;
    }

    /** 變更流程圖排版方向 */
    static changeDirection(code: string, newDir: 'TD' | 'LR' | 'BT' | 'RL'): string {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^(graph|flowchart)\s+(TD|LR|BT|RL|TB)/i);
            if (match) {
                lines[i] = line.replace(match[2], newDir);
                return lines.join('\n');
            }
        }
        return code;
    }

    /** 在圖末新增一個孤立節點 */
    static addIsolatedNode(code: string): string {
        const lines = code.split('\n');
        const newId   = `node_${Date.now().toString().slice(-4)}`;
        const newNode = `  ${newId}[新節點]`;
        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, newNode);
        return lines.join('\n');
    }

    /** 在兩個節點之間新增連線 */
    static addLink(code: string, sourceId: string, targetId: string): string {
        const lines = code.split('\n');
        const linkStr = `  ${sourceId} --> ${targetId}`;
        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, linkStr);
        return lines.join('\n');
    }

    /** 在指定節點後新增一個分支節點（含連線） */
    static addBranch(code: string, sourceId: string): string {
        const lines = code.split('\n');
        const newId   = `node_${Date.now().toString().slice(-4)}`;
        const newNode = `  ${sourceId} --> ${newId}[新分支]`;
        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, newNode);
        return lines.join('\n');
    }

    /** 變更節點形狀（支援標準括號形狀與 @{ shape: xxx } 擴展形狀） */
    static changeNodeShape(code: string, nodeId: string, shapeType: string): string {
        const lines = code.split('\n');

        // 標準括號形狀對照表
        const bracketShapes: Record<string, [string, string]> = {
            'round':            ['(', ')'],
            'stadium':          ['([', '])'],
            'subroutine':       ['[[', ']]'],
            'cylinder':         ['[(', ')]'],
            'circle':           ['((', '))'],
            'asymmetric':       ['>', ']'],
            'diamond':          ['{', '}'],
            'hexagon':          ['{{', '}}'],
            'parallelogram':    ['[/', '/]'],
            'parallelogram_alt':['[\\', '\\]'],
            'trapezoid':        ['[/', '\\]'],
            'trapezoid_alt':    ['[\\', '/]'],
            'rect':             ['[', ']'],
        };

        const isBracketShape  = shapeType in bracketShapes;
        const targetBraces    = isBracketShape ? bracketShapes[shapeType] : bracketShapes['rect'];

        // 替換節點本體括號
        const nodeRegex = new RegExp(
            `(^|\\s)(${nodeId})\\s*(\\[\\[|\\[\\(|\\[\\/|\\[\\\\|\\(\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|>)(.*?)(?:\\]\\]|\\)\\]|\\/\\]|\\\\\\]|\\]\\)|\\)\\)|\\}\\}|\\]|\\)|\\})(\\s|$)`,
            'g'
        );
        for (let i = 0; i < lines.length; i++) {
            if (nodeRegex.test(lines[i])) {
                lines[i] = lines[i].replace(nodeRegex, (_m, prefix, id, _open, text, suffix) =>
                    `${prefix}${id}${targetBraces[0]}${text}${targetBraces[1]}${suffix}`
                );
            }
        }

        // 處理 @{ shape: xxx } 擴展樣式
        const shapeDefRegex = new RegExp(`^(\\s*)${nodeId}@\\{\\s*shape\\s*:\\s*[^\\}]+\\}\\s*$`);
        let foundShapeDef = false;
        const resultLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (shapeDefRegex.test(lines[i])) {
                if (isBracketShape) {
                    continue; // 切換回標準括號 → 刪除擴展宣告
                } else {
                    resultLines.push(lines[i].replace(shapeDefRegex, `$1${nodeId}@{ shape: ${shapeType} }`));
                    foundShapeDef = true;
                }
            } else {
                resultLines.push(lines[i]);
            }
        }

        // 如果是擴展形狀且尚未宣告，追加在末尾
        if (!isBracketShape && !foundShapeDef) {
            resultLines.push(`  ${nodeId}@{ shape: ${shapeType} }`);
        }

        return resultLines.join('\n');
    }

    /** 刪除節點（同時移除與該節點相關的邊） */
    static deleteNode(code: string, nodeId: string): string {
        const lines = code.split('\n');
        const edgeRegex = new RegExp(`(^|\\s)${nodeId}\\s*-+>|\\s*-+>\\s*${nodeId}(\\s|$)`);
        const declRegex = new RegExp(`(^|\\s)${nodeId}\\s*(\\[|\\(\\(|\\{|\\(|>\\]|\\b)`);
        return lines.filter(line => {
            const isEdge = edgeRegex.test(line);
            const isDecl = declRegex.test(line) && !line.includes('-->');
            return !isEdge && !isDecl;
        }).join('\n');
    }

    /** 套用 classDef 至節點（若已存在則替換） */
    static applyNodeClassDef(code: string, nodeId: string, className: string): string {
        const lines    = code.split('\n');
        const classDecl = `class ${nodeId} ${className}`;
        if (lines.some(l => l.trim().startsWith(`class ${nodeId} `))) {
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith(`class ${nodeId} `)) {
                    lines[i] = `  ${classDecl}`;
                    return lines.join('\n');
                }
            }
        } else {
            const lastContentIdx = lines.reduceRight(
                (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
                -1
            );
            const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
            lines.splice(insertAt, 0, `  ${classDecl}`);
        }
        return lines.join('\n');
    }

    /**
     * 設定節點 inline 樣式（style 宣告）
     * 若已存在 style 宣告則合併，並自動加上 !important 以覆蓋全域 CSS
     */
    static changeNodeStyle(code: string, nodeId: string, styleRecord: MermaidNodeStyle): string {
        const lines = code.split('\n');
        let existingStyleLineIdx = -1;
        let existingStyles: Record<string, string> = {};

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith(`style ${nodeId} `)) {
                existingStyleLineIdx = i;
                const styleStr = trimmed.substring(`style ${nodeId} `.length).trim();
                styleStr.split(',').forEach(pair => {
                    const [k, v] = pair.split(':');
                    if (k && v) existingStyles[k.trim()] = v.replace(/\s*!important/gi, '').trim();
                });
                break;
            }
        }

        const mergedStyles = { ...existingStyles, ...styleRecord };
        const newStyleStr  = Object.entries(mergedStyles)
            .filter(([_, v]) => !!v)
            .map(([k, v]) => `${k}:${v}`)
            .join(',');
        const styleDecl = `style ${nodeId} ${newStyleStr}`;

        if (existingStyleLineIdx !== -1) {
            lines[existingStyleLineIdx] = `  ${styleDecl}`;
        } else {
            const lastContentIdx = lines.reduceRight(
                (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
                -1
            );
            const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
            lines.splice(insertAt, 0, `  ${styleDecl}`);
        }
        return lines.join('\n');
    }

    /** 讀取目前流程圖指定節點的 inline 樣式 */
    static getNodeStyle(code: string, nodeId: string): MermaidNodeStyle {
        if (!code) return {};
        const lines = code.split('\n');
        const styles: MermaidNodeStyle = {};
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith(`style ${nodeId} `)) {
                const styleStr = trimmed.substring(`style ${nodeId} `.length).trim();
                styleStr.split(',').forEach(pair => {
                    const [k, v] = pair.split(':');
                    if (k && v) {
                        const key = k.trim();
                        const val = v.replace(/\s*!important/gi, '').trim();
                        if (key === 'fill') styles.fill = val;
                        if (key === 'stroke') styles.stroke = val;
                        if (key === 'color') styles.color = val;
                    }
                });
                break;
            }
        }
        return styles;
    }
}
