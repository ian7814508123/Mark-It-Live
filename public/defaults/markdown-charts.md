# 數據與視覺化圖表範本

本系統支援 **Vega-Lite** 數據圖表、**Plot** 函數圖形以及 **Mindmap** 互動心智圖。

---

## 1. 2D 數學函數圖 (Function Plot)

使用 ````plot 區塊，支援簡易運算式語法或標準 JSON 參數，即時繪製高精度函數曲線。

```plot
title: 正弦與餘弦波形 (Trigonometric Functions)
xDomain: [-6.28, 6.28]
yDomain: [-1.8, 1.8]
grid: true
fn: sin(x) | color: #3b82f6
fn: cos(x) | color: #10b981
```

支援多項式、高斯分佈等複合曲線：

```plot
title: 多項式與雙曲函數
xDomain: [-4, 4]
yDomain: [-4, 10]
grid: true
fn: x^2 - 2 | color: #f59e0b
fn: 0.5 * x^3 | color: #ec4899
```

---

## 2. 互動式心智圖 (Mindmap)

使用 ````mindmap 區塊，直接編寫標準 Markdown 階層標題與清單，即時轉換為可展開、收合與縮放的互動心智圖。

```mindmap
# Mark It Live 知識架構
## 渲染核心 (Rendering Engines)
### Markdown 解析
- Remark & Rehype
- GitHub Alerts `[!NOTE]`
- 雙向連動滾動
### 數學與公式
- MathJax v4
- LaTeX 論文排版
## 圖表家族 (Diagrams & Charts)
### 結構圖形
- Mermaid (流程圖、甘特圖、時序圖)
### 數據與數學
- Vega-Lite 統計視覺化
- Plot 函數曲線
- Mindmap 階層心智圖
- SMILES 化學分子式
- ABC 音樂五線譜
## 儲存與同步
- IndexedDB 本地持久化
- 雲端備份串接
```

---

## 3. Vega-Lite 數據圖表

### 長條圖 (Bar Chart)
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 200,
  "data": {
    "values": [
      {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
      {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
      {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "b", "type": "quantitative"}
  }
}
```

### 圓形圖 (Pie Chart)
```vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "簡單的圓形圖",
  "data": {
    "values": [
      {"category": "A", "value": 4},
      {"category": "B", "value": 6},
      {"category": "C", "value": 10},
      {"category": "D", "value": 3},
      {"category": "E", "value": 7}
    ]
  },
  "mark": "arc",
  "encoding": {
    "theta": {"field": "value", "type": "quantitative"},
    "color": {"field": "category", "type": "nominal"}
  }
}
```
