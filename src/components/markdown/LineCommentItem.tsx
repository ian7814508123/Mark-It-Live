import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Edit3, Trash2, Check } from '../ui/Icons';
import { useCommentContext } from './CommentContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LineCommentItemProps {
    /** Markdown 原始行號（1-indexed，來自 remark AST position） */
    line: number;
    /** 該行目前已儲存的評論內容，undefined 表示尚無評論 */
    comment: string | undefined;
    /** 目前文件 ID，用於呼叫儲存 callback */
    currentDocId: string | null;
    /** 儲存 / 刪除評論的回呼（傳入空字串視為刪除） */
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
    /** 兼容舊屬性，現已全天候預設可用 */
    isCommentMode?: boolean;
}

/**
 * LineCommentItem
 *
 * 負責單一行號的「新增 / 檢視 / 編輯 / 刪除」評論 UI。
 * 緊鄰排版按鈕，免切換全域模式，隨時點擊即可新增或檢視註解。
 */
const LineCommentItem: React.FC<LineCommentItemProps> = React.memo(({
    line,
    comment,
    currentDocId,
    onUpdateLineComment,
}) => {
    // ─── 全域協調（同時只能有一個編輯框）────────────────────────────────────────
    const { editingLine, startEditing, stopEditing } = useCommentContext();
    const isEditing = editingLine === line;

    // ─── 組件內部 State ──────────────────────────────────────────────────────
    const [editValue, setEditValue] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 點擊卡片外部自動關閉檢視卡片
    useEffect(() => {
        if (!isExpanded && !isEditing) return;
        const handleDocClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                if (isExpanded && !isEditing) {
                    setIsExpanded(false);
                }
            }
        };
        document.addEventListener('mousedown', handleDocClick);
        return () => document.removeEventListener('mousedown', handleDocClick);
    }, [isExpanded, isEditing]);

    // ─── 事件處理器 ──────────────────────────────────────────────────────────

    /** 開始編輯：填入現有內容，透過 Context 廣播「我正在編輯」 */
    const handleStartEdit = () => {
        setEditValue(comment || '');
        startEditing(line);
        setIsExpanded(false);
    };

    /** 儲存評論並結束編輯 */
    const handleSave = () => {
        if (onUpdateLineComment && currentDocId) {
            onUpdateLineComment(currentDocId, line, editValue.trim());
        }
        stopEditing();
    };

    /** 取消編輯，還原到原始狀態 */
    const handleCancel = () => {
        stopEditing();
    };

    /** 刪除評論 */
    const handleDelete = () => {
        if (!currentDocId) return;
        if (window.confirm(`確定要刪除第 ${line} 行的註解嗎？`)) {
            onUpdateLineComment?.(currentDocId, line, '');
            setIsExpanded(false);
            stopEditing();
        }
    };

    /** 切換展開 / 收合評論卡片 */
    const handleToggleExpand = () => {
        if (isEditing) {
            stopEditing();
        } else {
            setIsExpanded(prev => !prev);
        }
    };

    // 當展開卡片或編輯中時，提升當前行的層級，避免被後續行動作列（排版與註解按鈕）遮擋
    useEffect(() => {
        if (!containerRef.current) return;
        const lineEl = containerRef.current.closest('[data-line]') as HTMLElement | null;
        if (!lineEl) return;

        if (isEditing || isExpanded) {
            lineEl.classList.add('z-30');
            return () => {
                lineEl.classList.remove('z-30');
            };
        } else {
            lineEl.classList.remove('z-30');
        }
    }, [isEditing, isExpanded]);

    const hasComment = !!comment;

    return (
        <div
            ref={containerRef}
            className={`relative inline-flex items-center ${isEditing || isExpanded ? 'z-40' : 'z-auto'}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* ─── 註解動作按鈕（緊鄰排版按鈕） ─── */}
            <button
                type="button"
                onClick={hasComment ? handleToggleExpand : handleStartEdit}
                className={`flex items-center justify-center gap-1 ${
                    hasComment ? 'h-6 px-2 rounded-full' : 'w-6 h-6 rounded-full p-0'
                } backdrop-blur-xs border shadow-xs hover:shadow text-[10px] font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-all select-none ${
                    isEditing
                        ? 'bg-brand-primary text-white border-brand-primary shadow-brand-primary/25 ring-2 ring-brand-primary/30'
                        : isExpanded
                            ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/25 ring-2 ring-amber-500/30'
                            : hasComment
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                : 'bg-white/95 dark:bg-slate-800/95 border-slate-200/90 dark:border-slate-700/90 text-slate-600 dark:text-slate-300 hover:text-brand-primary dark:hover:text-brand-primary'
                }`}
                title={hasComment ? `第 #${line} 行註解（點擊查看）` : `為第 #${line} 行新增註解`}
            >
                <MessageSquare
                    size={11}
                    className={
                        isEditing || isExpanded
                            ? 'text-white'
                            : hasComment
                                ? 'text-amber-500'
                                : 'text-slate-400 group-hover/line:text-brand-primary'
                    }
                />
                {hasComment && (
                    <span className="text-[10px] font-mono leading-none">#{line}</span>
                )}
            </button>

            {/* ─── 狀態一：已儲存評論 & 展開檢視卡片 ─── */}
            {hasComment && isExpanded && !isEditing && (
                <div
                    className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90 animate-in fade-in zoom-in-95 duration-150 select-none text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-mono font-bold text-amber-500 flex items-center gap-1.5">
                            <MessageSquare size={12} />
                            第 #{line} 行註解
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="收合"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-3 select-text max-h-48 overflow-y-auto custom-scrollbar">
                        {comment}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleStartEdit}
                            title="編輯註解"
                            className="flex items-center gap-1 px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-colors cursor-pointer"
                        >
                            <Edit3 size={12} />
                            <span>編輯</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            title="刪除註解"
                            className="flex items-center gap-1 px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                            <Trash2 size={12} />
                            <span>刪除</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ─── 狀態二：編輯中 Textarea 卡片 ─── */}
            {isEditing && (
                <div
                    className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl border-2 border-brand-primary animate-in fade-in zoom-in-95 duration-150 select-none text-left"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-mono font-bold text-brand-primary flex items-center gap-1.5">
                            <MessageSquare size={12} />
                            {hasComment ? `編輯第 #${line} 行註解` : `新增第 #${line} 行註解`}
                        </span>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="取消"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    <textarea
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                handleSave();
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancel();
                            }
                        }}
                        placeholder="輸入行號註解... (Ctrl+Enter 儲存, Esc 取消)"
                        className="w-full h-24 text-xs bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary resize-none text-slate-800 dark:text-slate-100 outline-none leading-relaxed"
                    />

                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="flex items-center gap-1 px-3 py-1 bg-brand-primary text-white rounded-md text-xs font-bold shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                            <Check size={12} />
                            <span>儲存</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

LineCommentItem.displayName = 'LineCommentItem';

export default LineCommentItem;
