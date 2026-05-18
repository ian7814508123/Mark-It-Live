# Markdown 主題系統開發規範 (Theme Specification)

為了確保未來新增的主題 (Themes) 能夠與系統（包含列印、深色模式、標註系統、圖表元件）完美相容，並降低維護成本，所有位於 `src/styles/themes` 目錄下的新增主題必須遵守以下規範。

> [!IMPORTANT]
> **核心設計哲學：對齊與服從 `index.css` 框架**
> 本規範的最大目的是**確保主題的改動不超出系統的排版設計框架**。
> - `index.css` 負責**核心邏輯**：如列印預覽的紙張模擬、邊界歸零策略 (`@page`)、標註系統的絕對座標系、斷行換頁邏輯等。
> - `theme-*.css` 負責**視覺呈現 (Cosmetics)**：如字體、顏色、框線、行高。
> 任何主題**嚴禁**修改或覆蓋與核心框架相關的設定（例如 `margin`, `padding`, `width`, `position`，除非僅針對 Markdown 內容本身如標題與表格）。主題只是穿在系統外的一件衣服，不能改變骨架。

---

## 1. 命名與作用域 (Naming & Scoping)

### 1.1 命名慣例
- 檔案命名必須為小寫英文，例如 `nature.css` 或 `cyberpunk.css`。
- 所有的 CSS 選擇器**必須**以 `.theme-[name]` 開頭，絕不允許污染全域樣式。
- 例如：`.theme-academic.prose` 用於修飾基礎 HTML 元素。

---

## 2. 標準主題變數接口 (Standard Variable Specification) [UPDATED]

為了解決以往主題變數混亂、維護困難的問題，系統現在強制要求所有主題都必須實作一組前綴為 `--theme-` 的標準化變數骨架。這些變數直接控制 Prose 中的各個元素外觀。

### 2.1 標準變數對照表

| 變數名稱 | 適用對象 / 說明 |
| :--- | :--- |
| **排版與基礎字體 (Typography)** | |
| `--theme-font-family` | 預覽區域內文字體疊加 (font stack) |
| `--theme-line-height` | 預覽區域內文行高 (例如 1.6 或 1.75) |
| `--theme-text-align` | 內文水平對齊方式 (`left` 或 `justify`) |
| `--theme-text-color` | 內文文字底色 (確保與背景具備 WCAG 良好對比) |
| `--theme-accent-color` | 主題代表的主色/強調色 |
| **標題設計 (Headings)** | |
| `--theme-heading-font` | 標題專用字體 (可與內文相同或不同) |
| `--theme-heading-color` | 標題文字顏色 |
| `--theme-heading-weight` | 標題字體粗細 (例如 700 或 800) |
| `--theme-h1-size` 到 `--theme-h6-size` | H1 ~ H6 的 `font-size` 尺寸定義 |
| `--theme-h1-border` / `--theme-h2-border` | H1/H2 底部裝飾線 (例如 `1px solid #ddd` 或 `none`) |
| `--theme-h1-transform` | H1 字母轉大寫/小寫/無 (`uppercase` / `lowercase` / `none`) |
| **引言區塊 (Blockquote)** | |
| `--theme-quote-bg` | 引言區塊的背景色 (無則設為 `transparent`) |
| `--theme-quote-border-left` | 引言左側的裝飾邊框 (例如 `4px solid #brand-primary`) |
| `--theme-quote-text` | 引言區塊的文字顏色 |
| `--theme-quote-font-style` | 引言字體樣式 (`italic` 或 `normal`) |
| **超連結 (Links)** | |
| `--theme-link-color` | 網頁超連結的前景色 |
| `--theme-link-decoration` | 連結底線裝飾 (`underline` 或 `none`) |
| `--theme-link-hover-bg` | 連結懸停時的背景色 |
| `--theme-link-hover-border` | 連結懸停時的底部框線色 |
| **表格設計 (Tables)** | |
| `--theme-table-border` | 表格外部與內部單元格的線條顏色與粗細 |
| `--theme-table-header-bg` | 表格首行 (TableHeader) 的背景色 |
| `--theme-table-header-color` | 表格首行文字顏色 |
| `--theme-table-header-border` | 表格首行底部的框線裝飾 (通常比一般線條粗) |
| **系統 UI 對接 (System Bridge)** | |
| `--brand-primary` | 按鈕、側邊欄活動狀態等系統 UI 的代表色 |
| `--brand-secondary` | 系統 UI 懸停、容器背景的輔助色 |
| `--brand-surface` | 整體應用程式的背景色 |
| `--code-bg` | **代碼區塊與圖表 (Diagram) 共同背景色** |
| `--code-border` | **代碼區塊與圖表 (Diagram) 共同邊框色** |

