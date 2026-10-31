/**
 * 簡報模式行內樣式等比放大插件：rehypeSlideScaleInlineStyles
 *
 * 背景：
 * - 文件模式以約 16px 內文為基準；簡報模式則以 1920×1080 虛擬畫布為基準，
 *   內文 36px（≈ 16px × 2.25）。
 * - 使用者透過 Typography Inspector / 手寫 HTML（`<p style="font-size: 20px">`、
 *   `<span style=...>`、`:font{size="20px"}`）寫入的是「文件級」絕對尺寸。
 * - 若不換算，這些絕對尺寸在簡報畫布上會被原樣套用（20px 對比清單 34px），
 *   導致在編輯/預覽時比清單大的「自訂標題」，在簡報模式反而明顯縮小（層級倒掛）。
 *
 * 行為：
 * - 僅在 isSlideMode 時啟用。
 * - 走訪所有 element 的 `style` 屬性，將 `font-size` 與 `letter-spacing`
 *   中的絕對單位（px / pt / rem）乘上 SLIDE_TYPE_SCALE。
 * - 相對單位（em / % / 無單位 line-height）本身會跟隨父層縮放，保持不動。
 */

/** 文件級 → 簡報級的字級換算係數（36px 簡報內文 / 16px 文件內文） */
export const SLIDE_TYPE_SCALE = 2.25;

const SCALABLE_PROPS = new Set(['font-size', 'letter-spacing']);
const ABSOLUTE_LENGTH_RE = /(-?\d*\.?\d+)(px|pt|rem)\b/gi;

const round = (n: number) => Math.round(n * 100) / 100;

/** 將單一 CSS 長度值（可能含 calc / 多段數值）中的絕對單位乘上係數 */
export function scaleCssLengthForSlide(value: string, factor: number = SLIDE_TYPE_SCALE): string {
    return value.replace(ABSOLUTE_LENGTH_RE, (_m, num: string, unit: string) => `${round(parseFloat(num) * factor)}${unit}`);
}

/** 換算整段行內 style 字串，例如 `font-size: 20px; color: red` → `font-size: 45px; color: red` */
export function scaleStyleStringForSlide(style: string, factor: number = SLIDE_TYPE_SCALE): string {
    return style
        .split(';')
        .map(decl => {
            const idx = decl.indexOf(':');
            if (idx === -1) return decl;
            const prop = decl.slice(0, idx).trim().toLowerCase();
            if (!SCALABLE_PROPS.has(prop)) return decl;
            return `${decl.slice(0, idx)}:${scaleCssLengthForSlide(decl.slice(idx + 1), factor)}`;
        })
        .join(';');
}

/** 換算 React style 物件（供元件內自行組裝的樣式使用，例如 Alert 標題） */
export function scaleStyleObjectForSlide<T extends Record<string, any>>(style: T, factor: number = SLIDE_TYPE_SCALE): T {
    const next: Record<string, any> = { ...style };
    for (const key of ['fontSize', 'letterSpacing']) {
        if (typeof next[key] === 'string') next[key] = scaleCssLengthForSlide(next[key], factor);
        else if (typeof next[key] === 'number') next[key] = round(next[key] * factor);
    }
    return next as T;
}

export interface SlideScaleOptions {
    isSlideMode?: boolean;
}

export default function rehypeSlideScaleInlineStyles(options: SlideScaleOptions = {}) {
    return (tree: any) => {
        if (!options.isSlideMode) return;

        const walk = (node: any) => {
            if (node.type === 'element' && node.properties && typeof node.properties.style === 'string') {
                node.properties.style = scaleStyleStringForSlide(node.properties.style);
            }
            if (Array.isArray(node.children)) node.children.forEach(walk);
        };
        walk(tree);
    };
}
