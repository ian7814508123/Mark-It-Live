import React, { useState, useEffect } from 'react';
import { X, Wrench, FileText, Table, BarChart2, Image, FileUp } from 'lucide-react';
import PdfMergeTool from './PdfMergeTool';
import TableGeneratorTool from './TableGeneratorTool';
import WordCountTool from './WordCountTool';
import ImageUploaderTool from './ImageUploaderTool';
import FileImportTool from './FileImportTool';
import RippleButton from '../ui/RippleButton';
import MagneticButton from '../ui/MagneticButton';
import GlassRailSelector from '../ui/GlassRailSelector';


interface ToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 當前文檔的原始 Markdown 內容，供字數統計使用 */
    currentDocContent: string;
    /** 當前文檔的編輯模式 */
    currentDocMode: 'markdown' | 'mermaid';
    /** 將文字插入編輯器游標位置的回呼 */
    onInsertIntoDoc: (text: string) => void;
    /** 觸發檔案導入的回呼 */
    onImportFiles?: (files: FileList | File[]) => void;
}

type ToolId = 'pdf-merge' | 'table-gen' | 'word-count' | 'image-upload' | 'file-import';

/** 工具清單定義：未來新增工具只需在此擴充 */
const TOOLS: { id: ToolId; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'pdf-merge', label: 'PDF 合併', desc: '合併 PDF 與圖片為單一 PDF', icon: <FileText size={13} /> },
    { id: 'table-gen', label: 'MD 表格', desc: '視覺化產生 Markdown 表格', icon: <Table size={13} /> },
    { id: 'word-count', label: '字數統計', desc: '自動略過公式與圖表區塊', icon: <BarChart2 size={13} /> },
    { id: 'image-upload', label: '圖片上傳', desc: '本地圖片上傳與即時預覽', icon: <Image size={13} /> },
    { id: 'file-import', label: '檔案導入', desc: '導入 Markdown 或 Excel 檔案', icon: <FileUp size={13} /> },
];

/** 根據 ToolId 渲染對應工具面板（新增工具只需在此 switch 加 case） */
function renderToolPanel(
    id: ToolId,
    currentDocContent: string,
    currentDocMode: 'markdown' | 'mermaid',
    onInsertIntoDoc: (t: string) => void,
    onImportFiles?: (files: FileList | File[]) => void
) {
    switch (id) {
        case 'pdf-merge': return <PdfMergeTool />;
        case 'table-gen': return <TableGeneratorTool currentDocMode={currentDocMode} onInsertIntoDoc={onInsertIntoDoc} />;
        case 'word-count': return <WordCountTool currentDocContent={currentDocContent} />;
        case 'image-upload': return <ImageUploaderTool currentDocContent={currentDocContent} onInsertIntoDoc={onInsertIntoDoc} />;
        case 'file-import': return <FileImportTool onImportFiles={onImportFiles} />;
        default: return null;
    }
}

const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, currentDocContent, currentDocMode, onInsertIntoDoc, onImportFiles }) => {
    const [activeTool, setActiveTool] = useState<ToolId>('pdf-merge');

    // 初始化 AdSense
    useEffect(() => {
        if (!isOpen) return;

        // 延遲執行以確保 Modal 動畫完成且容器寬度已計算
        const timer = setTimeout(() => {
            try {
                if (typeof window !== 'undefined') {
                    const adsbygoogle = (window as any).adsbygoogle || [];

                    // 只有在螢幕寬度足夠顯示側邊廣告 (xl: 1280px) 時才載入
                    if (window.innerWidth >= 1280) {
                        // 此 Modal 僅保留右側側邊廣告位
                        adsbygoogle.push({});
                    }
                }
            } catch (e) {
                console.error('AdSense ToolsModal error:', e);
            }
        }, 600); // 稍微增加延遲到 600ms

        return () => clearTimeout(timer);
    }, [isOpen]);

    // 按 Escape 關閉
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        /* 背景遮罩 + 霧化 */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in m3-fade-in duration-300"
            onClick={onClose}
        >

            {/* Modal 本體 */}
            <div
                className="relative flex flex-col w-full max-w-lg h-[min(640px,94vh)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 animate-in m3-slide-up duration-400 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                            <Wrench size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">更多工具</h2>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">輔助工具列表</p>
                        </div>
                    </div>
                    <MagneticButton
                        variant="icon"
                        onClick={onClose}
                        aria-label="關閉工具箱"
                        className="w-8 h-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="關閉"
                    >
                        <X size={18} />
                    </MagneticButton>
                </div>

                {/* Body：左側工具導覽 + 右側內容 */}
                <div className="flex min-h-[440px] flex-1 overflow-hidden rounded-b-3xl">
                    {/* 左側導覽 */}
                    <nav className="w-32 shrink-0 border-r border-slate-100 dark:border-slate-800 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar pb-3">
                        {TOOLS.map(tool => {
                            const isActive = activeTool === tool.id;
                            return (
                                <button
                                    key={tool.id}
                                    onClick={() => setActiveTool(tool.id)}
                                    className={[
                                        'md-ripple-root w-full flex flex-col items-start',
                                        'px-2.5 py-2.5 rounded-xl text-left transition-colors duration-200 [transition-timing-function:var(--m3-easing-standard)]',
                                        '[&_.md-ripple-wave]:text-brand-primary/15',
                                        isActive
                                            ? 'bg-brand-secondary dark:bg-brand-primary/30 text-brand-primary'
                                            : 'text-slate-500 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/8',
                                    ].join(' ')}
                                >
                                    <div className={`mb-1 p-1.5 rounded-xl ${isActive ? 'bg-brand-primary/20 dark:bg-brand-primary/50 text-brand-primary' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        {tool.icon}
                                    </div>
                                    <span className="text-[11px] font-semibold leading-tight">{tool.label}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-350 leading-tight mt-0.5">{tool.desc}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* 右側內容 */}
                    <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-900">
                        <div
                            key={activeTool}
                            className="absolute inset-0 flex flex-col"
                            style={{
                                animation: 'toolPanelIn 0.28s cubic-bezier(0.2, 0, 0, 1) both',
                            }}
                        >
                            {renderToolPanel(activeTool, currentDocContent, currentDocMode, onInsertIntoDoc, onImportFiles)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolsModal;
