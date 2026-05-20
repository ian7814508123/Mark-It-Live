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
| `--code-line-number-bg` | **程式碼行數欄位（Line Number Column）不透明背景色** (預設引用 `var(--code-bg)`) |
| `--code-line-number-shadow` | **程式碼向右捲動時，行數欄位右邊緣的動態投影顏色/強度** |
| **標註系統 (Alerts)** | |
| `--theme-alert-note-border` / `-bg` / `-text` | Note 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-tip-border` / `-bg` / `-text` | Tip 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-important-border` / `-bg` / `-text` | Important 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-warning-border` / `-bg` / `-text` | Warning 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-caution-border` / `-bg` / `-text` | Caution 標註的邊框色、背景色與文字/圖示色 |

---

## 3. 圖表與程式碼背景統一規範 (Code & Diagram Unification) [NEW]

本系統內嵌了全新升級的「卡片式增強型代碼區塊」與「動態圖表渲染元件」。
為了維持極致的視覺品質與防止畫布底色破碎，所有主題設計必須遵守以下規則：

### 3.1 變數統一綁定原則
1. **圖表背景自動對接**：系統圖表容器會自動讀取並渲染當前主題的 `var(--code-bg)` 背景色。
2. **禁止硬編碼**：每個主題**嚴禁**使用 `pre` 或 `.enhanced-codeblock` 等 CSS 選擇器來硬性覆寫背景與邊框。必須一律將背景色寫入 `--code-bg`，邊框色寫入 `--code-border`。這能自動確保圖表（Mermaid 畫布）與代碼區塊達到 100% 完美的視覺融合。

### 3.2 全新卡片式 Code Block 樣式設計規定
本系統的代碼區塊（Code Block）已全面升級為**無縫卡片拼接架構**，包含了獨立的標頭組件 (`CodeBlockHeader`) 與底部的代碼高亮區 (`SyntaxHighlighter`)。開發主題時需特別注意以下渲染機制，**切勿使用 CSS 破壞原有的動態佈局**：

1. **動態圓角拼接機制 (Dynamic Border Radius)**：
   - 當程式碼帶有語言標籤時，系統會自動生成 `CodeBlockHeader`，其具備頂部圓角 (`rounded-t-lg`)。
   - 此時，下方的代碼區塊 (`pre`) 頂部圓角會自動歸零，並藉由取消標頭底框 (`border-b-0`) 的方式，讓 `pre` 原生的 `border-top` 完美化身為 1px 分割線。
   - 主題設計者**不需（也不應）** 在 CSS 中強行覆蓋 `.enhanced-codeblock pre` 的 `border-radius` 或 `border` 屬性。
2. **語言圖示與標題列**：
   - `CodeBlockHeader` 內建了輕量級圖示與自適應的 Tailwind 色彩（用於各語言標籤分類）。
   - 標題列的背景色固定使用稍微與代碼底色區分的系統色階，主題開發者只需確保 `--code-border` (外框線) 與 `--code-bg` (代碼底色) 與整體畫面協調，即能呈現具質感的「編輯器卡片」風格。
   - 帶有標頭時，頂部內距為緊湊的 `1rem`；無標頭時，頂部自動擴展為 `1.2rem` 以保持視覺平衡。主題 CSS 絕對不得利用 `!important` 干預 `pre` 標籤的 `padding`。
   
### 3.3 語法高亮色階自訂 (Syntax Highlighting Customization) [OPTIONAL]
系統在底層 (`index.css` 的 `:root`) 已經強制採用了工業級標準的 **VS Code Light / Dark+** 作為預設的語法高亮配色，這代表：
只要您的 `--code-bg` 淺色維持高明度、深色維持低明度，系統預設的高亮配色就**絕對不會發生顏色衝突或對比度不足的問題**。

但若為了追求極致的美學契合度（例如：在古典宣紙風格中，純藍色的關鍵字可能顯得過於科技感），開發者可以選擇性地在主題 CSS 中覆寫特定的 Token 顏色：

```css
/* 範例：古典風中微調語法高亮顏色以契合宣紙質感 */
.theme-[name] {
    --code-token-keyword: #1b315e; /* 藏青色取代純藍 */
    --code-token-comment: #5c4a43; /* 枯茶色取代亮綠 */
}
```
> `--code-token-comment`, `--code-token-keyword`, `--code-token-string`, `--code-token-number`, `--code-token-function`, `--code-token-operator`, `--code-token-variable`, `--code-token-constant`, `--code-token-builtin`, `--code-token-class`, `--code-token-attr-name`, `--code-token-tag`, `--code-token-punctuation`