---

## 3. 圖表與程式碼背景統一規範 (Code & Diagram Unification) [NEW]

本系統內嵌了增強型代碼區塊與動態圖表渲染元件 ([DiagramBlock.tsx](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/DiagramBlock.tsx))。
為了防止畫布底色與程式碼背景各異造成視覺破碎，請遵守以下規則：

1. **圖表背景自動對接**：系統圖表容器會自動讀取並渲染當前主題的 `var(--code-bg)` 背景色。
2. **主題變數綁定**：每個主題**嚴禁**使用 `pre` 等硬編碼來改寫背景。必須一律將背景色寫入 `--code-bg`，邊框色寫入 `--code-border`。這能自動確保圖表（Mermaid 畫布）與代碼區塊達到 100% 完美的視覺融合。

---

## 4. 開箱即用之主題 CSS 模板骨架 (Standard Template Blueprint) [NEW]

未來開發新主題時，請直接複製以下模板，並填入對應配色即可：

```css
/* ==========================================================================
   主題名稱: [Your Theme Name] (例如: Cyberpunk)
   ========================================================================== */

.theme-[name] {
    /* 1. 排版與基礎字體 */
    --theme-font-family: system-ui, -apple-system, sans-serif;
    --theme-line-height: 1.7;
    --theme-text-align: left;
    --theme-text-color: #334155;
    --theme-accent-color: #3b82f6;

    /* 2. 標題設計 */
    --theme-heading-font: system-ui, -apple-system, sans-serif;
    --theme-heading-color: #1e293b;
    --theme-heading-weight: 800;
    --theme-h1-size: 2.5rem;
    --theme-h2-size: 1.85rem;
    --theme-h3-size: 1.45rem;
    --theme-h4-size: 1.25rem;
    --theme-h5-size: 1.1rem;
    --theme-h6-size: 1rem;
    --theme-h1-border: none;
    --theme-h2-border: none;
    --theme-h1-transform: none;

    /* 3. 引言區塊 */
    --theme-quote-bg: #f8fafc;
    --theme-quote-border-left: 4px solid #3b82f6;
    --theme-quote-text: #475569;
    --theme-quote-font-style: normal;

    /* 4. 超連結 */
    --theme-link-color: #3b82f6;
    --theme-link-decoration: none;
    --theme-link-hover-bg: #eff6ff;
    --theme-link-hover-border: #3b82f6;

    /* 5. 表格設計 */
    --theme-table-border: 1px solid #e2e8f0;
    --theme-table-header-bg: #f8fafc;
    --theme-table-header-color: #1e293b;
    --theme-table-header-border: 1px solid #e2e8f0;

    /* 6. 系統 UI 對接 (控制整體系統 UI 隨主題變換) */
    --brand-primary: #3b82f6;
    --brand-secondary: #eff6ff;
    --brand-surface: #ffffff;
    --brand-accent: #60a5fa;
    --code-bg: #f8fafc;
    --code-border: #e2e8f0;
}

/* --------------------------------------------------------------------------
   深色模式變數覆蓋 (WCAG 對比度對焦)
   -------------------------------------------------------------------------- */
.dark .theme-[name] {
    --theme-text-color: #cbd5e1;
    --theme-heading-color: #f1f5f9;
    --theme-accent-color: #60a5fa;

    --theme-quote-bg: #1e293b;
    --theme-quote-border-left: 4px solid #60a5fa;
    --theme-quote-text: #94a3b8;

    --theme-link-color: #60a5fa;
    --theme-link-hover-bg: rgba(96, 165, 250, 0.1);
    --theme-link-hover-border: #60a5fa;

    --theme-table-border: 1px solid #334155;
    --theme-table-header-bg: #1e293b;
    --theme-table-header-color: #f1f5f9;
    --theme-table-header-border: 1px solid #334155;

    --brand-primary: #60a5fa;
    --brand-secondary: #1e293b;
    --brand-surface: #0f172a;
    --brand-accent: #94a3b8;
    --code-bg: #1e293b;
    --code-border: #334155;
}

/* --------------------------------------------------------------------------
   Markdown 基礎元素綁定 (Prose Binding)
   -------------------------------------------------------------------------- */
.theme-[name].prose {
    font-family: var(--theme-font-family);
    color: var(--theme-text-color);
    line-height: var(--theme-line-height);
    text-align: var(--theme-text-align);
    max-width: 100%;
}

.theme-[name].prose h1,
.theme-[name].prose h2,
.theme-[name].prose h3,
.theme-[name].prose h4,
.theme-[name].prose h5,
.theme-[name].prose h6 {
    font-family: var(--theme-heading-font);
    color: var(--theme-heading-color);
    font-weight: var(--theme-heading-weight);
    border-bottom: none;
    margin-top: 2.5rem;
}

.theme-[name].prose h1 {
    font-size: var(--theme-h1-size);
    text-transform: var(--theme-h1-transform);
    border-bottom: var(--theme-h1-border);
}

.theme-[name].prose h2 {
    font-size: var(--theme-h2-size);
    border-bottom: var(--theme-h2-border);
    padding-bottom: 0.3rem;
}

.theme-[name].prose h3 { font-size: var(--theme-h3-size); }
.theme-[name].prose h4 { font-size: var(--theme-h4-size); }
.theme-[name].prose h5 { font-size: var(--theme-h5-size); }
.theme-[name].prose h6 { font-size: var(--theme-h6-size); }

.theme-[name].prose blockquote {
    background-color: var(--theme-quote-bg);
    border-left: var(--theme-quote-border-left);
    font-style: var(--theme-quote-font-style);
    color: var(--theme-quote-text);
    padding: 1.5rem 2rem;
    margin: 2rem 0;
}

.theme-[name].prose a {
    color: var(--theme-link-color);
    text-decoration: var(--theme-link-decoration);
    transition: all 0.2s;
}

.theme-[name].prose a:hover {
    background-color: var(--theme-link-hover-bg);
    border-bottom: 2px solid var(--theme-link-hover-border);
}

.theme-[name].prose table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: var(--theme-table-border);
    border-radius: 8px;
    overflow: hidden;
    margin: 2rem 0;
}

.theme-[name].prose th {
    background-color: var(--theme-table-header-bg);
    color: var(--theme-table-header-color);
    border-bottom: var(--theme-table-header-border);
    padding: 1rem;
    font-weight: 600;
    text-align: left;
}

.theme-[name].prose td {
    padding: 1rem;
    border-top: var(--theme-table-border);
    color: var(--theme-text-color);
}
```

