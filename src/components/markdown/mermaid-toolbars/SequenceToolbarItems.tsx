import React, { useState } from 'react';
import { Trash2, ToggleLeft, ArrowRightLeft, ChevronRight2 } from '../../ui/Icons';
import { SequenceManipulator, SequenceElement } from '../../../utils/mermaid';
import { useDynamicMenuPosition } from '../../../hooks/useDynamicMenuPosition';

interface SequenceToolbarItemsProps {
    sequenceElement: SequenceElement;
    rawCode: string;
    onUpdateCode: (newCode: string) => void;
    onUpdateElement?: (element: SequenceElement) => void;
    onClose?: () => void;
}

const SequenceToolbarItems: React.FC<SequenceToolbarItemsProps> = ({
    sequenceElement,
    rawCode,
    onUpdateCode,
    onUpdateElement,
    onClose
}) => {
    const [isArrowMenuOpen, setIsArrowMenuOpen] = useState(false);
    const { menuRef, positionClass } = useDynamicMenuPosition(isArrowMenuOpen, 'horizontal');

    return (
        <>
            {/* Actor 專屬工具 */}
            {sequenceElement.type === 'actor' && (
                <>
                    <button
                        onClick={() => {
                            const newCode = SequenceManipulator.toggleParticipantType(rawCode, sequenceElement.name);
                            onUpdateCode(newCode);
                        }}
                        className="flex items-center gap-1 p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-primary transition-all"
                        title="切換參與者類型 (Participant ↔ Actor)"
                    >
                        <ToggleLeft size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button
                        onClick={() => {
                            const newCode = SequenceManipulator.deleteParticipantAndMessages(rawCode, sequenceElement.name);
                            onUpdateCode(newCode);
                            onClose?.();
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-500 transition-all"
                        title="刪除參與者與相關訊息"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                </>
            )}

            {/* Message 專屬工具 */}
            {sequenceElement.type === 'message' && (
                <>
                    <div className="relative flex items-center">
                        <button
                            onClick={() => setIsArrowMenuOpen(!isArrowMenuOpen)}
                            className={`flex items-center gap-1 p-1.5 rounded-lg transition-all ${isArrowMenuOpen ? 'bg-slate-100 dark:bg-slate-700 text-brand-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-primary'}`}
                            title="修改訊息線條與箭頭"
                        >
                            <ArrowRightLeft size={14} />
                            <ChevronRight2 size={12} className={`transition-transform duration-200 ${isArrowMenuOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {isArrowMenuOpen && (
                            <div
                                ref={menuRef}
                                className={`absolute w-[140px] bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 ${positionClass}`}
                            >
                                {[
                                    { id: '->', label: '實線 (->)' },
                                    { id: '-->', label: '虛線 (-->)' },
                                    { id: '->>', label: '實線箭頭 (->>)' },
                                    { id: '-->>', label: '虛線箭頭 (-->>)' },
                                    { id: '-x', label: '非同步實線 (-x)' },
                                    { id: '--x', label: '非同步虛線 (--x)' },
                                    { id: '-)', label: '半箭頭實線 (-)' },
                                    { id: '--)', label: '半箭頭虛線 (--)' },
                                ].map((arrow) => (
                                    <button
                                        key={arrow.id}
                                        onClick={() => {
                                            const newCode = SequenceManipulator.changeMessageArrow(rawCode, sequenceElement.name, arrow.id);
                                            onUpdateCode(newCode);
                                            onUpdateElement?.({ ...sequenceElement, arrowType: arrow.id });
                                            setIsArrowMenuOpen(false);
                                        }}
                                        className={`text-left text-xs px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-all font-medium ${sequenceElement.arrowType === arrow.id ? 'bg-slate-50 dark:bg-slate-700/50 text-brand-primary font-bold' : ''}`}
                                    >
                                        {arrow.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button
                        onClick={() => {
                            const newCode = SequenceManipulator.deleteMessage(rawCode, sequenceElement.name);
                            onUpdateCode(newCode);
                            onClose?.();
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-500 transition-all"
                        title="刪除此訊息"
                    >
                        <Trash2 size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                </>
            )}
        </>
    );
};

export default SequenceToolbarItems;
