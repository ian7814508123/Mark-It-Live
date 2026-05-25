import React, { useState, useCallback, useRef } from 'react';
import {
    Upload,
    Image as ImageIcon,
    Trash2,
    Copy,
    Check,
    AlertTriangle,
    Clock,
    FileUp,
    FileText,
    Database,
    Info,
    ArrowLeft
} from 'lucide-react';
import { useImageStorage, formatExpiryDate, formatFileSize } from '../../hooks/useImageStorage';
import GlassRailSelector, { GlassRailOption } from '../ui/GlassRailSelector';
import ToolGuide from '../ui/ToolGuide';

interface DataMediaCenterToolProps {
    /** 當前文檔內容，用於 LRU 淘汰判斷 */
    currentDocContent?: string;
    /** 將 Markdown 語法插入編輯器游標位置的回呼 */
    onInsertIntoDoc: (text: string) => void;
    /** 檔案導入的回呼，支援傳入檔案列表 */
    onImportFiles?: (files: FileList | File[]) => void;
    /** 導入並新建為獨立文檔的回呼 */
    onImportAsNewDoc?: (name: string, content: string, mode: 'markdown' | 'mermaid') => void;
}

interface PendingImport {
    id: string;
    name: string;
    content: string;
    extension: 'md' | 'mmd' | 'txt';
}

