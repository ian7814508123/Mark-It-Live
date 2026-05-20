import React from 'react';
import { Braces, Terminal, FileText, Code2, FileCode, WrapText } from 'lucide-react';

// 1. 定義語言與 Icon/顏色的對應表
const LANGUAGE_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  // 標準語言
  json: { label: 'JSON Spec', icon: Braces, color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' },
  vega: { label: 'Vega Graph', icon: Braces, color: 'text-orange-500 border-orange-500/20 bg-orange-500/10' },
  javascript: { label: 'JavaScript', icon: FileCode, color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' },
  js: { label: 'JavaScript', icon: FileCode, color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' },
  typescript: { label: 'TypeScript', icon: FileCode, color: 'text-blue-500 border-blue-500/20 bg-blue-500/10' },
  ts: { label: 'TypeScript', icon: FileCode, color: 'text-blue-500 border-blue-500/20 bg-blue-500/10' },
  jsx: { label: 'React JS', icon: FileCode, color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' },
  tsx: { label: 'React TS', icon: FileCode, color: 'text-blue-500 border-blue-500/20 bg-blue-500/10' },
  html: { label: 'HTML', icon: FileCode, color: 'text-orange-500 border-orange-500/20 bg-orange-500/10' },
  css: { label: 'CSS', icon: FileCode, color: 'text-teal-500 border-teal-500/20 bg-teal-500/10' },
  python: { label: 'Python', icon: FileCode, color: 'text-sky-500 border-sky-500/20 bg-sky-500/10' },
  py: { label: 'Python', icon: FileCode, color: 'text-sky-500 border-sky-500/20 bg-sky-500/10' },
  go: { label: 'Go Language', icon: FileCode, color: 'text-cyan-500 border-cyan-500/20 bg-cyan-500/10' },
  golang: { label: 'Go Language', icon: FileCode, color: 'text-cyan-500 border-cyan-500/20 bg-cyan-500/10' },
  rust: { label: 'Rust', icon: FileCode, color: 'text-amber-600 border-amber-600/20 bg-amber-600/10' },
  rs: { label: 'Rust', icon: FileCode, color: 'text-amber-600 border-amber-600/20 bg-amber-600/10' },
  markdown: { label: 'Markdown', icon: FileText, color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' },
  md: { label: 'Markdown', icon: FileText, color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' },
  sql: { label: 'Database SQL', icon: Terminal, color: 'text-indigo-500 border-indigo-500/20 bg-indigo-500/10' },
  yaml: { label: 'YAML Config', icon: Braces, color: 'text-purple-500 border-purple-500/20 bg-purple-500/10' },
  yml: { label: 'YAML Config', icon: Braces, color: 'text-purple-500 border-purple-500/20 bg-purple-500/10' },
  toml: { label: 'TOML Config', icon: Braces, color: 'text-purple-500 border-purple-500/20 bg-purple-500/10' },
  xml: { label: 'XML Spec', icon: FileCode, color: 'text-orange-500 border-orange-500/20 bg-orange-500/10' },

  // 特殊例外處理 (Console, Log 紀錄)
  console: { label: 'Console Output', icon: Terminal, color: 'text-green-500 border-green-500/20 bg-green-500/5' },
  bash: { label: 'Terminal', icon: Terminal, color: 'text-green-500 border-green-500/20 bg-green-500/5' },
  sh: { label: 'Terminal', icon: Terminal, color: 'text-green-500 border-green-500/20 bg-green-500/5' },
  shell: { label: 'Terminal', icon: Terminal, color: 'text-green-500 border-green-500/20 bg-green-500/5' },
  log: { label: 'System Log', icon: FileText, color: 'text-blue-500 border-blue-500/20 bg-blue-500/5' },
};

// 2. 預設的備用 Icon (當使用者輸入了未知的語言時)
const DEFAULT_CONFIG = { label: 'Source Code', icon: Code2, color: 'text-slate-500 border-slate-500/20 bg-slate-500/5' };

interface CodeHeaderProps {
  language: string; // 傳入從 Markdown 解析出來的語言標籤
  isWrapped?: boolean;
  onToggleWrap?: () => void;
  showWrapButton?: boolean;
}

export const CodeBlockHeader: React.FC<CodeHeaderProps> = ({ 
  language,
  isWrapped,
  onToggleWrap,
  showWrapButton = true
}) => {
  const langKey = language.toLowerCase().trim();
  
  // 例外語言大寫化處理
  const isUpperLang = ['log', 'console'].includes(langKey);
  const config = LANGUAGE_CONFIG[langKey] || {
    ...DEFAULT_CONFIG,
    label: language ? (isUpperLang ? language.toUpperCase() : language.charAt(0).toUpperCase() + language.slice(1)) : DEFAULT_CONFIG.label
  };

  const IconComponent = config.icon;

  return (
    <div className="flex items-center justify-between px-4 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 border-b-0 h-10 select-none rounded-t-lg">
      {/* 左側：Icon + 語言名稱 */}
      <div className="flex items-center gap-2">
        <span className={`flex items-center justify-center w-5 h-5 rounded border ${config.color} p-0.5 transition-colors`}>
          <IconComponent className="w-3.5 h-3.5" />
        </span>
        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-neutral-300">
          {config.label}
        </span>
      </div>

      {/* 右側：控制按鈕 */}
      {showWrapButton && onToggleWrap && (
        <button
          className={`p-1.5 rounded transition-all duration-200 
            ${isWrapped
              ? 'bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/30 dark:text-brand-primary font-semibold'
              : 'bg-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'}`}
          onClick={onToggleWrap}
          title={isWrapped ? "禁用自動換行" : "啟用自動換行"}
          aria-label="Toggle Word Wrap"
        >
          <WrapText size={15} />
        </button>
      )}
    </div>
  );
};
