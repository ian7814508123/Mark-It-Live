import { 
  Keyboard, 
  MousePointer2, 
  Printer, 
  Layout, 
  BarChart3, 
  Music, 
  HelpCircle,
  Files,
  Wrench,
  Share2,
  AlertCircle
} from '../components/ui/Icons';

export interface FeatureCardData {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
  iconColor: string;
}

export interface ScienceSupportData {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

export interface ManualItem {
  label: string;
  detail: string;
}

export interface ManualSectionData {
  icon: React.ComponentType<any>;
  title: string;
  items: ManualItem[];
}

export const INTRO_SUMMARY = {
  title: "核心特色",
  description: "這是一個專為開發者、科研人員與創作者設計的編輯環境。我們整合了多種強大的渲染引擎，讓您的 Markdown 文件不只是純文字。"
};

export const FEATURE_CARDS: FeatureCardData[] = [
  {
    icon: Keyboard,
    title: "智慧編輯輔助",
    description: "支援自動縮排（Tab / Shift+Tab）、快速表格生成器與智慧換行，大幅提升輸入效率。",
    color: "bg-indigo-50 dark:bg-indigo-900/30",
    iconColor: "text-indigo-500"
  },
  {
    icon: MousePointer2,
    title: "互動式 MathJax 3",
    description: "數學公式支援右鍵點擊複製 LaTeX/MathML，並提供點擊放大檢視與自定義巨集功能。",
    color: "bg-emerald-50 dark:bg-emerald-900/30",
    iconColor: "text-emerald-500"
  },
  {
    icon: Printer,
    title: "專業級 PDF 匯出",
    description: "深度優化列印樣式，支援 A4/A3 紙張模擬預覽，確保圖表不破圖、公式不跑版。",
    color: "bg-orange-50 dark:bg-orange-900/30",
    iconColor: "text-orange-500"
  },
  {
    icon: Layout,
    title: "響應式即時預覽",
    description: "採用極速渲染引擎，左右滾動同步對齊，讓您隨時精確掌握文檔的最終樣貌。",
    color: "bg-pink-50 dark:bg-pink-900/30",
    iconColor: "text-pink-500"
  }
];

export const SCIENCE_SUPPORTS: ScienceSupportData[] = [
  {
    icon: BarChart3,
    title: "數據視覺化",
    description: "內建 Vega-Lite，用 JSON 畫出互動圖表。"
  },
  {
    icon: Music,
    title: "ABC 樂譜",
    description: "標準樂譜語法渲染，高品質向量輸出。"
  },
  {
    icon: HelpCircle,
    title: "進階化學",
    description: "mhchem 語法與 SMILES 分子結構渲染。"
  }
];

export const MANUAL_SECTIONS: ManualSectionData[] = [
  {
    icon: Files,
    title: "文檔管理與組織",
    items: [
      { label: "資料夾概念", detail: "點擊側邊欄的「資料夾」圖示建立資料夾。您可以將相關文件放入其中，方便分類與批次處理。" },
      { label: "雙向連結與安全匯出", detail: "在內容中使用 [[檔名]] 即可快速連結到另一個文件。若採用合併匯出 (MD/PDF)，連結將無縫轉換為文件內部的跳轉錨點；單檔匯出則自動降級為純文字。" },
      { label: "智慧歷史記錄", detail: "所有文檔皆儲存於瀏覽器本地 (IndexedDB)，即便重新整理頁面，您的創作也不會遺失。" }
    ]
  },
  {
    icon: Wrench,
    title: "強大輔助工具箱",
    items: [
      { label: "工具箱位置", detail: "位於側邊欄底部。內含 PDF 合併、表格產生器、字數統計與圖片上傳。" },
      { label: "表格產生器", detail: "提供視覺化界面建立 Markdown 表格。您也可以直接從 Excel 或試算表複製，系統會自動轉換文字。" },
      { label: "圖片上傳", detail: "支援拖放上傳本地圖片，並將其轉換為 Base64 內嵌於 Markdown 中，確保文檔可攜性。" }
    ]
  },
  {
    icon: MousePointer2,
    title: "數學與公式互動",
    items: [
      { label: "公式操作", detail: "對渲染後的公式點擊右鍵可複製 TeX 或 MathML；左鍵點擊則可切換放大檢視模式。" },
      { label: "自定義巨集", detail: "預設支援 \\RR (實數集)、\\dd (微分) 等。在「設定」中可自定義常用的 LaTeX 巨集。" },
      { label: "搜尋搜尋", detail: "按下 Ctrl + F 可開啟編輯器搜尋面板，支援全局取代與正則表達式。" }
    ]
  },
  {
    icon: Share2,
    title: "分享與進階匯出",
    items: [
      { label: "圖表尺寸控制", detail: "在 Mermaid 代碼塊的首行加入 %% width: 50% 可精確調整預覽與匯出時的顯示比例。" },
      { label: "紙張模擬預覽", detail: "在 設定 > 列印與匯出 中開啟。編輯器旁會顯示虛擬 A4 紙張與分頁線，所見即所得。" },
      { label: "智慧標題與檔名同步", detail: "瀏覽器分頁標題會自動與當前文檔同步。在列印至 PDF 時，系統也會自動建議正確的文檔名稱（或合併匯出的資料夾名稱）作為檔案名稱，省去手動修改的困擾。" },
      { label: "資料夾批次匯出", detail: "當您在資料夾中工作時，下載選單可切換「合併下載」或「合併列印」，一次導出整個資料夾內容。" }
    ]
  },
  {
    icon: AlertCircle,
    title: "注意",
    items: [
      {
        label: "同步滾動位置偏移或跳躍、列印時樣式跑版或顯示異常、其他異常狀況",
        detail: "目前資料夾模式下的列印預覽功能與同步滾動功能尚在測試中，若發現：同步滾動位置偏移或跳躍、列印時樣式跑版或顯示異常、其他異常狀況，請暫時關閉功能或嘗試重新整理頁面後再試。"
      }
    ]
  }
];
