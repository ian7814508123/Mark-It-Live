import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, FileText, Image as ImageIcon, ChevronLeft, Zap, FlaskConical, File, Ruler, BarChart2, GitBranch, Music, Search } from '../ui/Icons';
import RippleButton from '../ui/RippleButton';


interface CreateDocModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (mode: 'markdown' | 'mermaid', name: string, templateId?: string, icon?: string) => void;
    initialName?: string;
}

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

// 精選 Emoji 資料庫：每個 emoji 帶有中英文標籤，直接在前端 filter，無需任何翻譯橋接
const CURATED_EMOJIS: { emoji: string; tags: string[] }[] = [
    // 📁 文件 & 筆記
    { emoji: '📄', tags: ['文件', '文檔', 'document', 'file', 'page'] },
    { emoji: '📝', tags: ['筆記', '記錄', '編輯', 'note', 'write', 'edit', 'memo'] },
    { emoji: '📋', tags: ['清單', '列表', '剪貼板', 'list', 'clipboard', 'checklist'] },
    { emoji: '📌', tags: ['釘選', '重要', 'pin', 'important', 'pushpin'] },
    { emoji: '🔖', tags: ['書籤', '標記', 'bookmark', 'tag', 'mark'] },
    { emoji: '📎', tags: ['附件', '迴紋針', 'paperclip', 'attachment', 'clip'] },
    { emoji: '📁', tags: ['資料夾', '目錄', 'folder', 'directory', 'files'] },
    { emoji: '📂', tags: ['資料夾', '開啟', 'open folder', 'directory'] },
    { emoji: '🗂️', tags: ['分類夾', '索引', 'organize', 'dividers', 'index'] },
    { emoji: '📊', tags: ['圖表', '統計', '資料', 'chart', 'bar chart', 'statistics', 'data'] },
    { emoji: '📈', tags: ['上升', '成長', 'chart up', 'growth', 'increase', 'trend'] },
    { emoji: '📉', tags: ['下降', '衰退', 'chart down', 'decline', 'decrease'] },
    { emoji: '📰', tags: ['新聞', '報紙', 'newspaper', 'news', 'article'] },
    { emoji: '📜', tags: ['捲軸', '古文', 'scroll', 'document', 'script'] },
    { emoji: '📚', tags: ['書籍', '圖書館', 'books', 'library', 'study', 'reading'] },
    { emoji: '📖', tags: ['閱讀', '開書', 'book', 'read', 'open book'] },
    // 💡 工具 & 技術
    { emoji: '💡', tags: ['想法', '點子', '燈泡', 'idea', 'lightbulb', 'tip', 'hint'] },
    { emoji: '🔧', tags: ['扳手', '設定', '修復', 'wrench', 'tool', 'settings', 'fix', 'repair'] },
    { emoji: '⚙️', tags: ['齒輪', '設定', '配置', 'gear', 'settings', 'config', 'system'] },
    { emoji: '🛠️', tags: ['工具箱', '維修', 'tools', 'maintenance', 'repair', 'build'] },
    { emoji: '💻', tags: ['電腦', '筆電', '程式', 'laptop', 'computer', 'code', 'dev'] },
    { emoji: '🖥️', tags: ['螢幕', '桌電', 'desktop', 'monitor', 'screen', 'display'] },
    { emoji: '📱', tags: ['手機', '行動', 'phone', 'mobile', 'smartphone', 'app'] },
    { emoji: '🔍', tags: ['搜尋', '放大鏡', 'search', 'magnify', 'find', 'look'] },
    { emoji: '🔑', tags: ['鑰匙', '密碼', '存取', 'key', 'password', 'access', 'unlock'] },
    { emoji: '🔐', tags: ['鎖定', '安全', '私密', 'locked', 'secure', 'private', 'lock'] },
    { emoji: '🧪', tags: ['實驗', '測試', '燒杯', 'test', 'experiment', 'lab', 'flask', 'beta'] },
    // ✅ 狀態 & 標記
    { emoji: '✅', tags: ['完成', '勾選', '正確', 'check', 'done', 'complete', 'yes', 'correct'] },
    { emoji: '❌', tags: ['錯誤', '取消', '關閉', 'cross', 'error', 'cancel', 'no', 'wrong'] },
    { emoji: '⚠️', tags: ['警告', '注意', '危險', 'warning', 'caution', 'alert', 'danger'] },
    { emoji: '🔥', tags: ['火', '熱門', '趨勢', 'fire', 'hot', 'popular', 'trending', 'flame'] },
    { emoji: '⭐', tags: ['星星', '最愛', '評分', 'star', 'favorite', 'rating', 'starred'] },
    { emoji: '🎯', tags: ['目標', '精準', 'target', 'goal', 'aim', 'bullseye', 'focus'] },
    { emoji: '🏆', tags: ['獎盃', '冠軍', '第一', 'trophy', 'winner', 'champion', 'award'] },
    { emoji: '💯', tags: ['滿分', '完美', 'perfect', 'score', 'hundred', '100'] },
    { emoji: '🚀', tags: ['火箭', '啟動', '快速', 'rocket', 'launch', 'startup', 'fast', 'deploy'] },
    { emoji: '✨', tags: ['閃光', '特別', '魔法', 'sparkles', 'special', 'magic', 'new', 'shine'] },
    { emoji: '🎉', tags: ['慶祝', '派對', '完成', 'party', 'celebrate', 'tada', 'done'] },
    { emoji: '⚡', tags: ['閃電', '快速', '能量', 'lightning', 'fast', 'energy', 'power', 'zap'] },
    // ❤️ 心情 & 表情
    { emoji: '❤️', tags: ['愛', '喜歡', '心', 'love', 'heart', 'like', 'favorite'] },
    { emoji: '👍', tags: ['讚', '好', '同意', 'thumbs up', 'like', 'good', 'approve'] },
    { emoji: '🤔', tags: ['思考', '疑問', '考慮', 'thinking', 'hmm', 'question', 'wonder'] },
    { emoji: '😊', tags: ['開心', '微笑', '高興', 'happy', 'smile', 'joy'] },
    { emoji: '🧠', tags: ['腦', '知識', '智慧', 'brain', 'smart', 'knowledge', 'intelligence'] },
    { emoji: '👀', tags: ['眼睛', '查看', '注意', 'eyes', 'look', 'watch', 'see', 'attention'] },
    // 📅 工作 & 專案
    { emoji: '📅', tags: ['日期', '行程', '日曆', 'calendar', 'date', 'schedule', 'event'] },
    { emoji: '⏰', tags: ['時間', '鬧鐘', '計時', 'time', 'alarm', 'clock', 'timer', 'deadline'] },
    { emoji: '🗓️', tags: ['月曆', '計畫', '排程', 'calendar', 'plan', 'schedule', 'monthly'] },
    { emoji: '💬', tags: ['對話', '留言', '討論', 'chat', 'comment', 'discussion', 'message'] },
    { emoji: '📢', tags: ['公告', '廣播', '通知', 'announcement', 'broadcast', 'megaphone', 'notify'] },
    { emoji: '🎨', tags: ['設計', '藝術', '創意', 'design', 'art', 'creative', 'palette', 'color'] },
    { emoji: '🗺️', tags: ['地圖', '旅行', '探索', 'map', 'travel', 'explore', 'world'] },
    { emoji: '🏠', tags: ['家', '首頁', '主頁', 'home', 'house', 'main', 'homepage'] },
    { emoji: '🎵', tags: ['音樂', '歌曲', '音符', 'music', 'note', 'song', 'melody', 'audio'] },
    { emoji: '🎮', tags: ['遊戲', '控制器', 'game', 'gaming', 'play', 'controller', 'fun'] },
    // 🌟 自然 & 其他
    { emoji: '🌟', tags: ['閃耀', '發光', '特別', 'glowing star', 'shine', 'bright', 'special'] },
    { emoji: '☀️', tags: ['太陽', '晴天', '日光', 'sun', 'sunny', 'bright', 'day', 'daylight'] },
    { emoji: '🌙', tags: ['月亮', '夜晚', '夜間', 'moon', 'night', 'crescent', 'dark'] },
    { emoji: '🌈', tags: ['彩虹', '多彩', '色彩', 'rainbow', 'colorful', 'hope', 'diversity'] },
    { emoji: '🌿', tags: ['植物', '葉子', '自然', 'leaf', 'nature', 'green', 'plant'] },
    { emoji: '🌺', tags: ['花', '盛開', '美麗', 'flower', 'beautiful', 'bloom', 'blossom'] },
];

