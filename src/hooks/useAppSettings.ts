import { useState, useEffect } from 'react';
import { DEFAULT_MACROS } from '../config/defaultMacros';

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
    previewTheme: import('../config/previewThemes').PreviewTheme;
}

export type CustomThemeSettings = Record<string, string>;

export interface AppSettings {
    customMacros: Record<string, string | [string, number]>;
    printSettings: PrintSettings;
    favoriteThemes?: string[];
    customTheme?: CustomThemeSettings;
    /** @deprecated Use customTheme instead */
    mermaidTheme?: any;
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
    customMacros: DEFAULT_MACROS,
    printSettings: DEFAULT_PRINT_SETTINGS,
    favoriteThemes: [],
    customTheme: {},
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
                        favoriteThemes: parsed.favoriteThemes ?? [],
                        customTheme: parsed.customTheme ?? (parsed.mermaidTheme ? {
                            '--mermaid-node-bg': parsed.mermaidTheme.nodeBg,
                            '--mermaid-node-text': parsed.mermaidTheme.nodeText,
                            '--mermaid-node-border': parsed.mermaidTheme.nodeBorder,
                            '--mermaid-line': parsed.mermaidTheme.lineColor,
                            '--mermaid-edge-bg': parsed.mermaidTheme.edgeBg,
                        } : {})
                    };
                }
                // stored 存在但沒有 customMacros，補上預設後回傳
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    printSettings: parsed.printSettings ?? DEFAULT_PRINT_SETTINGS,
                    favoriteThemes: parsed.favoriteThemes ?? [],
                    customTheme: parsed.customTheme ?? (parsed.mermaidTheme ? {
                        '--mermaid-node-bg': parsed.mermaidTheme.nodeBg,
                        '--mermaid-node-text': parsed.mermaidTheme.nodeText,
                        '--mermaid-node-border': parsed.mermaidTheme.nodeBorder,
                        '--mermaid-line': parsed.mermaidTheme.lineColor,
                        '--mermaid-edge-bg': parsed.mermaidTheme.edgeBg,
                    } : {})
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

    const toggleFavoriteTheme = (themeValue: string) => {
        setSettings(prev => {
            const favs = prev.favoriteThemes || [];
            const nextFavs = favs.includes(themeValue)
                ? favs.filter(t => t !== themeValue)
                : [...favs, themeValue];
            return { ...prev, favoriteThemes: nextFavs };
        });
    };

    const updateCustomTheme = (patch: CustomThemeSettings) => {
        setSettings(prev => {
            // Remove empty values
            const newTheme = { ...(prev.customTheme || {}), ...patch };
            Object.keys(newTheme).forEach(k => {
                if (!newTheme[k]) delete newTheme[k];
            });
            return {
                ...prev,
                customTheme: newTheme
            };
        });
    };

    const restoreDefaults = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return {
        settings,
        updateMacros,
        updatePrintSettings,
        toggleFavoriteTheme,
        updateCustomTheme,
        restoreDefaults
    };
}
