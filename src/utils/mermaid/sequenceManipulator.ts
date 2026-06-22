/**
 * Sequence Diagram 操作工具
 * 包含參與者管理、訊息操作、autonumber 切換等功能
 */
export class SequenceManipulator {

    /**
     * 新增一個參與者（participant）到 Sequence Diagram
     * 插入位置：最後一行有效內容之後
     */
    static addParticipant(code: string): string {
        const lines   = code.split('\n');
        const newName = `Actor${Date.now().toString().slice(-3)}`;
        const newLine = `    participant ${newName}`;
        const lastContentIdx = lines.reduceRight(
            (found, line, idx) => found === -1 && line.trim() !== '' ? idx : found,
            -1
        );
        const insertAt = lastContentIdx === -1 ? lines.length : lastContentIdx + 1;
        lines.splice(insertAt, 0, newLine);
        return lines.join('\n');
    }

    /**
     * 切換 Sequence Diagram 的自動編號（autonumber）
     * 若已存在則刪除，否則在 sequenceDiagram 宣告行後插入
     */
    static toggleAutonumber(code: string): string {
        const lines    = code.split('\n');
        const autoIdx  = lines.findIndex(l => l.trim() === 'autonumber');
        if (autoIdx !== -1) {
            lines.splice(autoIdx, 1);
            return lines.join('\n');
        }
        const declIdx  = lines.findIndex(l => /^sequenceDiagram/i.test(l.trim()));
        const insertAt = declIdx !== -1 ? declIdx + 1 : 1;
        lines.splice(insertAt, 0, 'autonumber');
        return lines.join('\n');
    }

    /**
     * 取得某訊息的箭頭類型（透過標籤文字比對）
     * 回傳如 '->>' / '-->' 等；找不到則回傳 null
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
     * 尋找 actor/participant 的宣告行號（1-indexed）
     * 支援直接名稱與 alias（participant X as Name）
     */
    static findActorLine(code: string, name: string): number | null {
        const lines   = code.split('\n');
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
     * 尋找訊息的行號（透過標籤文字比對，1-indexed）
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
     * 切換參與者類型：participant ↔ actor（方塊 vs 人形）
     * 支援 alias 比對（participant X as Name → alias Name）
     */
    static toggleParticipantType(code: string, name: string): string {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!/^(participant|actor)\s+/.test(trimmed)) continue;
            const rest  = trimmed.replace(/^(participant|actor)\s+/, '');
            const parts = rest.split(/\s+as\s+/);
            const id    = parts[0].trim();
            const alias = parts[1]?.trim();
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
     * 刪除參與者及其所有相關訊息行
     * NOTE: Phase 1 僅支援無空格的簡單 ID
     */
    static deleteParticipantAndMessages(code: string, name: string): string {
        const lines = code.split('\n');
        // 如果有 alias，先找出實際 ID
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
     * 修改訊息的箭頭類型（透過標籤文字比對）
     * 例如將 '->>` 改為 '-->'
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
     * 刪除訊息行（透過標籤文字比對）
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
}
