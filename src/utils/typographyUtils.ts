import React from 'react';

export interface TypographyAttrs {
    family?: string;
    size?: string;
    weight?: string;
    ls?: string; // letter-spacing
    lh?: string; // line-height
    color?: string;
    align?: 'left' | 'center' | 'right' | 'justify';
    bg?: string;
}

export const FONT_FAMILY_PRESETS: { label: string; value: string; css: string }[] = [
    { label: '預設', value: '', css: '' },
    { label: '襯線體 (Noto Serif / 宋體)', value: 'serif', css: "'Noto Serif TC', 'Songti TC', 'Source Han Serif TC', Georgia, serif" },
    { label: '無襯線體 (黑體 / 現代)', value: 'sans', css: "'Inter', 'PingFang TC', 'Microsoft JhengHei', 'Heiti TC', sans-serif" },
    { label: '現代英數 (Outfit / Roboto)', value: 'outfit', css: "'Outfit', 'Roboto', 'Segoe UI', sans-serif" },
    { label: '工程等寬 (JetBrains / Fira)', value: 'mono', css: "'JetBrains Mono', 'Fira Code', Consolas, monospace" },
    { label: '文藝楷書 (Kaiti / 標楷體)', value: 'kaiti', css: "'Kaiti', 'STKaiti', 'DFKai-SB', 'BiauKai', serif" },
    { label: '手寫風格 (Caveat / 隨興)', value: 'cursive', css: "'Caveat', 'Comic Sans MS', cursive" },
];

export const PRESET_COLORS = [
    { label: '預設', value: '' },
    { label: '石墨黑', value: '#0f172a' },
    { label: '冰晶白', value: '#f8fafc' },
    { label: '天湛藍', value: '#0284c7' },
    { label: '極光青', value: '#0891b2' },
    { label: '翡翠綠', value: '#059669' },
    { label: '琥珀金', value: '#d97706' },
    { label: '玫瑰紅', value: '#e11d48' },
    { label: '紫羅蘭', value: '#7c3aed' },
];

export const HIGHLIGHT_COLORS = [
    { label: '無螢光', value: 'transparent', colorClass: 'border border-dashed border-slate-300 dark:border-slate-600' },
    { label: '柔黃', value: '#fef08a', colorClass: 'bg-yellow-200' },
    { label: '清新綠', value: '#bbf7d0', colorClass: 'bg-emerald-200' },
    { label: '晴空藍', value: '#bae6fd', colorClass: 'bg-sky-200' },
    { label: '櫻花粉', value: '#fbcfe8', colorClass: 'bg-pink-200' },
    { label: '溫暖橘', value: '#fed7aa', colorClass: 'bg-orange-200' },
    { label: '薰衣紫', value: '#e9d5ff', colorClass: 'bg-purple-200' },
];

/**
 * 將 rgb(r, g, b) 或 rgba(r, g, b, a) 轉換為十六進位 #rrggbb
 */
export function rgbToHex(rgb: string): string {
    if (!rgb) return '';
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return rgb;
    const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * 從渲染後的 DOM 元素中即時讀取 Computed Style，
 * 避免排版面板打開時出現與主題樣式斷鍵的落差（例如主題中 h1 為 2.4rem 卻顯示預設 16px）。
 */
export function getElementComputedTypography(el: HTMLElement | null): TypographyAttrs {
    if (!el || typeof window === 'undefined') return {};
    try {
        const cs = window.getComputedStyle(el);
        const result: TypographyAttrs = {};

        // 1. 字級大小 (Font Size)
        const rawSize = parseFloat(cs.fontSize);
        if (!isNaN(rawSize) && rawSize > 0) {
            result.size = `${Math.round(rawSize)}px`;
        }

        // 2. 行高 (Line Height)
        const rawLh = parseFloat(cs.lineHeight);
        if (!isNaN(rawLh) && rawSize > 0 && !isNaN(rawSize)) {
            const ratio = rawLh / rawSize;
            result.lh = String(Math.round(ratio * 10) / 10);
        } else {
            result.lh = '1.6';
        }

        // 3. 字距 (Letter Spacing)
        if (cs.letterSpacing && cs.letterSpacing !== 'normal') {
            const rawLs = parseFloat(cs.letterSpacing);
            if (!isNaN(rawLs)) {
                result.ls = `${Math.round(rawLs * 10) / 10}px`;
            }
        } else {
            result.ls = '0px';
        }

        // 4. 字重 (Font Weight)
        if (cs.fontWeight) {
            const fw = parseInt(cs.fontWeight, 10);
            if (!isNaN(fw)) {
                result.weight = fw >= 700 ? 'bold' : (fw >= 600 ? '600' : 'normal');
            } else {
                result.weight = cs.fontWeight;
            }
        }

        // 5. 文字對齊 (Text Align)
        if (cs.textAlign && ['left', 'center', 'right', 'justify'].includes(cs.textAlign)) {
            result.align = cs.textAlign as any;
        }

        // 6. 文字色彩 (Color)
        if (cs.color) {
            result.color = rgbToHex(cs.color);
        }

        // 7. 螢光背景色 (Background Color / Highlight)
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
            result.bg = rgbToHex(cs.backgroundColor);
        }

        return result;
    } catch {
        return {};
    }
}