const CreateDocModal: React.FC<CreateDocModalProps> = ({ isOpen, onClose, onCreate, initialName = '' }) => {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string>('');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [step, setStep] = useState<'type' | 'template'>('type');
    const [selectedMode, setSelectedMode] = useState<'markdown' | 'mermaid' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [customSearch, setCustomSearch] = useState('');

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setSelectedIcon('');
            setIsIconPickerOpen(false);
            setStep('type');
            setSelectedMode(null);
            setCustomSearch('');
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
        const finalTid = templateId || (selectedMode === 'markdown' ? 'markdown-basic' : 'flowchart');
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
                    <div className={`p-4 flex flex-col gap-2 transition-all duration-300 ${step === 'type' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none absolute inset-0'}`}>

                        {/* Unified Input Row */}
                        <div className="flex items-end gap-3">
                            {/* Icon Square Block */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">圖示</label>
                                <button
                                    onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                                    className={`w-12 h-12 flex items-center justify-center rounded-2xl text-2xl transition-all border ${isIconPickerOpen
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
                                    <div className="p-1.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 mt-1.5 ml-3">選擇圖示 (選填)</p>
                                        <div className="flex flex-col gap-1">
                                            {/* 搜尋 + 自訂：橫排平分，兩者都不需要長輸入框 */}
                                            <div className="flex items-center gap-1.5 mx-1">
                                                {/* 搜尋框 */}
                                                <div className="relative flex items-center flex-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 min-w-0">
                                                    <Search size={10} className="absolute left-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={customSearch}
                                                        onChange={(e) => setCustomSearch(e.target.value)}
                                                        placeholder="搜尋"
                                                        className="w-full h-7 pl-7 pr-6 bg-transparent text-[10px] text-slate-700 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                                                    />
                                                    {customSearch && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomSearch('')}
                                                            className="absolute right-2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                                                        >
                                                            <X size={8} />
                                                        </button>
                                                    )}
                                                </div>
                                                {/* 自訂貼上框 */}
                                                <div className="relative flex items-center flex-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 min-w-0">
                                                    <span className="absolute left-2.5 text-[10px] text-slate-300 dark:text-slate-600 select-none pointer-events-none">✏️</span>
                                                    <input
                                                        type="text"
                                                        placeholder="貼上自訂"
                                                        value={selectedIcon && !CURATED_EMOJIS.some(e => e.emoji === selectedIcon) ? selectedIcon : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val) setSelectedIcon(val);
                                                        }}
                                                        className="w-full h-7 pl-7 pr-2 bg-transparent text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    />
                                                </div>
                                            </div>

                                            {/* Emoji 格子：固定 2 排高度，超出滾軸瀏覽；搜尋後結果自然縮減 */}
                                            <div className="max-h-[33px] overflow-y-auto px-1 mb-0.5 custom-scrollbar">
                                                {(() => {
                                                    const filtered = CURATED_EMOJIS.filter(item =>
                                                        !customSearch || item.tags.some(tag =>
                                                            tag.toLowerCase().includes(customSearch.toLowerCase())
                                                        )
                                                    );
                                                    return filtered.length > 0 ? (
                                                        <div className="grid grid-cols-8 gap-0.5 py-0.5">
                                                            {filtered.map((item) => (
                                                                <button
                                                                    key={item.emoji}
                                                                    type="button"
                                                                    title={item.tags[0]}
                                                                    onClick={() => {
                                                                        setSelectedIcon(item.emoji);
                                                                        setIsIconPickerOpen(false);
                                                                    }}
                                                                    className={`h-8 w-full flex items-center justify-center text-base rounded-lg transition-all duration-150 hover:scale-110 ${selectedIcon === item.emoji
                                                                        ? 'bg-brand-primary/15 ring-1 ring-brand-primary/40 dark:bg-brand-primary/20'
                                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
                                                                        }`}
                                                                >
                                                                    {item.emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1.5 py-3 text-slate-400 dark:text-slate-600">
                                                            <span className="text-sm">🔍</span>
                                                            <p className="text-[10px]">找不到相符的圖示</p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mode Buttons */}
                        <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${isIconPickerOpen ? 'mt-0' : 'mt-1'}`}>
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
