import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Copy, Check, AlertTriangle, Clock, Image } from 'lucide-react';
import { useImageStorage, formatExpiryDate, formatFileSize } from '../../hooks/useImageStorage';
import RippleButton from '../ui/RippleButton';

interface ImageUploaderToolProps {
    /** 當前文檔內容，用於 LRU 淘汰判斷 */
    currentDocContent?: string;
    /** 將 Markdown 語法插入編輯器游標位置的回呼 */
    onInsertIntoDoc: (text: string) => void;
}

/** 圖片上傳與管理工具面板 */
const ImageUploaderTool: React.FC<ImageUploaderToolProps> = ({ currentDocContent = '', onInsertIntoDoc }) => {
    const { images, totalSizeMB, isAtLimit, uploadImage, getImage, deleteImage, maxImages, maxSizeMB, ttlDays } = useImageStorage();

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [evictNotice, setEvictNotice] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 觸發檔案選取對話框
    const openFilePicker = () => fileInputRef.current?.click();

    /** 執行上傳流程 */
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const file = files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);
        setEvictNotice(null);

        const prevCount = images.length;
        const result = await uploadImage(file, currentDocContent);

        setIsUploading(false);

        if (!result.success) {
            // TypeScript discriminated union：success=false 分支才有 error 屬性
            setUploadError((result as { success: false; error: string }).error);
            return;
        }

        // TypeScript discriminated union：success=true 分支才有 markdownRef 屬性
        const { markdownRef } = result as { success: true; id: string; name: string; markdownRef: string };

        // 若圖片數量沒有增加（代表有淘汰發生）
        if (prevCount >= maxImages) {
            setEvictNotice('已自動移除一張最舊的未引用圖片以騰出空間。');
            setTimeout(() => setEvictNotice(null), 5000);
        }

        // 自動插入 Markdown 語法至編輯器
        onInsertIntoDoc(markdownRef);
    }, [uploadImage, onInsertIntoDoc, images.length, maxImages]);

    // 拖放事件處理
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    };

    // 點選「插入」—— 因為 getImage 是非同步，直接使用 onInsertIntoDoc 傳入語法
    const handleInsert = (id: string, name: string) => {
        const ref = `![${name}](img-local://${id})`;
        onInsertIntoDoc(ref);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('確定要刪除這張圖片嗎？刪除後，引用此圖片的 Markdown 將無法顯示。')) return;
        await deleteImage(id);
    };

    // 容量使用百分比（以 100MB 為滿額基準，IndexedDB 通常遠大於此）
    const usagePercent = Math.min(100, (totalSizeMB / 100) * 100);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── 標題 ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                        <Image size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">圖片庫</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                            IMAGE UPLOADER
                        </p>
                    </div>

                </div>
                <div className="px-1.5 pt-1. pb-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <span className={`text-[10px] font-bold ${isAtLimit ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                        {images.length} / {maxImages} 張 · {totalSizeMB.toFixed(2)} MB
                    </span>
                </div>
                {/* 數量使用條 */}
                <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isAtLimit ? 'bg-red-500' : 'bg-brand-primary'}`}
                        style={{ width: `${(images.length / maxImages) * 100}%` }}
                    />
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    每張上限 {maxSizeMB} MB · 自動於 {ttlDays} 天後到期
                </p>
            </div>

            {/* 拖放上傳區域 */}
            <div className="px-3 pt-3 shrink-0">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={isUploading ? undefined : openFilePicker}
                    className={[
                        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200',
                        isDragging
                            ? 'border-brand-primary bg-brand-secondary dark:bg-brand-primary/20 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-brand-primary/60 dark:hover:border-brand-primary hover:bg-brand-secondary/50 dark:hover:bg-brand-primary/10',
                        isUploading ? 'cursor-wait opacity-70' : '',
                    ].join(' ')}
                >
                    {isUploading ? (
                        <>
                            <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-[11px] text-brand-primary dark:text-brand-primary font-medium">上傳中...</span>
                        </>
                    ) : (
                        <>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${isDragging ? 'scale-125 bg-brand-secondary dark:bg-brand-primary/50 text-brand-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                <Upload size={16} />
                            </div>
                            <div className="text-center">
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    {isDragging ? '放開以上傳' : '拖放或點擊上傳'}
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                    JPG · PNG · GIF · WebP · SVG
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* 隱藏的 file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} // 允許重複選同一檔案
                />

                {/* 錯誤訊息 */}
                {uploadError && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
                        <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-600 dark:text-red-400 leading-snug">{uploadError}</p>
                    </div>
                )}

                {/* LRU 淘汰通知 */}
                {evictNotice && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                        <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-snug">{evictNotice}</p>
                    </div>
                )}
            </div>

            {/* 圖片列表 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-2 pb-3 space-y-1.5">
                {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300 dark:text-slate-600 py-8">
                        <ImageIcon size={32} />
                        <p className="text-[11px] text-center leading-snug">尚未上傳任何圖片<br />上傳後即可插入 Markdown</p>
                    </div>
                ) : (
                    images.map((img) => {
                        const isInserted = copiedId === img.id;
                        const isExpiringSoon = (img.expiresAt - Date.now()) < 3 * 24 * 60 * 60 * 1000; // 3天內到期

                        return (
                            <div
                                key={img.id}
                                className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150"
                            >
                                {/* 縮圖預覽（lazy load） */}
                                <LocalThumbnail id={img.id} name={img.name} getImage={getImage} />

                                {/* 圖片資訊 */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{img.name}</p>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        {formatFileSize(img.sizeBytes)}
                                    </p>
                                    <div className={`flex items-center gap-1 mt-0.5 ${isExpiringSoon ? 'text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}>
                                        <Clock size={9} />
                                        <span className="text-[9px]">到期：{formatExpiryDate(img.expiresAt)}</span>
                                    </div>
                                </div>

                                {/* 操作按鈕 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                                    <button
                                        onClick={() => handleInsert(img.id, img.name)}
                                        title="插入至編輯器"
                                        className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${isInserted ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'hover:bg-brand-secondary dark:hover:bg-brand-primary/30 text-slate-400 hover:text-brand-primary'}`}
                                    >
                                        {isInserted ? <Check size={11} /> : <Copy size={11} />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(img.id)}
                                        title="刪除圖片"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// ─── 懶惰載入縮圖（僅在進入翻頁可見時，才非同步讀取 IndexedDB）──────────────────
interface LocalThumbnailProps {
    id: string;
    name: string;
    getImage: (id: string) => Promise<string | null>;
}

const LocalThumbnail: React.FC<LocalThumbnailProps> = ({ id, name, getImage }) => {
    const [src, setSrc] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        getImage(id).then(dataUrl => {
            if (!cancelled) setSrc(dataUrl);
        });
        return () => { cancelled = true; };
    }, [id, getImage]);

    if (!src) {
        return (
            <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ImageIcon size={14} className="text-slate-300 dark:text-slate-600" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className="w-9 h-9 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
        />
    );
};

export default ImageUploaderTool;
