import React, { useCallback, useId } from 'react';
import DiagramBlock from './DiagramBlock';

interface PlotBlockProps {
    code: string;
    isDarkMode: boolean;
    isPrinting?: boolean;
    printSessionId?: number;
}

interface PlotDatum {
    fn?: string;
    r?: string;
    x?: string;
    y?: string;
    color?: string;
    graphType?: 'polyline' | 'scatter' | 'interval';
    closed?: boolean;
    range?: [number, number];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

/**
 * 解析使用者輸入的 plot 語法（支援標準 JSON 與輕量簡潔語法）
 */
function parsePlotConfig(rawCode: string, isDark: boolean, containerWidth: number): any {
    const trimmed = rawCode.trim();

    // 1. 若開頭為 JSON 物件格式
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            const data: PlotDatum[] = (parsed.data || []).map((item: any, idx: number) => ({
                color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
                ...item
            }));

            return {
                title: parsed.title,
                grid: parsed.grid ?? true,
                disableZoom: parsed.disableZoom ?? false,
                xAxis: {
                    domain: parsed.xDomain || parsed.xAxis?.domain || [-6, 6],
                    label: parsed.xLabel || parsed.xAxis?.label || 'x'
                },
                yAxis: {
                    domain: parsed.yDomain || parsed.yAxis?.domain || [-6, 6],
                    label: parsed.yLabel || parsed.yAxis?.label || 'y'
                },
                data
            };
        } catch (e) {
            // JSON 解析失敗時 fallback 到簡易行解析
        }
    }

    // 2. 輕量行解析語法 (DSL)
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    let title = '';
    let grid = true;
    let disableZoom = false;
    let xDomain: [number, number] = [-6, 6];
    let yDomain: [number, number] = [-6, 6];
    let xLabel = 'x';
    let yLabel = 'y';
    const data: PlotDatum[] = [];

    for (const line of lines) {
        // 註解或指令
        if (line.startsWith('%%') || line.startsWith('//') || line.startsWith('#')) {
            continue;
        }

        const lower = line.toLowerCase();
        if (lower.startsWith('title:')) {
            title = line.slice(6).trim();
            continue;
        }
        if (lower.startsWith('grid:')) {
            grid = lower.slice(5).trim() === 'true';
            continue;
        }
        if (lower.startsWith('zoom:')) {
            disableZoom = lower.slice(5).trim() === 'false';
            continue;
        }
        if (lower.startsWith('xdomain:') || lower.startsWith('x:')) {
            const m = line.match(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
            if (m) xDomain = [parseFloat(m[1]), parseFloat(m[2])];
            continue;
        }
        if (lower.startsWith('ydomain:') || lower.startsWith('y:')) {
            const m = line.match(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
            if (m) yDomain = [parseFloat(m[1]), parseFloat(m[2])];
            continue;
        }
        if (lower.startsWith('xlabel:')) {
            xLabel = line.slice(7).trim();
            continue;
        }
        if (lower.startsWith('ylabel:')) {
            yLabel = line.slice(7).trim();
            continue;
        }

        // 提取函數表達式
        let expr = line;
        let customColor: string | undefined;

        if (expr.includes('|')) {
            const parts = expr.split('|');
            expr = parts[0].trim();
            const attr = parts[1].trim();
            const colorMatch = attr.match(/color:\s*([#\w]+)/i);
            if (colorMatch) customColor = colorMatch[1];
        }

        // 清理語法前綴（如 fn:, y =, f(x) =）
        expr = expr.replace(/^(?:fn\s*:|y\s*=|f\s*\(\s*x\s*\)\s*=)\s*/i, '').trim();

        if (expr) {
            const color = customColor || DEFAULT_COLORS[data.length % DEFAULT_COLORS.length];
            data.push({
                fn: expr,
                color,
                graphType: 'polyline'
            });
        }
    }

    if (data.length === 0) {
        data.push({ fn: 'x^2', color: DEFAULT_COLORS[0] });
    }

    return {
        title,
        grid,
        disableZoom,
        xAxis: { domain: xDomain, label: xLabel },
        yAxis: { domain: yDomain, label: yLabel },
        data
    };
}

/**
 * PlotBlock: 函數圖繪製組件
 * 整合 function-plot 套件，提供即時互動式 2D 數學曲線圖表渲染
 */
const PlotBlock: React.FC<PlotBlockProps> = React.memo(({
    code,
    isDarkMode,
    isPrinting,
    printSessionId = 0
}) => {
    const rawUniqueId = useId();
    const uniqueId = `plot-${rawUniqueId.replace(/[:]/g, '')}`;

    const render = useCallback(async (container: HTMLDivElement, renderCode: string, isDark: boolean) => {
        const functionPlotModule = await import('function-plot');
        const functionPlot = functionPlotModule.default;

        container.innerHTML = '';

        // 創建專屬樣式包裝器
        const wrapper = document.createElement('div');
        wrapper.id = uniqueId;
        wrapper.className = `function-plot-canvas w-full flex flex-col items-center justify-center overflow-hidden py-2 ${
            isDark ? 'plot-dark-mode' : 'plot-light-mode'
        }`;
        container.appendChild(wrapper);

        // 動態計算渲染寬度與高度
        const containerWidth = container.clientWidth || 580;
        const width = Math.min(Math.max(containerWidth - 24, 300), 720);
        const height = Math.round(Math.min(Math.max(width * 0.62, 280), 450));

        const plotOptions = parsePlotConfig(renderCode, isDark, width);

        // 注入專屬 CSS 樣式使座標軸與文字在深淺色模式完美契合
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            #${uniqueId} svg {
                font-family: inherit;
                background-color: transparent !important;
                user-select: none;
            }
            #${uniqueId}.plot-dark-mode .origin { stroke: #64748b !important; stroke-width: 1.5; }
            #${uniqueId}.plot-dark-mode .axis path, #${uniqueId}.plot-dark-mode .axis line { stroke: #475569 !important; }
            #${uniqueId}.plot-dark-mode .tick line { stroke: #334155 !important; stroke-dasharray: 2,2; }
            #${uniqueId}.plot-dark-mode .tick text { fill: #94a3b8 !important; font-size: 11px; }
            #${uniqueId}.plot-dark-mode text { fill: #cbd5e1 !important; }
            #${uniqueId}.plot-dark-mode .top-right-legend { fill: #94a3b8 !important; }
            #${uniqueId}.plot-dark-mode .title { fill: #f1f5f9 !important; font-weight: 600; font-size: 14px; }

            #${uniqueId}.plot-light-mode .origin { stroke: #94a3b8 !important; stroke-width: 1.5; }
            #${uniqueId}.plot-light-mode .axis path, #${uniqueId}.plot-light-mode .axis line { stroke: #cbd5e1 !important; }
            #${uniqueId}.plot-light-mode .tick line { stroke: #e2e8f0 !important; stroke-dasharray: 2,2; }
            #${uniqueId}.plot-light-mode .tick text { fill: #64748b !important; font-size: 11px; }
            #${uniqueId}.plot-light-mode text { fill: #334155 !important; }
            #${uniqueId}.plot-light-mode .top-right-legend { fill: #64748b !important; }
            #${uniqueId}.plot-light-mode .title { fill: #0f172a !important; font-weight: 600; font-size: 14px; }
        `;
        wrapper.appendChild(styleTag);

        const targetEl = document.createElement('div');
        targetEl.className = 'w-full flex justify-center';
        wrapper.appendChild(targetEl);

        functionPlot({
            target: targetEl,
            width,
            height,
            title: plotOptions.title,
            grid: plotOptions.grid,
            disableZoom: plotOptions.disableZoom,
            xAxis: plotOptions.xAxis,
            yAxis: plotOptions.yAxis,
            data: plotOptions.data
        });

        return () => {
            container.innerHTML = '';
        };
    }, [uniqueId]);

    return (
        <DiagramBlock
            type="plot"
            code={code}
            isDarkMode={isDarkMode}
            isPrinting={isPrinting}
            printSessionId={printSessionId}
            render={render}
            errorTitle="📈 函數圖 (Plot) 語法錯誤"
            containerClassName="plot-container"
        />
    );
});

export default PlotBlock;
