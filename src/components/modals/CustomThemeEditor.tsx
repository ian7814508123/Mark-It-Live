import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Palette, Code, Check, AlertCircle, Trash2 } from '../ui/Icons';
import RippleButton from '../ui/RippleButton';
import GlassRailSelector from '../ui/GlassRailSelector';

export interface ThemeVariable {
    id: string;
    label: string;
    type: 'color' | 'text' | 'number';
}

export interface ThemeGroup {
    id: string;
    label: string;
    variables: ThemeVariable[];
}

export const THEME_GROUPS: ThemeGroup[] = [
    {
        id: 'typography',
        label: '排版與基礎字體 (Typography)',
        variables: [
            { id: '--theme-text-color', label: '內文顏色', type: 'color' },
            { id: '--theme-accent-color', label: '強調色', type: 'color' },
        ]
    },
    {
        id: 'headings',
        label: '標題設計 (Headings)',
        variables: [
            { id: '--theme-heading-color', label: '標題顏色', type: 'color' },
        ]
    },
    {
        id: 'quote',
        label: '引言區塊 (Blockquote)',
        variables: [
            { id: '--theme-quote-bg', label: '引言背景', type: 'color' },
            { id: '--theme-quote-text', label: '文字顏色', type: 'color' },
        ]
    },
    {
        id: 'links',
        label: '超連結 (Links)',
        variables: [
            { id: '--theme-link-color', label: '預設顏色', type: 'color' },
            { id: '--theme-link-hover-bg', label: '懸停背景', type: 'color' },
            { id: '--theme-link-hover-border', label: '懸停底部邊框', type: 'color' },
        ]
    },
    {
        id: 'tables',
        label: '表格設計 (Tables)',
        variables: [
            { id: '--theme-table-header-bg', label: '標題列背景', type: 'color' },
            { id: '--theme-table-header-color', label: '標題文字', type: 'color' },
        ]
    },
    {
        id: 'code',
        label: '程式碼與系統 (System Bridge)',
        variables: [
            { id: '--code-bg', label: '代碼/圖表背景', type: 'color' },
            { id: '--code-border', label: '代碼/圖表邊框', type: 'color' },
            { id: '--brand-surface', label: '主背景色', type: 'color' },
        ]
    },
    {
        id: 'mermaid',
        label: '圖表連動 (Mermaid Diagrams)',
        variables: [
            { id: '--mermaid-node-bg', label: '節點背景', type: 'color' },
            { id: '--mermaid-node-text', label: '節點文字', type: 'color' },
            { id: '--mermaid-node-border', label: '節點邊框', type: 'color' },
            { id: '--mermaid-line', label: '連線與箭頭顏色', type: 'color' },
            { id: '--mermaid-edge-bg', label: '標籤文字背景', type: 'color' },
        ]
    }
];

interface CustomThemeEditorProps {
    customTheme: Record<string, string>;
    onChange: (patch: Record<string, string>) => void;
    onClear: () => void;
}

