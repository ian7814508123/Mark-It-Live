# 主題開發發想與深度設計草案 (Theme Design Drafts)

為了配合全新的主題規格規範，本文件深入設計了 **「古風宣紙風 (Imperial Scroll)」** 與 **「復古報紙風 (Retro Newspaper)」** 兩大主題的細緻配色與獨特排版機制。同時，另外發想了兩款極具視覺衝擊的潛在主題，供未來協同討論與擴充。

---

## 📜 主題 A：古風宣紙 / 人文古典風 (Imperial Scroll / Parchment)

### 1. 設計理念與適用場景
* **核心意象**：紙墨相惜、硃砂點綴、古意盎然、行文悠遠。
* **適用情境**：撰寫古典詩詞、歷史筆記、哲學評論、人文社科文章、手寫札記。
* **UX 目標**：給人一種在古老宣紙或羊皮紙上運筆的溫潤感，字體典雅，極具人文情懷。

### 2. 精細色彩規格 (Colors Specification)

| 變數 / 元素 | 淺色模式 (Light Mode) | 深色模式 (Dark Mode `.dark .theme-academic`) |
| :--- | :--- | :--- |
| `background` (底色) | `#faf6eb` (宣紙暖米黃) | `#181916` (玄黑/竹炭灰) |
| `--theme-text-color` | `#2c2a29` (徽墨暖黑色，非死板純黑) | `#e5dfd3` (溫潤玉白色) |
| `--theme-accent-color` | `#b22222` (硃砂紅色) | `#c9423a` (微亮硃砂紅) |
| `--brand-primary` | `#b22222` (硃砂紅 UI) | `#c9423a` (硃砂紅 UI) |
| `--code-bg` (代碼/圖表背景) | `#fdfbf7` (極淡麻色紙底) | `#20211d` (玄灰紙底) |
| `--code-border` | `#e6dfd3` (竹麻色邊框) | `#33342e` (深炭灰邊框) |
| `blockquote` (引言) | 左框 `2pt solid #b22222`，無背景 | 左框 `2pt solid #c9423a` |

### 3. 獨特排版與字體 (Typography & Layout)
* **字體堆疊 (Font Stack)**：
  ```css
  --theme-font-family: "Songti SC", "STSong", "SimSun", "Georgia", "Times New Roman", serif;
  ```
  優先使用帶有東方書法氣韻的**宋體/襯線體**，展現古籍排版美學。
* **排版對齊**：`--theme-text-align: justify` (兩端對齊)，使中文字幕排列如古籍般整齊。
* **古典三線表格**：
  表格頂底邊線較粗，表頭底線較細，**完全不使用豎向邊框線**，營造經典的印刷線裝書風格。
  ```css
  .theme-academic.prose table {
      border-top: 2px solid var(--theme-accent-color);
      border-bottom: 2px solid var(--theme-accent-color);
      border-left: none;
      border-right: none;
  }
  ```

---

## 📰 主題 B：復古報紙 / 紐約時報風 (Retro Newspaper)

### 1. 設計理念與適用場景
* **核心意象**：鉛字印刷、頭條大標、社論雙線、復古專欄情懷。
* **適用情境**：部落格長文、深度社論、時事隨筆、人物專訪。
* **UX 目標**：高度還原 20 世紀實體報紙的油墨印刷質感，具有極強的視覺張力與故事感。

### 2. 精細色彩規格 (Colors Specification)

| 變數 / 元素 | 淺色模式 (Light Mode) | 深色模式 (Dark Mode) |
| :--- | :--- | :--- |
| `background` (底色) | `#f5ede1` (泛黃新聞報紙色) | `#1b1a19` (深炭黑色) |
| `--theme-text-color` | `#111111` (印刷鉛字黑) | `#e2dbcd` (磨損鉛白) |
| `--theme-accent-color` | `#000000` (純黑色) | `#ffffff` (純白色) |
| `--brand-primary` | `#111111` (鉛黑 UI) | `#ffffff` (反白 UI) |
| `--code-bg` (代碼/圖表背景) | `#ebe3d5` (略深報紙色) | `#252422` (油煙黑) |
| `--code-border` | `#d1c7b7` (油墨擦痕邊框) | `#3e3c39` (深鉛灰邊框) |
| `blockquote` (引言) | 上下雙線 `3px double #111`，左右無框 | 上下雙線 `3px double #fff`，左右無框 |

### 3. 獨特排版與字體 (Typography & Layout)
* **字體堆疊 (Font Stack)**：
  標題使用極粗、大氣開闊的粗襯線體 (Slab Serif)，內文使用適度緊湊的 Serif 體。
  ```css
  --theme-heading-font: "Playfair Display", "Times New Roman", "SimHei", serif;
  --theme-font-family: "Georgia", "Times New Roman", "SimSun", serif;
  ```
* **📰 首字放大 (Drop Cap) 機制**：
  在報紙排版中，段落的第一個字大號展示能瞬間拉高視覺層次。我們可以藉由 CSS Pseudo-elements 來完美實踐：
  ```css
  .theme-newspaper.prose p:first-of-type::first-letter {
      font-size: 3.5rem;
      float: left;
      font-weight: 800;
      line-height: 1;
      margin-right: 0.5rem;
      color: var(--theme-accent-color);
  }
  ```
* **社論專欄引言 (Editorial Blockquote)**：
  引言不再使用一般的左側單邊線，而是使用**上下雙橫實線 (Double line)**，並將文字置中，模仿經典報紙專欄的插話框效果。

---

## 🎨 其他發想主題推薦 (Future Concept Pipeline)

為了讓 Markdown 編輯器的主題廣度更完善，我另外發想了兩款極具特色的主題概念：

### 5. 🌲 北歐森林 / 鼠尾草護眼 (Nordic Forest / Sage)
* **風格主基調**：淡雅、平靜、護眼。
* **淺色模式**：鼠尾草綠底色 (`#f4f6f4`) 搭配橄欖深綠文字 (`#1c2d20`)。
* **深色模式**：深邃針葉林綠背景 (`#0d1712`) 搭配亮薄荷綠強調 (`#6ee7b7`)。
* **適用場景**：睡前日記、詩歌創作、專注讀書筆記。能讓人在螢幕前感覺到森林的靜謐。

### 6. 🌌 幻境太空 / 星際探索 (Cosmic Voyage / Deep Space)
* **風格主基調**：深邃、螢光、科幻。
* **淺色模式**：乾淨銀白色 (`#f1f3f5`) 搭配星雲藍紫漸層連結。
* **深色模式**：深空黑背景 (`#060814`)，搭配星系金 (`#f59e0b`) 與超新星紫 (`#a855f7`) 的發光邊框。
* **適用場景**：天文科普、科幻小說寫作、前沿人工智慧技術說明書。

---

> [!NOTE]
> **共同討論提示**：
> 以上設計規格已完全對齊我們的全新標準主題規格。如果您決定開發其中某款（例如「古風宣紙」或「復古報紙」），我可以在 `src/styles/themes/` 目錄下直接為您實作其 CSS 代碼，並同步將其新增至偏好設定的面板中！
