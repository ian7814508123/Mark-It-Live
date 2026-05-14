import React, { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FilePlus2, Trash2, Download, GripVertical, FileText, Image as ImageIcon, X, Loader2, Upload } from 'lucide-react';
import RippleButton from '../ui/RippleButton';

/** 使用者加入的合併項目 */
interface MergeItem {
    id: string;
    file: File;
    type: 'pdf' | 'image';
}

const PdfMergeTool: React.FC = () => {
    const [items, setItems] = useState<MergeItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** 接受 File 列表並加入 items */
    const addFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        const newItems: MergeItem[] = arr
            .filter(f => {
                const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
                return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext);
            })
            .map(f => {
                const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
                return {
                    id: `${Date.now()}-${Math.random()}`,
                    file: f,
                    type: ext === 'pdf' ? 'pdf' : 'image',
                };
            });
        setItems(prev => [...prev, ...newItems]);
    }, []);

    // ── 拖放到上傳區域 ──────────────────────────────────
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    };

    const openFilePicker = () => fileInputRef.current?.click();

    // ── 列表項目拖曳排序 ─────────────────────────────────
    const handleItemDragStart = (idx: number) => setDraggedIdx(idx);
    const handleItemDragEnter = (idx: number) => setDragOverIdx(idx);
    const handleItemDragEnd = () => {
        if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
            setItems(prev => {
                const next = [...prev];
                const [moved] = next.splice(draggedIdx, 1);
                next.splice(dragOverIdx, 0, moved);
                return next;
            });
        }
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

    // ── PDF 合併 ──────────────────────────────────────────
    const handleMerge = async () => {
        if (items.length === 0) return;
        setIsMerging(true);

        try {
            const merged = await PDFDocument.create();

            for (const item of items) {
                const arrayBuffer = await item.file.arrayBuffer();

                if (item.type === 'pdf') {
                    // 合併 PDF 頁面
                    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                    const copiedPages = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
                    copiedPages.forEach(p => merged.addPage(p));
                } else {
                    // 將圖片嵌入為一頁 PDF
                    const ext = item.file.name.split('.').pop()?.toLowerCase();
                    const embeddedImage =
                        ext === 'png'
                            ? await merged.embedPng(arrayBuffer)
                            : await merged.embedJpg(arrayBuffer);

                    const { width, height } = embeddedImage.scale(1);
                    // 使用 A4 (595×842 pt) 為基準，等比縮放
                    const A4_W = 595, A4_H = 842;
                    const ratio = Math.min(A4_W / width, A4_H / height, 1);
                    const imgW = width * ratio;
                    const imgH = height * ratio;

                    const page = merged.addPage([A4_W, A4_H]);
                    page.drawImage(embeddedImage, {
                        x: (A4_W - imgW) / 2,
                        y: (A4_H - imgH) / 2,
                        width: imgW,
                        height: imgH,
                    });
                }
            }

            const pdfBytes = await merged.save();
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `merged-${Date.now()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF 合併失敗：', err);
            alert('合併失敗，請確認檔案未加密或格式正確。');
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── 標題 ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                        <FilePlus2 size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">PDF 合併工具</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                            PDF・PNG・JPG → 單一 PDF
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 內容區域 ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
                {/* 拖放上傳區域 */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={openFilePicker}
                    className={[
                        'relative flex items-center justify-center border-2 border-dashed cursor-pointer transition-all duration-300 rounded-2xl',
                        items.length > 0
                            ? 'flex-row gap-3 p-3'
                            : 'flex-col gap-2 p-8',
                        isDragging
                            ? 'border-brand-primary bg-brand-secondary dark:bg-brand-primary/20 scale-[1.01]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-brand-primary/60 dark:hover:border-brand-primary hover:bg-brand-secondary/50 dark:hover:bg-brand-primary/10',
                    ].join(' ')}
                >
                    <div className={`
                        flex items-center justify-center rounded-xl transition-all duration-300
                        ${items.length > 0 ? 'w-8 h-8' : 'w-10 h-10'}
                        ${isDragging ? 'scale-110 bg-brand-secondary dark:bg-brand-primary/50 text-brand-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                    `}>
                        <Upload size={items.length > 0 ? 16 : 20} />
                    </div>
                    <div className={items.length > 0 ? 'text-left flex-1' : 'text-center'}>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-100">
                            {isDragging ? '放開以上傳' : items.length > 0 ? '繼續添加或拖放檔案' : '拖放或點擊上傳檔案'}
                        </p>
                        {items.length === 0 && (
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                支援 PDF · PNG · JPG
                            </p>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                    />
                </div>

                {/* 已加入的檔案列表 */}
                {items.length > 0 && (
                    <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                                合併順序（可拖曳排序）
                            </p>
                            <button
                                onClick={() => setItems([])}
                                className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                            >
                                清除全部
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    draggable
                                    onDragStart={() => handleItemDragStart(idx)}
                                    onDragEnter={() => handleItemDragEnter(idx)}
                                    onDragEnd={handleItemDragEnd}
                                    onDragOver={e => e.preventDefault()}
                                    className={`
                                        group flex items-center gap-3 p-2.5 rounded-xl
                                        bg-slate-50 dark:bg-slate-800/50
                                        border transition-all duration-150 cursor-grab active:cursor-grabbing
                                        ${dragOverIdx === idx && draggedIdx !== idx
                                            ? 'border-brand-primary ring-1 ring-brand-primary bg-brand-secondary dark:bg-brand-primary/20'
                                            : 'border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600'}
                                        ${draggedIdx === idx ? 'opacity-40' : 'opacity-100'}
                                    `}
                                >
                                    <GripVertical size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shadow-sm text-brand-primary">
                                        {item.type === 'pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {item.file.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500">
                                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 底部操作 ── */}
            <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <RippleButton
                    variant="filled"
                    onClick={handleMerge}
                    disabled={isMerging || items.length === 0}
                    className={`w-full h-11 justify-center rounded-xl font-bold gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/20 ${isMerging || items.length === 0 ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                >
                    {isMerging ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>正在處理中...</span>
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            <span>合併並下載 PDF</span>
                        </>
                    )}
                </RippleButton>
            </div>
        </div>
    );
};

export default PdfMergeTool;
