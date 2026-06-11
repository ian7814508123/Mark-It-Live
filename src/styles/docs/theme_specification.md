# Markdown 主題系統開發規範 (Theme Specification)

為了確保未來新增的主題 (Themes) 能夠與系統（包含列印、深色模式、標註系統、圖表元件）完美相容，並降低維護成本，所有位於 `src/styles/themes` 目錄下的新增主題必須遵守以下規範。

> [!IMPORTANT]
> **核心設計哲學：全新「三層樣式架構 (Three-Tier Style Architecture)」**
> 本規範的最大目的是**確保 Markdown 預覽區樣式在優雅關注點分離 (SoC) 的原則下，達到極致的輕量化與高可維護性**。
> - **第一層：App 全域介面樣式 (`index.css`)**：負責應用程式外殼佈局（如 Tailwind 核心導入、彈窗、搜尋面板、動效、View Transitions 圓形擴散動效、全域 Webkit/Firefox 捲軸美化）。**不直接干預** Markdown 預覽區 (`.prose`) 內部元素的視覺。
> - **第二層：Markdown 排版骨架 (`markdown-base.css`)**：統一負責與色彩、字型無關的 Markdown 結構排版（如無序與有序列表 6 級縮排符號、Alerts 的 Flex 佈局、表格基礎佈局、Inline Code 等寬字型等）。
> - **第三層：客製化主題樣式 (`src/styles/themes/theme-*.css`)**：僅負責主題專屬的色彩變數、深色模式色彩覆蓋、以及該主題特定的美學覆寫（如學術三線表、硃砂紅 marker、命令列終端前綴等）。
> 任何主題**嚴禁**修改或覆蓋與第一層核心框架相關的設定（例如系統外框 `margin`, `padding`，除非僅針對 Markdown Prose 內容本身如標題與表格）。主題只是穿在系統外的一件衣服，不能改變骨架。

---

## 1. 命名與作用域 (Naming & Scoping)

### 1.1 命名慣例
- 檔案命名必須為小寫英文，例如 `nature.css` 或 `cyberpunk.css` (例如 `nordicforest.css`)。
- 所有的 CSS 選擇器**必須**以 `.theme-[name]` 開頭，絕不允許污染全域樣式。
- 例如：`.theme-academic.prose` 用於修飾基礎 HTML 元素。

