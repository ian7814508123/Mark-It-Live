# Markdown 主題系統開發規範 (Theme Specification)

為了確保未來新增的主題 (Themes) 能夠與系統（包含列印、深色模式、標註系統）完美相容，並降低維護成本，所有位於 `src/styles/themes` 目錄下的新增主題必須遵守以下規範。

> [!IMPORTANT]
> **核心設計哲學：對齊與服從 `index.css` 框架**
> 本規範的最大目的是**確保主題的改動不超出系統的排版設計框架**。
> - `index.css` 負責**核心邏輯**：如列印預覽的紙張模擬、邊界歸零策略 (`@page`)、標註系統的絕對座標系、斷行換頁邏輯等。
> - `theme-*.css` 負責**視覺呈現 (Cosmetics)**：如字體、顏色、框線、行高。
> 任何主題**嚴禁**修改或覆蓋與核心框架相關的設定（例如 `margin`, `padding`, `width`, `position`，除非僅針對 Markdown 內容本身如標題與表格）。主題只是穿在系統外的一件衣服，不能改變骨架。

## 1. 命名與作用域 (Naming & Scoping)

### 1.1 命名慣例
- 檔案命名必須為小寫英文，例如 `nature.css` 或 `cyberpunk.css`。
- 所有的 CSS 選擇器**必須**以 `.theme-[name]` 開頭，絕不允許污染全域樣式。

### 1.2 變數宣告 (CSS Variables)
每個主題應該在根節點建立自己的 CSS 變數系統，這有助於統一管理顏色與字體，並避免 Hardcode (Magic Numbers)。

```css
/* ✅ 正確範例 */
.theme-academic {
    --academic-font-serif: "Times New Roman", serif;
    --academic-text-color: #1a1a1a;
    --academic-heading-border: 1px solid #ddd;
}
```

## 2. 系統變數對接 (System Variable Integration) [NEW]

為了讓整個應用程式（包含按鈕、側邊欄、捲軸）與當前主題視覺統一，主題**應該**覆寫 `index.css` 中定義的核心系統變數。

### 2.1 核心 UI 變數
- `--brand-primary`: 主要品牌色（影響標題、按鈕背景、活動狀態）。
- `--brand-secondary`: 輔助色（影響容器背景、懸停狀態）。
- `--brand-surface`: 應用程式底色（影響側邊欄與整體背景）。

### 2.2 內容元件變數
- `--code-bg` & `--code-border`: 影響程式碼區塊的背景與邊框。覆寫這些變數優於直接設定 `pre` 標籤，因為這能確保「行號系統」同步更新顏色。

```css
/* 範例：讓系統 UI 跟隨主題變動 */
.theme-academic {
    --brand-primary: #1a1a1a;    /* 按鈕變為深黑色 */
    --brand-secondary: #f3f4f6;
    --code-border: #d1d5db;      /* 程式碼邊框同步變更 */
}
```

## 3. 針對 Markdown 元件的覆蓋 (Targeting Prose)

我們的 Markdown 渲染底層使用了 Tailwind 的 `@tailwindcss/typography` (即 `.prose` 類別)。主題的職責是覆蓋預設的 `.prose` 樣式。

### 3.1 必須實作的核心元素
任何新主題至少需要對以下 Markdown 元素進行樣式定義：
- **基礎排版**: `.theme-[name].prose` (包含字體、行高、文字對齊)
- **標題階層**: `h1` 至 `h6` (確保層次分明)
- **強調區塊**: `blockquote` (引言區塊的左側邊框與背景)
- **表格**: `table`, `th`, `td` (建議實作符合主題風格的邊框樣式)
- **超連結**: `a` (包含 Hover 效果)
- **列表**: `ul`, `ol`, `li` (確保多層次縮排與符號正確)

## 4. 程式碼區塊適配 (Code Block Integration) [NEW]

本系統使用「增強型程式碼區塊」，具備動態行號與斷行控制。

- **禁止行為**: 嚴禁在主題中使用 `pre { ... !important }` 強行覆寫邊框與內距。
- **正確做法**: 
    1. 透過覆寫 `--code-bg` 變數來調整背景。
    2. 若需微調字體大小，請使用 `.prose pre code`。
    3. 確保行號邊框與外框一致（這通常透過覆寫 `--code-border` 自動達成）。

## 5. 列印與輸出的相容性 (Print Compatibility)

### 5.1 物理單位
在螢幕上我們使用 `rem` 或 `px`，但在 `@media print` 區塊中，字體與間距強烈建議改用物理單位 `pt` (點) 或 `mm` (公釐)。
- 內文建議：`10pt` ~ `12pt`。
- 標題建議：`14pt` ~ `24pt`。

### 5.2 顏色洗淨原則 (Ink-Saving)
**「誰弄髒的顏色，誰就負責在列印時洗乾淨」**。主題必須在 `@media print` 中，把自己修改過的背景顏色強制設回 `white !important`，文字設為 `black !important`。

## 6. 深色模式與無障礙 (Dark Mode & Accessibility)

### 6.1 動態響應
如果主題支援深色模式，請使用 `.dark` 父選擇器進行變量覆蓋。

```css
/* 深色模式下的變數覆蓋 */
.dark .theme-developer {
    --dev-text: #f8fafc;
    --dev-bg: #0f172a;
}
```

### 6.2 WCAG 對比度規範
1. **內文**: 對比度至少需達到 `4.5:1`。
2. **標題**: 對比度至少需達到 `3:1`。
3. **程式碼高亮**: 確保 Token 顏色在主題背景下清晰可辨。

## 7. 開發工作流

1. 在 `src/styles/themes/` 建立 `<new-theme>.css`。
2. 遵循變數對接與作用域規範。
3. 在 `src/App.tsx` 引入樣式。
4. 更新相關 Type 與 UI 選項。
5. **驗證**: 切換主題觀察 UI 連動，並檢查 `Ctrl+P` 列印效果。
