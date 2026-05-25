import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'mermaid-lens-settings';

/** Mermaid PDF 列印設定 */
export interface PrintSettings {
    paperSize: 'A4' | 'A3' | 'Letter';
    orientation: 'portrait' | 'landscape';
    /** 'fit' = 符合頁面, 'actual' = 實際大小, number = 自訂百分比 (10–200) */
    scale: 'fit' | 'actual' | number;
    margin: 'normal' | 'narrow' | 'none';
    /** 匯出 MD 時合併資料夾 */
    mergeVaultOnMdExport: boolean;
    /** 下載 PDF 時合併資料夾 */
    mergeVaultOnPdfExport: boolean;
    /** Markdown 預覽主題 */
    previewTheme: 'default' | 'academic' | 'minimal' | 'developer' | 'implementation-plan' | 'classical' | 'newspaper';
}

export interface AppSettings {
    customMacros: Record<string, string | [string, number]>;
    printSettings: PrintSettings;
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
    paperSize: 'A4',
    orientation: 'landscape',
    scale: 'fit',
    margin: 'normal',
    mergeVaultOnMdExport: false,
    mergeVaultOnPdfExport: false,
    previewTheme: 'default',
};

const DEFAULT_SETTINGS: AppSettings = {
    customMacros: {
        // 常用數學集合
        "RR": "{\\mathbb{R}}",           // 實數集
        "NN": "{\\mathbb{N}}",           // 自然數集
        "ZZ": "{\\mathbb{Z}}",           // 整數集
        "QQ": "{\\mathbb{Q}}",           // 有理數集
        "CC": "{\\mathbb{C}}",           // 複數集

        // 文字樣式
        "bold": ["{\\mathbf{#1}}", 1],   // 粗體

        // 微分相關
        "dd": "{\\mathrm{d}}",           // 微分符號 d
        "dv": ["{\\frac{\\mathrm{d} #1}{\\mathrm{d} #2}}", 2],  // 導數 d/dx
        "pdv": ["{\\frac{\\partial #1}{\\partial #2}}", 2],     // 偏導數 ∂/∂x

        // 括號類
        "norm": ["{\\left\\| #1 \\right\\|}", 1],     // 範數 ||x||
        "abs": ["{\\left| #1 \\right|}", 1],          // 絕對值 |x|
        "set": ["{\\left\\{ #1 \\right\\}}", 1],      // 集合 {x}
        "paren": ["{\\left( #1 \\right)}", 1],        // 括號 (x)
        "bracket": ["{\\left[ #1 \\right]}", 1],      // 方括號 [x]
        "angle": ["{\\left\\langle #1 \\right\\rangle}", 1],  // 角括號 ⟨x⟩

        // 向量與矩陣
        "vect": ["{\\mathbf{#1}}", 1],               // 向量粗體
        "mat": ["{\\mathbf{#1}}", 1],                // 矩陣粗體
    },
    printSettings: DEFAULT_PRINT_SETTINGS,
};


export function useAppSettings() {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migration: Remove backslashes from macro keys if they exist
                if (parsed.customMacros) {
                    const newMacros: Record<string, any> = {};
                    let hasChanges = false;

                    Object.entries(parsed.customMacros).forEach(([key, value]) => {
                        if (key.startsWith('\\')) {
                            newMacros[key.substring(1)] = value;
                            hasChanges = true;
                        } else {
                            newMacros[key] = value;
                        }
                    });

                    return {
                        ...DEFAULT_SETTINGS,
                        ...parsed,
                        customMacros: hasChanges ? newMacros : parsed.customMacros,
                        // 旧用戶沒有 printSettings時补上預設就
                        printSettings: {
                            ...DEFAULT_PRINT_SETTINGS,
                            ...(parsed.printSettings ?? {})
                        },
                    };
                }
                // stored 存在但沒有 customMacros，補上預設後回傳
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    printSettings: parsed.printSettings ?? DEFAULT_PRINT_SETTINGS
                };
            }
            return DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return DEFAULT_SETTINGS;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }, [settings]);

    const updateMacros = (newMacros: Record<string, string | [string, number]>) => {
        setSettings(prev => ({ ...prev, customMacros: newMacros }));
    };

    const updatePrintSettings = (patch: Partial<PrintSettings>) => {
        setSettings(prev => ({ ...prev, printSettings: { ...prev.printSettings, ...patch } }));
    };

    const restoreDefaults = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return {
        settings,
        updateMacros,
        updatePrintSettings,
        restoreDefaults
    };
}