### 1.2 嚴格的樣式隔離防禦規範 (Strict CSS Scoping) [CRITICAL]
- **【警告】絕對禁止在主題 CSS 中宣告不帶主題類名前綴的通用排版選擇器。**
  - 例如，**絕對嚴禁**在主題 CSS 中直接寫 `.prose h1`、`.prose ol`、`.prose blockquote` 等。
  - **原因**：由於系統會將所有主題 CSS 檔案同時打包引入，如果省略了 `.theme-[name]` 前綴，這些規則會直接變為全域污染，導致當用戶切換到其他主題時，該主題的標題、列表或引言樣式也會被強行篡改！
  - **正確作法**：必須始終以 `.theme-[name]` 或 `.theme-[name].prose` 限定所有自訂樣式規則，確保極致的樣式防禦與完美隔離：
    - ❌ **錯誤做法**：`.prose h1 { font-family: var(--theme-heading-font); }` (會污染其他所有主題)
    - ✅ **正確做法**：`.theme-academic.prose h1 { font-family: var(--theme-heading-font); }` (完美隔離)

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
| **圖表連動 (Mermaid Diagrams) [NEW]** | |
| `--mermaid-node-bg` **(核心)** | Mermaid 流程圖、狀態圖等節點的背景色 |
| `--mermaid-node-text` **(核心)**| Mermaid 節點內部的文字顏色 |
| `--mermaid-node-border` **(核心)**| Mermaid 節點的描邊/邊框顏色 |
| `--mermaid-line` **(核心)** | 連線、箭頭與連接線線條顏色 |
| `--mermaid-edge-bg` **(核心)** | 連接線上文字標籤 (Edge Label) 的背景色 |
| `--mermaid-actor-bg` | *選配 (Fallback ➔ core)* 序列圖參與者 (Actor) 背景色 |
| `--mermaid-actor-text` | *選配 (Fallback ➔ core)* 序列圖參與者 (Actor) 文字顏色 |
| `--mermaid-actor-border` | *選配 (Fallback ➔ core)* 序列圖參與者 (Actor) 邊框顏色 |
| `--mermaid-note-bg` | *選配 (Fallback ➔ core)* 備忘錄 (Note) 背景色 |
| `--mermaid-note-text` | *選配 (Fallback ➔ core)* 備忘錄 (Note) 文字顏色 |
| `--mermaid-note-border` | *選配 (Fallback ➔ core)* 備忘錄 (Note) 邊框顏色 |
| **標註系統 (Alerts)** | |
| `--theme-alert-note-border` / `-bg` / `-text` | Note 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-tip-border` / `-bg` / `-text` | Tip 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-important-border` / `-bg` / `-text` | Important 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-warning-border` / `-bg` / `-text` | Warning 標註的邊框色、背景色與文字/圖示色 |
| `--theme-alert-caution-border` / `-bg` / `-text` | Caution 標註的邊框色、背景色與文字/圖示色 |

---

## 3. 圖表與程式碼背景統一規範 (Code & Diagram Unification) [UPDATED]

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
3. **行內與區塊代碼的選擇器防禦隔離 (Inline vs Block Code Selector Isolation) [CRITICAL]**：
   - **嚴禁使用** `.theme-[name].prose code` 這種寬鬆的選擇器來定義行內代碼。這會因為 CSS 權重問題，誤傷到代碼塊（Enhanced Code Block）內層語法高亮生成的 `<code>` 元素。
   - 誤傷後會導致代碼塊內的每一行文字也跟著被強行加上 inline code 的邊框、圓角與內距，造成極為突兀的「內層線框」視覺 Bug。
   - **強制規範**：所有主題的行內代碼（Inline Code）樣式，**必須且嚴格限制**寫為排除 `pre` 的 `:not` 選擇器：
     ```css
     .theme-[name].prose :not(pre) > code {
         /* 僅修飾行內代碼，不誤傷區塊代碼 */
         background-color: var(--code-bg);
         border: 1px solid var(--code-border);
         padding: 0.2em 0.4em;
         border-radius: 4px;
         font-size: 0.85em;
     }
     ```

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

### 3.4 GitHub-style Alert 標註系統自訂 (Blockquote & Alerts) [UPDATED]
本系統在 React 解析層級已完整對齊 GitHub 標準，會自動將 `<blockquote>` 內開頭含有 `[!NOTE]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`, `[!TIP]`（包括不帶驚嘆號的 `[NOTE]` 等）的區塊解析為 Alert 標註。

此外，本系統進行了以下**深度語法擴充與容錯支援**：
1.  **空格語法容錯**：允許方括號內帶有額外空白字元，如 `[! NOTE ]` 仍可被正確匹配並渲染。
2.  **自訂標題支援**：支援 `[!TYPE] 自訂標題` 或 `[!TYPE](自訂標題)` 語法。當偵測到自訂標題時，預覽面板將自動以該標題替換預設的大寫類型名稱，且 fallback 粗體字亦同步變更。
3.  **擴充語義別名與色彩映射**：
    系統支援 5 種核心類別與 14 種自訂擴充別名（共 19 種別名），主題開發者只需定義以下 5 種核心 alerts 變數即可自動覆蓋所有類別。以下是快速對照表：

| 核心類別 (Core Type) | 映射 CSS 變數 | 預設 Icon | 支援的語法別名 (Aliases) | 預設標題 (Default Label) | 色系風格 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Note** | `--theme-alert-note-*` | `Info` | `[!note]`, `[!info]` | NOTE, INFO | 藍色 (科技/資訊) |
| **Tip** | `--theme-alert-tip-*` | `Lightbulb` / `CheckCircle` | `[!tip]`, `[!success]`, `[!check]`, `[!quickstart]`, `[!start]` | TIP, SUCCESS, CHECK, QUICK START, START | 綠色 (正面/成功/指引) |
| **Warning** | `--theme-alert-warning-*` | `AlertTriangle` | `[!warning]`, `[!attention]` | WARNING, ATTENTION | 黃色 (注意/潛在風險) |
| **Caution** | `--theme-alert-caution-*` | `AlertOctagon` / `Bug` / `Ban` | `[!caution]`, `[!ban]`, `[!danger]`, `[!error]`, `[!bug]`, `[!failure]` | CAUTION, BAN, DANGER, ERROR, BUG, FAILURE | 紅色 (危險/核心報錯/失效) |
| **Important** | `--theme-alert-important-*` | `AlertCircle` / `HelpCircle` | `[!important]`, `[!question]`, `[!help]`, `[!faq]` | IMPORTANT, QUESTION, HELP, FAQ | 紫色 (關鍵/疑問/解答) |

#### 🛠️ 解析後的 DOM 結構：
```html
<blockquote class="markdown-alert markdown-alert-[type]">
  <div class="markdown-alert-title">
    <!-- 向量圖示 (由 AlertIcon 模組根據 alertType 懶載入對應之 Lucide 圖示) -->
    <!-- 自訂標題 (優先使用 node.data.alertTitle，無則使用預設 label) -->
    <span>自訂標題 / Default Label</span>
  </div>
  <div class="markdown-alert-content">
    <!-- 去除標註字串與重複前綴後的 Markdown 內容 -->
  </div>
 </blockquote>
