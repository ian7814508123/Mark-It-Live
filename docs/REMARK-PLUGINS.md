# 🔌 自訂 Remark 插件維護指南 (Custom Remark Plugins Guide)

本文件提供 Markdown Live Previewer 中自訂的三個 Remark 插件（`remarkGithubAlerts`、`remarkWikiLink`、`remarkPageBreak`）的技術解析與維護指引。這些插件均位於 [src/components/markdown/](../src/components/markdown/)。

---

## 💡 為什麼要使用 AST 插件化？ (Why AST Plugins?)

在專案早期版本中，特殊語意（如 WikiLink 與 Alerts）的解析是透過「字串正則替換預處理」或「React DOM 克隆深度遍歷」來實現的。這導致了兩大問題：
1. **「誤殺」代碼塊**：無法區分正常文字與程式碼區塊（`code` / `inlineCode`），導致程式碼中的 WikiLink 或換頁標記也被錯誤解析。
2. **效能低效**：在 React 渲染階段重複遍歷龐大的虛擬 DOM 節點樹會造成嚴重的輸入延遲與卡頓。

**目前的 AST 插件架構**：
透過自訂 Remark 插件，語意解析在 **Markdown 解析為 AST (Abstract Syntax Tree，抽象語法樹) 的階段** 一次完成。插件能夠感知語義上下文，進行安全的條件遍歷，解耦解析與 UI 渲染，為專案帶來了極高的安全性與流暢性。

---

## 🧩 插件架構與運作機制 (Plugin Mechanisms)

### 1. remarkGithubAlerts (警示盒插件)
*   **檔案路徑**：[remarkGithubAlerts.ts](../src/components/markdown/remarkGithubAlerts.ts)
*   **設計目的**：解析 GitHub-style Alert 語法（例如：`> [!NOTE]`），將其渲染為美觀的自訂警告方塊。
*   **AST 轉換邏輯**：
    1. 遍歷 AST 樹中的所有 `blockquote` 節點。
    2. 檢查 `blockquote` 的第一個子節點是否為 `paragraph`。
    3. 檢查 `paragraph` 的第一個子節點是否為 `text`。
    4. 使用正規表示式匹配 `[!NOTE]`, `[!WARNING]`, `[!CAUTION]`, `[!IMPORTANT]`, `[!TIP]`（不區分大小寫，亦支援不帶驚嘆號的舊版格式如 `[NOTE]`）。
    5. **文字轉換與清理**：如果匹配成功，將標記文字自 text 節點中裁剪移除。
        - **同行有內容且帶換行**（如 `> [!NOTE]\n檔案命名規則`）：在 AST 階段直接進行節點分裂，建立一個加粗的 `strong` 標題節點（如 `<strong>NOTE</strong>`）、一個 `: ` 分隔符號 `text` 節點、一個 `break` 換行節點與後續內容 `text` 節點，實現標題與內文自動換行排列。
        - **同行有內容且無換行**（如 `> [!NOTE] 檔案命名規則`）：直接分裂建立 `strong` 標題節點與代表剩餘文字內容的 `text` 節點（如 `: 檔案命名規則`）。並對使用者可能手動輸入的前綴進行去重（如移除 `**NOTE**:` 或 `NOTE:`）。
        - **同行無內容但後續有其他節點**（例如換行寫內文或手動 `<br>`）：自動分裂建立 `strong` 標題節點與一個 `break` 換行節點。同時會自動對隨後的重複換行（如使用者寫的 `<br>` 產生的 `break` 或 `html` 節點）進行去重清理，防止重複換行。
        - **完全空的 Alert**：僅移出 text 節點。若第一個段落（`paragraph`）在清理後已無任何子節點，則直接將該段落自 `blockquote` 中移出，徹底防止產生空 `<p>` 標籤以避免多出一行空行。
    6. **屬性注入**：
       - 在 `node.data.hProperties.className` 注入 `markdown-alert` 與 `markdown-alert-{alertType}`，供 CSS 樣式控制。
       - 在 `node.data.alertType` 儲存此類型值。
*   **React 端整合**：
    在 `MarkdownPreview.tsx` 的 `components` 配置中，自訂了 `blockquote` 的渲染元件：
    - 當檢測到 `node.data?.alertType` 存在時，會動態載入對應的 Lucide 圖標（如 `Info`, `AlertTriangle`, `Octagon` 等）與標題，並以現代的 Glassmorphism 警示樣式渲染。
    - 否則，渲染為一般引言。

---

