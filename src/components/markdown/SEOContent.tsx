import React from 'react';

/**
 * SEO Accessibility Content Component
 *
 * 這個隱藏的內容區域專為搜尋引擎爬蟲 (Googlebot) 和螢幕閱讀器設計。
 */
const SEOContent: React.FC = () => {
  return (
    <div className="sr-only" role="main" aria-label="Markdown 編輯器主要區域">

      {/* ── 全頁唯一 H1 ──────────────────────────────────────────────────────
          核心關鍵字自然融入，同時兼顧 Google 判斷頁面主題的準確性。
          English title is handled as H2 below to maintain single-H1 rule.
          ────────────────────────────────────────────────────────────────── */}
      <h1> Mark It Live — Markdown Live Previewer — 免費線上 Markdown 編輯器，支援即時預覽、Mermaid 圖表與 LaTeX 公式</h1>

      {/* ==========================================
          CHINESE SEO CONTENT (中文 SEO 關鍵字最佳化)
          ========================================== */}

      <p>
        歡迎使用 Mark It Live，這是一款功能強大的<strong>免費線上 Markdown 編輯器</strong>。
        我們提供最流暢的<strong>Markdown 即時預覽</strong>與<strong>線上預覽</strong>服務，
        無須安裝任何軟體或擴充功能，打開瀏覽器即可開始寫作。
        本工具注重您的數據隱私，所有編輯、渲染與導出操作皆在本地端完成，無須上傳雲端，是您最安全的線上 Markdown 編輯工具。
      </p>

      {/* H2：融入「線上 Markdown 工具」關鍵字群，提升該主題的搜尋能見度 */}
      <h2>線上 Markdown 編輯器核心功能：為什麼選擇我們？</h2>
      <p>
        不論您是需要編寫 GitHub README 說明文件、學術論文、技術 API 規格書，還是進行日常筆記整理，
        我們的線上 Markdown 工具都提供了最全面的技術支援：
      </p>

      {/* H3 */}
      <h3>1. Markdown 線上編輯與即時同步預覽</h3>
      <ul>
        <li>實時雙向滾動同步 - 編輯區與預覽區精準滾動對齊，即時查看渲染效果</li>
        <li>支援完整 GFM 語法 - GitHub Flavored Markdown 規格相容</li>
        <li>語法高亮著色 - 自動偵測並著色數十種熱門程式語言代碼</li>
        <li>智慧表格工具 - 輕鬆建立並格式化 Markdown 表格</li>
        <li>互動式任務清單 - 支援在預覽區直接點擊勾選 Task List</li>
      </ul>

      <h3>2. Mermaid 線上流程圖與 UML 繪圖</h3>
      <p>無須額外軟體，即可在 Markdown 中使用 Mermaid 語法繪製並預覽以下圖表：</p>
      <ul>
        <li>業務流程圖 (Flowchart) - 梳理工作流與邏輯</li>
        <li>順序圖 / 時序圖 (Sequence Diagram) - 描述系統交互與訊息傳遞</li>
        <li>甘特圖 (Gantt Chart) - 專案時程與進度規劃</li>
        <li>類別圖 (Class Diagram) 與狀態圖 (State Diagram) - 軟體架構設計</li>
        <li>實體關係圖 (ER Diagram) - 資料庫 Schema 設計</li>
        <li>使用者旅程圖 (User Journey) - 分析使用者行為路徑</li>
      </ul>

      <h3>3. LaTeX 數學公式與科學符號編輯</h3>
      <ul>
        <li>LaTeX 行內公式與塊級公式 - 完美支援複雜數學方程與物理公式</li>
        <li>化學結構支援 - 透過 SMILES 表記法呈現化學符號</li>
        <li>自訂 LaTeX 巨集 - 支援自定義常用的數學表示法</li>
      </ul>

      <h3>4. Vega-Lite 數據可視化圖表</h3>
      <ul>
        <li>互動式數據圖表 - 在 Markdown 中直接嵌入折線圖、柱狀圖與散點圖</li>
        <li>數據即時轉換 - 支援在代碼塊中進行數據聚合與呈現</li>
      </ul>

      <h3>5. Excel 轉 Markdown 表格與多格式導出</h3>
      <ul>
        <li>Excel 表格直接轉換 - 複製 Excel 或 CSV 內容即可一鍵轉換為 Markdown 表格</li>
        <li>高質量 PDF 導出 - 支援自訂邊距、紙張大小，完美將 Markdown 轉為 PDF</li>
        <li>多元圖像導出 - 支援導出 PNG、SVG 與 JPG 向量或光柵圖檔</li>
        <li>PDF 合併工具 - 將多份 PDF 與圖片合併為單一文件</li>
      </ul>

      <h3>6. 12 種精選排版主題，打造個性化寫作體驗</h3>
      <p>提供多種精心設計的視覺排版主題，滿足不同寫作情境與審美需求：</p>
      <ul>
        <li>預設 / 學術 (Academic) / 極簡 (Minimal) — 均衡排版，適合技術文件與學術論文</li>
        <li>工程師 (Developer) / 實作計畫 — 全等寬字體與終端機風格，技術感十足</li>
        <li>古典宣紙 / 復古報紙 — 人文古意與印刷質感，適合創意寫作</li>
        <li>北歐森林 / 落日餘暉 — 沉浸式自然情境主題，適合日記與隨筆</li>
        <li>潛境太空 / 極光冰原 / 霓虹雨夜 — 高科技深色主題，適合深夜開發</li>
        <li>支持收藏常用主題，下次快速切換</li>
      </ul>

      <h3>7. 隱私優先的外部媒體保護盾</h3>
      <ul>
        <li>自動偵測並遮蔽外部 iframe、YouTube 影片、音訊嵌入，保護您的瀏覽隱私</li>
        <li>白名單網域管理 - 信任一次，永遠自動放行該網域內容</li>
        <li>所有操作 100% 在瀏覽器本地完成，零雲端傳輸，無任何數據洩漏風險</li>
      </ul>

      <h3>8. 進階 Markdown 語法擴展</h3>
      <ul>
        <li>GitHub Alerts 提示框 — 支援 NOTE / TIP / IMPORTANT / WARNING / CAUTION 語法</li>
        <li>分頁斷行標記 (Page Break) — 精確控制 PDF 導出時的頁面分隔位置</li>
        <li>WikiLinks 雙向連結 — 在文件間建立知識網路，打造個人知識庫</li>
        <li>ABC Notation 樂譜渲染 — 直接在 Markdown 中撰寫並預覽音樂樂譜</li>
      </ul>

      <hr />

      {/* ==========================================
          ENGLISH SEO CONTENT (GLOBAL SEO OPTIMIZATION)
          ========================================== */}

      {/* H2：讓 Google 同時掌握中英文搜尋意圖 */}
      <h2>Free Online Markdown Editor with Live Preview — Key Features</h2>
      <p>
        Mark It Live is a free, feature-rich <strong>online Markdown editor</strong>
        providing seamless <strong>live Markdown preview</strong>. Write, edit, and visualize
        Markdown files in real-time right in your browser. With a privacy-first architecture,
        all editing, rendering, and exporting are processed locally on your device, ensuring
        your document data never leaves your computer.
      </p>

      <h3>Live Markdown Editing & Sync Scroll</h3>
      <ul>
        <li>Real-time Synchronized Scrolling - Edit on the left and see the rendered Markdown instantly on the right.</li>
        <li>GitHub Flavored Markdown (GFM) Compatibility - Full support for tables, task lists, and autolinks.</li>
        <li>Syntax Highlighting - Beautiful syntax coloring for code blocks across dozens of programming languages.</li>
        <li>Markdown Table Editor - Effortlessly create, edit, and align tables online.</li>
      </ul>

      <h3>Mermaid Diagramming Online</h3>
      <p>Render professional diagrams directly within your Markdown using Mermaid.js syntax:</p>
      <ul>
        <li>Flowcharts & Workflows - Map out business logic and processes.</li>
        <li>Sequence Diagrams - Visualize system interactions and message flows.</li>
        <li>Gantt Charts - Plan project timelines and milestones.</li>
        <li>ER Diagrams - Design database schemas and entities.</li>
        <li>Class & State Diagrams - Model object-oriented structures.</li>
      </ul>

      <h3>LaTeX Math Equations & Scientific Notation</h3>
      <ul>
        <li>Inline & Block Math Formulas - Write complex mathematical and physical equations using standard LaTeX.</li>
        <li>Chemical Structures - Render chemistry notations using SMILES strings.</li>
        <li>Custom LaTeX Macros - Define custom macros for faster writing.</li>
      </ul>

      <h3>12 Premium Markdown Themes for Every Writing Style</h3>
      <p>Choose from 12 carefully crafted visual themes to match your writing context:</p>
      <ul>
        <li>Academic, Minimal & Default - Perfect for technical docs and research papers.</li>
        <li>Developer & Implementation Plan - Monospace terminal aesthetic for coders.</li>
        <li>Classical, Newspaper - Creative and humanistic print-inspired layouts.</li>
        <li>Nordic Forest, Sunset Glow - Immersive nature-inspired writing moods.</li>
        <li>Cosmic, Aurora, Neon Rain - Dark high-tech themes for late-night sessions.</li>
      </ul>

      <h3>Privacy-First External Media Shield</h3>
      <ul>
        <li>Automatically blocks external iframes, YouTube embeds, and audio for privacy protection.</li>
        <li>Trusted domain whitelist - approve once, always allowed thereafter.</li>
        <li>100% local processing - zero cloud uploads, zero data leakage.</li>
      </ul>

      <h3>Advanced Markdown Syntax Extensions</h3>
      <ul>
        <li>GitHub Alerts - NOTE, TIP, IMPORTANT, WARNING, CAUTION callout boxes.</li>
        <li>Page Break markers for precise PDF pagination control.</li>
        <li>WikiLinks for bidirectional document linking and personal knowledge base.</li>
        <li>ABC Notation for rendering musical scores inside Markdown.</li>
      </ul>

      <h2>Frequently Asked Questions About Our Markdown Editor</h2>
      <ul>
        <li>How to preview Markdown online? Simply paste or write your text in our editor, and the live preview renders immediately on the right panel.</li>
        <li>Can I export Markdown to PDF? Yes, our tool supports high-quality PDF export with customizable paper size, orientation, and margins.</li>
        <li>Is my data safe? Absolutely. We run 100% locally in your browser. No files are ever uploaded to any server.</li>
        <li>How many themes are available? We offer 12 premium themes including Academic, Developer, Nordic Forest, Aurora, Neon Rain, and more.</li>
        <li>Does it support offline use? After the first load, the app is cached and can be used offline for editing and previewing existing documents.</li>
      </ul>

      <h2>Developer Information & Open Source</h2>
      <p>
        Developed and maintained by Huang Jyun Ying. This online Markdown previewer is free and open-source.
        Contribute to our repository on GitHub, report issues, or suggest new features to help the community.
      </p>
    </div>
  );
};

export default SEOContent;
