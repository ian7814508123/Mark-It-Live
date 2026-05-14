import React, { useState, useCallback, useRef } from 'react';
import { FileUp, Info, Check, Upload, AlertTriangle } from 'lucide-react';
import RippleButton from '../ui/RippleButton';

interface FileImportToolProps {
    /** 觸發檔案導入的回呼，支援傳入檔案列表 */
    onImportFiles?: (files: FileList | File[]) => void;
}

/**
 * 檔案導入工具組件
 * 提供 Markdown, Excel, CSV 等檔案的導入功能，支援拖放上傳
 */
const FileImportTool: React.FC<FileImportToolProps> = ({ onImportFiles }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 觸發檔案選取對話框
    const openFilePicker = () => fileInputRef.current?.click();

    /** 執行上傳流程 */
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            if (onImportFiles) {
                await onImportFiles(files);
            }
            // 模擬上傳延遲或處理時間
            await new Promise(resolve => setTimeout(resolve, 600));
        } catch (err: any) {
            setUploadError(err.message || '檔案匯入失敗');
        } finally {
            setIsUploading(false);
        }
    }, [onImportFiles]);

    // 拖放事件處理
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── 標題 ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                        <FileUp size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">檔案導入工具</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                            IMPORT EXTERNAL FILES
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 內容區域 ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">準備導入新檔案？</h4>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[240px] leading-relaxed">
                        您可以將現有的文檔整合進來，系統將自動處理格式並顯示預覽。
                    </p>

                    {/* 拖放區域 */}
                    <div className="w-full max-w-[280px]">
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={isUploading ? undefined : openFilePicker}
                            className={[
                                'relative flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200',
                                isDragging
                                    ? 'border-brand-primary bg-brand-secondary dark:bg-brand-primary/20 scale-[1.02]'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-primary/60 dark:hover:border-brand-primary hover:bg-brand-secondary/50 dark:hover:bg-brand-primary/10',
                                isUploading ? 'cursor-wait opacity-70' : '',
                            ].join(' ')}
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[11px] text-brand-primary dark:text-brand-primary font-medium">處理中...</span>
                                </>
                            ) : (
                                <>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform ${isDragging ? 'scale-125 bg-brand-secondary dark:bg-brand-primary/50 text-brand-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        <Upload size={20} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                            {isDragging ? '放開以上傳' : '拖放或點擊上傳'}
                                        </p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            Markdown · Excel · CSV
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-1"></div>
                        {/* 支援格式卡片 */}
                        <div className="w-full max-w-[280px] mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-start gap-3 text-left">
                            <div className="mt-0.5 text-indigo-500 dark:text-indigo-400">
                                <Info size={14} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">支援的檔案格式</p>
                                <div className="flex flex-wrap gap-1">
                                    {['.md', '.mmd', '.txt', '.xlsx', '.csv'].map(ext => (
                                        <span key={ext} className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px] font-mono text-slate-600 dark:text-slate-300">
                                            {ext}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 隱藏的 file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv,.md,.txt,.mmd"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFiles(e.target.files)}
                            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                        />

                        {/* 錯誤訊息 */}
                        {uploadError && (
                            <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-left">
                                <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-red-600 dark:text-red-400 leading-snug">{uploadError}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 底部提示 ── */}
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 shrink-0 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    提示：導入 Excel 時會自動轉換為 Markdown 表格格式
                </p>
            </div>
        </div>
    );
};

export default FileImportTool;

