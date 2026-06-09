import React, { useState } from 'react';
import { MessageSquare, X, Edit3, Trash2, Check, Plus } from '../ui/Icons';
import { useCommentContext } from './CommentContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LineCommentItemProps {
    /** Markdown 原始行號（1-indexed，來自 remark AST position） */
    line: number;
    /** 該行目前已儲存的評論內容，undefined 表示尚無評論 */
    comment: string | undefined;
    /** 是否處於評論模式（控制 + 按鈕顯示） */
    isCommentMode: boolean;
    /** 目前文件 ID，用於呼叫儲存 callback */
    currentDocId: string | null;
    /** 儲存 / 刪除評論的回呼（傳入空字串視為刪除） */
    onUpdateLineComment?: (docId: string, line: number, comment: string) => void;
}

/**
 * LineCommentItem
 *
 * 負責單一行號的「新增 / 檢視 / 編輯 / 刪除」評論 UI。
 *
 * 設計要點：
 * - `isEditing` 的協調由 `CommentContext` 管理，確保全局只有一個編輯框
 * - 展開/收合（isExpanded）仍為組件內部自治 state
 * - `React.memo` 保護：只在 `comment` / `isCommentMode` 改變時重渲
 * - `print:hidden` 確保列印 / PDF 匯出時完全隱藏
 */
const LineCommentItem: React.FC<LineCommentItemProps> = React.memo(({
    line,
    comment,
    isCommentMode,
    currentDocId,
    onUpdateLineComment,
}) => {
    // ─── 全域協調（同時只能有一個編輯框）────────────────────────────────────────
    const { editingLine, startEditing, stopEditing } = useCommentContext();
    const isEditing = editingLine === line;

    // ─── 組件內部 State ──────────────────────────────────────────────────────
    const [editValue, setEditValue] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // 沒有評論模式且沒有既有評論時，不渲染任何東西
    if (!isCommentMode && !comment) return null;

    // ─── 事件處理器 ──────────────────────────────────────────────────────────

    /** 開始編輯：填入現有內容，透過 Context 廣播「我正在編輯」 */
    const handleStartEdit = () => {
        setEditValue(comment || '');
        startEditing(line);   // 這會讓其他行的 isEditing 自動變 false
        setIsExpanded(true);
    };

    /** 儲存評論並結束編輯 */
    const handleSave = () => {
        if (onUpdateLineComment && currentDocId) {
            onUpdateLineComment(currentDocId, line, editValue);
        }
        stopEditing();
    };

    /** 取消編輯，還原到原始狀態 */
    const handleCancel = () => {
        stopEditing();
    };

    /** 刪除評論（傳入空字串觸發 hook 內的刪除邏輯） */
    const handleDelete = () => {
        if (!currentDocId) return;
        
        // 加入簡單的 UX 確認
        if (window.confirm(`確定要刪除第 ${line} 行的評論嗎？`)) {
            onUpdateLineComment?.(currentDocId, line, '');
            setIsExpanded(false);
            stopEditing();
        }
    };

    /** 切換展開 / 收合評論卡片 */
    const handleToggleExpand = () => {
        setIsExpanded(prev => !prev);
    };

    // ─── 渲染 ─────────────────────────────────────────────────────────────────
    return (
        // 動態 z-index：正在編輯的最優先 (z-50)，展開其次 (z-40)，其餘維持 z-30
        // 這樣可以確保第 N 行的編輯框不會被第 N+1 行的按鈕遮擋
        <div className={`line-comment-wrapper absolute left-full ml-4 top-0 print:hidden ${isEditing ? 'z-50' : isExpanded ? 'z-40' : 'z-30'}`}>

            {/* 狀態一：有評論 & 非編輯中 → 顯示 Bubble + 可展開的卡片 */}
            {comment && !isEditing ? (
                <div className="flex flex-col gap-1 items-start">
                    {/* 折疊 / 展開 Bubble */}
                    <button
                        onClick={handleToggleExpand}
                        title={isExpanded ? '收合評論' : `第 ${line} 行評論（點擊展開）`}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all
                            ${isExpanded
                                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-primary hover:text-brand-primary shadow-sm'
                            }`}
                    >
                        <MessageSquare size={10} />
                        <span>Commit</span>
                        {isExpanded
                            ? <X size={10} />
                            : <span className="opacity-60 text-[9px] font-mono">#{line}</span>
                        }
                    </button>

                    {/* 展開後的評論卡片 */}
                    {isExpanded && (
                        <div className="w-64 mt-1 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                            {/* 評論內容 */}
                            <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-3">
                                {comment}
                            </div>
                            {/* 操作列 */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <button
                                    onClick={handleStartEdit}
                                    title="編輯評論"
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-brand-primary transition-colors"
                                >
                                    <Edit3 size={12} />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    title="刪除評論"
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            ) : isEditing ? (
                /* 狀態二：編輯中 → 顯示 Textarea 卡片 */
                <div className="w-64 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-brand-primary animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-slate-400">第 {line} 行評論</span>
                        <button onClick={handleCancel} className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X size={12} />
                        </button>
                    </div>
                    <textarea
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            // Ctrl+Enter / Cmd+Enter 快速儲存
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                handleSave();
                            }
                            // Escape 取消
                            if (e.key === 'Escape') handleCancel();
                        }}
                        placeholder="輸入評論... (Ctrl+Enter 儲存)"
                        className="w-full h-24 text-xs bg-transparent border-none focus:ring-0 resize-none text-slate-700 dark:text-slate-200 outline-none"
                    />
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                            onClick={handleCancel}
                            className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1 px-2 py-1 bg-brand-primary text-white rounded-md text-[10px] font-bold"
                        >
                            <Check size={10} />
                            儲存
                        </button>
                    </div>
                </div>

            ) : isCommentMode && !editingLine && (
                /* 狀態三：無評論 & 評論模式 & 目前沒有其他行在編輯 → 顯示 + 新增按鈕 */
                <button
                    onClick={handleStartEdit}
                    title={`為第 ${line} 行新增評論`}
                    className="opacity-0 group-hover/line:opacity-100 p-1.5 bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                >
                    <Plus size={14} />
                </button>
            )}
        </div>
    );
});

LineCommentItem.displayName = 'LineCommentItem';

export default LineCommentItem;
