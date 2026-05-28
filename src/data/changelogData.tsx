import React from 'react';
import { PackagePlus, Palette, MessageSquare, Check, X, Star } from 'lucide-react';

export interface ChangelogSubSection {
  icon: React.ComponentType<any>;
  title: string;
  details: React.ReactNode[];
}

export interface ChangelogCard {
  type: 'version_header';
  title: string;
  cardBgGradient: string;
  cardBorderColor: string;
  subSections?: ChangelogSubSection[];
  bullets?: React.ReactNode[];
}

export const CHANGELOG_CARDS: ChangelogCard[] = [
  {
    type: 'version_header',
    title: 'v4.1.5 (2026/05/28) - 編輯介面UX提升',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: Palette,
        title: '介面與體驗優化 (Improvements)',
        details: [
          <>
            <strong>加入 Sticky scroll:</strong> 目前支援追蹤 <code className="text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 font-mono px-1 ">#</code> (H1~H6) 標題。
          </>
        ]
      }
    ]
  },
  {
    type: 'version_header',
    title: 'v4.1.4 (2026/05/27) - 修正樣式錯誤',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: Check,
        title: '體驗優化 (Improvements)',
        details: [
        ]
      }
    ]
  },
  {
    type: 'version_header',
    title: 'v4.1.3 (2026/05/27) - UI美化',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: Palette,
        title: '介面與體驗優化 (Improvements)',
        details: [
          <>
            <strong>調整樣式</strong>
          </>
        ]
      }
    ]
  },
  {
    type: 'version_header',
    title: 'v4.1.2 (2026/05/26) - 精緻導覽手冊與介面美化',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: PackagePlus,
        title: '新增功能 (New Features)',
        details: [
          <>
            <strong>內建完整使用手冊</strong>：在偏好設定的關於頁面中新增了「打開完整使用手冊」的引導按鈕，點擊可一鍵開啟功能導覽與快速鍵教學，方便新手快速上手。
          </>
        ]
      },
      {
        icon: Palette,
        title: '介面與體驗優化 (Improvements)',
        details: [
          <>
            <strong>發行內容介面升級</strong>：全新改版了偏好設定中的發行日誌面板，引進更具現代感的編年體歷史卡片排版。
          </>,
          <>
            <strong>中文字元相容性優化</strong>：優化了系統內部編碼，修復了在特定情況下桌面端部分路徑中文字元可能出現亂碼的問題。
          </>
        ]
      }
    ]
  },
  {
    type: 'version_header',
    title: 'v4.1.0 (2026/05/21) - 合併列印 PDF 與實作計畫新主題',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: PackagePlus,
        title: '新增功能 (New Features)',
        details: [
          <>
            <strong>多文件合併列印 PDF</strong>：支援在資料夾模式下，一鍵將多個 Markdown 文件合併輸出為單一 PDF 檔案，且圖表與圖片皆能保持高品質。
          </>,
          <>
            <strong>11 種全新預覽風格主題</strong>：新增包括「實作計畫」、「北歐森林」、「復古報紙」、「古典宣紙」、「霓虹雨夜」等 11 種精心設計的排版風格，完美搭配不同的寫作心流。
          </>,
          <>
            <strong>行號註解標記模式 (Beta)</strong>：開啟頂部工具列的註解模式，可以直接在預覽面板中為特定段落行號標記並添加即時筆記。
          </>
        ]
      },
      {
        icon: Check,
        title: '體驗優化 (Improvements)',
        details: [
          <>
            <strong>富媒體排版渲染穩定度</strong>：大幅提升了警示盒、內部連結與強制物理分頁（`\\pagebreak`）的排版渲染穩定度，特別避免了程式碼區塊內部的排版衝突。
          </>
        ]
      }
    ]
  },
  {
    type: 'version_header',
    title: 'v4.0.0 (2026/03/15) - 即時預覽引擎升級與毛玻璃設計',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: PackagePlus,
        title: '新增功能 (New Features)',
        details: [
          <>
            <strong>極速即時預覽核心</strong>：大幅優化預覽核心的打字反應時間，即使在超過 10,000 行的超大型 Markdown 編輯時依然毫無卡頓。
          </>,
          <>
            <strong>LaTeX 數學公式與 Mermaid 圖表</strong>：完整支援 MathJax 3.0 公式排版與 Mermaid 複雜圖表即時生成，滿足硬核學術與技術寫作需求。
          </>
        ]
      },
      {
        icon: Palette,
        title: '介面與體驗優化 (Improvements)',
        details: [
          <>
            <strong>毛玻璃物理互動美學</strong>：採用現代 Glassmorphism 風格全新設計 UI 介面，搭配 Q 彈物理磁力按鈕與細緻的彈窗動畫，讓編輯與設定過程充滿愉悅。
          </>,
          <>
            <strong>全自動夜間深色模式</strong>：支援一鍵切換深色主題，並自動對齊所有的編輯區與預覽色彩面板。
          </>
        ]
      }
    ]
  },
  {
    type: 'version_header',
    title: 'v3.8.0 (2025/11/10) - 磁力物理互動與性能大躍進',
    cardBgGradient: 'from-brand-secondary/15 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-brand-primary/10 dark:border-slate-700/50',
    subSections: [
      {
        icon: PackagePlus,
        title: '新增功能 (New Features)',
        details: [
          <>
            <strong>物理感應磁力按鈕</strong>：引入磁力吸引與物理回彈動畫元件，讓每一次點擊與滑過都充滿趣味。
          </>
        ]
      },
      {
        icon: Check,
        title: '體驗優化 (Improvements)',
        details: [
          <>
            <strong>打字渲染性能大躍進</strong>：重構預覽引擎的效能，讓編輯更加流暢省電。
          </>
        ]
      },
      {
        icon: X,
        title: '取消項目',
        details: [
          <>
            列印預覽功能在接下來的版本跟我們說 bye bye 了。
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>列印時仍然優先選擇淺色主題。</li>
              <li>還是可以使用強制換頁來控制頁面分佈，這功能沒有影響。</li>
            </ul>
          </>
        ]
      }
    ]
  }
];
