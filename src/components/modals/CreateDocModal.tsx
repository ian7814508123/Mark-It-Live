import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, FileText, Image as ImageIcon, ChevronLeft, Zap, FlaskConical, File, Ruler, BarChart2, GitBranch, Music } from 'lucide-react';
import RippleButton from '../ui/RippleButton';

interface CreateDocModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (mode: 'markdown' | 'mermaid', name: string, templateId?: string, icon?: string) => void;
    initialName?: string;
}

const COMMON_ICONS = ['📝', '📊', '💡', '📅', '🚀', '🛠️', '🎨', '🔒', '🌟', '🎶', '🖼️'];

const MD_TEMPLATES = [
    { id: 'basic', name: '基礎文字', desc: '純淨的標題、列表與文字樣式', icon: File, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    { id: 'markdown-standard', name: '進階導覽', desc: '包含所有語法與進階引擎示範', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    { id: 'markdown-beta', name: 'Beta 功能', desc: '測試語法第一時間將在此提供', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/40' },
    { id: 'math', name: '數學化學', desc: 'LaTeX 公式與化學方程式', icon: Ruler, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/40' },
    { id: 'charts', name: '數據圖表', desc: 'Vega-Lite 專業視覺化圖表', icon: BarChart2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    { id: 'mermaid', name: '內嵌圖表', desc: '在文章中畫流程圖與時序圖', icon: GitBranch, color: 'text-brand-primary', bg: 'bg-brand-secondary/60 dark:bg-brand-primary/20' },
    { id: 'markdown-abc', name: '音樂樂譜', desc: '支援 abc notation 五線譜渲染', icon: Music, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/40' },
];

const MMD_TEMPLATES = [
    { id: 'mermaid-standard', name: '完整攻略', desc: 'Mermaid 所有語法與樣式大全', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    { id: 'mermaid-beta', name: 'Beta 功能', desc: '測試語法第一時間將在此提供', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/40' },
    { id: 'flowchart', name: '流程圖', desc: 'Flowchart: 節點、判斷與路徑', icon: GitBranch, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    { id: 'sequence', name: '時序圖', desc: 'Sequence: 角交互、訊息傳遞', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/40' },
    { id: 'gantt', name: '甘特圖', desc: 'Gantt: 專案開發進度與排程', icon: BarChart2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    { id: 'class', name: '類別圖', desc: 'Class: 物件導向、繼承關係', icon: File, color: 'text-brand-primary', bg: 'bg-brand-secondary/60 dark:bg-brand-primary/20' },
    { id: 'state', name: '狀態圖', desc: 'State: 生命週期、狀態移轉', icon: Ruler, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/40' },
];

const CreateDocModal: React.FC<CreateDocModalProps> = ({ isOpen, onClose, onCreate, initialName = '' }) => {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string>('');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [step, setStep] = useState<'type' | 'template'>('type');
    const [selectedMode, setSelectedMode] = useState<'markdown' | 'mermaid' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setSelectedIcon('');
            setIsIconPickerOpen(false);
            setStep('type');
            setSelectedMode(null);
            // Focus after animation
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSelectType = (mode: 'markdown' | 'mermaid') => {
        setSelectedMode(mode);
        setStep('template');
    };

    const handleSubmit = (templateId: string = '') => {
        const finalTid = templateId || (selectedMode === 'markdown' ? 'markdown-standard' : 'mermaid-standard');
        onCreate(selectedMode, name.trim(), finalTid, selectedIcon || undefined);
        onClose();
    };

    const templates = selectedMode === 'markdown' ? MD_TEMPLATES : MMD_TEMPLATES;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in m3-fade-in duration-300"
            onClick={onClose}
        >

            <div
                className="relative flex flex-col w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 animate-in m3-slide-up duration-400 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 'template' ? (
                            <RippleButton
                                variant="icon"
                                onClick={() => setStep('type')}
                                aria-label="返回類別選擇"
                                className="w-9 h-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <ChevronLeft size={20} />
                            </RippleButton>
                        ) : (
                            <div className="w-10 h-10 bg-brand-secondary dark:bg-brand-primary/30 text-brand-primary rounded-2xl flex items-center justify-center shadow-sm">
                                <Plus size={20} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                {step === 'type' ? '新增文檔' : (selectedMode === 'markdown' ? 'Markdown 範本' : 'Mermaid 範本')}
                            </h2>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                                {step === 'type' ? '建立新的編輯空間' : '選擇符合需求的預設語法'}
                            </p>
                        </div>
                    </div>
                    <RippleButton
                        variant="icon"
                        onClick={onClose}
                        aria-label="關閉彈窗"
                        className="w-9 h-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="關閉"
                    >
                        <X size={20} />
                    </RippleButton>
                </div>

                {/* Body with Animation Container */}
                <div className="relative min-h-[300px]">
                    {/* Step 1: Type Selection */}
                    <div className={`p-5 flex flex-col gap-5 transition-all duration-300 ${step === 'type' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none absolute inset-0'}`}>

                        {/* Unified Input Row */}
                        <div className="flex items-end gap-3">
                            {/* Icon Square Block */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">圖示</label>
                                <button
                                    onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                                    className={`w-12 h-12 flex items-center justify-center rounded-2xl text-2xl transition-all border shadow-sm ${isIconPickerOpen
                                        ? 'border-brand-primary bg-brand-secondary/30 dark:bg-brand-primary/20 ring-4 ring-brand-primary/10'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {selectedIcon ? (
                                        selectedIcon
                                    ) : (
                                        <Plus size={20} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                </button>
                            </div>

                            {/* Name Rectangle Block */}
                            <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">文檔名稱</label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="輸入名稱 (選填)"
                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        {/* Collapsible Icon Picker */}
                        <div style={{
                            display: 'grid',
                            gridTemplateRows: isIconPickerOpen ? '1fr' : '0fr',
                            transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            marginBottom: isIconPickerOpen ? '0.5rem' : '0'
                        }} className="overflow-hidden">
                            <div className="min-h-0">
                                <div className="pt-2">
                                    <div className="p-3 g-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">選擇圖示 (選填)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {COMMON_ICONS.map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => {
                                                        setSelectedIcon(selectedIcon === icon ? '' : icon);
                                                        setIsIconPickerOpen(false);
                                                    }}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-lg transition-all ${selectedIcon === icon
                                                        ? 'bg-brand-primary text-white shadow-md scale-110'
                                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'
                                                        }`}
                                                >
                                                    {icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mode Buttons */}
                        <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${isIconPickerOpen ? 'pt-2' : 'mt-0'}`}>
                            <button
                                onClick={() => handleSelectType('markdown')}
                                className={`flex flex-col items-center gap-3 p-4 border rounded-3xl transition-all group
                                    ${selectedMode === 'markdown'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-sm' // [選中狀態] 深藍邊框
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200' // [未選中 + Hover]
                                    }`}
                            >
                                <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110
                                        ${selectedMode === 'markdown'
                                            ? 'bg-blue-600 text-white' // [選中時] 藍底白字
                                            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' // [未選中時] 淺藍色
                                        }`}
                                >
                                    <FileText size={24} />
                                </div>

                                <div className="text-center">
                                    <span className={`block text-sm font-bold transition-colors
                                        ${selectedMode === 'markdown'
                                            ? 'text-blue-700 dark:text-blue-300'
                                            : 'text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        標記掉落
                                    </span>
                                    <span className={`text-[10px] uppercase font-medium transition-colors
                                        ${selectedMode === 'markdown'
                                            ? 'text-blue-500/70'
                                            : 'text-slate-400 dark:text-slate-500'
                                        }`}
                                    >
                                        Markdown
                                    </span>
                                </div>
                            </button>


                            <button
                                onClick={() => handleSelectType('mermaid')}
                                className={`flex flex-col items-center gap-3 p-4 border rounded-3xl transition-all group
                                    ${selectedMode === 'mermaid'
                                        ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 shadow-sm' // [選中狀態]
                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200' // [未選中狀態 + Hover]
                                    }`}
                            >
                                <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110
                                        ${selectedMode === 'mermaid'
                                            ? 'bg-purple-600 text-white' // [選中時] 圖示變深底白字，更醒目
                                            : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' // [未選中時] 原本的淺紫色
                                        }`}
                                >
                                    <ImageIcon size={24} />
                                </div>

                                <div className="text-center">
                                    <span className={`block text-sm font-bold transition-colors
                                        ${selectedMode === 'mermaid'
                                            ? 'text-purple-700 dark:text-purple-300'
                                            : 'text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        美人魚
                                    </span>
                                    <span className={`text-[10px] uppercase font-medium transition-colors
                                        ${selectedMode === 'mermaid'
                                            ? 'text-purple-500/70'
                                            : 'text-slate-400 dark:text-slate-500'
                                        }`}
                                    >
                                        Mermaid
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Template Selection */}
                    <div className={`p-4 flex flex-col gap-2 transition-all duration-300 max-h-[400px] overflow-y-auto custom-scrollbar ${step === 'template' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none absolute inset-0'}`}>
                        {templates.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => handleSubmit(t.id)}
                                className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md transition-all text-left group"
                            >
                                <div className={`w-10 h-10 ${t.bg} ${t.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
                                    <t.icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-primary transition-colors">
                                        {t.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                        {t.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-3xl border-t border-slate-100 dark:border-slate-800/50">
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                        提示：{step === 'type' ? '選擇類別後展開範本' : '點擊任一範本即可快速建立'}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateDocModal;
