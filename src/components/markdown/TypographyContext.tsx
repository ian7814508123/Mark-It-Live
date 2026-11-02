import React, { createContext, useContext } from 'react';
import { TypographyAttrs } from '../../utils/typographyUtils';

export interface TypographyContextValue {
    /** 目前排版面板開啟時指向的目標行號（若未開啟則為 null） */
    activeLine: number | null;
    /** 開啟排版微調面板的回調函式 */
    onOpenTypography: (line: number, tagName: string, targetEl: HTMLElement, existingAttrs?: TypographyAttrs) => void;
}

export const TypographyContext = createContext<TypographyContextValue>({
    activeLine: null,
    onOpenTypography: () => {},
});

export const useTypographyContext = () => useContext(TypographyContext);