### 3.4 GitHub-style Alert 標註系統自訂 (Blockquote & Alerts) [NEW]
本系統在 React 解析層級已完整對齊 GitHub 標準，會自動將 `<blockquote>` 內開頭含有 `[!NOTE]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`, `[!TIP]`（包括不帶驚嘆號的 `[NOTE]` 等）的區塊解析為 Alert 標註。

#### 🛠️ 解析後的 DOM 結構：
```html
<blockquote class="markdown-alert markdown-alert-[type]">
  <div class="markdown-alert-title">
    <!-- Lucide 向量圖示 (自動根據類別對齊) -->
    <span>Note</span>
  </div>
  <div class="markdown-alert-content">
    <!-- 去除標註字串後的 Markdown 內容 -->
  </div>
</blockquote>
```

#### 🎨 客製化樣式原則：
主題開發者應透過定義標準的標註變數（如 `--theme-alert-note-*`）來控制各類型 Alert 的視覺外觀，以確保在深淺色模式下皆有符合 WCAG 規範的良好對比度。避免在 CSS 中直接寫死硬編碼顏色。若未自訂，系統會自動 Fallback 回各主題基礎的 `blockquote` 與 `--theme-accent-color` 配置。

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
    --code-line-number-bg: var(--code-bg);
    --code-line-number-shadow: rgba(0, 0, 0, 0.05);

    /* 7. 標註系統 (Alerts) */
    --theme-alert-note-border: #3b82f6;
    --theme-alert-note-bg: rgba(59, 130, 246, 0.05);
    --theme-alert-note-text: #2563eb;
    --theme-alert-tip-border: #10b981;
    --theme-alert-tip-bg: rgba(16, 185, 129, 0.05);
    --theme-alert-tip-text: #059669;
    --theme-alert-important-border: #8b5cf6;
    --theme-alert-important-bg: rgba(139, 92, 246, 0.05);
    --theme-alert-important-text: #7c3aed;
    --theme-alert-warning-border: #f59e0b;
    --theme-alert-warning-bg: rgba(245, 158, 11, 0.05);
    --theme-alert-warning-text: #d97706;
    --theme-alert-caution-border: #ef4444;
    --theme-alert-caution-bg: rgba(239, 68, 68, 0.05);
    --theme-alert-caution-text: #dc2626;
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
    --code-line-number-bg: var(--code-bg);
    --code-line-number-shadow: rgba(0, 0, 0, 0.25);

    /* 7. 標註系統 (Alerts - 深色模式對比優化) */
    --theme-alert-note-border: #60a5fa;
    --theme-alert-note-bg: rgba(96, 165, 250, 0.1);
    --theme-alert-note-text: #60a5fa;
    --theme-alert-tip-border: #34d399;
    --theme-alert-tip-bg: rgba(52, 211, 153, 0.1);
    --theme-alert-tip-text: #34d399;
    --theme-alert-important-border: #a78bfa;
    --theme-alert-important-bg: rgba(167, 139, 250, 0.1);
    --theme-alert-important-text: #a78bfa;
    --theme-alert-warning-border: #fbbf24;
    --theme-alert-warning-bg: rgba(251, 191, 36, 0.1);
    --theme-alert-warning-text: #fbbf24;
    --theme-alert-caution-border: #f87171;
    --theme-alert-caution-bg: rgba(248, 113, 113, 0.1);
    --theme-alert-caution-text: #f87171;
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

/* Alert 標註自訂擴充 */
.theme-[name].prose blockquote.markdown-alert {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    padding-left: 1rem;
    padding-right: 1rem;
    margin: 1.5rem 0;
}

.theme-[name].prose blockquote.markdown-alert .markdown-alert-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    margin-bottom: 0.35rem;
    font-weight: 600;
}

.theme-[name].prose blockquote.markdown-alert .markdown-alert-title svg {
    margin-right: 0.375rem;
}

.theme-[name].prose blockquote.markdown-alert-note {
    border-left-color: var(--theme-alert-note-border);
    background-color: var(--theme-alert-note-bg);
}
.theme-[name].prose blockquote.markdown-alert-note .markdown-alert-title {
    color: var(--theme-alert-note-text);
}

