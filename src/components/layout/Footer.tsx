import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from '../ui/Icons';

interface FooterProps {
  showIntroTrigger?: boolean;
  onOpenIntro?: () => void;
}

const Footer: React.FC<FooterProps> = ({ showIntroTrigger = true, onOpenIntro }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <footer className={`w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out relative z-40 print:hidden ${isCollapsed ? 'py-2 px-6' : 'py-8 px-6'}`}>

      {/* 展開/收合切換按鈕 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -top-3 right-8 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-400 hover:text-brand-primary transition-all hover:scale-110 z-50"
        title={isCollapsed ? "展開詳情" : "收合頁腳"}
      >
        {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <div className="max-w-7xl mx-auto overflow-hidden">

        {/* 展開模式下的豐富內容 */}
        {!isCollapsed && (
          <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-12 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Left: Branding & Tagline */}
            <div className="max-w-md space-y-3 mb-8 lg:mb-0">
              <div className="flex items-center gap-3">
                <img src="./image/markdown_liveditor.svg?v=2" alt=" Mark It Live Logo" className="w-5 h-5" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-widest">
                  Mark It Live
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                專業級線上 Markdown 即時編輯工具，整合 Mermaid 圖表、LaTeX 數學公式與數據視覺化。
                我們堅持<strong>隱私至上</strong>，所有運算與存儲均在使用者本地瀏覽器完成，給您最安全的創作環境。
              </p>
            </div>

            {/* Middle: Feature Links */}
            <div className="flex flex-wrap gap-x-5 lg:gap-x-10 gap-y-8">
              {/* 法律資訊 */}
              <div className="flex flex-col gap-2 min-w-[100px]">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">法律資訊</span>
                <div className="flex flex-col gap-1.5">
                  <a href={`${import.meta.env.BASE_URL}privacy.html`} className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors flex items-center gap-1">隱私政策 <ExternalLink size={10} /></a>
                  <a href={`${import.meta.env.BASE_URL}terms.html`} className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors flex items-center gap-1">服務條款 <ExternalLink size={10} /></a>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[100px]">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">關於</span>
                <div className="flex flex-col gap-1.5">
                  <a href="https://github.com/ian7814508123/Mark-It-Live" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors flex items-center gap-1">GitHub Repo <ExternalLink size={10} /></a>
                  <a href={`${import.meta.env.BASE_URL}about.html`} className="text-xs text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors flex items-center gap-1">關於本站<ExternalLink size={10} /></a>
                </div>
              </div>

              {/* 技術規格 */}
              <div className="flex flex-col gap-2 min-w-[100px]">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">技術規格</span>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {['Vite 6', 'React 19', 'Tailwind 4', 'IndexedDB'].map((tech) => (
                    <span
                      key={tech}
                      className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-300 font-medium text-center truncate"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-[100px]"></div>
            </div>
          </div>
        )}

        {/* 底部導覽條 */}
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 ${!isCollapsed ? 'border-t border-slate-100 dark:border-slate-800/50 pt-6' : ''}`}>
          <div className="flex items-center gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                © 2026 Mark It Live.
                <span className="hidden sm:inline-block">
                  {!isCollapsed && "　Maintained by Huang Jyun Ying."}
                </span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Released under the <a href="https://github.com/ian7814508123/Mark-It-Live/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 transition-colors">Apache-2.0 License</a>.
              </p>
            </div>
            {isCollapsed && (
              <nav className="sm:flex items-center gap-5 hidden border-l border-slate-200 dark:border-slate-700 pl-4 animate-in fade-in duration-300">
                <a href={`${import.meta.env.BASE_URL}privacy.html`} className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors font-bold">隱私政策</a>
                <a href={`${import.meta.env.BASE_URL}terms.html`} className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors font-bold">服務條款</a>
                <a href={`${import.meta.env.BASE_URL}about.html`} className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors font-bold">關於我們</a>
              </nav>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