/**
 * 將數值字串標準化為 CSS 尺寸（如 24 -> 24px）
 */
export function normalizeUnit(val: string | number | undefined, defaultUnit = 'px'): string | undefined {
    if (val === undefined || val === null || val === '') return undefined;
    const s = String(val).trim();
    if (!s) return undefined;
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        return `${s}${defaultUnit}`;
    }
    return s;
}

/**
 * 解析任意 CSS style 字串為 React.CSSProperties 物件，防止 React 報錯
 */
export function parseStyleString(style: string | React.CSSProperties | undefined): React.CSSProperties | undefined {
    if (!style) return undefined;
    if (typeof style === 'object') return style;
    const result: Record<string, string> = {};
    style.split(';').forEach(rule => {
        const idx = rule.indexOf(':');
        if (idx > -1) {
            const prop = rule.slice(0, idx).trim();
            const val = rule.slice(idx + 1).trim();
            if (prop && val) {
                const camelProp = prop.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
                result[camelProp] = val;
            }
        }
    });
    return result as React.CSSProperties;
}

/**
 * 將 TypographyAttrs 轉換為標準 CSSProperties 物件
 */
export function typographyAttrsToStyle(attrs: TypographyAttrs): React.CSSProperties {
    const style: React.CSSProperties = {};

    if (attrs.family) {
        const found = FONT_FAMILY_PRESETS.find(p => p.value === attrs.family);
        style.fontFamily = found?.css || attrs.family;
    }
    if (attrs.size) {
        style.fontSize = normalizeUnit(attrs.size);
    }
    if (attrs.weight) {
        style.fontWeight = attrs.weight;
    }
    if (attrs.ls) {
        style.letterSpacing = normalizeUnit(attrs.ls);
    }
    if (attrs.lh) {
        style.lineHeight = attrs.lh;
    }
    if (attrs.color) {
        style.color = attrs.color;
    }
    if (attrs.align) {
        style.textAlign = attrs.align;
    }
    if (attrs.bg) {
        style.backgroundColor = attrs.bg;
    }

    return style;
}

/**
 * 將 TypographyAttrs 轉換為標準 CSS 字串，供 HAST / Rehype 節點使用
 */