.theme-[name].prose blockquote.markdown-alert-tip {
    border-left-color: var(--theme-alert-tip-border);
    background-color: var(--theme-alert-tip-bg);
}
.theme-[name].prose blockquote.markdown-alert-tip .markdown-alert-title {
    color: var(--theme-alert-tip-text);
}

.theme-[name].prose blockquote.markdown-alert-important {
    border-left-color: var(--theme-alert-important-border);
    background-color: var(--theme-alert-important-bg);
}
.theme-[name].prose blockquote.markdown-alert-important .markdown-alert-title {
    color: var(--theme-alert-important-text);
}

.theme-[name].prose blockquote.markdown-alert-warning {
    border-left-color: var(--theme-alert-warning-border);
    background-color: var(--theme-alert-warning-bg);
}
.theme-[name].prose blockquote.markdown-alert-warning .markdown-alert-title {
    color: var(--theme-alert-warning-text);
}

.theme-[name].prose blockquote.markdown-alert-caution {
    border-left-color: var(--theme-alert-caution-border);
    background-color: var(--theme-alert-caution-bg);
}
.theme-[name].prose blockquote.markdown-alert-caution .markdown-alert-title {
    color: var(--theme-alert-caution-text);
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

## 6. 列印與輸出的相容性 (Print Compatibility) [UPDATED]

### 6.1 架構層級的深色自動免除
系統已在架構層（[App.tsx](file:///c:/Users/User/Desktop/Markdown-live-previewer/App.tsx) 渲染引擎）建立安全防護：
**在觸發列印（包含 `Ctrl + P` 或 PDF 匯出）的瞬間，系統會自動在全域 DOM（`html` 元素）上暫時剝除 `.dark` 類別，並在列印對話框關閉後自動加回。**
*   **效益**：這代表列印時，所有的 `.dark .theme-xxxx` 深色模式變數會**百分之百自動失效**。
*   **降級機制**：所有主題的列印渲染，會自動、完美地 Fallback 回套用該主題 `.theme-xxxx` 中最基礎的 **「淺色模式變數」**。
*   **開發者優勢**：開發者**完全不需**在客製化主題 CSS 檔案中，針對 `.dark` 狀態重複編寫繁重、冗餘、且帶有高權重 `!important` 的列印覆寫規則！

### 6.2 列印配色與樣式裁量準則 (Print Color & Style Decision Guide) [UPDATED]
由於架構層已確保「列印時必定以降級的淺色模式渲染」，為了在「正式文件嚴謹度」與「主題設計感」之間取得平衡，系統採用以下**美學分流準則**。開發者在編寫主題的 `@media print` 規則時應遵循此規範：

1. **嚴謹型主題 (如 Academic / Formal 主題)**
   - **定位**：用於論文、公文、合約等需 100% 複印與嚴謹閱讀的場景。
   - **規範**：必須在 `@media print` 中將顏色強行「黑白洗淨」。使用 `color: #000000 !important;` 確保最高對比度，並將表格邊框、引言左側線條等裝飾元素強制覆寫為純黑色或深灰色。
   - **範例**：參見 `academic.css`。

2. **創意與美學型主題 (如 Classical / Developer / Minimal 主題)**
   - **定位**：用於個人網誌、創意日誌、代碼分享等強調個人格調或設計藍圖的場景。
   - **規範**：**不應**在 `@media print` 內將顏色強行洗為純黑。直接利用系統降級後的「淺色模式變數」來渲染。開發者只需確保淺色模式的配色在白色背景紙張上具有 WCAG 對比度（如古典宣紙的硃砂紅標題、開發者主題的綠色邊框/語法高亮），即可直接以精美的彩色 PDF 導出，保留編輯器的豐富美學。
   - **範例**：參見 `classical.css` 與 `developer.css`。

### 6.3 簡明列印排版微調指南 (選配)
當淺色配色已具備足夠對比度時，開發者**甚至不需要編寫任何顏色相關的 `@media print` 規則**。僅在有以下排版需求時，在主題內加上簡單的純結構性 `@media print` 微調：
- **字體與排版尺寸**：將字體大小精準調成 A4 紙張適合 spacing 的 `10pt` 或 `11pt`，調整行高以利閱讀。
- **分頁控制**：為標題加上 `page-break-after: avoid;` 或為表格、代碼區塊加上 `page-break-inside: avoid;`，防止內容被攔腰切斷。

由於不需要考慮深色模式防禦，開發者在編寫這些微調時只需針對淺色狀態，**絕無任何 `!important` 負擔**！

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
