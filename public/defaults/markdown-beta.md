## 🧪色彩實驗室(β)
本預覽器深度整合了主題系統與 Mermaid 配色。您可以在 Markdown 文檔中直接內嵌 `<style>` 標籤，或在客製化主題中修改以下 CSS 變數，即時微調圖表外觀（支援深色模式）：

### 💡 支援的 Mermaid CSS 變數：

| 變數名稱 | 適用對象與說明 | 預設繼承 (Fallback) |
| :--- | :--- | :--- |
| `--mermaid-node-bg` | 流程圖、狀態圖等節點的背景色 | `--brand-secondary` |
| `--mermaid-node-text` | 節點內部的文字顏色 | `--theme-text-color` |
| `--mermaid-node-border` | 節點的描邊/邊框顏色 | `--code-border` |
| `--mermaid-line` | 連線、箭頭與連接線線條顏色 | `--theme-accent-color` |
| `--mermaid-edge-bg` | 連線上文字標籤 (Edge Label) 的背景色 | `--brand-surface` |
| **時序圖/序列圖專用 (Sequence Diagram)** | | |
| `--mermaid-actor-bg` | 序列圖參與者 (Actor) 的背景色 | `--mermaid-node-bg` |
| `--mermaid-actor-text` | 序列圖參與者 (Actor) 的文字顏色 | `--mermaid-node-text` |
| `--mermaid-actor-border` | 序列圖參與者 (Actor) 的邊框顏色 | `--mermaid-node-border` |
| `--mermaid-note-bg` | 序列圖備忘錄 (Note) 的背景色 | `--brand-surface` |
| `--mermaid-note-text` | 序列圖備忘錄 (Note) 的文字顏色 | `--mermaid-node-text` |
| `--mermaid-note-border` | 序列圖備忘錄 (Note) 的邊框顏色 | `--mermaid-node-border` |

### 🛠️ 實戰：即時變更時序圖 (Sequence Diagram) 樣式
您可以將下方的樣式與圖表代碼貼入您的文檔中，並試著修改其中的色碼，右側預覽將會即時套用全新配色：

<style>
/* 🌌 午夜極光配色 */
.prose {
    --mermaid-actor-bg: #1e1b4b;     /* 深靛藍背景 */
    --mermaid-actor-text: #c084fc;   /* 亮紫文字 */
    --mermaid-actor-border: #6366f1; /* 靛藍邊框 */
    --mermaid-note-bg: #064e3b;      /* 深綠備忘錄 */
    --mermaid-note-text: #34d399;    /* 亮綠文字 */
    --mermaid-note-border: #059669;  /* 綠色邊框 */
    --mermaid-line: #818cf8;          /* 亮藍箭頭 */
}
</style>

```mermaid
sequenceDiagram
    actor 使用者 as 👤 使用者
    participant 預覽器 as 💻 即時預覽器
    
    使用者->>預覽器: 1. 在 Markdown 中編寫圖表與 <style>
    Note right of 預覽器: 此 Note 樣式受 --mermaid-note-* 影響
    預覽器-->>使用者: 2. 預覽器自動抓取變數並完美套用！
```

---

## 🎨 擴充警示框 (Github-style Alerts)
除了 GitHub 原生的 5 種基本警示框（Note、Tip、Important、Warning、Caution）之外，本編輯器額外支援了**擴充語義類型**、**自訂標題**與**空格容錯**功能。

### 1. 支援的類型：
*   **Info**：`[!note]`、`[!info]`
*   **Tip/Success**：`[!tip]`、`[!success]`、`[!check]`、`[!quickstart]`
*   **Warning**：`[!warning]`、`[!caution]`
*   **Danger**：`[!danger]`、`[!error]`、`[!bug]`、`[!failure]`
*   **Important**：`[!important]`、`[!question]`、`[!help]`、`[!faq]`
 
> [!TIP]
> 支援:`開頭大寫`、`全大寫`、`全小寫` 的寫法

### 2. 自訂標題示範：
您可以透過 `[!TYPE] 自訂標題` 來替換預設的大寫標題字樣（亦支援如 `[!TYPE](自訂標題)` 的括號包裝）：

> [!NOTE](自訂標題)
> 這是一個自訂標題的範例。

### 3. 語法容錯（空格容錯）：
> [! WARNING ]
> 這是一個格式容錯測試，前後包含多餘空格也能正常匹配。

### 4. 巢狀結構:
> [!Question]
> 可以透過。
>> [!TIP]
>> 巢狀寫法來組合不同類型的警示框。
>>> [!danger]
>>> 但為了可讀性,還是希望不要用到這麼多層。