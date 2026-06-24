// Mermaid 圖表類型的枚舉，用於驅動對應的工具列內容
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

    /**
     * 偵測 Mermaid 程式碼的圖表類型
     * 透過解析第一行有效宣告（略過 YAML frontmatter 與注解）來判斷
     */
    static detectDiagramType(code: string): MermaidDiagramType {
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

    /**
     * 新增 Sequence Diagram 參與者
     * 在最後一行有效內容後插入 `participant 新角色`
     */
    static addParticipant(code: string): string {
        const lines = code.split('\n');
        const newName = `Actor${Date.now().toString().slice(-3)}`;
        const newLine = `    participant ${newName}`;

        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        // 找到 sequenceDiagram 宣告行之後插入，但優先放在最後一行有效內容後
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, newLine);
        return lines.join('\n');
    }

    /**
     * 切換 Sequence Diagram 的自動編號（autonumber）
     * 若已存在則刪除，否則在 sequenceDiagram 宣告行後插入
     */
    static toggleAutonumber(code: string): string {
        const lines = code.split('\n');

        // 已有 autonumber → 移除
        const autoIdx = lines.findIndex(l => l.trim() === 'autonumber');
        if (autoIdx !== -1) {
            lines.splice(autoIdx, 1);
            return lines.join('\n');
        }

        // 尋找 sequenceDiagram 宣告行，在其後插入
        const declIdx = lines.findIndex(l => /^sequenceDiagram/i.test(l.trim()));
        const insertAt = declIdx !== -1 ? declIdx + 1 : 1;
        lines.splice(insertAt, 0, 'autonumber');
        return lines.join('\n');
    }

    /**
     * 取得 Sequence Diagram 某訊息的箭頭類型（透過標籤文字比對）
     * 回傳如 '->>' / '-->' 等，找不到则回傳 null
     */
    static findMessageArrow(code: string, label: string): string | null {
        const lines = code.split('\n');
        for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1 && line.substring(colonIdx + 1).trim() === label) {
                const match = line.substring(0, colonIdx).match(/(-[-]*[>x)]+)/);
                return match ? match[0] : null;
            }
        }
        return null;
    }

    /**
     * 尋找 Sequence Diagram actor/participant 的宣告行號（1-indexed）
     * 支援直接名稱與 alias（participant X as Name）
     */
    static findActorLine(code: string, name: string): number | null {
        const lines = code.split('\n');
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed === `participant ${name}` || trimmed === `actor ${name}` ||
                new RegExp(`^(participant|actor)\\s+\\S+\\s+as\\s+${escaped}\\s*$`, 'i').test(trimmed)) {
                return i + 1;
            }
        }
        return null;
    }

    /**
     * 尋找 Sequence Diagram 訊息的行號（透過標籤文字比對，1-indexed）
     */
    static findMessageLine(code: string, label: string): number | null {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const colonIdx = lines[i].indexOf(':');
            if (colonIdx !== -1 && lines[i].substring(colonIdx + 1).trim() === label) {
                return i + 1;
            }
        }
        return null;
    }

    /**
     * 切換 Sequence Diagram 參與者類型：participant ↔ actor
     */
    static toggleParticipantType(code: string, name: string): string {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!/^(participant|actor)\s+/.test(trimmed)) continue;
            // 取出 ID 與 alias
            const rest = trimmed.replace(/^(participant|actor)\s+/, '');
            const parts = rest.split(/\s+as\s+/);
            const id = parts[0].trim();
            const alias = parts[1]?.trim();
            // 匹配 display name（alias 或 id）
            if (alias === name || id === name) {
                if (/^participant\s+/.test(trimmed)) {
                    lines[i] = lines[i].replace(/\bparticipant\b/, 'actor');
                } else {
                    lines[i] = lines[i].replace(/\bactor\b/, 'participant');
                }
                return lines.join('\n');
            }
        }
        return code;
    }

    /**
     * 刪除 Sequence Diagram 的參與者及其所有相關訊息行
     * NOTE: Phase 1 僅支援簡單名稱（無空格的 ID）
     */
    static deleteParticipantAndMessages(code: string, name: string): string {
        const lines = code.split('\n');
        // 如果有 alias，找出實際 ID
        let actorId = name;
        for (const line of lines) {
            const aliasMatch = line.trim().match(/^(participant|actor)\s+(\S+)\s+as\s+(.+)$/i);
            if (aliasMatch && aliasMatch[3].trim() === name) {
                actorId = aliasMatch[2];
                break;
            }
        }
        return lines.filter(line => {
            const trimmed = line.trim();
            // 移除宣告行
            if (/^(participant|actor)\s+/.test(trimmed)) {
                const id = trimmed.replace(/^(participant|actor)\s+/, '').split(/\s+/)[0];
                if (id === actorId || id === name) return false;
            }
            // 移除包含此參與者的訊息行（From 或 To）
            const msgMatch = trimmed.match(/^([^\s-]+)\s*-[-]*[>x)]+\s*([^:\s]+)/);
            if (msgMatch) {
                const from = msgMatch[1].trim();
                const to   = msgMatch[2].trim();
                if (from === actorId || to === actorId || from === name || to === name) return false;
            }
            return true;
        }).join('\n');
    }

    /**
     * 修改 Sequence Diagram 訊息的箭頭類型（透過標籤文字比對）
     */
    static changeMessageArrow(code: string, label: string, newArrow: string): string {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const colonIdx = lines[i].indexOf(':');
            if (colonIdx !== -1 && lines[i].substring(colonIdx + 1).trim() === label) {
                const before  = lines[i].substring(0, colonIdx);
                const updated = before.replace(/(-[-]*[>x)]+)/, newArrow);
                lines[i] = `${updated}: ${label}`;
                return lines.join('\n');
            }
        }
        return code;
    }

    /**
     * 刪除 Sequence Diagram 訊息行（透過標籤文字比對）
     */
    static deleteMessage(code: string, label: string): string {
        return code.split('\n')
            .filter(line => {
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) return line.substring(colonIdx + 1).trim() !== label;
                return true;
            })
            .join('\n');
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
