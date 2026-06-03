import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, FolderOpen, FileText, Wrench, ChevronDown, ChevronRight, Files, FolderPlus } from 'lucide-react';
import { DocumentRecord } from '../../types';
import DocumentItem from '../ui/DocumentItem';
import ToolsModal from '../modals/ToolsModal';
import RippleButton from '../ui/RippleButton';
import MarkdownPreview from '../markdown/MarkdownPreview';
import MagneticButton from '../ui/MagneticButton';
import EllipsisMenu from '../ui/EllipsisMenu';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    documents: DocumentRecord[];
    currentDocId: string | null;
    currentDocContent: string;
    currentDocMode: 'markdown' | 'mermaid';
    onInsertIntoDoc: (text: string) => void;
    onSelectDocument: (docId: string) => void;
    onCreateDocument: (folderId: string | null) => void;
    onDeleteDocument: (docId: string) => void;
    onRenameDocument: (docId: string, newName: string) => void;
    storageUsage: number;
    getBacklinks: (docName: string) => DocumentRecord[];
    folders: any[];
    onCreateFolder: (name: string) => void;
    onDeleteFolder: (folderId: string) => void;
    onRenameFolder: (folderId: string, newName: string) => void;
    onMoveDocument: (docId: string, folderId: string | null) => void;
    onReorderDocuments: (docIds: string[]) => void;
    onImportFiles?: (files: FileList | File[]) => void;
    onImportAsNewDoc?: (name: string, content: string, mode: 'markdown' | 'mermaid') => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    onClose,
    documents,
    currentDocId,
    currentDocContent,
    currentDocMode,
    onInsertIntoDoc,
    onSelectDocument,
    onCreateDocument,
    onDeleteDocument,
    onRenameDocument,
    storageUsage,
    getBacklinks,
    folders,
    onCreateFolder,
    onDeleteFolder,
    onRenameFolder,
    onMoveDocument,
    onReorderDocuments,
    onImportFiles,
    onImportAsNewDoc,
}) => {
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editFolderName, setEditFolderName] = useState('');
    const [hasPushedAd, setHasPushedAd] = useState(false);
    const adContainerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef<{
        lastY: number;
        isActive: boolean;
        startTime: number | null;
        animationFrame: number | null;
        scrollLoopFn: (() => void) | null;
    }>({
        lastY: 0,
        isActive: false,
        startTime: null,
        animationFrame: null,
        scrollLoopFn: null,
    });

    // 初始化側邊欄廣告
    useEffect(() => {
        if (isOpen && !hasPushedAd) {
            let retryCount = 0;
            const maxRetries = 10;

            const tryPushAd = () => {
                if (!isOpen) return;
                if (adContainerRef.current && adContainerRef.current.clientWidth > 0) {
                    try {
                        if (typeof window !== 'undefined') {
                            const adsbygoogle = (window as any).adsbygoogle || [];
                            adsbygoogle.push({});
                            setHasPushedAd(true);
                        }
                    } catch (e) {
                        console.error('AdSense Sidebar error:', e);
                    }
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(tryPushAd, 200);
                }
            };
            const timer = setTimeout(tryPushAd, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, hasPushedAd]);

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    /**
     * 資料夾重新命名：由 EllipsisMenu 的 onRename callback 觸發，
     * 直接進入行內輸入模式，取代觸控端難以觸發的「雙擊重命名」。
     */
    const handleFolderRenameStart = (folder: any) => {
        setEditingFolderId(folder.id);
        setEditFolderName(folder.name);
    };

    const handleFolderRenameSave = (folderId: string) => {
        if (editFolderName.trim() && editFolderName !== folders.find(f => f.id === folderId)?.name) {
            onRenameFolder(folderId, editFolderName.trim());
        }
        setEditingFolderId(null);
    };

    /**
     * 處理拖曳時的邊緣滾動 (Auto-Scroll) - 使用 requestAnimationFrame 達到平滑效果
     */
    useEffect(() => {
        const state = autoScrollRef.current;

        const scrollLoop = () => {
            const container = scrollContainerRef.current;
            if (!container || !state.isActive) {
                state.animationFrame = null;
                return;
            }

            const rect = container.getBoundingClientRect();
            const threshold = 60; // 觸發邊距
            const maxSpeed = 15;  // 最高速度
            const delay = 300;    // 停頓延遲 (ms)

            const distTop = state.lastY - rect.top;
            const distBottom = rect.bottom - state.lastY;

            let speed = 0;
            let direction = 0;

            if (distTop < threshold && distTop > 0) {
                direction = -1;
                speed = (1 - Math.max(0, distTop / threshold)) * maxSpeed;
            } else if (distBottom < threshold && distBottom > 0) {
                direction = 1;
                speed = (1 - Math.max(0, distBottom / threshold)) * maxSpeed;
            }

            if (direction !== 0) {
                if (!state.startTime) state.startTime = Date.now();
                const elapsed = Date.now() - state.startTime;
                if (elapsed >= delay) {
                    container.scrollTop += direction * speed;
                }
            } else {
                state.startTime = null;
            }

            state.animationFrame = requestAnimationFrame(scrollLoop);
        };

        state.scrollLoopFn = scrollLoop;

        return () => {
            if (state.animationFrame) {
                cancelAnimationFrame(state.animationFrame);
            }
        };
    }, []);

    const handleDragOverScroll = (e: React.DragEvent) => {
        const state = autoScrollRef.current;
        state.lastY = e.clientY;

        if (!state.isActive) {
            state.isActive = true;
            if (!state.animationFrame && state.scrollLoopFn) {
                state.animationFrame = requestAnimationFrame(state.scrollLoopFn);
            }
        }
    };

    const handleDragEnd = () => {
        const state = autoScrollRef.current;
        state.isActive = false;
        state.startTime = null;
        if (state.animationFrame) {
            cancelAnimationFrame(state.animationFrame);
            state.animationFrame = null;
        }
    };

    /**
     * 處理文件排序相關的拖曳邏輯
     */
    const handleDragOverItem = (e: React.DragEvent, targetDocId: string) => {
        e.preventDefault();
        e.stopPropagation();
        // 增加視覺反饋可在這裡實作，目前先保持簡潔
    };

    const handleDropItem = (e: React.DragEvent, targetDocId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedDocId = e.dataTransfer.getData('text/plain');
        if (!draggedDocId || draggedDocId === targetDocId) return;

        const draggedDoc = documents.find(d => d.id === draggedDocId);
        const targetDoc = documents.find(d => d.id === targetDocId);

        if (draggedDoc && targetDoc && draggedDoc.folderId === targetDoc.folderId) {
            // 在同一個資料夾內重排
            const folderDocs = documents
                .filter(d => d.folderId === draggedDoc.folderId)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.updatedAt - b.updatedAt);

            const oldIndex = folderDocs.findIndex(d => d.id === draggedDocId);
            const newIndex = folderDocs.findIndex(d => d.id === targetDocId);

            const newOrder = [...folderDocs];
            newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, draggedDoc);

            onReorderDocuments(newOrder.map(d => d.id));
        }
    };

    const currentDoc = documents.find(d => d.id === currentDocId);
    const backlinks = currentDoc ? getBacklinks(currentDoc.name) : [];


    return (
        <>
            {/* 背景遮罩 (Overlay) */}
            <div
                className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* 側邊欄 */}
            <aside
                className={`
                    fixed inset-y-0 left-0
                    z-[60] h-full
                    w-[320px]
                    bg-white dark:bg-slate-900
                    border-r border-slate-200 dark:border-slate-800
                    shadow-2xl
                    flex flex-col
                    transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    shrink-0 print:hidden
                    rounded-r-[2rem] overflow-hidden
                `}
            >
                {/* 標題列 (高度與主 Header 貼齊) */}
                <div className="flex items-center justify-between px-6 h-15 p-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Files size={25} className="text-brand-primary opacity-80" />
                        <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">我的文檔</h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <MagneticButton
                            variant="icon"
                            onClick={() => {
                                let targetFolderId: string | null = null;
                                if (expandedFolders.size > 0) {
                                    if (currentDoc?.folderId && expandedFolders.has(currentDoc.folderId)) {
                                        targetFolderId = currentDoc.folderId;
                                    } else {
                                        targetFolderId = Array.from(expandedFolders).pop() || null;
                                    }
                                }
                                onCreateDocument(targetFolderId);
                            }}
                            className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            title="新建文檔"
                            aria-label="新建文檔"
                        >
                            <FileText size={18} strokeWidth={2.5} />
                        </MagneticButton>

                        <MagneticButton
                            variant="icon"
                            onClick={() => onCreateFolder('')}
                            className="w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            title="新建資料夾"
                            aria-label="新建資料夾"
                        >
                            <FolderPlus size={18} strokeWidth={2.5} />
                        </MagneticButton>

                        <MagneticButton
                            variant="icon"
                            onClick={onClose}
                            title="關閉"
                            aria-label="關閉側邊欄"
                            className="w-10 h-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X size={20} />
                        </MagneticButton>
                    </div>
                </div>

                {/* 文檔列表 */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar"
                    onDragOver={handleDragOverScroll}
                    onDragLeave={handleDragEnd}
                    onDrop={handleDragEnd}
                >
                    {documents.length === 0 && folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                            <FolderOpen size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
                            <p className="text-sm text-slate-400 dark:text-slate-600">尚無內容</p>
                            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">建立檔案或資料夾開始</p>
                        </div>
                    ) : (
                        <div className="py-1 space-y-4">
                            {/* 資料夾區域 (資料夾) */}
                            {folders.length > 0 && (
                                <div className="space-y-1">
                                    <div className="px-4 py-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">資料夾 (Folders)</span>
                                    </div>
                                    {folders.map(folder => {
                                        const isExpanded = expandedFolders.has(folder.id);
                                        const folderDocs = documents
                                            .filter(d => d.folderId === folder.id)
                                            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.updatedAt - b.updatedAt);
                                        return (
                                            <div
                                                key={folder.id}
                                                className="space-y-0.5"
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.add('bg-brand-secondary/50', 'dark:bg-brand-primary/10');
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove('bg-brand-secondary/50', 'dark:bg-brand-primary/10');
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('bg-brand-secondary/50', 'dark:bg-brand-primary/10');
                                                    const docId = e.dataTransfer.getData('text/plain');
                                                    if (docId) onMoveDocument(docId, folder.id);
                                                }}
                                            >
                                                <div
                                                    className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                                    onClick={() => toggleFolder(folder.id)}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                        {isExpanded ? <ChevronDown size={14} className="text-brand-primary shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                                                        <FolderOpen size={16} className={`${isExpanded ? 'text-brand-primary' : 'text-slate-400'} shrink-0`} />
                                                        {editingFolderId === folder.id ? (
                                                            <input
                                                                type="text"
                                                                value={editFolderName}
                                                                onChange={(e) => setEditFolderName(e.target.value)}
                                                                onBlur={() => handleFolderRenameSave(folder.id)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleFolderRenameSave(folder.id);
                                                                    if (e.key === 'Escape') setEditingFolderId(null);
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex-1 px-1 py-0 text-xs font-bold bg-white dark:bg-slate-700 border border-brand-primary/30 dark:border-brand-primary/50 rounded focus:outline-none focus:ring-1 focus:ring-brand-primary text-slate-800 dark:text-slate-200"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className={`text-xs font-bold truncate ${isExpanded ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {folder.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* 資料夾操作：EllipsisMenu 常駐顯示，同時適用桌面端與觸控端 */}
                                                    <div className="shrink-0 ml-1">
                                                        <EllipsisMenu
                                                            onRename={() => handleFolderRenameStart(folder)}
                                                            onDelete={() => {
                                                                if (confirm("建立在資料夾內的『點擊建檔』與『雙向連結』僅限於該資料夾內有效。\n確定要刪除整個資料夾嗎？")) {
                                                                    onDeleteFolder(folder.id);
                                                                }
                                                            }}
                                                            deleteLabel="刪除資料夾"
                                                        />
                                                    </div>
                                                </div>

                                                {/* CSS Grid 彈性展開動畫：內容常駐提高渲染額費，不再條件淡入 */}
                                                {/* 加上 min-w-0 確保 Grid 容器及其子項目寬度受到父級約束，不被長檔名撐破 */}
                                                <div
                                                    className="min-w-0"
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateRows: isExpanded ? '1fr' : '0fr',
                                                        transition: 'grid-template-rows 0.35s cubic-bezier(0.4,0,0.2,1)',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <div
                                                        className="min-w-0"
                                                        style={{
                                                            minHeight: 0,
                                                            opacity: isExpanded ? 1 : 0,
                                                            transform: isExpanded ? 'translateY(0)' : 'translateY(-8px)',
                                                            transition: isExpanded
                                                                ? 'opacity 0.3s ease 0.05s, transform 0.3s ease 0.05s'
                                                                : 'opacity 0.18s ease, transform 0.18s ease',
                                                        }}
                                                    >
                                                        <div className="pl-1 space-y-0.2 border-l border-brand-primary/10 dark:border-brand-primary/30 ml-6 mb-2 min-w-0">
                                                            {folderDocs.length === 0 ? (
                                                                <p className="px-4 py-2 text-[10px] text-slate-400 dark:text-slate-600 italic">無文件</p>
                                                            ) : (
                                                                folderDocs.map(doc => (
                                                                    <DocumentItem
                                                                        key={doc.id}
                                                                        document={doc}
                                                                        isActive={doc.id === currentDocId}
                                                                        onClick={() => onSelectDocument(doc.id)}
                                                                        onDelete={() => onDeleteDocument(doc.id)}
                                                                        onRename={(newName) => onRenameDocument(doc.id, newName)}
                                                                        onMove={(fId) => onMoveDocument(doc.id, fId)}
                                                                        onSelectDocument={onSelectDocument}
                                                                        folders={folders}
                                                                        backlinks={getBacklinks(doc.name)}
                                                                        onDragOverItem={handleDragOverItem}
                                                                        onDropItem={handleDropItem}
                                                                    />
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 獨立文件區域 */}
                            <div
                                className="space-y-1"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('bg-slate-100/50', 'dark:bg-slate-800/30');
                                }}
                                onDragLeave={(e) => {
                                    e.currentTarget.classList.remove('bg-slate-100/50', 'dark:bg-slate-800/30');
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('bg-slate-100/50', 'dark:bg-slate-800/30');
                                    const docId = e.dataTransfer.getData('text/plain');
                                    if (docId) onMoveDocument(docId, null);
                                }}
                            >
                                <div className="px-4 py-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">獨立文件</span>
                                </div>
                                {documents.filter(d => !d.folderId).length === 0 ? (
                                    <p className="px-8 py-2 text-[10px] text-slate-400 dark:text-slate-600 italic">尚無獨立文件</p>
                                ) : (
                                    documents.filter(d => !d.folderId).map(doc => (
                                        <DocumentItem
                                            key={doc.id}
                                            document={doc}
                                            isActive={doc.id === currentDocId}
                                            onClick={() => onSelectDocument(doc.id)}
                                            onDelete={() => onDeleteDocument(doc.id)}
                                            onRename={(newName) => onRenameDocument(doc.id, newName)}
                                            onMove={(fId) => onMoveDocument(doc.id, fId)}
                                            onSelectDocument={onSelectDocument}
                                            folders={folders}
                                            backlinks={getBacklinks(doc.name)}
                                            onDragOverItem={handleDragOverItem}
                                            onDropItem={handleDropItem}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* 底部按鈕與統計區域 */}
                <div className="mt-auto border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">

                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">文檔數 <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{documents.length} / 50</span></p>
                                <div
                                    className={`h-1 transition-all duration-500 ${storageUsage > 80 ? 'bg-red-500' : storageUsage > 50 ? 'bg-amber-500' : 'bg-brand-primary'} overflow-hidden mb-1`}
                                    style={{ width: `${storageUsage}%` }}
                                />
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                            <button
                                onClick={() => setIsToolsOpen(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-brand-primary hover:bg-slate-50/100 dark:hover:bg-slate-800/50 rounded-full transition-colors group"
                                aria-label='More tools'
                                title='更多工具'
                            >
                                <Wrench size={14} className="text-slate-400 group-hover:text-brand-primary transition-colors" />
                                <span className="text-xs font-bold tracking-wide">更多工具</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 更多工具 Modal */}
            <ToolsModal
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                currentDocContent={currentDocContent}
                currentDocMode={currentDocMode}
                onInsertIntoDoc={onInsertIntoDoc}
                onImportFiles={onImportFiles}
                onImportAsNewDoc={onImportAsNewDoc}
            />
        </>
    );
};

export default HistorySidebar;
