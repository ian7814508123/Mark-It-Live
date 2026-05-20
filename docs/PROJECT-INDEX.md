# 🗺️ 專案結構與文件導航 (Project Map)

本文件提供 Markdown Live Previewer 的完整目錄結構說明與所有說明文件的索引，方便開發人員與維護者快速定位資源與理解專案佈局。

---

## 📁 完整專案結構樹 (Directory Structure)

專案結構遵循嚴格的開發規範：原始碼集中於 `src/`，單元測試位於 `tests/`，說明文件位於 `docs/`。以下是最新重構後的完整結構樹（點擊檔案名稱可直接跳轉至對應實體檔案）：

```
Markdown-live-previewer/
│
├── 📦 項目配置文件 (核心)
│   ├── [index.html](file:///c:/Users/User/Desktop/Markdown-live-previewer/index.html)                   ✏️ (SEO Meta, JSON-LD Schema & FAQ)
│   ├── [index.tsx](file:///c:/Users/User/Desktop/Markdown-live-previewer/index.tsx)                    🚀 (React 應用進入點)
│   ├── [App.tsx](file:///c:/Users/User/Desktop/Markdown-live-previewer/App.tsx)                      🏠 (根組件 & 多文件合併下載邏輯)
│   ├── [package.json](file:///c:/Users/User/Desktop/Markdown-live-previewer/package.json)                 📦 (專案依賴與版本配置)
│   └── [vite.config.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/vite.config.ts)               ⚡ (Vite 建置配置、模組拆分與 SEO 驗證檔生成插件)
│
├── 📚 [docs/](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs)                         📖 (說明文件目錄 - 本專案核心指南)
│   ├── [PROJECT-INDEX.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/PROJECT-INDEX.md)             🗺️ (專案地圖 - 本文件)
│   ├── [DEVELOPMENT.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/DEVELOPMENT.md)               🛠️ (開發與部署一站式指南) [精簡重整]
│   ├── [REMARK-PLUGINS.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/REMARK-PLUGINS.md)            🔌 (自訂 AST 插件維護手冊) [全新增設]
│   ├── [SEO-GUIDE.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/SEO-GUIDE.md)                 🎯 (SEO 核心與維護指南) [精簡重整]
│   ├── [print-and-pdf.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/print-and-pdf.md)             🖨️ (列印、分頁與 PDF 合併指南) [完全重構]
│   └── [dependencies.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/dependencies.md)              📦 (依賴項第三方套件與授權說明)
│
├── 🗃️ [contexts/](file:///c:/Users/User/Desktop/Markdown-live-previewer/contexts)                     📁 (專案核心上下文 - 中文原生協定)
│   └── [context.md](file:///c:/Users/User/Desktop/Markdown-live-previewer/contexts/context.md)                   ⭐ (專案核心上下文說明) [全新增設]
│
├── 🔧 [public/](file:///c:/Users/User/Desktop/Markdown-live-previewer/public)                       🌐 (網頁靜態資源)
│   ├── [robots.txt](file:///c:/Users/User/Desktop/Markdown-live-previewer/public/robots.txt)                   ✏️ (搜尋引擎爬蟲規則)
│   ├── [sitemap.xml](file:///c:/Users/User/Desktop/Markdown-live-previewer/public/sitemap.xml)                  ✏️ (網站地圖 - 每週更新)
│   └── .well-known/                 🔒 (安全合規資訊目錄)
│       └── security.txt             🔒 (安全漏洞回報聯繫通道)
│
├── 💻 [src/](file:///c:/Users/User/Desktop/Markdown-live-previewer/src)                          💻 (前端源代碼)
│   ├── [components/](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components)                  🧩 (React UI 組件)
│   │   ├── [SEOContent.tsx](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/SEOContent.tsx)           🔍 (SEO 專屬 8k 字隱藏語意元件)
│   │   └── [markdown/](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown)                📝 (Markdown 編輯與預覽核心組件區)
│   │       ├── [MarkdownPreview.tsx](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/MarkdownPreview.tsx)  🖼️ (預覽面板核心 - 整合自訂 Remark 插件)
│   │       ├── [remarkGithubAlerts.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/remarkGithubAlerts.ts)🔌 (自訂 AST 插件：警示盒轉換)
│   │       ├── [remarkWikiLink.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/remarkWikiLink.ts)    🔌 (自訂 AST 插件：雙括號連結轉換)
│   │       └── [remarkPageBreak.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/src/components/markdown/remarkPageBreak.ts)   🔌 (自訂 AST 插件：手動強制換頁)
│   └── styles/                      🎨 (CSS 樣式系統與多主題配置)
│
└── 🧪 [tests/](file:///c:/Users/User/Desktop/Markdown-live-previewer/tests)                        🧪 (單元與整合測試)
    └── [components/](file:///c:/Users/User/Desktop/Markdown-live-previewer/tests/components)                  🧩 (插件與核心邏輯單元測試)
        ├── [remarkGithubAlerts.test.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/tests/components/remarkGithubAlerts.test.ts) 🧪 (警示盒插件單元測試)
        ├── [remarkWikiLink.test.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/tests/components/remarkWikiLink.test.ts)   🧪 (WikiLink 插件單元測試)
        └── [remarkPageBreak.test.ts](file:///c:/Users/User/Desktop/Markdown-live-previewer/tests/components/remarkPageBreak.test.ts)  🧪 (強制分頁插件單元測試)
```

