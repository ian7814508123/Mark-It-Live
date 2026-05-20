import React from 'react';
import { PackagePlus, Palette, MessageSquare, Check, X } from 'lucide-react';

export interface ChangelogSubSection {
  icon: React.ComponentType<any>;
  title: string;
  details: React.ReactNode[];
}

export interface ChangelogCard {
  type: 'new_features' | 'optimizations' | 'removals';
  icon: React.ComponentType<any>;
  title: string;
  iconBgColor: string;
  iconTextColor: string;
  cardBgGradient: string;
  cardBorderColor: string;
  subSections?: ChangelogSubSection[];
  bullets?: React.ReactNode[];
}

export const CHANGELOG_CARDS: ChangelogCard[] = [
  {
    type: 'new_features',
    icon: PackagePlus,
    title: '全新功能與特色',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconTextColor: 'text-indigo-500 dark:text-indigo-400',
    cardBgGradient: 'from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-indigo-100/50 dark:border-slate-700/50',
    subSections: [
      {
        icon: PackagePlus,
        title: '合併列印 Markdown & Mermaid',
        details: [
          <>
            在資料夾模式下，您可以開啟 <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono mx-1">合併列印PDF</code> 來同時列印多個 markdown 文件與 Mermaid，文件中的圖表與圖片會保持高品質，wikilink 也會自動轉換成超連結。
          </>,
          <>
            開啟 <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono mx-1">合併下載(Markdown)</code> 也會自動將 Mermaid 轉成 code block 樣式。
          </>
        ]
      },
      {
        icon: Palette,
        title: '更多預覽風格',
        details: [
          <>
            開啟 <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono mx-1">偏好設定 &gt; 列印與匯出 &gt; 預覽風格</code> 套用不同風格。
          </>,
          <>
            (注意！此功能仍在測試中，如果某風格的排版不符合預期，請暫時切換回預設風格或其他可行風格。)
          </>
        ]
      },
      {
        icon: MessageSquare,
        title: '註解模式 (Beta)',
        details: [
          <>
            開啟頂列的註解模式，即可開始在預覽器中標記文字內容並添加註解。
          </>,
          <>
            (注意！此功能仍在測試中，目前註解不會用於輸出 Markdown 或 PDF，建議僅在數位展示環境下使用。)
          </>
        ]
      }
    ]
  },
  {
    type: 'optimizations',
    icon: Check,
    title: '體驗優化與修正',
    iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconTextColor: 'text-emerald-600 dark:text-emerald-400',
    cardBgGradient: 'from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-indigo-100/50 dark:border-slate-700/50',
    bullets: [
      <>內嵌圖表支援置中/置左/置右功能。</>,
      <>
        <span className="flex items-center gap-1.5 flex-wrap">
          <img src="./image/livelogo_v1.svg" alt="立即試試" title="還有 v2 可以玩玩看哦！" className="h-4 inline" />
          <span>(提醒：若匯出 PDF 等靜態格式，動圖將固定於特定幀，建議僅在數位展示環境下使用。)</span>
        </span>
      </>,
      <>
        使用 <strong>\pagebreak</strong>、<strong>[page-break]</strong>、<strong>---pb---</strong> 指令強制換頁（在預覽面板上可直接看到藍色虛線，列印時將自動在此處分頁）。
      </>,
      <>
        增強 WikiLink 匯出相容性：合併匯出時自動轉為內部跳轉錨點（注意：列印時要選擇 Save to PDF，而不是 Print to PDF），單檔匯出則自動降級為純文字以避免死連結。
      </>,
      <>按鈕變得更Q彈了，可以試著長按並滑動他們。</>
    ]
  },
  {
    type: 'removals',
    icon: X,
    title: '取消項目',
    iconBgColor: 'bg-rose-100 dark:bg-rose-950/40',
    iconTextColor: 'text-rose-600 dark:text-rose-400',
    cardBgGradient: 'from-indigo-50 to-white dark:from-slate-800 dark:to-slate-800/50',
    cardBorderColor: 'border-indigo-100/50 dark:border-slate-700/50',
    bullets: [
      <>
        列印預覽功能在接下來的版本跟我們說 bye bye 了。
        <ul className="list-disc pl-4 mt-1 space-y-1">
          <li>列印時仍然優先選擇淺色主題。</li>
          <li>還是可以使用強制換頁來控制頁面分佈，這功能沒有影響。</li>
        </ul>
      </>
    ]
  }
];
