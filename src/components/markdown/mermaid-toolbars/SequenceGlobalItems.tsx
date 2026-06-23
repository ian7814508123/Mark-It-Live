import React from 'react';
import { UserPlus, Hash } from '../../ui/Icons';
import { SequenceManipulator } from '../../../utils/mermaid';

interface SequenceGlobalItemsProps {
    rawCode: string;
    onUpdateCode: (newCode: string) => void;
    orientation?: 'horizontal' | 'vertical';
}

const SequenceGlobalItems: React.FC<SequenceGlobalItemsProps> = ({
    rawCode,
    onUpdateCode,
    orientation = 'horizontal'
}) => {
    const handleAddParticipant = () => {
        const newCode = SequenceManipulator.addParticipant(rawCode);
        onUpdateCode(newCode);
    };

    const handleToggleAutonumber = () => {
        const newCode = SequenceManipulator.toggleAutonumber(rawCode);
        onUpdateCode(newCode);
    };

    return (
        <div className={`flex items-center gap-1 border-slate-200 dark:border-white/10 ${orientation === 'vertical' ? 'flex-col border-b py-2' : 'border-r px-2'}`}>
            {/* 新增參與者 */}
            <button
                onClick={handleAddParticipant}
                className={`flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition-all active:scale-90 text-xs font-semibold ${orientation === 'vertical' ? 'p-2 justify-center' : 'px-3 py-1.5'}`}
                title="新增參與者 (Add Participant)"
            >
                <UserPlus size={14} /> {orientation === 'horizontal' && 'Participant'}
            </button>

            {/* 切換自動編號 */}
            <button
                onClick={handleToggleAutonumber}
                className={`flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 hover:text-sky-500 transition-all active:scale-90 text-xs font-semibold ${orientation === 'vertical' ? 'p-2 justify-center' : 'px-2 py-1.5'}`}
                title="切換自動編號 (Toggle Autonumber)"
            >
                <Hash size={14} /> {orientation === 'horizontal' && 'Autonumber'}
            </button>
        </div>
    );
};

export default SequenceGlobalItems;