export function typographyAttrsToCssString(attrs: TypographyAttrs): string {
    const styleObj = typographyAttrsToStyle(attrs);
    return Object.entries(styleObj)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${String(v).replace(/"/g, "'")};`)
        .join(' ');
}

/**
 * 解析單行 Markdown 原始碼中的排版設定 (:font{...} 或 HTML style)
 */
export function parseLineTypography(lineContent: string): TypographyAttrs {
    if (!lineContent) return {};

    // 1. 匹配 :font{...}、:style{...} 或 :typography{...}
    const directiveMatch = /:(?:font|style|typography)\{([^}]+)\}/.exec(lineContent);
    if (directiveMatch) {
        const rawAttrs = directiveMatch[1];
        const attrs: TypographyAttrs = {};
        // 匹配 key=value 或 key="value"
        const regex = /([a-zA-Z_-]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
        let match;
        while ((match = regex.exec(rawAttrs)) !== null) {
            const key = match[1].toLowerCase();
            const val = match[2] ?? match[3] ?? match[4];
            if (key === 'size' || key === 'fontsize' || key === 'font-size') attrs.size = val;
            else if (key === 'color') attrs.color = val;
            else if (key === 'family' || key === 'font' || key === 'fontfamily' || key === 'font-family') attrs.family = val;
            else if (key === 'weight' || key === 'fontweight' || key === 'font-weight') attrs.weight = val;
            else if (key === 'ls' || key === 'letterspacing' || key === 'letter-spacing') attrs.ls = val;
            else if (key === 'lh' || key === 'lineheight' || key === 'line-height') attrs.lh = val;
            else if (key === 'align' || key === 'textalign' || key === 'text-align') attrs.align = val as any;
            else if (key === 'bg' || key === 'background') attrs.bg = val;
        }
        return attrs;
    }

    // 2. 匹配 HTML 標籤 style="..." (如 <h1 style="...">系統</h1>)
    const styleAttrMatch = /<[a-zA-Z0-9]+\s+[^>]*style=["']([^"']+)["'][^>]*>/i.exec(lineContent);
    if (styleAttrMatch) {
        const styleObj = parseStyleString(styleAttrMatch[1]) as Record<string, string>;
        const attrs: TypographyAttrs = {};
        if (styleObj.fontSize) attrs.size = styleObj.fontSize;
        if (styleObj.color) attrs.color = styleObj.color;
        if (styleObj.fontFamily) attrs.family = styleObj.fontFamily;
        if (styleObj.fontWeight) attrs.weight = styleObj.fontWeight;
        if (styleObj.letterSpacing) attrs.ls = styleObj.letterSpacing;
        if (styleObj.lineHeight) attrs.lh = styleObj.lineHeight;
        if (styleObj.textAlign) attrs.align = styleObj.textAlign as any;
        if (styleObj.backgroundColor) attrs.bg = styleObj.backgroundColor;
        return attrs;
    }

    return {};
}

/**
 * 將 TypographyAttrs 格式化為 Markdown Directive 字串
 * 例如: :font{size="28px" color="#3b82f6"}
 */
export function formatDirective(attrs: TypographyAttrs): string {
    const parts: string[] = [];
    if (attrs.size) parts.push(`size="${attrs.size}"`);
    if (attrs.family) parts.push(`family="${attrs.family}"`);
    if (attrs.weight && attrs.weight !== 'normal') parts.push(`weight="${attrs.weight}"`);
    if (attrs.ls) parts.push(`ls="${attrs.ls}"`);
    if (attrs.lh) parts.push(`lh="${attrs.lh}"`);
    if (attrs.color) parts.push(`color="${attrs.color}"`);
    if (attrs.align && attrs.align !== 'left') parts.push(`align="${attrs.align}"`);
    if (attrs.bg) parts.push(`bg="${attrs.bg}"`);

    if (parts.length === 0) return '';
    return `:font{${parts.join(' ')}}`;
}

/**
 * 將新的排版屬性即時寫回 Markdown 文件中的特定行
 * 支援:
 * 1. 更新既有 :font{...}
 * 2. 更新既有 HTML style="..."
 * 3. 為一般 Markdown 標題 / 段落追加 :font{...}
 * 4. 若屬性皆為空，則乾淨清除排版標記
 */
export function updateLineTypography(
    markdownContent: string,
    targetLine: number,
    attrs: TypographyAttrs,
    targetFormat: 'directive' | 'html' = 'directive'
): string {
    const lines = markdownContent.split('\n');
    const lineIndex = targetLine - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) return markdownContent;

    const originalLine = lines[lineIndex];
    const newDirective = formatDirective(attrs);
    const hasAttrs = Object.keys(attrs).some(k => attrs[k as keyof TypographyAttrs]);

    const styleProps = typographyAttrsToStyle(attrs);
    const styleCss = Object.entries(styleProps)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${String(v).replace(/"/g, "'")};`)
        .join(' ');

    const directiveRegex = /\s*:(?:font|style|typography)\{[^}]*\}\s*$/;
    const htmlTagMatch = /^(<([a-zA-Z0-9]+)\b)([^>]*)(>)(.*?)(<\/\2>)$/i.exec(originalLine.trim());

    // ─── 模式 0: Blockquote / Alert 引用行保護 (保留 `>` 語法，防止 Alert 破圖) ──────
    const bqMatch = /^(\s*>+\s*)/.exec(originalLine);
    if (bqMatch) {
        const prefix = bqMatch[1]; // 如 "> "
        const innerLine = originalLine.slice(prefix.length);

        // 情況 A：Alert 宣告標題行 (例如 `> [!NOTE](自訂標題)` 或 `> [!NOTE]`)
        const alertMatch = /^(\[!([a-zA-Z0-9_-]+)\])(?:\((.*?)\))?/i.exec(innerLine.trim());
        if (alertMatch) {
            const fullTypeTag = alertMatch[1]; // [!NOTE]
            const alertType = alertMatch[2];
            const rawTitle = alertMatch[3] ?? '';

            // 清洗既有 span 或 directive
            const cleanTitle = rawTitle
                .replace(/^<span\b[^>]*style=["'][^"']*["'][^>]*>(.*?)<\/span>$/i, '$1')
                .replace(directiveRegex, '')
                .trim();

            if (!hasAttrs) {
                lines[lineIndex] = cleanTitle ? `${prefix}${fullTypeTag}(${cleanTitle})` : `${prefix}${fullTypeTag}`;
            } else {
                const titleText = cleanTitle || alertType;
                lines[lineIndex] = `${prefix}${fullTypeTag}(${titleText}) ${newDirective}`;
            }
            return lines.join('\n');
        }

        // 情況 B：Blockquote / Alert 內文行
        const cleanContent = innerLine
            .replace(/^<span\b[^>]*style=["'][^"']*["'][^>]*>(.*?)<\/span>$/i, '$1')
            .replace(directiveRegex, '')
            .trim();

        if (!hasAttrs) {
            lines[lineIndex] = `${prefix}${cleanContent}`;
        } else {
            lines[lineIndex] = `${prefix}<span style="${styleCss}">${cleanContent}</span>`;
        }
        return lines.join('\n');
    }

    // ─── 模式 0.5: List Item 清單項目保護 (保留 `* `, `- `, `+ `, `1. ` 等前綴) ────
    const listMatch = /^(\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?)/.exec(originalLine);
    if (listMatch) {
        const prefix = listMatch[1]; // 例如 "* ", "1. ", "- [ ] "
        const innerContent = originalLine.slice(prefix.length);

        // 清除既有 span 或 directive
        const cleanContent = innerContent
            .replace(/^<span\b[^>]*style=["'][^"']*["'][^>]*>(.*?)<\/span>$/i, '$1')
            .replace(directiveRegex, '')
            .trim();

        if (!hasAttrs) {
            lines[lineIndex] = `${prefix}${cleanContent}`;
        } else {
            lines[lineIndex] = `${prefix}<span style="${styleCss}">${cleanContent}</span>`;
        }
        return lines.join('\n');
    }

    // ─── 模式 1: 原生 HTML 模式 (<h1 style="...">標題</h1>) ─────────────────
    if (targetFormat === 'html') {
        if (!hasAttrs) {
            // 清除樣式：還原為標準 Markdown
            if (htmlTagMatch) {
                const [, , tagName, , , innerContent] = htmlTagMatch;
                if (/^h[1-6]$/i.test(tagName)) {
                    const level = parseInt(tagName[1], 10);
                    lines[lineIndex] = `${'#'.repeat(level)} ${innerContent.trim()}`;
                } else if (tagName.toLowerCase() === 'p') {
                    lines[lineIndex] = innerContent.trim();
                } else {
                    lines[lineIndex] = originalLine.replace(/\s*style=["'][^"']*["']/i, '');
                }
            } else {
                lines[lineIndex] = originalLine.replace(directiveRegex, '');
            }
            return lines.join('\n');
        }

        // 若本來就是 HTML 標籤，更新 style
        if (htmlTagMatch) {
            const [, , tagName, attrString, , innerContent, tagClose] = htmlTagMatch;
            const cleanAttrs = attrString.replace(/\s*style=["'][^"']*["']/i, '');
            lines[lineIndex] = `<${tagName} style="${styleCss}"${cleanAttrs}>${innerContent}${tagClose}`;
            return lines.join('\n');
        }

        // 若原本是 Markdown 標題 (如 `# 標題` 或 `# 標題 :font{...}`)
        const headingMatch = /^(#{1,6})\s+(.*)$/.exec(originalLine.trim());
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2].replace(directiveRegex, '').trim();
            lines[lineIndex] = `<h${level} style="${styleCss}">${text}</h${level}>`;
            return lines.join('\n');
        }

        // 若原本為一般段落文字
        const cleanParagraph = originalLine.replace(directiveRegex, '').trim();
        lines[lineIndex] = `<p style="${styleCss}">${cleanParagraph}</p>`;
        return lines.join('\n');
    }

    // ─── 模式 2: Markdown Directive 模式 (# 標題 :font{...}) ─────────────────
    if (htmlTagMatch) {
        const [, , tagName, , , innerContent] = htmlTagMatch;
        const cleanText = innerContent.trim();
        if (!hasAttrs) {
            if (/^h[1-6]$/i.test(tagName)) {
                const level = parseInt(tagName[1], 10);
                lines[lineIndex] = `${'#'.repeat(level)} ${cleanText}`;
            } else {
                lines[lineIndex] = cleanText;
            }
            return lines.join('\n');
        }
        if (/^h[1-6]$/i.test(tagName)) {
            const level = parseInt(tagName[1], 10);
            lines[lineIndex] = `${'#'.repeat(level)} ${cleanText} ${newDirective}`;
        } else {
            lines[lineIndex] = `${cleanText} ${newDirective}`;
        }
        return lines.join('\n');
    }

    if (directiveRegex.test(originalLine)) {
        if (!newDirective) {
            lines[lineIndex] = originalLine.replace(directiveRegex, '');
        } else {
            lines[lineIndex] = originalLine.replace(directiveRegex, ` ${newDirective}`);
        }
        return lines.join('\n');
    }

    if (!newDirective) {
        return markdownContent;
    }

    lines[lineIndex] = `${originalLine.trimEnd()} ${newDirective}`;
    return lines.join('\n');
}

/**
 * 輔助函數：跳脫正則表達式特殊字元
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 輔助函數：解析 CSS style 字串為物件
 */
export function parseCssStyleString(styleStr: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!styleStr) return result;
    const rules = styleStr.split(';');
    for (const rule of rules) {
        const colonIdx = rule.indexOf(':');
        if (colonIdx !== -1) {
            const key = rule.slice(0, colonIdx).trim().toLowerCase();
            const value = rule.slice(colonIdx + 1).trim();
            if (key && value) {
                result[key] = value;
            }
        }
    }
    return result;
}

