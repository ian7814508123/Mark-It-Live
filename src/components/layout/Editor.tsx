
import React, { forwardRef, useState, useMemo, useEffect } from 'react';
import { FileCode, Check, Copy, RefreshCw, Trash2, Menu, X, FileText, FileSearch } from 'lucide-react';
import RippleButton from '../ui/RippleButton';
import CodeMirrorEditor from './CodeMirrorEditor';
import { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import IntroModal from '../modals/IntroModal';
import { DocumentRecord } from '../../types';
import MagneticButton from '../ui/MagneticButton';

interface EditorProps {
    mode: 'mermaid' | 'markdown';
    code: string;
    setCode: (code: string) => void;
    onCopy: () => void;
    onReset: () => void;
    onClear: () => void;
    copied: boolean;
    onScroll?: (e: React.UIEvent | Event) => void;
    isDarkMode: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onToggleSidebar?: () => void;
    // Tab 相關
    openDocIds?: string[];
    currentDocId?: string | null;
    documents?: DocumentRecord[]; // 用來取得標題與模式
    onSwitchTab?: (docId: string) => void;
    onCloseTab?: (docId: string, e: React.MouseEvent) => void;
    /** 是否有任何文件被打開 */
    hasOpenDocuments?: boolean;
}

const Editor = forwardRef<ReactCodeMirrorRef, EditorProps>(({
    mode,
    code,
    setCode,
    onCopy,
    onReset,
    onClear,
    copied,
    onScroll,
    isDarkMode,
    onMouseEnter,
    onMouseLeave,
    onToggleSidebar,
    openDocIds = [],
    currentDocId,
    documents = [],
    onSwitchTab,
    onCloseTab,
    hasOpenDocuments = false,
}, ref) => {

    const [isIntroOpen, setIsIntroOpen] = useState(false);

    // 優化：建立 ID 到文件的映射，避免在 map 中重複搜尋
    const docMap = useMemo(() => {
        const map = new Map<string, DocumentRecord>();
        documents.forEach(doc => map.set(doc.id, doc));
        return map;
    }, [documents]);

    const handleSearch = () => {
        if (ref && 'current' in ref && ref.current?.view) {
            import('@codemirror/search').then(({ openSearchPanel }) => {
                openSearchPanel(ref.current!.view!);
            });
        }
    };

    return (
        <section
            className="flex-1 min-w-0 lg:min-w-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20  transition-colors duration-200 print:hidden"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* 整合後的 Tab Bar + 工具列 (精緻瀏覽器風格) */}
            <div className="flex items-end border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 pl-0 pr-1 pt-1 sticky top-0 z-30 select-none" onMouseEnter={onMouseEnter}>

                <div className="flex flex-nowrap items-end flex-1 min-w-0">
                    {/* 左側漢堡選單 */}
                    <div className="flex items-center gap-1 px-1.5 mb-0.5 shrink-0">
                        <RippleButton
                            variant="icon"
                            onClick={onToggleSidebar}
                            aria-label="我的文檔"
                            title="我的文檔"
                            className="w-8 h-8 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                        >
                            <Menu size={18} />
                        </RippleButton>
                    </div>

                    {/* 分頁區域 */}
                    <div className="flex items-end flex-1 min-w-0 h-full overflow-hidden">
                        {openDocIds.map((id, index) => {
                            const doc = docMap.get(id);
                            if (!doc) return null;
                            const isActive = id === currentDocId;
                            const isNextActive = openDocIds[index + 1] === currentDocId;

                            return (
                                <div
                                    key={id}
                                    onClick={() => onSwitchTab?.(id)}
                                    className={`
                                        flex items-center gap-1 px-3 text-[10px] font-medium cursor-pointer transition-all relative group
                                        ${isActive
                                            ? 'bg-white dark:bg-slate-900 text-brand-primary rounded-t-xl z-20 flex-[3_3_0%] min-w-[60px] h-9 mb-[0px] mx-0.5'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/90 rounded-lg flex-1 min-w-[30px] h-7 mb-[4px] mx-1'
                                        }
                                    `}
                                    style={{ maxWidth: '150px' }}
                                    title={doc.name}
                                >
                                    {/* 垂直分隔線 */}
                                    {!isActive && !isNextActive && index < openDocIds.length - 1 && (
                                        <div className="absolute -right-1.5 top-1/4 bottom-1/4 w-px bg-slate-300 dark:bg-slate-700 pointer-events-none opacity-50" />
                                    )}

                                    <div className="flex items-center justify-center shrink-0 w-4 h-4">
                                        {doc.icon ? (
                                            <span className="text-xs leading-none">{doc.icon}</span>
                                        ) : (
                                            doc.mode === 'mermaid'
                                                ? <FileCode size={12} className={isActive ? 'text-brand-primary' : 'opacity-60'} />
                                                : <FileText size={12} className={isActive ? 'text-brand-primary' : 'opacity-60'} />
                                        )}
                                    </div>
                                    <span className={`truncate flex-1 transition-all duration-200 ${isActive ? 'font-bold opacity-100' : 'opacity-100'} 
                                        ${!isActive ? 'hidden sm:block' : ''} 
                                        group-hover:block
                                    `}>
                                        {doc.name}
                                    </span>

                                    {isActive && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCloseTab?.(id, e);
                                            }}
                                            aria-label="關閉此分頁"
                                            className="p-0.5 rounded-full transition-all flex items-center justify-center shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 ml-auto"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}

                                    {/* 側邊圓角過渡 (Active state only) */}
                                    {isActive && (
                                        <>
                                            <div className="absolute -left-2 bottom-0 w-2 h-2 bg-white dark:bg-slate-900 pointer-events-none z-20">
                                                <div className="w-2 h-2 rounded-br-xl bg-slate-100 dark:bg-slate-950" />
                                            </div>
                                            <div className="absolute -right-2 bottom-0 w-2 h-2 bg-white dark:bg-slate-900 pointer-events-none z-20">
                                                <div className="w-2 h-2 rounded-bl-xl bg-slate-100 dark:bg-slate-950" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 右側操作按鈕 */}
                <div className="flex items-center gap-1 px-2 mb-0.5 shrink-0">
                    <RippleButton
                        variant="icon"
                        onClick={() => {
                            if (hasOpenDocuments) handleSearch();
                        }}
                        aria-label="搜尋與取代 (Ctrl+F)"
                        title="搜尋 (Ctrl+F)"
                        className={`w-8 h-8 text-slate-500 dark:text-slate-400
                                    ${!hasOpenDocuments
                                ? 'cursor-not-allowed opacity-40'
                                : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        disabled={!hasOpenDocuments}
                    >
                        <FileSearch size={14} />
                    </RippleButton>
                    <RippleButton
                        variant="icon"
                        onClick={() => {
                            if (hasOpenDocuments) onCopy();
                        }}
                        aria-label="複製內容"
                        title="複製"
                        className={`w-8 h-8 text-slate-500 dark:text-slate-400
                                    ${!hasOpenDocuments
                                ? 'cursor-not-allowed opacity-40'
                                : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        disabled={!hasOpenDocuments}
                    >
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </RippleButton>
                    <RippleButton
                        variant="icon"
                        onClick={() => {
                            if (hasOpenDocuments) onReset();
                        }}
                        aria-label="還原初始內容"
                        title="重置"
                        className={`w-8 h-8 text-slate-500 dark:text-slate-400
                                    ${!hasOpenDocuments
                                ? 'cursor-not-allowed opacity-40'
                                : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        disabled={!hasOpenDocuments}
                    >
                        <RefreshCw size={14} />
                    </RippleButton>
                    <RippleButton
                        variant="icon"
                        onClick={() => {
                            if (hasOpenDocuments) onClear();
                        }}
                        aria-label="清空編輯器"
                        title="清除"
                        className={`w-8 h-8 text-slate-400
                                    ${!hasOpenDocuments
                                ? 'cursor-not-allowed opacity-40'
                                : 'hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        disabled={!hasOpenDocuments}
                    >
                        <Trash2 size={14} />
                    </RippleButton>
                </div>
            </div>

            {/* 編輯區域 */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-200 relative">
                {/* 核心編輯器 */}
                {openDocIds.length > 0 && (
                    <CodeMirrorEditor
                        ref={ref}
                        mode={mode}
                        code={code}
                        setCode={setCode}
                        isDarkMode={isDarkMode}
                        onScroll={onScroll}
                        placeholder={mode === 'mermaid' ? "Enter Mermaid code..." : "Enter Markdown content..."}
                    />
                )}

                {/* 空狀態覆蓋層 */}
                <div className={`
                    absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 space-y-6 bg-white dark:bg-slate-900 z-20 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                    ${openDocIds.length > 0
                        ? 'opacity-0 translate-y-full pointer-events-none blur-sm'
                        : 'opacity-100 translate-y-0'
                    }
                `}>
                    <div className="relative">
                        <div className="absolute -inset-4"></div>
                        <div className="relative p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-700">
                            <FileSearch size={40} className="text-brand-primary" />
                        </div>
                    </div>
                    <div className="text-center space-y-2 max-w-xs">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">尚未開啟任何文件</h3>
                        <p className="text-sm leading-relaxed">
                            請在左側工具欄點選文件圖示，從「我的文檔」中選擇文件開始編輯。
                        </p>
                    </div>

                    <MagneticButton variant="filled" onClick={onToggleSidebar}
                        aria-label="開啟側邊攔"
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all select-none`}
                        magneticOptions={{ maxOffset: 14, radius: 70, stiffness: 250, damping: 18 }}>
                        <Menu size={15} />
                        <span>開啟側邊欄</span>
                    </MagneticButton>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm leading-relaxed">
                            不知道如何開始嗎？要不要看看
                        </p>

                        <MagneticButton variant="filled" onClick={() => setIsIntroOpen(true)}
                            aria-label="開啟功能介紹"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-all select-none`}
                            magneticOptions={{ maxOffset: 14, radius: 70, stiffness: 250, damping: 18 }}>
                            <span>功能介紹</span>
                        </MagneticButton>
                    </div>
                </div>
            </div>
            <IntroModal
                isOpen={isIntroOpen}
                onClose={() => setIsIntroOpen(false)}
            />
        </section>
    );
});
export default Editor;