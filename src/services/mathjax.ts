// MathJax CDN 版本服務層
// 使用 window.MathJax（由 index.html 的 <script> 標籤注入），
// 避免 npm @mathjax/src 在 Vite browser bundle 中動態字型載入失敗的問題。

// 擴充 Window 型別以包含 MathJax 全域物件
declare global {
    interface Window {
        MathJax: any;
    }
}

class MathJaxService {
    // 等待 CDN 腳本載入完成的 Promise（singleton，只建立一次）
    private readyPromise: Promise<void> | null = null;

    /** 等待 MathJax CDN 腳本初始化完成 */
    private waitForReady(): Promise<void> {
        if (this.readyPromise) return this.readyPromise;

        this.readyPromise = new Promise<void>((resolve) => {
            // MathJax v3 在完成初始化後會設定 startup.promise
            const check = () => {
                const mj = window.MathJax;
                if (mj?.startup?.promise) {
                    mj.startup.promise.then(resolve);
                } else if (mj?.typesetPromise) {
                    // fallback：若 startup.promise 不存在但 typesetPromise 已掛載
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });

        return this.readyPromise;
    }

    /**
     * 對指定容器執行 MathJax 排版
     * @param container - 要排版的 DOM 容器
     */
    async typeset(container: HTMLElement) {
        try {
            await this.waitForReady();
            const mj = window.MathJax;
            // 移除 typesetClear()！
            // 在 v3 中，MathJax 會自動識別並跳過已經排版過的元素（帶有 mjx-container 的）。
            // 呼叫 typesetClear 會強制刪除所有已排版結果，導致 React re-render 時出現強烈閃爍甚至內容消失。
            await mj.typesetPromise([container]);
            window.dispatchEvent(new CustomEvent('mathjax-render-complete'));
        } catch (err) {
            console.error('MathJax typeset failed:', err);
        }
    }

    /**
     * 更新自訂 LaTeX 巨集並重置 TeX 狀態
     * 下一次 typeset() 呼叫時會套用新的巨集設定
     * @param customMacros - 使用者定義的巨集字典
     */
    reset(customMacros: Record<string, string | [string, number]> = {}) {
        this.waitForReady().then(() => {
            const mj = window.MathJax;
            if (!mj) return;

            // 1. 更新全局配置
            if (mj.config?.tex) {
                mj.config.tex.macros = { ...customMacros };
            }

            // 2. 動態注入巨集到現有的 TeX 解析器中
            // MathJax v3 初始化後，需直接操作 InputJax 的 parseOptions 才能即時生效
            try {
                const tex = mj.startup.getInputJax('tex');
                if (tex?.parseOptions?.macros) {
                    const macros = tex.parseOptions.macros;
                    Object.keys(customMacros).forEach(key => {
                        // 使用 v3 內部的 add 方法註冊或覆蓋巨集
                        if (typeof macros.add === 'function') {
                            macros.add(key, customMacros[key]);
                        }
                    });
                }
            } catch (e) {
                console.warn('MathJax: 嘗試直接更新 TeX 巨集失敗，將依賴下次初始化', e);
            }

            // 清除 TeX 內部狀態（計數器等），但不清除已渲染的 DOM
            mj.texReset?.();
        });
    }
}

export const mathJaxService = new MathJaxService();

if (typeof window !== 'undefined') {
    (window as any).mathJaxService = mathJaxService;
}
