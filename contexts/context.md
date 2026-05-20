# 專案核心上下文 (Project Context)

本文件提供 Markdown Live Previewer 的核心架構概述、設計哲學、重大技術變革以及開發規範，旨在幫助新進開發者快速理解專案的全局脈絡。

---

## 🎯 專案概述 (Project Overview)

**Markdown Live Previewer** 是一款功能強大且著重隱私的網頁版 Markdown 編輯器與即時預覽工具。它允許用戶以直觀的高效能介面編寫 Markdown 文件，同時支援科學運算、工程圖表與多格式導出。所有運算與渲染皆在瀏覽器端（客戶端）完成，不向任何伺服器傳送用戶文件內容，保障絕對的安全與隱私。

---

## 🏗️ 核心架構與渲染管線 (Core Architecture & Pipeline)

專案基於 **Vite + React + TypeScript** 構建，核心由 CodeMirror 編輯器與動態 React Markdown 預覽管線組成：

```mermaid
graph TD
    UserEdit["1. CodeMirror 編輯器 (使用者輸入)"]
    MarkdownPreview["2. MarkdownPreview 元件接收 Raw Markdown"]
    RemarkCompiler["3. Unified/Remark 編譯管線 (AST 樹解析)"]
    CustomPlugins["4. 自訂 AST 插件區區 (remarkGithubAlerts, remarkWikiLink, remarkPageBreak)"]
    RehypeCompiler["5. Rehype 編譯管線 (轉換為 HTML AST)"]
    ReactRender["6. React Markdown 渲染 (React DOM)"]
    ScienceTools["7. 科學/圖表動態渲染 (Mermaid, MathJax, Vega, SMILES)"]

    UserEdit -->|文字流| MarkdownPreview
    MarkdownPreview --> RemarkCompiler
    RemarkCompiler --> CustomPlugins
    CustomPlugins --> RehypeCompiler
    RehypeCompiler --> ReactRender
    ReactRender --> ScienceTools
```

### 重大技術變革：AST 插件化重構 (2026-05)

在專案早期版本中，針對特殊功能（如 WikiLink、手動強制換頁及 GitHub-style Alerts）的解析，是透過**字串正則表示式預處理**（在 raw markdown 傳入編譯器前進行替換）或在 **React Render 階段對 DOM 節點進行複製克隆**來完成。

此架構存在嚴重的缺點：
1. **誤殺 Code Blocks**：字串正則替換無法辨識上下文，會不小心把程式碼區塊內部的 `[[Link]]` 或 `\pagebreak` 語法也一併替換，破壞程式碼內容。
2. **效能瓶頸**：在 React Render 階段進行深度遍歷與克隆會造成嚴重的效能損耗，導致輸入卡頓。
3. **維護難度高**：邏輯分散在預處理和 UI 渲染中，難以進行獨立測試。

**當前架構（AST 插件驅動）**：
專案目前已全面重構，所有語意解析工作皆移至 **Unified / Remark 的 AST（抽象語法樹）階段** 處理。透過自訂的 Remark 插件，系統能夠安全地遍歷 AST 節點，防禦性地避開 `code` 與 `inlineCode` 節點，並在語法樹中完成節點的新增、拆分與類別注入，徹底解決了上述問題，實現了：
- **安全邊界**：程式碼區塊內容獲得 100% 保護。
- **極速渲染**：AST 遍歷與轉換一次完成，解耦 UI 渲染，提升編輯流暢度。
- **100% 測試覆蓋**：插件邏輯可透過單元測試進行獨立且完整的驗證。

---

## ⚡ 核心功能與組件架構

1. **富媒體與科學圖表**：
   - **Mermaid 整合** (`DiagramBlock.tsx`)：支援流程圖、序列圖、甘特圖等 7 種圖表。
   - **MathJax 渲染** (`rehype-mathjax`)：提供高品質的 LaTeX 數學公式展示，並在生產環境中覆蓋斷行樣式以求美觀。
   - **Vega-Lite 統計圖表**：支援宣告式資料視覺化。
   - **化學結構式 (SMILES)**：動態解析化學公式。
   - **樂譜解析 (ABCJS)** (`AbcBlock.tsx`)：將文字樂譜轉換為視覺化五線譜與音訊播放。

2. **自訂 Markdown 語意插件** (位於 `src/components/markdown/`)：
   - [remarkGithubAlerts.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/remarkGithubAlerts.ts)：將 `[!NOTE]` / `[!WARNING]` 等區塊轉換為美觀的 GitHub 風格警示盒。
   - [remarkWikiLink.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/remarkWikiLink.ts)：將 `[[頁面名稱]]` 安全地轉換為內部錨點連結。
   - [remarkPageBreak.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/remarkPageBreak.ts)：將 `\pagebreak` 等強制分頁指令轉換為物理換頁節點。

3. **列印與 PDF 工具**：
   - 支援將資料夾內的所有 Markdown 合併下載或合併列印。
   - 工具箱整合客戶端 `pdf-lib`，支援在瀏覽器中直接排序、等比縮放並合併外部 PDF/圖片。

---

## 🛠️ 開發與維護規範 (Development Standards)

為確保本專案的可維護性與高品質，所有開發人員必須遵守以下規範：

1. **目錄結構**：
   * **原始碼**：主要邏輯按照類別置於 `src/`。Markdown 解析插件統一放置於 `src/components/markdown/`。
   * **測試代碼**：所有單元測試必須存放在 `tests/` 目錄中，並對應原始碼目錄結構（例如 `tests/components/`）。
   * **說明文件**：所有架構說明、維護手冊、部署指南等必須存放在 `docs/` 中。

2. **完成的定義 (Definition of Done)**：
   * 任何新開發的元件、自訂插件或重大邏輯在**未附帶單元測試 (Unit Test)** 前，視為「未完成」。
   * 所有新增功能或架構異動在**未同步更新 README 或 `docs/` 指南**前，視為「未交付」。

3. **代碼風格與語系**：
   * 新撰寫的程式碼註解、工作流文件、技術文件等，除專門針對機器讀取的配置外，一律使用**繁體中文 (ch-tw)**。
   * 程式碼保持高可讀性，避免 Magic Numbers 與過度巢狀。
