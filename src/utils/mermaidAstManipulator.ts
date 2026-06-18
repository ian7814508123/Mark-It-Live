export interface MermaidNodeStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    color?: string;
}

export class MermaidAstManipulator {
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
        return code; // Fallback if no direction found
    }

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

    static addIsolatedNode(code: string): string {
        const lines = code.split('\n');
        const newId = `node_${Date.now().toString().slice(-4)}`;
        const newNode = `  ${newId}[新節點]`;
        
        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, newNode);
        return lines.join('\n');
    }

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

    // 將現有的 addNode (包含預設連接) 重構
    static addBranch(code: string, sourceId: string): string {
        const lines = code.split('\n');
        const newId = `node_${Date.now().toString().slice(-4)}`;
        const newNode = `  ${sourceId} --> ${newId}[新分支]`;
        
        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, newNode);
        return lines.join('\n');
    }

    static changeNodeShape(code: string, nodeId: string, shapeType: string): string {
        const lines = code.split('\n');
        
        // 1. 定義標準括號語法圖形
        const bracketShapes: Record<string, [string, string]> = {
            'round': ['(', ')'],
            'stadium': ['([', '])'],
            'subroutine': ['[[', ']]'],
            'cylinder': ['[(', ')]'],
            'circle': ['((', '))'],
            'asymmetric': ['>', ']'],
            'diamond': ['{', '}'],
            'hexagon': ['{{', '}}'],
            'parallelogram': ['[/', '/]'],
            'parallelogram_alt': ['[\\', '\\]'],
            'trapezoid': ['[/', '\\]'],
            'trapezoid_alt': ['[\\', '/]'],
            'rect': ['[', ']']
        };

        const isBracketShape = shapeType in bracketShapes;
        // 如果是擴展形狀，則將本體還原為方形 [ ] 作為基礎
        const targetBraces = isBracketShape ? bracketShapes[shapeType] : bracketShapes['rect'];

        // 2. 替換本體節點的括號
        // 正規表達式尋找：起頭 -> nodeId -> 任意括號 -> 內容 -> 結尾括號
        const nodeRegex = new RegExp(`(^|\\s)(${nodeId})\\s*(\\[\\[|\\[\\(|\\[\\/|\\[\\\\|\\(\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|\\>)(.*?)(?:\\]\\]|\\)\\]|\\/\\]|\\\\\\]|\\]\\)|\\)\\)|\\}\\}|\\]|\\)|\\})(\\s|$)`, 'g');
        
        for (let i = 0; i < lines.length; i++) {
            if (nodeRegex.test(lines[i])) {
                lines[i] = lines[i].replace(nodeRegex, (match, prefix, id, openBrace, text, suffix) => {
                    return `${prefix}${id}${targetBraces[0]}${text}${targetBraces[1]}${suffix}`;
                });
            }
        }

        // 3. 處理 @{ shape: xxx } 擴展樣式
        // 尋找是否已經存在該節點的 @{ shape: ... } 宣告
        const shapeDefRegex = new RegExp(`^(\\s*)${nodeId}@\\{\\s*shape\\s*:\\s*[^\\}]+\\}\\s*$`);
        let foundShapeDef = false;
        let resultLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            if (shapeDefRegex.test(lines[i])) {
                if (isBracketShape) {
                    // 如果切換回標準括號圖形，則刪除這行
                    continue; 
                } else {
                    // 替換為新的形狀
                    resultLines.push(lines[i].replace(shapeDefRegex, `$1${nodeId}@{ shape: ${shapeType} }`));
                    foundShapeDef = true;
                }
            } else {
                resultLines.push(lines[i]);
            }
        }

        // 4. 如果是擴展形狀且尚未宣告過，則在最尾端（或適當位置）加上去
        if (!isBracketShape && !foundShapeDef) {
            // 嘗試找到合適的縮排，通常可以取最後一行的縮排或預設兩格空白
            resultLines.push(`  ${nodeId}@{ shape: ${shapeType} }`);
        }

        return resultLines.join('\n');
    }

    static deleteNode(code: string, nodeId: string): string {
        const lines = code.split('\n');
        // Delete lines that contain the node as a source or target in an edge
        // Note: this is a basic implementation. For complex graphs, a full parser is needed.
        const edgeRegex = new RegExp(`(^|\\s)${nodeId}\\s*-+\\>|\\s*-+\\>\\s*${nodeId}(\\s|$)`);
        const declRegex = new RegExp(`(^|\\s)${nodeId}\\s*(\\[|\\(\\(|\\{|\\(|\\>\\]|\\b)`);

        return lines.filter(line => {
            const isEdgeWithNode = edgeRegex.test(line);
            const isDeclOnly = declRegex.test(line) && !line.includes('-->'); // very rough
            return !isEdgeWithNode && !isDeclOnly;
        }).join('\n');
    }

    static applyNodeClassDef(code: string, nodeId: string, className: string): string {
        const lines = code.split('\n');
        // Check if `class nodeId className;` exists
        const classDecl = `class ${nodeId} ${className}`;
        if (lines.some(line => line.trim().startsWith(`class ${nodeId} `))) {
            // Replace existing class
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith(`class ${nodeId} `)) {
                    lines[i] = `  ${classDecl}`;
                    return lines.join('\n');
                }
            }
        } else {
            // Append
            const lastContentIdx = lines.reduceRight(
                (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
                -1
            );
            const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
            lines.splice(insertAt, 0, `  ${classDecl}`);
        }
        return lines.join('\n');
    }

    static changeNodeStyle(code: string, nodeId: string, styleRecord: Record<string, string>): string {
        const lines = code.split('\n');
        let existingStyleLineIdx = -1;
        let existingStyles: Record<string, string> = {};

        // 尋找現有的 style 定義
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith(`style ${nodeId} `)) {
                existingStyleLineIdx = i;
                const styleStr = trimmed.substring(`style ${nodeId} `.length).trim();
                const pairs = styleStr.split(',');
                pairs.forEach(pair => {
                    const [k, v] = pair.split(':');
                    if (k && v) existingStyles[k.trim()] = v.trim();
                });
                break;
            }
        }

        // 合併樣式並確保帶有 !important 以覆蓋全域 CSS
        const mergedStyles = { ...existingStyles, ...styleRecord };
        const newStyleStr = Object.entries(mergedStyles).map(([k, v]) => {
            const val = v.includes('!important') ? v : `${v} !important`;
            return `${k}:${val}`;
        }).join(',');
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
}