```

#### 🎨 客製化樣式原則：
主題開發者應透過定義標準的標註變數（如 `--theme-alert-note-*`）來控制各類型 Alert 的視覺外觀，以確保在深淺色模式下皆有符合 WCAG 規範的良好對比度。避免在 CSS 中直接寫死硬編碼顏色。若未自訂，系統會自動 Fallback 回各主題基礎的 `blockquote` 與 `--theme-accent-color` 配置。

### 3.5 主題背景與內聯容器層級對比規範 (Theme Surface & Inline Contrast) [UPDATED]
為了確保預覽區域的視覺「純淨度」與「資訊層級清晰度」，避免內聯元素（如代碼區塊 `--code-bg`、引言區塊 `--theme-quote-bg`、表格頭 `--theme-table-header-bg`）與主題的主背景色（Prose 容器背景 `--brand-surface`）發生色彩重疊或視覺混淆，所有主題設計必須遵循 **「卡片層級視覺差 (Layered Visual Contrast)」** 原則：

1. **主背景淨空與純淨化 (Surface Pureness)**：所有主題的主背景色（`--brand-surface` 與預覽區 `.prose` 的 `background-color`）**必須維持絕對的淨白（淺色模式，如 `#ffffff`）與深藍黑（深色模式，如 `#0f172a`），嚴禁在主背景上強行染上濃厚的主題色相（如直接使用偏綠、偏藍的底色）**。這能確保主預覽區擁有最乾淨清爽的閱讀邊界，內聯容器浮現時才不會與底色色彩重疊而顯得髒亂。
2. **內聯容器與主背景的「黃金 2% - 3% 明度差」配色原則 (Golden Lightness Contrast) [NEW]**：
   內聯容器的背景色與邊框**嚴禁**與主背景完全相同或明度差過大。為了呈現最舒適、柔和且不突兀的無邊界感，開發者在進行色彩選配時應遵循以下明度差指標：
   - **淺色模式 (Light Mode) ➔ 2% - 3% 的微妙明度差**：代碼底色 `--code-bg` 相對於主背景 `--brand-surface`（通常為純白 `#ffffff`，明度 L=100%）應**僅下降 2% 至 3% 的明度**，落在 **97% - 98%** 的明度帶（如溫潤森林綠白 `#f3f7f3`、極淡太空冷灰藍 `#f5f7f9`）。邊框 `--code-border` 的明度則應調淡至 **88% - 90%** 之間（如 `#dae3da` 或 `#e0e4e7`）。這能完美防禦突兀的「色塊補丁」感，呈現高級的微弱卡片感。
   - **深色模式 (Dark Mode) ➔ 2% - 3% 的微妙明度差**：代碼底色 `--code-bg` 相對於主背景 `--brand-surface`（通常為極深黑，明度 L=10% 左右）應**僅提升 2% 至 3% 的明度**（如 `#0d1124` 或 `#121d17`）。而邊框 `--code-border` 的明度應控制在 **15% - 17%** 左右，避免深色模式下的邊框與行號線喧賓奪主，確保細緻優雅。