---

## 5. 深色模式與無障礙 (Dark Mode & Accessibility) [UPDATED]

### 5.1 WCAG 2.1 對比度標準 (強制性)
所有新主題必須使用對焦檢查工具（如 Chrome DevTools Accessibility Checker），確保在深淺色模式下皆滿足以下條件：
1. **普通內文**：相較於背景的對比度至少需達到 **`4.5:1`**。
2. **粗體或大型標題**：對比度至少需達到 **`3:1`**。
3. **程式碼高亮**：程式碼 Token 色與 `--code-bg` 必須維持優良的可讀對比。

---

## 6. 列印與輸出的相容性 (Print Compatibility)

### 6.1 顏色洗淨原則 (Ink-Saving)
**「誰弄髒的顏色，誰就負責在列印時洗乾淨」**。
主題必須在 `@media print` 中，將修改過的背景顏色強制重置為 `white !important`，文字重置為 `black !important`，以節省墨水並確保紙張呈現自然。

---

## 7. 新增主題的完整工作流

1. 在 `src/styles/themes/` 建立 `<new-theme>.css`。
2. 複製 **4. 主題 CSS 模板骨架**，填入您的專屬配色與排版樣式。
3. 在 `src/App.tsx` 最上方引入您的 CSS 檔案：
   ```tsx
   import './src/styles/themes/new-theme.css';
   ```
4. 在 `src/components/modals/SettingsModal.tsx` 的 `ThemeGridSelector` 選項列表中加入該主題選項。
5. **視覺驗證**：切換至新主題，測試「淺色模式」、「深色模式」、「圖表畫布適配」以及 `Ctrl+P` 的列印排版。