/** 整合式媒體與數ImageUpload中心) */
const DataMediaCenterTool: React.FC<DataMediaCenterToolProps> = ({
    currentDocContent = '',
    onInsertIntoDoc,
    onImportFiles,
    onImportAsNewDoc
}) => {
    const {
        images,
        isAtLimit,
        uploadImage,
        getImage,
        deleteImage,
        maxImages,

        dataFiles,
        isDataAtLimit,
        uploadDataFile,
        deleteDataFile,
        maxDataFiles,

        totalSizeMB,
        maxSizeMB,
        ttlDays
    } = useImageStorage();

    const [activeTab, setActiveTab] = useState<'import' | 'data' | 'images'>('import');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // 待導入檔案列表狀態
    const [pendingImports, setPendingImports] = useState<PendingImport[]>([]);

    // 說明氣泡提示框顯示狀態
    const [showInfoPopover, setShowInfoPopover] = useState(false);

    // 指南頁面中 Vega Spec 複製狀態
    const [vegaTemplateCopied, setVegaTemplateCopied] = useState(false);

    // 用於追蹤特定項目點擊「複製」或「插入」後的打勾狀態
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [insertedId, setInsertedId] = useState<string | null>(null);

    const [evictNotice, setEvictNotice] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 軌道分頁設定
    const tabOptions: GlassRailOption<'import' | 'data' | 'images'>[] = [
        { label: '文檔', value: 'import', icon: <FileUp size={13} /> },
        { label: '檔案與數據', value: 'data', icon: <Database size={13} /> },
        { label: '圖片庫', value: 'images', icon: <ImageIcon size={13} /> }
    ];

    // 觸發檔案選取對話框
    const openFilePicker = () => fileInputRef.current?.click();

    /** 執行上傳流程 */
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const file = files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);
        setEvictNotice(null);

        if (activeTab === 'images') {
            const prevCount = images.length;
            const result = await uploadImage(file, currentDocContent);
            setIsUploading(false);

            if (result.success === false) {
                setUploadError(result.error);
                return;
            }

            // 若圖片數量沒有增加（代表有淘汰發生）
            if (prevCount >= maxImages) {
                setEvictNotice('已自動移除一張最舊的未引用圖片以騰出空間。');
                setTimeout(() => setEvictNotice(null), 5000);
            }

            onInsertIntoDoc(result.markdownRef);
        } else if (activeTab === 'data') {
            // 上傳數據檔案
            const prevCount = dataFiles.length;
            const result = await uploadDataFile(file, currentDocContent);
            setIsUploading(false);

            if (result.success === false) {
                setUploadError(result.error);
                return;
            }

            // 判斷是否覆蓋或淘汰
            const isOverwrite = dataFiles.some(d => d.name === file.name);
            if (!isOverwrite && prevCount >= maxDataFiles) {
                setEvictNotice('已自動移除一個最舊的未引用數據檔案以騰出空間。');
                setTimeout(() => setEvictNotice(null), 5000);
            }

            // 提醒使用者已上傳成功，並提供引用語法
            const refSyntax = `data-local://${result.name}`;
            onInsertIntoDoc(refSyntax);

            // 觸發成功勾勾動畫
            setInsertedId(result.id);
            setTimeout(() => setInsertedId(null), 2000);
        } else if (activeTab === 'import') {
            // 處理檔案導入 (即原 FileImportTool 的核心處理邏輯)
            const fileName = file.name.toLowerCase();
            try {
                if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                    // 解析 Excel/CSV 並直接轉成 MD 表格插入編輯器
                    const { parseExcelToMarkdown } = await import('../../services/excelParser');
                    const md = await parseExcelToMarkdown(file);
                    if (md) {
                        onInsertIntoDoc(md);
                    }
                } else {
                    // 讀取 Markdown/MMD 文字內容並加入 pending 導入清單中，讓使用者二選一
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content !== undefined) {
                            const extension = file.name.split('.').pop()?.toLowerCase() || 'txt';
                            setPendingImports(prev => [
                                ...prev,
                                {
                                    id: Math.random().toString(36).substring(2, 9),
                                    name: file.name.replace(/\.[^/.]+$/, ""),
                                    content,
                                    extension: extension === 'mmd' ? 'mmd' : (extension === 'md' ? 'md' : 'txt')
                                }
                            ]);
                        }
                    };
                    reader.readAsText(file);
                }
            } catch (err: any) {
                setUploadError(err.message || '檔案匯入失敗');
            } finally {
                setIsUploading(false);
            }
        }
    }, [activeTab, uploadImage, uploadDataFile, currentDocContent, images.length, dataFiles.length, maxImages, maxDataFiles, onInsertIntoDoc]);

    // 拖放事件處理
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    };

    // 圖片：插入編輯器
    const handleInsertImage = (id: string, name: string) => {
        const ref = `![${name}](img-local://${id})`;
        onInsertIntoDoc(ref);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // 數據：複製引用路徑
    const handleCopyDataRef = (name: string, id: string) => {
        const ref = `data-local://${name}`;
        navigator.clipboard.writeText(ref).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    // 檔案導入：插入到當前文檔中
    const handleInsertImportToDoc = (id: string, content: string) => {
        onInsertIntoDoc(content);
        setPendingImports(prev => prev.filter(item => item.id !== id));
    };

    // 檔案導入：建立獨立文件
    const handleCreateImportAsNewDoc = (id: string, name: string, content: string, extension: 'md' | 'mmd' | 'txt') => {
        if (onImportAsNewDoc) {
            onImportAsNewDoc(name, content, extension === 'mmd' ? 'mermaid' : 'markdown');
        }
        setPendingImports(prev => prev.filter(item => item.id !== id));
    };

    // 檔案導入：自清單中移除（取消導入）
    const handleRemovePendingImport = (id: string) => {
        setPendingImports(prev => prev.filter(item => item.id !== id));
    };

    // 刪除處理
    const handleDeleteImage = async (id: string) => {
        if (!window.confirm('確定要刪除這張圖片嗎？刪除後，引用此圖片的 Markdown 將無法顯示。')) return;
        await deleteImage(id);
    };

    const handleDeleteData = async (id: string) => {
        if (!window.confirm('確定要刪除這個數據檔案嗎？刪除後，引用此數據的 Vega 圖表將無法渲染。')) return;
        await deleteDataFile(id);
    };

    // 計算百分比限制（聯立以 100MB 為滿額基準，IndexedDB 容量通常極大）
    const usagePercent = Math.min(100, (totalSizeMB / 100) * 100);
    const activeFilesCount =
        activeTab === 'images'
            ? images.length
            : activeTab === 'data'
                ? dataFiles.length
                : pendingImports.length;

    if (showInfoPopover) {
        return (
            <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-200 bg-white dark:bg-slate-900">
                {/* ── 指南頂部 ── */}
                <ToolGuide
                    title="數據與媒體中心 使用指南"
                    subtitle="USER GUIDE FOR DATA & MEDIA CENTER"
                    onClose={() => setShowInfoPopover(false)}
                >
                    {/* 1. 檔案導入功能 */}
                    <ToolGuide.Section title="1. 檔案導入功能" icon="">
                        <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                            <p>
                                <strong>Excel 與 CSV (.xlsx, .xls, .csv)：</strong>
                                拖放或上傳後，系統會自動將表格解析，轉換成標準的 Markdown 表格格式，並直接插入到目前主編輯器的游標位置。
                            </p>
                            <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5 mt-1.5">
                                <strong>Markdown 與 Mermaid (.md, .txt, .mmd)：</strong>
                                上傳後會暫存於<strong>「待處理導入清單」</strong>中，您可彈性選擇：
                                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                    <li><span className="font-semibold text-indigo-605 dark:text-indigo-400">插入此文檔</span>：將文字內容寫入目前文檔。</li>
                                    <li><span className="font-semibold text-indigo-605 dark:text-indigo-400">新建獨立檔</span>：在左側文件庫新建一個獨立檔案，並自動為您切換分頁。</li>
                                </ul>
                                選擇完成後，該檔案將從待處理清單中釋出，保持操作介面的清爽。
                            </p>
                        </div>
                    </ToolGuide.Section>

                    {/* 2. 略過區塊 */}
                    <ToolGuide.Section title="2. 數據庫配置與管理" icon="">
                        <div className="text-[12px] text-slate-555 dark:text-slate-400 space-y-1.5 leading-relaxed">
                            <p>
                                支援上傳 <code>.json, .csv, .tsv, .topojson</code> 數據檔案，這會將檔案寫入本地 IndexedDB 快取庫。您可以在 Vega / Vega-Lite Spec 中，利用 <code>"data-local://檔名.json"</code> 的虛擬路徑離線引用此檔案。
                            </p>
                        </div>
                    </ToolGuide.Section>

                    {/* 3. 多功能模式 */}
                    <ToolGuide.Section title="3. 本地圖片庫與容量說明" icon="">
                        <div className="text-[12px] text-slate-550 dark:text-slate-400 space-y-1.5 leading-relaxed">
                            <p>
                                <strong>Markdown 引用：</strong>
                                圖片上傳後會顯示在列表中。點擊「複製」或「插入」可取得 <code>![圖片名稱](img-local://ID)</code> 引用語法，預覽區將為您即時渲染顯示該圖片。
                            </p>
                            <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5 mt-1.5">
                                <strong>LRU 自動淘汰機制：</strong>
                                本地存儲設有 100MB 滿額容量上限（以保障瀏覽器性能）。當空間不足或上傳數達上限時，系統會依據<strong>「最久未在目前編輯器中引用的檔案」</strong>（Least Recently Used）進行自動淘汰，確保重要文件圖片永久可用。
                            </p>
                        </div>
                    </ToolGuide.Section>
                </ToolGuide>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── 標題與聯立空間資訊 ── */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary rounded-xl flex items-center justify-center">
                            <Database size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">數據與媒體中心</h3>
                                <button
                                    onClick={() => setShowInfoPopover(!showInfoPopover)}
                                    className={`p-0.5 rounded-md transition-colors ${showInfoPopover ? 'bg-brand-secondary text-brand-primary dark:bg-brand-primary/20' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                                    title="顯示數據管理中心說明"
                                >
                                    <Info size={15} />
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-semibold">
                                DATA & MEDIA STORAGE
                            </p>
                        </div>
                    </div>
                    {/* 容量百分比 */}
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        總容量：{totalSizeMB.toFixed(2)} MB / 100 MB
                    </span>
                </div>

                {/* 聯立容量使用條 */}
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${usagePercent > 80 ? 'bg-amber-500' : usagePercent > 95 ? 'bg-red-500' : 'bg-brand-primary'}`}
                        style={{ width: `${usagePercent}%` }}
                    />
                </div>

                {/* 軌道式分頁切換器 */}
                <GlassRailSelector
                    options={tabOptions}
                    value={activeTab}
                    onChange={(val) => {
                        setActiveTab(val);
                        setUploadError(null);
                    }}
                    className="w-full"
                />
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
                            <span className="text-[11px] text-brand-primary dark:text-brand-primary font-medium">處理中...</span>
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
                                    {activeTab === 'images'
                                        ? 'JPG · PNG · GIF · WebP · SVG'
                                        : activeTab === 'import'
                                            ? 'Markdown · Excel · TXT · MMD'
                                            : 'JSON · CSV · TSV · TopoJSON'}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* 隱藏的 file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={activeTab === 'images'
                        ? "image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        : activeTab === 'import'
                            ? ".xlsx,.xls,.md,.txt,.mmd"
                            : ".json,.csv,.tsv,.topojson"}
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

            {/* 檔案/圖片列表 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-2 pb-3 space-y-1.5 animate-in fade-in duration-355">
                {activeTab === 'images' ? (
                    // ── 圖片庫渲染 ──
                    images.map((img) => {
                        const isCopied = copiedId === img.id;
                        const isExpiringSoon = (img.expiresAt - Date.now()) < 3 * 24 * 60 * 60 * 1000;

                        return (
                            <div
                                key={img.id}
                                className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150"
                            >
                                <LocalThumbnail id={img.id} name={img.name} getImage={getImage} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{img.name}</p>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        {formatFileSize(img.sizeBytes)}
                                    </p>
                                    <div className={`flex items-center gap-1 mt-0.5 ${isExpiringSoon ? 'text-amber-500 font-semibold' : 'text-slate-400 dark:text-slate-600'}`}>
                                        <Clock size={9} />
                                        <span className="text-[9px]">到期日：{formatExpiryDate(img.expiresAt)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                                    <button
                                        onClick={() => handleInsertImage(img.id, img.name)}
                                        title="插入圖片語法至編輯器"
                                        className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${isCopied ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'hover:bg-brand-secondary dark:hover:bg-brand-primary/30 text-slate-400 hover:text-brand-primary'}`}
                                    >
                                        {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteImage(img.id)}
                                        title="刪除圖片"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : activeTab === 'data' ? (
                    // ── 數據庫渲染 ──
                    dataFiles.map((file) => {
                        const isCopied = copiedId === file.id;
                        const isExpiringSoon = (file.expiresAt - Date.now()) < 3 * 24 * 60 * 60 * 1000;
                        const ext = file.name.split('.').pop()?.toUpperCase() || 'DATA';

                        return (
                            <div
                                key={file.id}
                                className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-150"
                            >
                                {/* 數據檔案格式 Logo */}
                                <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center relative">
                                    <Database size={13} className="text-brand-primary" />
                                    <span className="text-[7px] font-black text-brand-primary/80 uppercase tracking-tighter mt-0.5 leading-none">
                                        {ext}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                        大小：{formatFileSize(file.sizeBytes)}
                                    </p>
                                    <div className={`flex items-center gap-1 mt-0.5 ${isExpiringSoon ? 'text-amber-500 font-semibold' : 'text-slate-400 dark:text-slate-600'}`}>
                                        <Clock size={9} />
                                        <span className="text-[9px]">到期：{formatExpiryDate(file.expiresAt)}</span>
                                    </div>
                                </div>

                                {/* 數據檔案操作按鈕 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                                    <button
                                        onClick={() => handleCopyDataRef(file.name, file.id)}
                                        title="複製 data-local:// 虛擬引用路徑"
                                        className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${isCopied ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'hover:bg-brand-secondary dark:hover:bg-brand-primary/30 text-slate-400 hover:text-brand-primary'}`}
                                    >
                                        {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteData(file.id)}
                                        title="刪除檔案"
                                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // ── 待導入檔案列表渲染 ──
                    pendingImports.map((item) => {
                        const extUpper = item.extension.toUpperCase();
                        return (
                            <div
                                key={item.id}
                                className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/30 dark:hover:bg-slate-800/60 transition-all duration-150 border border-slate-100 dark:border-slate-800/40 relative overflow-hidden"
                            >
                                {/* 檔案類型小徽章 */}
                                <div className="w-9 h-9 shrink-0 rounded-lg bg-brand-secondary dark:bg-brand-primary/10 border border-brand-primary/10 flex flex-col items-center justify-center relative">
                                    <FileText size={14} className="text-brand-primary" />
                                    <span className="text-[7px] font-black text-brand-primary/80 uppercase tracking-tighter mt-0.5 leading-none">
                                        {extUpper}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.name}>
                                        {item.name}
                                    </p>
                                    <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">
                                        待選擇處理方式...
                                    </p>
                                </div>

                                {/* 操作按鈕區 */}
                                <div className="flex items-center gap-1.5 shrink-0 z-10">
                                    <button
                                        onClick={() => handleInsertImportToDoc(item.id, item.content)}
                                        title="插入至目前文件最後或游標處"
                                        className="px-2.5 py-1 text-[9px] font-bold bg-brand-secondary dark:bg-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white dark:hover:bg-brand-primary rounded-lg transition-all active:scale-95 flex items-center gap-0.5"
                                    >
                                        插入此文檔
                                    </button>
                                    <button
                                        onClick={() => handleCreateImportAsNewDoc(item.id, item.name, item.content, item.extension)}
                                        title="新建為獨立文檔並切換分頁"
                                        className="px-2.5 py-1 text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 rounded-lg transition-all active:scale-95 flex items-center gap-0.5"
                                    >
                                        新建獨立檔
                                    </button>
                                    <button
                                        onClick={() => handleRemovePendingImport(item.id)}
                                        title="取消導入"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={12} />
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

// ─── 圖片庫懶加載縮圖 ───
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

export default DataMediaCenterTool;
