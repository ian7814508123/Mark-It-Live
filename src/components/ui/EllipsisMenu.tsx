import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Pencil, FolderInput, Trash2, FolderOpen, Home, ChevronDown } from 'lucide-react';
import { FolderRecord } from '../../types';

interface EllipsisMenuProps {
    /** 觸發重新命名的 callback（由父層控制 isEditing 狀態） */
    onRename: () => void;
    /**
     * 觸發移動文檔的 callback（選填）
     * 不傳入時，「移動至...」整個區塊不渲染（適用於資料夾場景）
     */
    onMove?: (folderId: string | null) => void;
    /** 觸發刪除的 callback */
    onDelete: () => void;
    /** 所有資料夾清單（onMove 存在時必填） */
    folders?: FolderRecord[];
    /** 目前文檔所屬的資料夾 ID（null 代表根目錄獨立文件） */
    currentFolderId?: string | null;
    /** 刪除按鈕的顯示文字，預設為「刪除文檔」 */
    deleteLabel?: string;
}

/** 選單的 fixed 定位樣式 */
interface MenuPosition {
    style: React.CSSProperties;
}

/**
 * 文檔／資料夾的「更多操作」Ellipsis (...) 選單元件
 *
 * 採用 React Portal 直接掛載至 document.body，
 * 徹底逃脫祖先容器的 overflow: hidden 與 transform 剪裁，
 * 解決在 CSS Grid 展開動畫容器中選單被截斷或定位失效的問題。
 * 
 * 導入智慧型 Auto-flipping 偵測視窗上下空間，空間不足時自動往上展開，
 * 並精確限制其 maxHeight 與加入滾動條，防堵 Window Clipping 與 Viewport Overflow。
 */
