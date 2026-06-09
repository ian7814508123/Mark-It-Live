import React from 'react';
import { WrapText } from '../ui/Icons';
import {
  FaJs,
  FaPython,
  FaRust,
  FaGolang,
  FaHtml5,
  FaCss3,
  FaMarkdown,
  FaJava,
  FaDocker
} from 'react-icons/fa6';
import {
  TbDatabase,
  TbTerminal,
  TbFileCode,
  TbBraces,
  TbFileText,
  TbBrandPowershell,
  TbBrandCSharp,
  TbBrandCpp
} from 'react-icons/tb';
import { BsTypescript, BsFiletypeJsx, BsFiletypeTsx } from "react-icons/bs";
import { SiYaml, SiGnubash, SiZsh, SiArduino, SiVite, SiVitest } from "react-icons/si";

// 定義 CodeHeaderProps 介面
interface CodeHeaderProps {
  language: string; // 傳入從 Markdown 解析出來的語言標籤
  isWrapped?: boolean;
  onToggleWrap?: () => void;
  showWrapButton?: boolean;
}

// 根據語言標籤取得對應的 React-Icon 元件與配色樣式
const getLanguageIconData = (lang: string): { Icon: React.ComponentType<any>; colorClass: string } => {
  const langKey = lang.toLowerCase().trim();

  const mapping: Record<string, { Icon: React.ComponentType<any>; colorClass: string }> = {
    js: { Icon: FaJs, colorClass: 'text-amber-500' },
    javascript: { Icon: FaJs, colorClass: 'text-amber-500' },

    java: { Icon: FaJava, colorClass: 'text-amber-500' },

    ts: { Icon: BsTypescript, colorClass: 'text-blue-500' },
    typescript: { Icon: BsTypescript, colorClass: 'text-blue-500' },
    jsx: { Icon: BsFiletypeJsx, colorClass: 'text-cyan-500' },
    tsx: { Icon: BsFiletypeTsx, colorClass: 'text-cyan-500' },

    python: { Icon: FaPython, colorClass: 'text-sky-600 dark:text-sky-400' },
    py: { Icon: FaPython, colorClass: 'text-sky-600 dark:text-sky-400' },

    csharp: { Icon: TbBrandCSharp, colorClass: 'text-amber-500' },
    c: { Icon: TbBrandCpp, colorClass: 'text-blue-600 dark:text-blue-400' },
    cpp: { Icon: TbBrandCpp, colorClass: 'text-blue-600 dark:text-blue-400' },
    arduino: { Icon: SiArduino, colorClass: 'text-[#3186a0] dark:text-[#4fccf3]' },

    rust: { Icon: FaRust, colorClass: 'text-orange-600 dark:text-orange-500' },
    rs: { Icon: FaRust, colorClass: 'text-orange-600 dark:text-orange-500' },

    go: { Icon: FaGolang, colorClass: 'text-cyan-500' },
    golang: { Icon: FaGolang, colorClass: 'text-cyan-500' },

    html: { Icon: FaHtml5, colorClass: 'text-orange-500' },
    css: { Icon: FaCss3, colorClass: 'text-blue-600 dark:text-blue-400' },

    json: { Icon: TbBraces, colorClass: 'text-yellow-600 dark:text-yellow-500' },
    yaml: { Icon: SiYaml, colorClass: 'text-emerald-500' },
    yml: { Icon: SiYaml, colorClass: 'text-emerald-500' },
    toml: { Icon: TbBraces, colorClass: 'text-gray-500' },

    markdown: { Icon: FaMarkdown, colorClass: 'text-indigo-500' },
    md: { Icon: FaMarkdown, colorClass: 'text-indigo-500' },

    sql: { Icon: TbDatabase, colorClass: 'text-pink-500' },
    docker: { Icon: FaDocker, colorClass: 'text-blue-500' },
    dockerfile: { Icon: FaDocker, colorClass: 'text-blue-500' },

    makefile: { Icon: TbFileCode, colorClass: 'text-slate-500 dark:text-neutral-400' },
    vite: { Icon: SiVite, colorClass: 'text-purple-500' },
    vitest: { Icon: SiVitest, colorClass: 'text-orange-500' },

    bash: { Icon: SiGnubash, colorClass: 'text-emerald-500' },
    sh: { Icon: TbTerminal, colorClass: 'text-emerald-500' },
    shell: { Icon: TbBrandPowershell, colorClass: 'text-emerald-500' },
    console: { Icon: TbTerminal, colorClass: 'text-neutral-500' },
    zsh: { Icon: SiZsh, colorClass: 'text-emerald-500' },
    log: { Icon: TbFileText, colorClass: 'text-ember-500' },
  };

  return mapping[langKey] || { Icon: TbFileCode, colorClass: 'text-slate-500 dark:text-neutral-400' };
};

// 根據語言標籤取得顯示的標籤文字
const getLanguageLabel = (lang: string): string => {
  const langKey = lang.toLowerCase().trim();
  const labels: Record<string, string> = {
    json: 'JSON Spec',
    vega: 'Vega Graph',
    javascript: 'JavaScript',
    js: 'JavaScript',
    java: 'Java',
    typescript: 'TypeScript',
    ts: 'TypeScript',
    jsx: 'React JS',
    tsx: 'React TS',
    html: 'HTML',
    css: 'CSS',
    python: 'Python',
    py: 'Python',
    go: 'Go Language',
    golang: 'Go Language',
    rust: 'Rust',
    rs: 'Rust',
    markdown: 'Markdown',
    md: 'Markdown',
    sql: 'Database SQL',
    yaml: 'YAML Config',
    yml: 'YAML Config',
    toml: 'TOML Config',
    xml: 'XML Spec',
    console: 'Console',
    bash: 'Terminal',
    sh: 'Terminal',
    shell: 'Terminal',
    log: 'System Log',
  };

  if (labels[langKey]) return labels[langKey];

  // 例外大寫化處理
  if (['log', 'console'].includes(langKey)) return lang.toUpperCase();
  return lang ? (lang.charAt(0).toUpperCase() + lang.slice(1)) : 'Source Code';
};

export const CodeBlockHeader: React.FC<CodeHeaderProps> = ({
  language,
  isWrapped,
  onToggleWrap,
  showWrapButton = true
}) => {
  const { Icon, colorClass } = getLanguageIconData(language);

  return (
    <div
      className="flex items-center justify-between px-4 border-b h-10 select-none"
      style={{
        backgroundColor: 'var(--code-header-bg, var(--code-bg))',
        borderColor: 'var(--code-border)'
      }}
    >
      {/* 左側：Icon + 語言名稱 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-5 h-5 transition-transform hover:scale-110">
          <Icon className={colorClass} size={16} />
        </div>
        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-neutral-300">
          {getLanguageLabel(language)}
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
