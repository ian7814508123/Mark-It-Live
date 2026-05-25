# 主題開發發想與深度設計草案 (Theme Design Drafts)

為了配合全新的主題規格規範，本文件精確規劃了兩款即將實作、極具視覺衝擊力與護眼/科技實用性的全新暫定開發主題。
原有的「復古報紙風 (Retro Newspaper)」與「古典宣紙 (Classical)」已正式開發完畢並上線生產，故本發想草案專注於未來新主題的精細設計，供後續協同開發。

---

## 🌲 主題 A：北歐森林 / 鼠尾草護眼 (Nordic Forest / Sage) 【STATUS: PLANNED】

### 1. 設計理念與適用場景
* **核心意象**：清晨薄霧林地、松針陰影、鼠尾草綠、岩石苔蘚、大地木質質感。
* **適用情境**：心流寫作、睡前日記、詩歌創作、專注讀書筆記、長時間文件編寫。
* **UX 目標**：透過極低反射、自然平和的大地色彩，最大程度過濾有害藍光，提供極致的眼部放鬆與沉浸式寫作體驗。

### 2. 精細色彩規格 (Colors Specification)

| 變數 / 元素 | 淺色模式 (Light Mode) | 深色模式 (Dark Mode) |
| :--- | :--- | :--- |
| `background` (底紙底色) | `#f4f6f4` (清晨鼠尾草綠泥色) | `#0d1712` (深邃針葉林黑綠) |
| `--theme-text-color` | `#1c2d20` (松針橄欖深綠) | `#e2ece6` (清晨白霧松白) |
| `--theme-accent-color` | `#2d4a36` (林地深葉綠) | `#6ee7b7` (瑩亮薄荷綠) |
| `--brand-primary` | `#2d4a36` (大地綠 UI) | `#6ee7b7` (瑩亮綠 UI) |
| `--code-bg` (代碼/圖表背景) | `#e9ece9` (略深岩石灰綠) | `#13221b` (暗林翠炭黑) |
| `--code-border` | `#d2ded2` (松脂灰綠邊框) | `#1f362b` (深松葉綠邊框) |
| `blockquote` (引言) | 左側單邊線 `4px solid #2d4a36`，背景 `#edf2ed` | 左側單邊線 `4px solid #6ee7b7`，背景 `#13221b` |

### 3. 獨特排版與字體 (Typography & Layout)
* **字體堆疊 (Font Stack)**：
  標題使用優雅、帶有北歐冷感且開闊的無襯線字體，內文使用柔和易讀的無襯線或溫和襯線字體。
  ```css
  --theme-heading-font: "Outfit", "Inter", "Heiti TC", sans-serif;
  --theme-font-family: "Inter", "PingFang TC", "Hiragino Sans GB", sans-serif;
  --theme-line-height: 1.7;
  --theme-text-align: left;
  ```
* **🌲 自然列表符號 (Leaf Bullets)**：
  無序列表點採用精緻的針葉綠圓點或自然葉片標記，呈現林間漫步的有機氛圍：
  ```css
  .theme-forest.prose li::marker {
      color: var(--theme-accent-color);
      font-size: 0.9em;
  }
  ```
* **松木引言 (Sage Blockquote)**：
  引言左側粗實線為松針綠，底色帶有極低飽和度的清透嫩芽綠，字體呈現極具文藝感的仿手寫斜體，非常適合抒情詩歌或心靈隨筆。

---

## 🌌 主題 B：潛境太空 / 星際探索 (Cosmic Voyage / Deep Space) 【STATUS: PLANNED】

### 1. 設計理念與適用場景
* **核心意象**：冷冽太空船艙、霓虹發光二極體、深空暗物質、星雲紫、星系金。
* **適用情境**：技術白皮書、前沿 AI 說明書、科幻小說創作、代碼藍圖與架構圖表展示。
* **UX 目標**：藉由深邃深海星際藍背景與螢光霓虹重點邊框的強烈對比，產生極具未來科幻感與高張力視角的展示效果。

### 2. 精細色彩規格 (Colors Specification)

