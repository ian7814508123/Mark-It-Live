import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Zap, Layout, Printer, MousePointer2, Keyboard, Microscope, Music, BarChart3, HelpCircle, BookOpen, ChevronRight, Files, Wrench, Share2, AlertCircle } from 'lucide-react';
import RippleButton from '../ui/RippleButton';
import InteractiveLogo from '../ui/InteractiveLogo';
import GlassRailSelector from '../ui/GlassRailSelector';
import MagneticButton from '../ui/MagneticButton';


interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroModal: React.FC<IntroModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'manual'>('overview');

  if (!isOpen) return null;

  const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
  }> = ({ icon, title, description, color }) => (
    <div className="group p-5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-brand-primary/30 dark:hover:border-brand-primary/40 transition-all duration-300 shadow-sm hover:shadow-md">
      <div className={`p-2.5 rounded-xl ${color} w-fit mb-4 transition-transform group-hover:scale-110 duration-300`}>
        {icon}
      </div>
      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">{title}</h4>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );

  const ManualSection: React.FC<{
    icon: React.ReactNode;
    title: string;
    items: { label: string; detail: string }[];
  }> = ({ icon, title, items }) => (
    <div className="space-y-4 p-6 bg-white dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-lg">
          {icon}
        </div>
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3 group">
            <div className="shrink-0 mt-1">
              <ChevronRight size={14} className="text-brand-primary/40 group-hover:text-brand-primary transition-colors" />
            </div>
            <div className="space-y-1">
              <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );



  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-800/80 z-[101] flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 fade-in duration-500">

        {/* Header Section */}
        <div className="relative shrink-0 p-5 pb-2 text-center overflow-hidden">
          <div className="flex items-center justify-center gap-4 mb-3">
            <InteractiveLogo size={40} variant="v1" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              歡迎使用 Markdown Live Previewer
            </h2>
            <InteractiveLogo size={40} variant="v2" />
          </div>

          {/* Tab 導航：玻璃滑軌，支援拖曳切換分頁 */}
          <GlassRailSelector
            options={[
              { label: '特色總覽', value: 'overview', icon: <Sparkles size={14} /> }, { label: '使用手冊', value: 'manual', icon: <BookOpen size={14} /> },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'manual' | 'overview')}
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
          {activeTab === 'overview' ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* Quick Start Intro */}
              <div className="mb-8 p-6 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-brand-primary/10 rounded-3xl border border-brand-primary/10 dark:border-brand-primary/20">
                <h3 className="text-xs font-black text-brand-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Zap size={14} /> 核心特色
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-loose font-medium">
                  這是一個專為開發者、科研人員與創作者設計的編輯環境。我們整合了多種強大的渲染引擎，讓您的 Markdown 文件不只是純文字。
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                <FeatureCard
                  icon={<Keyboard size={18} className="text-indigo-500" />}
                  title="智慧編輯輔助"
                  description="支援自動縮排（Tab / Shift+Tab）、快速表格生成器與智慧換行，大幅提升輸入效率。"
                  color="bg-indigo-50 dark:bg-indigo-900/30"
                />
                <FeatureCard
                  icon={<MousePointer2 size={18} className="text-emerald-500" />}
                  title="互動式 MathJax 3"
                  description="數學公式支援右鍵點擊複製 LaTeX/MathML，並提供點擊放大檢視與自定義巨集功能。"
                  color="bg-emerald-50 dark:bg-emerald-900/30"
                />
                <FeatureCard
                  icon={<Printer size={18} className="text-orange-500" />}
                  title="專業級 PDF 匯出"
                  description="深度優化列印樣式，支援 A4/A3 紙張模擬預覽，確保圖表不破圖、公式不跑版。"
                  color="bg-orange-50 dark:bg-orange-900/30"
                />
                <FeatureCard
                  icon={<Layout size={18} className="text-pink-500" />}
                  title="響應式即時預覽"
                  description="採用極速渲染引擎，左右滾動同步對齊，讓您隨時精確掌握文檔的最終樣貌。"
                  color="bg-pink-50 dark:bg-pink-900/30"
                />
              </div>

              {/* Advanced Science Support */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <Microscope size={18} className="text-brand-primary" />
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">科學與藝術支援</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-brand-primary/10 rounded-3xl border border-brand-primary/10 dark:border-brand-primary/20">
                    <BarChart3 size={16} className="text-slate-400 mb-2" />
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">數據視覺化</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">內建 Vega-Lite，用 JSON 畫出互動圖表。</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-brand-primary/10 rounded-3xl border border-brand-primary/10 dark:border-brand-primary/20">
                    <Music size={16} className="text-slate-400 mb-2" />
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">ABC 樂譜</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">標準樂譜語法渲染，高品質向量輸出。</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-brand-primary/5 to-transparent dark:from-brand-primary/10 rounded-3xl border border-brand-primary/10 dark:border-brand-primary/20">
                    <HelpCircle size={16} className="text-slate-400 mb-2" />
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">進階化學</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">mhchem 語法與 SMILES 分子結構渲染。</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
              <ManualSection
                icon={<Files size={16} />}
                title="文檔管理與組織"
                items={[
                  { label: "資料夾概念", detail: "點擊側邊欄的「資料夾」圖示建立資料夾。您可以將相關文件放入其中，方便分類與批次處理。" },
                  { label: "雙向連結與安全匯出", detail: "在內容中使用 [[檔名]] 即可快速連結到另一個文件。若採用合併匯出 (MD/PDF)，連結將無縫轉換為文件內部的跳轉錨點；單檔匯出則自動降級為純文字。" },
                  { label: "智慧歷史記錄", detail: "所有文檔皆儲存於瀏覽器本地 (IndexedDB)，即便重新整理頁面，您的創作也不會遺失。" }
                ]}
              />
              <ManualSection
                icon={<Wrench size={16} />}
                title="強大輔助工具箱"
                items={[
                  { label: "工具箱位置", detail: "位於側邊欄底部。內含 PDF 合併、表格產生器、字數統計與圖片上傳。" },
                  { label: "表格產生器", detail: "提供視覺化界面建立 Markdown 表格。您也可以直接從 Excel 或試算表複製，系統會自動轉換文字。" },
                  { label: "圖片上傳", detail: "支援拖放上傳本地圖片，並將其轉換為 Base64 內嵌於 Markdown 中，確保文檔可攜性。" }
                ]}
              />
              <ManualSection
                icon={<MousePointer2 size={16} />}
                title="數學與公式互動"
                items={[
                  { label: "公式操作", detail: "對渲染後的公式點擊右鍵可複製 TeX 或 MathML；左鍵點擊則可切換放大檢視模式。" },
                  { label: "自定義巨集", detail: "預設支援 \\RR (實數集)、\\dd (微分) 等。在「設定」中可自定義常用的 LaTeX 巨集。" },
                  { label: "搜尋搜尋", detail: "按下 Ctrl + F 可開啟編輯器搜尋面板，支援全局取代與正則表達式。" }
                ]}
              />
              <ManualSection
                icon={<Share2 size={16} />}
                title="分享與進階匯出"
                items={[
                  { label: "圖表尺寸控制", detail: "在 Mermaid 代碼塊的首行加入 %% width: 50% 可精確調整預覽與匯出時的顯示比例。" },
                  { label: "紙張模擬預覽", detail: "在 設定 > 列印與匯出 中開啟。編輯器旁會顯示虛擬 A4 紙張與分頁線，所見即所得。" },
                  { label: "智慧標題與檔名同步", detail: "瀏覽器分頁標題會自動與當前文檔同步。在列印至 PDF 時，系統也會自動建議正確的文檔名稱（或合併匯出的資料夾名稱）作為檔案名稱，省去手動修改的困擾。" },
                  { label: "資料夾批次匯出", detail: "當您在資料夾中工作時，下載選單可切換「合併下載」或「合併列印」，一次導出整個資料夾內容。" }
                ]}
              />
              <ManualSection
                icon={<AlertCircle size={16} />}
                title='注意'
                items={[
                  {
                    label: "同步滾動位置偏移或跳躍、列印時樣式跑版或顯示異常、其他異常狀況",
                    detail: "目前資料夾模式下的列印預覽功能與同步滾動功能尚在測試中，若發現：同步滾動位置偏移或跳躍、列印時樣式跑版或顯示異常、其他異常狀況，請暫時關閉功能或嘗試重新整理頁面後再試。",
                  }
                ]}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 p-2 pt-1 flex justify-center">
          <MagneticButton variant="filled" onClick={onClose}
            aria-label="馬上開始使用"
            className={`inline-flex items-center px-10 py-3.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-full text-xs font-black tracking-[0.2em]`}
            magneticOptions={{ maxOffset: 14, radius: 70, stiffness: 250, damping: 18 }}>
            <span>馬上開始</span>
          </MagneticButton>
        </div>
      </div>
    </>,
    document.body
  );
};

export default IntroModal;
