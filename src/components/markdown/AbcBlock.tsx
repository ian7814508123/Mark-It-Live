import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import abcjs from 'abcjs';
import DiagramBlock from './DiagramBlock';
import { hashString } from '../../utils';

interface AbcBlockProps {
    code: string;
    isDarkMode: boolean;
    isPrinting?: boolean;
    printSessionId?: number;
}

const AbcBlock: React.FC<AbcBlockProps> = React.memo(({ code, isDarkMode, isPrinting, printSessionId = 0 }) => {
    const paperRef = useRef<HTMLDivElement>(null);

    const render = useCallback(async (container: HTMLDivElement, renderCode: string) => {
        // 先建立一個內部容器，因為 abcjs 會直接操作 DOM
        container.innerHTML = '<div class="w-full abcjs-inner-container"></div>';
        const target = container.querySelector('.abcjs-inner-container') as HTMLDivElement;

        abcjs.renderAbc(target, renderCode, {
            responsive: 'resize'
        });
    }, []);

    return (
        <DiagramBlock
            type="abc"
            code={code}
            isDarkMode={isDarkMode}
            isPrinting={isPrinting}
            printSessionId={printSessionId}
            render={render}
            errorTitle="🎵 Abc Notation 語法錯誤"
            containerClassName="abcjs-wrapper"
        />
    );
});


export default AbcBlock;
