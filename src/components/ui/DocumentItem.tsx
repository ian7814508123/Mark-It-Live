import React, { useState } from 'react';
import { FileText, FileCode2, Clock, Link as LinkIcon, GripVertical } from './Icons';
import { DocumentRecord } from '../../types';
import EllipsisMenu from './EllipsisMenu';

interface DocumentItemProps {
    document: DocumentRecord;
    isActive: boolean;
    onClick: () => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
    onMove: (folderId: string | null) => void;
    onSelectDocument: (docId: string) => void;
    folders: any[];
    backlinks?: DocumentRecord[];
    onDragOverItem?: (e: React.DragEvent, docId: string) => void;
    onDropItem?: (e: React.DragEvent, docId: string) => void;
}

/**
 * 觸控裝置偵測（只在模組載入時計算一次，效能友善）
 * 用於決定是否停用 HTML5 Drag & Drop（觸控端以 Ellipsis Menu 的「移動至...」替代）
 */
const isTouchDevice =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const DocumentItem: React.FC<DocumentItemProps> = ({
    document,
    isActive,
    onClick,
    onDelete,
    onRename,
    onMove,
    onSelectDocument,
    folders,
    backlinks = [],
    onDragOverItem,
    onDropItem,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(document.name);
    const [isBacklinksOpen, setIsBacklinksOpen] = useState(false);

    /** 桌面端雙擊仍可直接重命名（保留原有習慣） */
    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditName(document.name);
    };

    const handleSave = () => {
        if (editName.trim()) {
            onRename(editName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName(document.name);
        }
    };

    /** Ellipsis Menu 的刪除 callback（帶確認對話框） */
    const handleDeleteViaMenu = () => {
        if (confirm(`確定要刪除「${document.name}」嗎？`)) {
            onDelete();
        }
    };

    /** Ellipsis Menu 的重新命名 callback（進入行內編輯模式） */
    const handleRenameViaMenu = () => {
        setIsEditing(true);
        setEditName(document.name);
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '剛剛';
        if (minutes < 60) return `${minutes} 分鐘前`;
        if (hours < 24) return `${hours} 小時前`;
        if (days < 7) return `${days} 天前`;
        return date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
    };

    return (
        <div
            onClick={onClick}
            onDoubleClick={handleDoubleClick}
            // 觸控端：停用原生 HTML5 Drag & Drop，改以 Ellipsis Menu 的「移動至...」操作
            draggable={!isTouchDevice}
            onDragStart={!isTouchDevice ? (e) => {
                e.dataTransfer.setData('text/plain', document.id);
                e.dataTransfer.effectAllowed = 'move';
            } : undefined}
            onDragOver={!isTouchDevice ? (e) => onDragOverItem?.(e, document.id) : undefined}
            onDrop={!isTouchDevice ? (e) => onDropItem?.(e, document.id) : undefined}
            className={`
                group relative px-3 py-2.5 mx-2 rounded-2xl cursor-pointer transition-all min-w-0
                doc-item-draggable
                ${isActive ? 'doc-item--active' : ''}
                ${isActive
                    ? 'bg-brand-secondary dark:bg-brand-primary/30 border border-brand-primary/20 dark:border-brand-primary/50 shadow-sm'
                    : 'hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
                }
            `}
        >
            {/* 使用 w-full 與 min-w-0 限制主要 Flex 容器寬度，防止長檔名撐破容器 */}
            <div className="flex items-start gap-1 w-full min-w-0">
                {/* 拖曳圖框（doc-item-grip：觸控端透過 CSS 隱藏） */}
                <div className="mt-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 transition-opacity doc-item-grip">
                    <GripVertical size={14} />
                </div>

                <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* 模式圖示 */}
                    <div className={`mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 ${isActive ? 'text-brand-primary' : 'text-slate-400 dark:text-slate-600'}`}>
                        {document.icon ? (
                            <span className="text-sm leading-none">{document.icon}</span>
                        ) : (
                            document.mode === 'mermaid' ? <FileCode2 size={16} /> : <FileText size={16} />
                        )}
                    </div>

                    {/* 文檔名稱 */}
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-0.5 text-sm font-medium bg-white dark:bg-slate-700 border border-brand-primary/30 dark:border-brand-primary/50 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-slate-800 dark:text-slate-200"
                                autoFocus
                            />
                        ) : (
                            <div
                                className={`text-sm font-medium truncate ${isActive
                                    ? 'text-brand-primary'
                                    : 'text-slate-700 dark:text-slate-300'
                                    }`}
                                title={document.name}
                            >
                                {document.name}
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                            <div className="flex items-center gap-1">
                                <Clock size={10} />
                                <span>{formatTime(document.updatedAt)}</span>
                            </div>
                            <span className={`px-1 rounded text-[9px] font-bold uppercase ${document.mode === 'mermaid'
                                ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'
                                : 'bg-green-50/50 dark:bg-green-900/20 text-green-500 dark:text-green-400'
                                }`}>
                                {document.mode === 'mermaid' ? '美人魚' : '標記掉落'}
                            </span>
                        </div>
                    </div>

                    {/* 操作按鈕組（doc-item-actions：觸控端由 CSS 控制 Active-Only 顯示） */}
                    <div className="flex items-center gap-1 shrink-0 doc-item-actions">
                        {/* 反向連結按鈕 */}
                        {backlinks.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBacklinksOpen(!isBacklinksOpen);
                                }}
                                aria-label={`查看反向連結 (${backlinks.length} 個)`}
                                className={`p-1.5 rounded-full transition-all ${isBacklinksOpen ? 'bg-brand-secondary text-brand-primary dark:bg-brand-primary/30' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                title={`反向連結 (${backlinks.length})`}
                            >
                                <LinkIcon size={14} />
                            </button>
                        )}

                        {/* Ellipsis 更多操作選單（收納 Rename / Move / Delete） */}
                        <EllipsisMenu
                            onRename={handleRenameViaMenu}
                            onMove={onMove}
                            onDelete={handleDeleteViaMenu}
                            folders={folders}
                            currentFolderId={document.folderId}
                        />
                    </div>
                </div>
            </div>

            {/* 反向連結清單：CSS Grid 彈性展開 */}
            <div style={{
                display: 'grid',
                gridTemplateRows: isBacklinksOpen && backlinks.length > 0 ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.35s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
            }}>
                <div style={{
                    minHeight: 0,
                    opacity: isBacklinksOpen && backlinks.length > 0 ? 1 : 0,
                    transform: isBacklinksOpen && backlinks.length > 0 ? 'translateY(0)' : 'translateY(-8px)',
                    transition: isBacklinksOpen && backlinks.length > 0
                        ? 'opacity 0.3s ease 0.05s, transform 0.3s ease 0.05s'
                        : 'opacity 0.18s ease, transform 0.18s ease',
                }}>
                    <div className="mt-2 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                        {backlinks.map(linkDoc => (
                            <button
                                key={`link-${linkDoc.id}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDocument(linkDoc.id);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-brand-primary dark:text-slate-500 dark:hover:text-brand-primary hover:bg-white dark:hover:bg-slate-800/50 transition-all text-left"
                                title={`跳轉至 ${linkDoc.name}`}
                            >
                                <LinkIcon size={10} className="shrink-0 opacity-40" />
                                <span className="truncate flex-1 font-medium">{linkDoc.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentItem;