---

## 📖 說明文件導覽 (Documentation Index)

經過深度精簡與整合，我們將分散混亂的文件進行了合併。以下是最新整理出的核心說明文件指南：

### 1. 專案背景與架構變革 (核心必讀)
*   **[⭐ 專案核心上下文 (contexts/context.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/contexts/context.md)**: 了解專案基本現況、前端渲染管線設計、以及從傳統正則預處理升級為 **AST 插件化架構** 的重大技術演進。
*   **[🔌 自訂 AST 插件維護手冊 (docs/REMARK-PLUGINS.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/REMARK-PLUGINS.md)**: 詳細說明 `remarkGithubAlerts`、`remarkWikiLink` 與 `remarkPageBreak` 三個插件的 AST 節點匹配、節點轉換分裂與安全邊界防禦（保護代碼塊）的技術內幕，並提供測試執行指引。

### 2. 開發與部署 (運維指引)
*   **[🛠️ 開發與部署一站式完整指南 (docs/DEVELOPMENT.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/DEVELOPMENT.md)**: 涵蓋本地 Node 運行環境設定、**Docker/Docker-Compose 部署**、**GitHub Pages 雙模路徑設計**、**Render 雲端平台託管**以及**自訂網域 DNS 與 TXT 擁有權驗證**。

### 3. 排版列印與進階工具
*   **[🖨️ 列印預覽、分頁與 PDF 合併指南 (docs/print-and-pdf.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/print-and-pdf.md)**: 解析如何透過 `@media print` 與代碼防截斷樣式實現瀏覽器端 PDF 列印、AST 驅動的分頁機制、多文件合併下載/列印，以及工具箱中基於 `pdf-lib` 的客戶端二進位 PDF 合併工具。

### 4. 搜尋引擎優化與檢查
*   **[🎯 SEO 核心與維護指南 (docs/SEO-GUIDE.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/SEO-GUIDE.md)**: 剖析專案的「五層 SEO 優化架構」，介紹 `SEOContent.tsx` 8,000 字 sr-only 隱藏語意文本與 JSON-LD 結構化數據，並提供每週/月/季/年的維護計劃與 GSC 故障排除手冊。

### 5. 第三方套件
*   **[📦 依賴套件說明 (docs/dependencies.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/dependencies.md)**: 條列專案 `package.json` 中的核心運行依賴與開發依賴，並載明對應的開源授權協議 (License)。

---

## 🧭 開發者快速查找建議

*   **我是新加入的開發人員**：請先閱讀 [專案核心上下文 (contexts/context.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/contexts/context.md)。
*   **我要修改 Markdown 的渲染行為或新增語法**：請詳細研讀 [自訂 AST 插件維護手冊 (docs/REMARK-PLUGINS.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/REMARK-PLUGINS.md)。
*   **我需要修復列印格式或調整分頁樣式**：請參閱 [列印、分頁與 PDF 合併指南 (docs/print-and-pdf.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/print-and-pdf.md)。
*   **我要發布新版本或綁定自訂網域**：請參考 [開發與部署一站式指南 (docs/DEVELOPMENT.md)](file:///c:/Users/User/Desktop/Markdown-live-previewer/docs/DEVELOPMENT.md)。

---

**最後更新時間**：2026-05-20  
**文件維護者**：Huang Jyun Ying / Antigravity AI Partner