3. **設計優勢**：這能確保在任何文字排版、縮放比例或列印狀態下，程式碼卡片、引言盒子與表格表頭皆能像「實體卡片」般清晰立體地浮現於純淨的主背景之上，既不會發生背景重疊顯得髒亂，也不會因底色支離破碎而破壞專注度。

### 3.6 Mermaid 圖表深度主題連動與自訂規範 [NEW]
本系統將 Mermaid 與 Markdown 預覽區的主題配色進行了全方位打通。為了保證極致的設計美感與使用者自訂的高自由度，所有主題必須遵守以下開發規範：

#### 1. 底層自適應運作機制與深色模式支援 (Dynamic DOM Variable Extraction) [NEW]
- **動態 DOM 提取機制**：本系統目前已升級為全新的**「全自動動態 DOM 變數提取與統一 `base` 主題自適應渲染」**架構。
  - 當用戶切換主題或切換深色模式時，預覽引擎會自動在背景建立臨時的 `div.prose.theme-[name]` 節點（若是深色模式，則自動包裹在 `div.dark` 容器中），掛載至 `body` 後利用 `getComputedStyle` 動態抓取主題宣告的所有 `--mermaid-` 變數與字型，並以此初始化全域的 Mermaid 單例。
- **天生深色主題 (Dark-only Theme) 支援**：對於直接定位在深色（如 `cosmic`, `neonrain`, `developer`）的主題，開發者可以將變數直接寫在 `.theme-[name]` 下，提取器會以最優雅的方式自動捕獲它們，完全防禦獨立模式下的「全黑退化」問題。
- **快取強制刷新**：當系統偵測到主題或深色模式發生切換時，會即時更新 `renderId` 快取鍵，強制 Mermaid 重新為當前主題生成全新的 SVG，消除任何主題殘留。

#### 2. 雙層變數 Fallback 繼承架構 (Core & Optional variables)
- **核心必填變數 (Core - 5個)**：主題開發者**僅需**在 `.theme-[name]` 與 `.dark .theme-[name]` 中填入這 5 個核心變數，即可完成 90% 圖表的最優雅適配：
  - `--mermaid-node-bg` (節點背景色)
  - `--mermaid-node-text` (節點文字色)
  - `--mermaid-node-border` (節點邊框)
  - `--mermaid-line` (箭頭與連線線條)
  - `--mermaid-edge-bg` (連線上標籤文字背景)
- **進階選配變數 (Optional)**：如序列圖專用的 `--mermaid-actor-*`、`--mermaid-note-*` 等。**若主題未定義這些進階變數，系統會自動 fallback 繼承對應的核心變數。** 這維持了主題開發的極致輕量，同時給予了精細設計極大的自訂度。
- **自適應最佳實踐 (CSS 變數動態連動)**：主題開發者通常只需在 CSS 中將這些核心變數直接關聯到該主題現有的 CSS 變數，即能自動形成與主題美感高度協調的配色，極為優雅：
  ```css
  .theme-[name] {
      /* 一鍵完成 Mermaid 主題連動 */
      --mermaid-node-bg: var(--brand-secondary, var(--code-bg));
      --mermaid-node-text: var(--theme-text-color, inherit);
      --mermaid-node-border: var(--code-border);
      --mermaid-line: var(--theme-accent-color, var(--brand-primary));
      --mermaid-edge-bg: var(--brand-surface, #ffffff);
  }
  ```

