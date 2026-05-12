import React, { createContext, useContext, useState, useCallback } from 'react';

// ─── CommentContext 型別 ───────────────────────────────────────────────────────

interface CommentContextValue {
    /** 目前正在編輯的行號，null 表示沒有開啟的編輯框 */
    editingLine: number | null;
    /** 開始編輯指定行（關閉其他已開啟的編輯框） */
    startEditing: (line: number) => void;
    /** 結束編輯（關閉編輯框） */
    stopEditing: () => void;
}

const CommentContext = createContext<CommentContextValue>({
    editingLine: null,
    startEditing: () => {},
    stopEditing: () => {},
});

/**
 * CommentProvider
 *
 * 管理「同一時間只允許一個編輯框開啟」的全域編輯狀態。
 * 包裹在 MarkdownPreview 的渲染樹外層，讓所有 LineCommentItem 透過 Context 協調。
 */
export const CommentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [editingLine, setEditingLine] = useState<number | null>(null);

    const startEditing = useCallback((line: number) => {
        setEditingLine(line);
    }, []);

    const stopEditing = useCallback(() => {
        setEditingLine(null);
    }, []);

    return (
        <CommentContext.Provider value={{ editingLine, startEditing, stopEditing }}>
            {children}
        </CommentContext.Provider>
    );
};

/**
 * useCommentContext
 *
 * 在 LineCommentItem 中取得全域編輯協調狀態。
 */
export const useCommentContext = () => useContext(CommentContext);