| 變數 / 元素 | 淺色模式 (Light Mode) | 深色模式 (Dark Mode) |
| :--- | :--- | :--- |
| `background` (底紙底色) | `#f1f3f5` (太空艙冷金屬銀) | `#060814` (暗物質深空星際藍) |
| `--theme-text-color` | `#1e293b` (冷石板暗藍) | `#f8fafc` (星際無瑕太空白) |
| `--theme-accent-color` | `#6366f1` (星雲光芒靛藍) | `#a855f7` (螢光超新星紫) |
| `--brand-primary` | `#6366f1` (艙內冷靛藍 UI) | `#a855f7` (霓虹螢光紫 UI) |
| `--code-bg` (代碼/圖表背景) | `#e2e8f0` (冷光顯示螢幕灰) | `#0c0f24` (暗星際藍儀表底色) |
| `--code-border` | `#cbd5e1` (金屬艙口接縫邊框) | `#1e254d` (超新星霓虹發光邊框) |
| `blockquote` (引言) | 太空艙紀錄風格，左邊框 `4px solid #6366f1`，背景 `#eff6ff` | 終端通訊風格，左邊框 `4px solid #a855f7`，背景 `rgba(168, 85, 247, 0.05)` |

### 3. 獨特排版與字體 (Typography & Layout)
* **字體堆疊 (Font Stack)**：
  全主題採用等寬或極具硬核幾何感的未來風無襯線字體，呈現冷峻且精確的科技氣息。
  ```css
  --theme-heading-font: "Orbitron", "Fira Code", "Heiti TC", monospace;
  --theme-font-family: "Fira Code", "JetBrains Mono", "Courier New", monospace;
  --theme-line-height: 1.6;
  --theme-text-align: left;
  ```
* **🌌 星芒列表點 (Cosmic Bullets)**：
  無序列表點改為科幻感十足的瑩亮小星芒符號 (✦ 或 ✧)：
  ```css
  .theme-cosmic.prose ul {
      list-style-type: '✦  ' !important;
  }
  .theme-cosmic.prose li::marker {
      color: var(--theme-accent-color);
      text-shadow: 0 0 8px var(--theme-accent-color); /* 星芒帶有細微霓虹發光效果 */
  }
  ```
* **儀表板發光容器 (Glow Hover Card)**：
  代碼卡片與 SVG 圖表容器在滑鼠懸停 (Hover) 時，會散發出非常細密的 **「瑩亮紫/星際藍外發光 (box-shadow glow)」**，極度酷炫：
  ```css
  .theme-cosmic.prose .enhanced-codeblock:hover,
  .theme-cosmic.prose .diagram-block-container:hover {
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.25), 0 0 1px rgba(168, 85, 247, 0.5) !important;
      border-color: var(--theme-accent-color) !important;
      transition: all 0.3s ease-in-out;
  }
  ```


# 主題選擇器 UX 優化與未來功能發想

內建的主題（Theme）越來越多時，目前彈出視窗中「兩欄平鋪按鈕」的設計會面臨以下痛點：
- 1. 畫面擁擠 
- 2. 缺乏分類 
- 3. 載入與擴充成本
---
## 1. 介面設計（UI/UX）優化
### A. 分類標籤頁（Tabbed Categories）
將主題依照「風格」或「使用場景」進行分類，利用左側側邊欄或頂部 Tab 切換，避免一次呈現太多選項。

分類範例：全部、簡約（Minimal）、專業（Academic/Dev）、藝術/復古（Creative）。

好處：使用者能快速縮小尋找範圍，且單一頁面只需渲染少數主題。

### B. 網格卡片-> 這應該也不太理想, 因為佔據空間
放棄目前單純的文字按鈕，改用網格卡片（Grid View）設計。

每個卡片內包含：主題名稱、風格標籤，以及一個微縮版的效果縮圖（Thumbnail）。

當滑鼠懸停（Hover）或點擊卡片時，右側或背景可以直接預覽該主題套用在 Markdown 上的局部效果，減少使用者反覆點擊切換的成本。

### C.  下拉選單

## 2. 未來功能擴充（Advanced Features）
A. 收藏/常用主題（Favorites / Recently Used）當主題多達 20 個以上時，多數使用者常用的其實固定就那 2-3 個。可以在主題卡片右上角加上「星星（$\star$）」功能，讓使用者收藏常用主題。在最上方獨立一區「常用主題」，讓使用者無需每次都重新尋找。
B. 社群/自訂主題（Custom CSS / Theme Marketplace）
既然這是一個專業的 Markdown 編輯器，未來可以考慮開放自訂主題：
提供一個「自訂（Custom）」選項，允許使用者直接貼上自訂的 CSS 樣式程式碼。
長期來看，甚至能像 Obsidian 一樣，讓使用者透過連結匯入 GitHub 上的第三方主題。
但這勢必要釋出我們的主題開發規格, 與該怎麼與base主題配合