const CustomThemeEditor: React.FC<CustomThemeEditorProps> = ({ customTheme, onChange, onClear }) => {
    const [activeTab, setActiveTab] = useState<'gui' | 'json'>('gui');
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const [isMainExpanded, setIsMainExpanded] = useState(false);

    // Keep JSON input in sync when switching to json tab
    useEffect(() => {
        if (activeTab === 'json') {
            // 產生包含所有可用變數的完整模板，方便使用者參考
            const template: Record<string, string> = {};
            THEME_GROUPS.forEach(group => {
                group.variables.forEach(v => {
                    template[v.id] = customTheme?.[v.id] || '';
                });
            });

            // 保留使用者自己新增但不在預設群組內的變數
            const fullJson = { ...template, ...(customTheme || {}) };

            setJsonInput(JSON.stringify(fullJson, null, 4));
            setJsonError(null);
        }
    }, [activeTab, customTheme]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const handleVariableChange = (id: string, value: string) => {
        onChange({ [id]: value });
    };

    const applyJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            if (typeof parsed !== 'object' || parsed === null) throw new Error('必須為 JSON 物件');

            // clear then apply new
            onClear();
            onChange(parsed);

            setJsonError(null);
            // Flash success state or simply switch back
            setActiveTab('gui');
        } catch (err: any) {
            setJsonError(err.message || '格式錯誤');
        }
    };

    const overrideCount = Object.keys(customTheme || {}).length;
    const hasAnyCustomization = overrideCount > 0;

    return (
        <div className="relative z-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <button
                onClick={() => setIsMainExpanded(!isMainExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isMainExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <div className="p-1.5 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-lg text-brand-primary">
                        <Palette size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                        進階自訂預覽風格 (Custom Theme)
                    </p>
                </div>
                {!isMainExpanded && hasAnyCustomization && (
                    <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-xl font-bold border border-brand-primary/20">
                        已覆寫 {overrideCount} 項
                    </span>
                )}
            </button>

            {isMainExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                    <div className="flex items-center justify-end gap-2">
                        <GlassRailSelector<'gui' | 'json'>
                            className="w-[180px] h-8"
                            options={[
                                { label: '', icon: <Palette size={14} />, value: 'gui' },
                                { label: '', icon: <Code size={14} />, value: 'json' }
                            ]}
                            value={activeTab}
                            onChange={(v) => setActiveTab(v)}
                        />
                        {hasAnyCustomization && (
                            <button
                                onClick={onClear}
                                className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest ml-2 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {activeTab === 'gui' && (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {THEME_GROUPS.map(group => {
                                const isExpanded = expandedGroups[group.id];
                                const overriddenCount = group.variables.filter(v => !!customTheme?.[v.id]).length;

                                return (
                                    <div key={group.id} className="border border-slate-100 dark:border-slate-700/60 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/40">
                                        <button
                                            className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                                            onClick={() => toggleGroup(group.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{group.label}</span>
                                            </div>
                                            {overriddenCount > 0 && (
                                                <span className="text-[10px] bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded-full font-bold">
                                                    {overriddenCount} 已設定
                                                </span>
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-900">
                                                {group.variables.map(variable => {
                                                    const val = customTheme?.[variable.id] || '';
                                                    return (
                                                        <div key={variable.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/80">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{variable.label}</span>
                                                                <span className="text-[9px] text-slate-400 font-mono scale-90 origin-left">{variable.id.replace('--', '')}</span>
                                                            </div>

                                                            {variable.type === 'color' ? (
                                                                <div className="flex items-center gap-2">
                                                                    {val && (
                                                                        <button
                                                                            onClick={() => handleVariableChange(variable.id, '')}
                                                                            className="text-[10px] text-slate-400 hover:text-red-400"
                                                                        >
                                                                            清除
                                                                        </button>
                                                                    )}
                                                                    <div className="relative w-6 h-6 rounded overflow-hidden border border-slate-200 dark:border-slate-600" style={{ backgroundColor: val || 'transparent' }}>
                                                                        {!val && <div className="absolute inset-0 flex items-center justify-center text-slate-300"><div className="w-full h-px bg-slate-300 rotate-45"></div></div>}
                                                                        <input
                                                                            type="color"
                                                                            value={val || '#ffffff'}
                                                                            onChange={(e) => handleVariableChange(variable.id, e.target.value)}
                                                                            className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 opacity-0 cursor-pointer"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    placeholder="預設"
                                                                    onChange={(e) => handleVariableChange(variable.id, e.target.value)}
                                                                    className="w-24 text-right text-xs bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600"
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'json' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <textarea
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                    className="w-full min-h-[250px] p-4 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-slate-700 dark:text-slate-300 custom-scrollbar shadow-inner"
                                    spellCheck={false}
                                />
                                {jsonError && (
                                    <div className="absolute top-4 right-4 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-[10px] px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-800/50 flex items-center gap-2">
                                        <AlertCircle size={12} />
                                        {jsonError}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end">
                                <RippleButton variant="filled" onClick={applyJson} className="bg-brand-primary hover:bg-brand-primary/90 px-4 py-2 rounded-xl text-[10px] font-bold uppercase">
                                    套用 JSON
                                </RippleButton>
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-2">
                        提示：留空的項目會自動繼承您在上方選擇的「預覽風格 (Theme)」預設值。透過這些變數，您可以覆寫預覽區內所有的字體與顏色細節。
                    </p>
                </div>
            )}
        </div>
    );
};

export default CustomThemeEditor;