const EllipsisMenu: React.FC<EllipsisMenuProps> = ({
    onRename,
    onMove,
    onDelete,
    folders = [],
    currentFolderId,
    deleteLabel = '刪除文檔',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMoveExpanded, setIsMoveExpanded] = useState(false);
    const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const openTimeRef = useRef<number>(0);

    /** 從觸發按鈕的 BoundingRect 計算 fixed 定位座標與 Auto-flipping 樣式 */
    const calculatePosition = useCallback((): MenuPosition | null => {
        if (!buttonRef.current) return null;
        const rect = buttonRef.current.getBoundingClientRect();
        const VIEWPORT_MARGIN = 8;
        const GAP = 4;
        const ESTIMATED_HEIGHT = 220; // 預估選單收合時的高度

        // 計算視窗下方與上方的可用空間
        const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
        const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;

        // 計算選單相對於視窗右側的距離（右貼齊）
        const right = window.innerWidth - rect.right;

        // Auto-flipping 偵測：若下方空間不足以展開預估高度，且上方空間大於下方空間，則往上翻轉
        const shouldFlip = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

        const style: React.CSSProperties = {
            right: `${right}px`,
        };

        if (shouldFlip) {
            // 向上翻轉：使用 bottom 定位。當子選單「移動至...」展開時，選單會自動向上伸長，不遮擋按鈕
            style.bottom = `${window.innerHeight - rect.top + GAP}px`;
            style.maxHeight = `${spaceAbove}px`;
            style.transformOrigin = 'bottom right';
        } else {
            // 向下展開
            style.top = `${rect.bottom + GAP}px`;
            style.maxHeight = `${spaceBelow}px`;
            style.transformOrigin = 'top right';
        }

        return { style };
    }, []);

    /** ClickAway 與捲動監聽：觸發時關閉選單 */
    useEffect(() => {
        if (!isOpen) return;

        const close = () => {
            setIsOpen(false);
            setIsMoveExpanded(false);
        };

        const handleClickAway = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            // 點擊在選單或觸發按鈕內部時，不關閉
            if (dropdownRef.current?.contains(target)) return;
            if (buttonRef.current?.contains(target)) return;
            close();
        };

        // 父容器捲動時關閉（capture 確保捕獲所有捲動事件）
        const handleScroll = () => {
            // 防禦性快閃保護：在開啟後 150 毫秒內，忽略任何滾動事件
            // 這是為了防止因 Portal 渲染、DOM 結構改變或焦點轉移引起的微小滾動觸發秒關（防閃退）
            if (Date.now() - openTimeRef.current < 150) return;
            close();
        };

        document.addEventListener('mousedown', handleClickAway);
        document.addEventListener('touchstart', handleClickAway, { passive: true });
        document.addEventListener('scroll', handleScroll, { capture: true, passive: true });

        return () => {
            document.removeEventListener('mousedown', handleClickAway);
            document.removeEventListener('touchstart', handleClickAway);
            document.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, [isOpen]);

    const closeMenu = () => {
        setIsOpen(false);
        setIsMoveExpanded(false);
    };

    const handleRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeMenu();
        onRename();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeMenu();
        onDelete();
    };

    const handleMove = (e: React.MouseEvent, folderId: string | null) => {
        e.stopPropagation();
        closeMenu();
        onMove?.(folderId);
    };

    /** 可移動的目標資料夾清單（排除目前所在資料夾） */
    const availableFolders = folders.filter(f => f.id !== currentFolderId);
    const canMoveToRoot = currentFolderId != null;
    // onMove 未提供時（資料夾場景）整個移動區塊不顯示
    const hasMoveTargets = !!onMove && (availableFolders.length > 0 || canMoveToRoot);

    return (
        <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
        >
            {/* ... 觸發按鈕 */}
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen) {
                        // 開啟時即時計算位置與 Auto-flipping 狀態
                        setMenuPos(calculatePosition());
                        openTimeRef.current = Date.now();
                    }
                    setIsOpen(prev => !prev);
                    setIsMoveExpanded(false);
                }}
                aria-label="更多操作"
                aria-expanded={isOpen}
                className={`
                    p-1.5 rounded-full transition-all
                    ${isOpen
                        ? 'bg-brand-secondary text-brand-primary dark:bg-brand-primary/30 dark:text-brand-primary'
                        : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                    }
                `}
                title="更多操作"
            >
                <MoreHorizontal size={14} />
            </button>

            {/*
              * 選單使用 React Portal 渲染到 document.body
              * 理由：徹底脫離側邊欄 aside 的 transform 定位基準點以及 overflow:hidden 剪裁，
              *       完全消除 Window Clipping、Viewport Overflow 以及定位偏移的問題。
              */}
            {isOpen && menuPos && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        ...menuPos.style,
                        overflowY: 'auto',
                        zIndex: 9999,
                    }}
                    className="
                        w-44 py-1 rounded-xl
                        bg-white dark:bg-slate-800
                        border border-slate-200 dark:border-slate-700
                        shadow-xl
                        ellipsis-menu-enter
                    "
                >
                    {/* ✏️ 重新命名 */}
                    <button
                        onClick={handleRename}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-xl"
                    >
                        <Pencil size={13} className="text-slate-400 shrink-0" />
                        重新命名
                    </button>

                    {/* 📂 移動至...（垂直展開式子列表） */}
                    {hasMoveTargets && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMoveExpanded(prev => !prev);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <FolderInput size={13} className="text-slate-400 shrink-0" />
                                <span className="flex-1 text-left">移動至...</span>
                                <ChevronDown
                                    size={12}
                                    className={`text-slate-300 dark:text-slate-600 transition-transform duration-200 ${isMoveExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* 資料夾子列表：垂直展開（適應行動端窄側欄） */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateRows: isMoveExpanded ? '1fr' : '0fr',
                                    transition: 'grid-template-rows 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                <div style={{ minHeight: 0 }} className="border-l-2 border-brand-primary/20 dark:border-brand-primary/30 ml-3">
                                    {/* 移至根目錄 */}
                                    {canMoveToRoot && (
                                        <button
                                            onClick={(e) => handleMove(e, null)}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
                                        >
                                            <Home size={11} className="shrink-0" />
                                            <span className="truncate">根目錄（獨立文件）</span>
                                        </button>
                                    )}

                                    {/* 各資料夾選項 */}
                                    {availableFolders.map(folder => (
                                        <button
                                            key={folder.id}
                                            onClick={(e) => handleMove(e, folder.id)}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-brand-primary dark:hover:text-brand-primary transition-colors"
                                        >
                                            <FolderOpen size={11} className="shrink-0" />
                                            <span className="truncate">{folder.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* 分隔線 */}
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                    {/* 🗑️ 刪除（紅色警示，物理防誤觸；文字由 deleteLabel prop 客製化） */}
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl"
                    >
                        <Trash2 size={13} className="shrink-0" />
                        {deleteLabel}
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default EllipsisMenu;