#### 3. 強制性設計防禦規則 (CRITICAL SELECTOR SHIELD)
- **【警告】嚴禁在主題 CSS 中使用 `!important` 覆蓋 `.mermaid` 內層節點樣式。**
  - 例如，**嚴禁**撰寫 `.theme-[name] .mermaid rect { fill: #xxx !important; }`。這會發生「權重霸凌」，徹底誤殺使用者在 Markdown 中使用 `classDef` 或 `style` 語法為特定節點微調的彩色配色。
  - **正確作法**：將配色變數宣告在 `.theme-[name]` 的變數列表中，渲染引擎會自動調用並作為 base 配色傳遞給 Mermaid。這樣使用者的行內自訂樣式（`classDef`）能以高權重自然蓋過預設主題，保留最棒的自訂度。
- **【關鍵防禦】首字放大 (Drop Cap) 與圖表隔離規定 [NEW]**
  - 如果主題使用了像 `.theme-[name].prose p::first-letter` 這樣的首字放大設計，**必須在 CSS 的防護重置段落中，加上對 `.mermaid` 容器以及 `svg text::first-letter` 的重置規則**，以防在沒有 `.not-prose` 包裹的獨立圖表預覽模式下，圖表文字被首字放大所誤傷導致排版截斷：
    ```css
    /* 徹底洗淨首字放大對圖表文字的污染，防護獨立圖表預覽 */
    .theme-[name].prose .mermaid p::first-letter,
    .theme-[name].prose .mermaid text::first-letter,
    .theme-[name].prose svg text::first-letter,
    .theme-[name].prose svg p::first-letter,
    .theme-[name].prose svg span::first-letter,
    .theme-[name].prose text::first-letter {
        font-size: inherit !important;
        float: none !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        margin: 0 !important;
        text-transform: none !important;
        color: inherit !important;
        font-family: inherit !important;
    }
    ```

---

## 4. 開箱即用之主題 CSS 模板骨架 (Standard Template Blueprint) [UPDATED]

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

    /* 6. 系統 UI 對接 (控制整體系統 UI 隨主題變換，強制對齊 2%-3% 黃金明度差配色原則) */
    --brand-primary: #3b82f6;
    --brand-secondary: #eff6ff;
    --brand-surface: #ffffff;      /* 主背景維持純淨 */
    --brand-accent: #60a5fa;
    --code-bg: #f5f7f9;            /* 2%-3% 黃金明度差，微降明度至 97% */
    --code-border: #e0e4e7;        /* 邊框維持在 88%-90% 溫和對比，防禦突兀 */
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
    /* 8. Mermaid 樣式變數 (自適應主題連動) */
    --mermaid-node-bg: var(--brand-secondary, var(--code-bg));
    --mermaid-node-text: var(--theme-text-color, inherit);
    --mermaid-node-border: var(--code-border);
    --mermaid-line: var(--theme-accent-color, var(--brand-primary));
    --mermaid-edge-bg: var(--brand-surface, #ffffff); /*維持畫布底色為純白,不受任何主題改變*/
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
    --brand-surface: #0f172a;      /* 深色主背景 */
    --brand-accent: #94a3b8;
    --code-bg: #131729;            /* 2%-3% 黃金明度差，微升明度 */
    --code-border: #1e243d;        /* 邊框維持在 15%-17% 溫和對比 */
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
   Markdown 基礎元素與特色客製 (Prose Binding & Customizations)
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
}

/* ─── 行內代碼 (Inline Code) 樣式自訂 [CRITICAL] ───
   必須嚴格使用排除 pre 內層的 :not(pre) 選擇器，消除區塊代碼內部的雙重線框 Bug */
.theme-[name].prose :not(pre) > code {
    background-color: var(--code-bg);
    color: var(--theme-text-color);
    border: 1px solid var(--code-border);
    border-radius: 4px;
    padding: 0.2em 0.4em;
    font-family: var(--theme-font-family);
    font-size: 0.85em;
}

/* 註：Alert 標註系統、列表 (ul/ol) 縮排階層、表格寬度等
   已在 `markdown-base.css` 統一處理，主題 CSS 不需重複撰寫。
   如果主題對 Alerts 顏色、表格特定邊框或超連結有客製需求，可按需加入以下客製： */