### 2. remarkWikiLink (雙括號連結插件)
*   **檔案路徑**：[remarkWikiLink.ts](../src/components/markdown/remarkWikiLink.ts)
*   **設計目的**：將 `[[頁面名稱]]` 的雙括號 WikiLink 語法安全地轉換為內部錨點連結。
*   **AST 轉換與分裂邏輯**：
    1. 遍歷 AST 中所有的 `text` 節點。
    2. **安全邊界檢查**：若當前 `text` 節點的父節點（`parent`）為 `code`、`inlineCode` 或已經是 `link` 內部，則**立即跳過**，100% 避免程式碼內容與普通連結被誤殺。
    3. 使用 `[[(.*?)]]` 正規表示式全局匹配。
    4. **節點拆分 (Node Splitting)**：若在單個 text 節點中匹配到多個 WikiLink，則進行段落分裂，例如將：
       `"請參考 [[A 頁面]] 與 [[B 頁面]] 的內容"` 拆分為：
       - `text` 節點：`"請參考 "`
       - `link` 節點：url 為 `#wikilink-A%20%E9%A0%81%E9%9D%A2`，子節點為 `text` `"A 頁面"`
       - `text` 節點：`" 與 "`
       - `link` 節點：url 為 `#wikilink-B%20%E9%A0%81%E9%9D%A2`，子節點為 `text` `"B 頁面"`
       - `text` 節點：`" 的內容"`
    5. **父節點替換**：在 `parent.children` 陣列中，使用 `splice` 將原有的單個 text 節點替換為上述拆分後的節點陣列。

---

### 3. remarkPageBreak (強制分頁插件)
*   **檔案路徑**：[remarkPageBreak.ts](../src/components/markdown/remarkPageBreak.ts)
*   **設計目的**：識別單獨成行的手動分頁指令（`\pagebreak`, `[page-break]`, `---pb---`），並將其編譯成列印時生效的物理分頁元素。
*   **AST 轉換邏輯**：
    1. 遍歷所有的 `paragraph` 節點。
    2. 檢查 `paragraph` 內是否**僅有一個**子節點，且該子節點為 `text` 節點。
    3. 去除首尾空白後，檢查其值是否為 `\pagebreak`、`[page-break]` 或 `---pb---` 中的其中之一。
    4. **節點改造 (Node Mutation)**：
       - 將該 `paragraph` 節點的類型直接修改為 `html` 節點。
       - 設定 `node.value` 為 `<div class="page-break"></div>`。
       - **清除子節點**：刪除 `node.children` 屬性使其成為無子節點的葉子節點。
*   **CSS 列印樣式**：
    在 `src/styles/themes/` 相關 CSS 中，對此類別設定：
    ```css
    @media print {
      .page-break {
        page-break-after: always;
        break-after: page;
        height: 0;
        margin: 0;
        padding: 0;
        border: none;
      }
    }
    ```
    這會觸發瀏覽器的列印引擎，在該位置強制開啟新的一頁。在編輯器的預覽介面中，它會被渲染為一條帶有 **"FORCE PAGE BREAK"** 的虛線指示，輔助用戶排版。

---

## 🧪 測試與驗證 (Testing & Verification)

專案已為三個自訂插件編寫了 100% 覆蓋的單元測試，存放於 `tests/components/`：
- `remarkGithubAlerts.test.ts`
- `remarkWikiLink.test.ts`
- `remarkPageBreak.test.ts`

### 測試覆蓋重點
*   **基礎轉換**：驗證正常語法是否能被正確解析為對應的 AST 節點、class 與資料。
*   **多重匹配**：驗證單行中有多個 WikiLink 時的拆分正確性。
*   **邊界條件**：驗證在程式碼區塊（`` `...` `` 或 ` ```...``` `）內部時，插件是否完全不作用（100% 安全防禦）。
*   **容錯性**：驗證帶有額外空白、大小寫混合時的匹配容錯。

### 執行單元測試
開發人員在修改 Remark 插件後，必須執行以下指令來驗證是否破壞既有邏輯：

```bash
# 執行單次測試
npx vitest run

# 啟動測試監聽模式（開發推薦）
npx vitest
```

---

## 📝 插件開發與修改建議 (Best Practices for Maintenance)

1.  **遞迴遍歷安全性**：
    遍歷 AST 時若有涉及節點新增、刪除或修改長度的操作（如 `remarkWikiLink`），必須對 `children` 陣列進行**防禦性複製**（例如 `const childrenCopy = [...node.children]`），再行遍歷。直接遍歷原陣列並在途中使用 `splice` 會導致 index 偏移或無限循環。
2.  **避免重複解析**：
    將 paragraph 節點改為 html 節點（如 `remarkPageBreak`）時，務必清除 `children`。否則，後續的編譯器可能會繼續解析其子節點，造成非預期的雙重渲染。
3.  **效能考量**：
    儘可能將 AST 遍歷的篩選條件放在最前端（例如優先過濾節點類型、檢查子節點長度等），避免在不匹配的節點上執行昂貴的正則匹配。
