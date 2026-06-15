export const DEFAULT_MACROS: Record<string, string | [string, number]> = {
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
};
