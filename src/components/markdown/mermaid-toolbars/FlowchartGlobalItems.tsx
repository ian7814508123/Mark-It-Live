import React, { useState, useRef, useEffect } from 'react';
import { Plus, MoveDown, MoveUp, MoveRight, MoveLeft } from '../../ui/Icons';
import { FlowchartManipulator } from '../../../utils/mermaid';
import { useDynamicMenuPosition } from '../../../hooks/useDynamicMenuPosition';

interface FlowchartGlobalItemsProps {
    rawCode: string;
    onUpdateCode: (newCode: string) => void;
    currentDirection: 'TD' | 'LR' | 'BT' | 'RL' | 'TB' | null;
    orientation?: 'horizontal' | 'vertical';
}

const FlowchartGlobalItems: React.FC<FlowchartGlobalItemsProps> = ({
    rawCode,
    onUpdateCode,
    currentDirection,
    orientation = 'horizontal'
}) => {
    const [isDirectionMenuOpen, setIsDirectionMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { menuRef, positionClass } = useDynamicMenuPosition(isDirectionMenuOpen, orientation);

    // 點擊外部時關閉下拉選單
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDirectionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCurrentDirectionIcon = () => {
        switch (currentDirection) {
            case 'BT': return <MoveUp size={14} />;
            case 'LR': return <MoveRight size={14} />;
            case 'RL': return <MoveLeft size={14} />;
            case 'TD':
            case 'TB':
            default: return <MoveDown size={14} />;
        }
    };

    const handleAddNode = () => {
        const newCode = FlowchartManipulator.addIsolatedNode(rawCode);
        onUpdateCode(newCode);
    };

    const handleChangeDirection = (dir: 'TD' | 'LR' | 'BT' | 'RL') => {
        const newCode = FlowchartManipulator.changeDirection(rawCode, dir);
        onUpdateCode(newCode);
        setIsDirectionMenuOpen(false);
    };

    return (
        <div className={`flex items-center gap-1 border-slate-200 dark:border-white/10 ${orientation === 'vertical' ? 'flex-col border-b py-2' : 'border-r px-2'}`}>
            {/* 新增節點 */}
            <button
                onClick={handleAddNode}
                className={`flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition-all active:scale-90 text-xs font-semibold ${orientation === 'vertical' ? 'p-2 justify-center' : 'px-3 py-1.5'}`}
                title="新增節點"
            >
                <Plus size={14} /> {orientation === 'horizontal' && 'Node'}
            </button>

            {/* 方向切換選單 */}
            <div className="relative flex items-center gap-1 p-1 rounded-full" ref={dropdownRef}>
                <button
                    onClick={() => setIsDirectionMenuOpen(!isDirectionMenuOpen)}
                    className={`p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all shadow-sm ${isDirectionMenuOpen
                            ? 'bg-white dark:bg-slate-700 text-brand-primary'
                            : 'text-slate-500 dark:text-slate-400 hover:text-brand-primary'
                        }`}
                    title="變更排版方向 (Change Direction)"
                >
                    {getCurrentDirectionIcon()}
                </button>

                {isDirectionMenuOpen && (
                    <div ref={menuRef} className={`absolute py-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-700/50 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200 ${positionClass}`}>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">
                            排版方向
                        </div>
                        <button
                            onClick={() => handleChangeDirection('TD')}
                            className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'TD' || currentDirection === 'TB' || !currentDirection ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                        >
                            <MoveDown size={14} className="shrink-0" /> 由上往下
                        </button>
                        <button
                            onClick={() => handleChangeDirection('BT')}
                            className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'BT' ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                        >
                            <MoveUp size={14} className="shrink-0" /> 由下往上
                        </button>
                        <button
                            onClick={() => handleChangeDirection('LR')}
                            className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'LR' ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                        >
                            <MoveRight size={14} className="shrink-0" /> 由左往右
                        </button>
                        <button
                            onClick={() => handleChangeDirection('RL')}
                            className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50 ${currentDirection === 'RL' ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-slate-600 dark:text-slate-300 font-medium'}`}
                        >
                            <MoveLeft size={14} className="shrink-0" /> 由右往左
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlowchartGlobalItems;