/**
 * 輔助函數：將 CSS 物件格式化為 style 字串
 */
export function formatCssStyleObject(styleObj: Record<string, string>): string {
    return Object.entries(styleObj)
        .map(([k, v]) => `${k}: ${v};`)
        .join(' ');
}

export interface ApplyInlineTypographyOptions {
    markdownContent: string;
    targetLine: number; // 1-indexed
    selectedText: string;
    attrs?: TypographyAttrs;
    action?: 'apply' | 'clear';
    occurrenceIndex?: number; // 0-indexed: 此行第幾次出現該選取文字
}

/**
 * 精確對個別選取的行內文字套用或清除樣式（Word 級選取排版）
 * 1. 透過 targetLine 鎖定單行，防止全域文字錯位
 * 2. 透過 occurrenceIndex 消除同一行多個相同單字的歧義
 * 3. 智慧檢測既有 <span style="...">，進行屬性合併而非無限巢狀
 * 4. 支援清除樣式，乾淨還原純文字
 */
export function applyInlineTypographyToMarkdown(options: ApplyInlineTypographyOptions): string {
    const {
        markdownContent,
        targetLine,
        selectedText,
        attrs = {},
        action = 'apply',
        occurrenceIndex = 0
    } = options;

    const trimmedSelection = selectedText.trim();
    if (!trimmedSelection) return markdownContent;

    const lines = markdownContent.split('\n');
    const lineIndex = targetLine - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) return markdownContent;

    let line = lines[lineIndex];

    // 1. 建立新的 CSS 樣式清單
    const newCssMap: Record<string, string> = {};
    if (attrs.family) {
        const preset = FONT_FAMILY_PRESETS.find(p => p.value === attrs.family);
        if (preset?.css) newCssMap['font-family'] = preset.css;
    }
    if (attrs.size) newCssMap['font-size'] = attrs.size;
    if (attrs.weight) newCssMap['font-weight'] = attrs.weight;
    if (attrs.color) newCssMap['color'] = attrs.color;
    if (attrs.bg) {
        newCssMap['background-color'] = attrs.bg;
        if (attrs.bg !== 'transparent') {
            newCssMap['padding'] = '0.1em 0.3em';
            newCssMap['border-radius'] = '0.25em';
        }
    }
    if (attrs.ls) newCssMap['letter-spacing'] = attrs.ls;
    if (attrs.lh) newCssMap['line-height'] = attrs.lh;

    // 2. 檢測行中是否有「專屬包裹該選取文字」的既有 <span style="...">...</span>
    // 關鍵：使用精確比對避免匹配到外層更大的容器 span（如清單項目或整行樣式）
    const escapedText = escapeRegExp(trimmedSelection);
    const exactSpanRegex = new RegExp(`<span\\b([^>]*)>(\\s*${escapedText}\\s*)<\\/span>`, 'gi');

    // 尋找目標 occurrence 的專屬 span
    let match: RegExpExecArray | null;
    let spanMatchIndex = 0;
    let targetSpanMatch: { full: string; attrs: string; inner: string; start: number; end: number } | null = null;

    while ((match = exactSpanRegex.exec(line)) !== null) {
        if (spanMatchIndex === occurrenceIndex) {
            targetSpanMatch = {
                full: match[0],
                attrs: match[1],
                inner: match[2],
                start: match.index,
                end: match.index + match[0].length
            };
            break;
        }
        spanMatchIndex++;
    }

    if (action === 'clear') {
        if (targetSpanMatch) {
            // 清除現有的專屬 span 包裹，還原為內部純文字（外層容器樣式得以保留）
            line = line.slice(0, targetSpanMatch.start) + targetSpanMatch.inner + line.slice(targetSpanMatch.end);
        }
        lines[lineIndex] = line;
        return lines.join('\n');
    }

    // action === 'apply'
    if (targetSpanMatch) {
        // 目標文字已具有專屬 span，合併其 style 屬性
        const styleMatch = targetSpanMatch.attrs.match(/style=["']([^"']*)["']/i);
        const existingStyles = styleMatch ? parseCssStyleString(styleMatch[1]) : {};
        const mergedStyles = { ...existingStyles, ...newCssMap };
        const newStyleStr = formatCssStyleObject(mergedStyles);

        let newAttrs = targetSpanMatch.attrs;
        if (styleMatch) {
            newAttrs = newAttrs.replace(/style=["'][^"']*["']/i, `style="${newStyleStr}"`);
        } else {
            newAttrs = `${newAttrs} style="${newStyleStr}"`.trim();
        }

        const newSpan = `<span ${newAttrs}>${targetSpanMatch.inner}</span>`;
        line = line.slice(0, targetSpanMatch.start) + newSpan + line.slice(targetSpanMatch.end);
        lines[lineIndex] = line;
        return lines.join('\n');
    }

    // 若原本不是專屬 span，在第 occurrenceIndex 個出現的位置安全包裹 <span style="...">
    // 關鍵防護：必須避開 HTML 標籤屬性內部（如 <span style="font-family: ...">）
    const newStyleStr = formatCssStyleObject(newCssMap);
    const replacementSpan = `<span style="${newStyleStr}">${trimmedSelection}</span>`;

    let searchIdx = -1;
    let currentOccurrence = 0;
    while ((searchIdx = line.indexOf(trimmedSelection, searchIdx + 1)) !== -1) {
        // 檢查 searchIdx 是否位在任何 HTML 標籤 <...> 內部
        const before = line.slice(0, searchIdx);
        const lastOpen = before.lastIndexOf('<');
        const lastClose = before.lastIndexOf('>');
        if (lastOpen > lastClose) {
            // 位於標籤內部（如屬性字串），跳過
            continue;
        }

        if (currentOccurrence === occurrenceIndex) {
            line = line.slice(0, searchIdx) + replacementSpan + line.slice(searchIdx + trimmedSelection.length);
            lines[lineIndex] = line;
            return lines.join('\n');
        }
        currentOccurrence++;
    }

    // Fallback: 若找不到指定 occurrence，替換第一個不在標籤內的出現位置
    searchIdx = -1;
    while ((searchIdx = line.indexOf(trimmedSelection, searchIdx + 1)) !== -1) {
        const before = line.slice(0, searchIdx);
        const lastOpen = before.lastIndexOf('<');
        const lastClose = before.lastIndexOf('>');
        if (lastOpen <= lastClose) {
            line = line.slice(0, searchIdx) + replacementSpan + line.slice(searchIdx + trimmedSelection.length);
            break;
        }
    }

    lines[lineIndex] = line;
    return lines.join('\n');
}
