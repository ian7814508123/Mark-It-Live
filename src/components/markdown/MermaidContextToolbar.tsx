import React from 'react';
import { Code } from '../ui/Icons';
import { MermaidDiagramType, SequenceElement } from '../../utils/mermaid';
import FlowchartToolbarItems from './mermaid-toolbars/FlowchartToolbarItems';
import SequenceToolbarItems from './mermaid-toolbars/SequenceToolbarItems';

interface MermaidContextToolbarProps {
    nodeId: string | null;
    position: { x: number, y: number, isNearTop?: boolean } | null;
    zoom: number;
    /** 目前圖表類型，用於控制顯示按鈕群組 */
    diagramType?: MermaidDiagramType;
    onGoToCode?: () => void;
    onClose?: () => void;

    // 新增：代碼修改核心 callback 與原始碼，用以實現內部調用 Manipulator
    rawCode: string;
    onUpdateCode: (newCode: string) => void;

    // 連線動作 (Flowchart 專用)
    onStartConnect?: () => void;

    // Sequence 專用
    sequenceElement?: SequenceElement | null;
    onUpdateSequenceElement?: (element: SequenceElement) => void;
}

const MermaidContextToolbar: React.FC<MermaidContextToolbarProps> = ({
    nodeId,
    position,
    zoom,
    diagramType = 'flowchart',
    onGoToCode,
    onClose,
    rawCode,
    onUpdateCode,
    onStartConnect,
    sequenceElement,
    onUpdateSequenceElement
}) => {
    // sequenceElement 有值時，即使 nodeId 為空也應該渲染
    const hasValidSelection = diagramType === 'sequence' 
        ? !!sequenceElement 
        : !!nodeId;

    if (!hasValidSelection || !position) return null;

    // 依據 zoom 調整位置與比例
    const scale = Math.max(0.7, Math.min(1.2, zoom / 100));

    return (
        <div
            className="absolute z-40 flex items-center gap-1 p-1.5 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 animate-in fade-in zoom-in-95"
            style={{
                left: position.x,
                top: position.y + (position.isNearTop ? 10 : -10),
                transform: `translate(-50%, ${position.isNearTop ? '0' : '-100%'}) scale(${scale})`,
                transformOrigin: position.isNearTop ? 'top center' : 'bottom center'
            }}
            onClick={(e) => e.stopPropagation()} // 避免觸發畫布的點擊事件
        >
            {/* 節點 ID / 元素名稱 顯示 */}
            <div className="flex items-center px-2 border-r border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 max-w-[80px] truncate" title={diagramType === 'sequence' ? sequenceElement?.name : nodeId || ''}>
                    {diagramType === 'sequence' ? sequenceElement?.name : nodeId}
                </span>
            </div>

            {/* === Flowchart 專屬工具 === */}
            {diagramType === 'flowchart' && nodeId && (
                <FlowchartToolbarItems
                    nodeId={nodeId}
                    rawCode={rawCode}
                    onUpdateCode={onUpdateCode}
                    onStartConnect={onStartConnect}
                    onClose={onClose}
                />
            )}

            {/* === Sequence 專屬工具 === */}
            {diagramType === 'sequence' && sequenceElement && (
                <SequenceToolbarItems
                    sequenceElement={sequenceElement}
                    rawCode={rawCode}
                    onUpdateCode={onUpdateCode}
                    onUpdateElement={onUpdateSequenceElement}
                    onClose={onClose}
                />
            )}

            {/* 跳至原始碼 - 所有圖類型都顯示 */}
            <button
                onClick={onGoToCode}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand-primary transition-all"
                title="跳至原始碼 (Go To Code)"
            >
                <Code size={14} />
            </button>
        </div>
    );
};

export default MermaidContextToolbar;