/* 若需要覆寫 Alerts 邊框與背景（選配） */
.theme-[name].prose blockquote.markdown-alert-note {
    border-left-color: var(--theme-alert-note-border);
    background-color: var(--theme-alert-note-bg);
}
.theme-[name].prose blockquote.markdown-alert-note .markdown-alert-title {
    color: var(--theme-alert-note-text);
}
/* 其他 Alerts (tip, important, warning, caution) 依此類推 */

/* 若需要覆寫表格特色邊框或圓角（選配） */
.theme-[name].prose table {
    border: var(--theme-table-border);
    border-radius: 8px;
}
.theme-[name].prose th {
    background-color: var(--theme-table-header-bg);
    color: var(--theme-table-header-color);
    border-bottom: var(--theme-table-header-border);
}
.theme-[name].prose td {
    border-top: var(--theme-table-border);
    color: var(--theme-text-color);
}

/* 若需要覆寫超連結特色樣式（選配） */
.theme-[name].prose a {
    color: var(--theme-link-color);
    text-decoration: var(--theme-link-decoration);
}
.theme-[name].prose a:hover {
    background-color: var(--theme-link-hover-bg);
    border-bottom-color: var(--theme-link-hover-border);
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
由於架構層已確保「列印時必定以降級的淺色模式渲染」，為了在「商務/論文文件嚴謹度」與「創意主題設計感」之間取得完美平衡，本系統建立以下**美學列印分流準則**。開發者與使用者需遵循以下規範：

1. **唯一商務/論文正規列印載體 ➔ 系統預設主題 (DEFAULT Theme)**
   - **定位**：用於論文、公文、合約、學術報告等需 100% 黑白複印、極致嚴謹閱讀的正式場景。
   - **規範**：系統已在主入口 `@media print` 中，透過 `.prose:not([class*="theme-"])` 對其進行強硬的「黑白洗淨防禦」。其內文、超連結、程式碼、以及 **Note, Tip, Warning, Caution 等彩色 Alerts 標註，會被自動且嚴密地強制洗淨為無彩色的高雅黑、白、灰色調**，呈現最無瑕的商務學術規範。

2. **創意與美學風格印表 ➔ 全體特色主題 (Academic / Classical / Developer / Minimal / Implementation Plan)**
   - **定位**：用於技術部落格、代碼藍圖、古典文藝日誌、精緻簡報與開發計劃書等強調個人美學與專業格調的場景。
   - **規範**：**徹底放寬列印色彩限制，自訂度完美回歸**。開發者不應（也不需要）在客製主題的 `@media print` 內將顏色與邊框洗淨為純黑白。系統已建立高保真保護規則，會完美將特色主題降級後的「淺色模式特色變數」（如古典宣紙的暖黃底色與硃砂紅、開發者的終端綠與語法高亮、學術主題的彩色 Alerts 標註與三線表、實作計劃的工業寶藍 Checkbox）透傳輸出至 PDF 中，保留編輯器的核心視覺張力。

### 6.3 簡明列印排版微調指南 (選配)
當淺色配色已具備足夠對比度時，開發者**甚至不需要編寫任何顏色相關的 `@media print` 規則**。僅在有以下排版需求時，在主題內加上簡單的純結構性 `@media print` 微調：
- **字體與排版尺寸**：將字體大小精準調成 A4 紙張適合 spacing 的 `10pt` 或 `11pt`，調整行高以利閱讀。
- **分頁控制**：為標題加上 `page-break-after: avoid;` 或為表格、代碼區塊加上 `page-break-inside: avoid;`，防止內容被攔腰切斷。

由於不需要考慮深色模式防禦，開發者在編寫這些微調時只需針對淺色狀態，**絕無任何 `!important` 負擔**！

---

## 7. 新增主題的完整工作流與維護指引 (New Theme Workflow & TypeScript Registry) [UPDATED]

為本系統新增一個精美的主題需要完成 5 個關鍵步驟。為了防止編譯錯誤（TypeScript compile errors）並確保全系統（預覽、列印、彈窗設定、Mermaid 單例）的無縫契合，請遵循以下完整工作流：

### 步驟 1：建立並撰寫主題 CSS 檔案
1. 在 `src/styles/themes/` 目錄下建立 `<new-theme>.css`。
2. 複製 **「4. 主題 CSS 模板骨架」**，填入您的客製配色變數與 Prose 微調。
3. **首字放大防護（若有）**：若主題使用了首字下沉，必須在 CSS 結尾加上 **「3.6.3 關鍵防禦」** 的 Drop Cap 圖表洗淨重置。

### 步驟 2：註冊 TypeScript 型別 (Type System Registry) [CRITICAL]
為了防止型別檢查失敗，必須在以下 3 個關鍵檔案中，將新主題的 `value` 名稱（如 `'new-theme'`) 追加至 `previewTheme` 的型別聯合定義中：

1. **[src/hooks/useAppSettings.ts]**：
   - 尋找 `previewTheme` 的型別定義，追加您的主題。
2. **[src/components/layout/PreviewPanel.tsx]**：
   - 尋找 `PrintPaperProps.previewTheme` 與 `PreviewPanelProps.previewTheme` 的型別定義，追加您的主題。
3. **[src/components/markdown/MarkdownPreview.tsx]**：
   - 尋找 `MarkdownPreviewProps.previewTheme` 型別，追加您的主題。

### 步驟 3：於主程式中導入主題 CSS [CRITICAL]
打開 **[App.tsx]**：
1. **導入 CSS 檔案**（在頂層導入區）：
   ```tsx
   import './src/styles/themes/new-theme.css';
   ```
   *(註：由於系統現在採用極致先進的「全自動動態 DOM 變數提取」與統一 `'base'` 自適應渲染架構，您**不再需要**手動進行任何 Mermaid 主題映射或常數維護！單純導入 CSS 即可被背景引擎自動適配)*

### 步驟 4：在偏好設定彈窗中加入 UI 選項
打開 **[SettingsModal.tsx]**：
在 `PdfSettingsPanel` 的 `ThemeGridSelector` 的 `options` 屬性陣列中，新增一個主題選項物件。格式如下：
```typescript
{
    label: '新主題名稱',            // UI 顯示的繁體中文名稱 (如 '北歐森林')
    value: 'new-theme',             // 主題字串識別 (必須與 CSS 中的 .theme-[name] 完全一致)
    hint: 'New Theme Subtitle',     // 懸停時的副標題/特色簡述
    icon: <Leaf size={16} />,       // Lucide React 圖示組件 (需在頂部 import 中加入)
    color: '#2d4a36',               // 主題亮點代表色 (通常為十六進位，用於 UI 小圓點裝飾)
    previewImg: '/image/themes/{new-theme-name}.png', // 主題縮圖路徑 (儲存於 public/image/themes/ 中)
    description: '詳細描述這款主題的美學理念與適用場景。',
    category: 'creative'            // 類別：'minimal' (極簡) | 'tech' (科技) | 'creative' (創意)
}
```

### 步驟 5：執行高保真多重驗證 (Verification Workflow)
完成上述設定後，執行以下 4 項視覺驗證以確保高品質：
1. **淺色模式驗證**：在 Markdown 預覽區，確認背景色、標題大小、超連結與表格是否精美無瑕。
2. **深色模式對比**：切換深色模式，檢查內文對比度（WCAG 2.1 是否滿足 4.5:1）以及語法高亮。
3. **Mermaid 自適應圖表**：切換到 Mermaid 獨立模式，驗證圖表是否 100% 正確套用主題配色，無古典黃污染或死黑退化。如果是 `newspaper` 或使用了 Drop Cap 的主題，確認節點文字是否清晰，絕無首字放大所致的截斷。
4. **匯出 PDF / 列印降級安全驗證**：按下 `Ctrl + P` 呼叫列印，確認系統是否正確將主題降級至淺色模式特色變數，且 layout 圓角、分頁等表現完美。
