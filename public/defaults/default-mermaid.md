---
title: Mermaid 語法與樣式全攻略 (Cheat Sheet)
---
%% width: 100%
%% 👆 Tip: 使用 %% width: 80% 或 %% scale: 0.9 來調整圖表大小 (支援 PDF 匯出)
graph TD
    %% ==========================================
    %% 1. 基礎節點語法 (Node Syntax)
    %% 修正重點：文字內容全部加上雙引號 "" 以避免解析錯誤
    %% ==========================================
    
    Start(("Start<br/>(圓形)")) --> Node1["<b>標準矩形</b><br/>支援換行"]
    Node1 --> Node2("圓角矩形")
    Node2 --> Node3{"決策<br/>(菱形)"}
    
    %% 這裡就是原本報錯的地方，加上引號就修好了
    Node3 -->|Yes| Node4[/"平行四邊形<br/>(輸入/輸出)"/]
    
    Node3 -->|No| Node5[("資料庫<br/>Database")]
    Node4 --> Node6{{"六角形<br/>(準備/迴圈)"}}
    Node6 --> End((("雙圈<br/>(結束)")))

    %% ==========================================
    %% 2. 連線樣式 (Link Styles)
    %% ==========================================
    
    Node1 -.->|"虛線 (.-)"| Node3
    Node4 ==>|"粗線 (==)"| End
    Node5 --o|"圓頭 (o)"| Node2
    Node5 --x|"叉頭 (x)"| Node6

    %% ==========================================
    %% 3. 子圖表 (Subgraphs) - 用於分組
    %% ==========================================

    subgraph Group1 [📂 後端處理區]
        direction TB
        %% 這裡面的節點會被框在一起
        API["API 接口"] --> Auth{"驗證身分"}
        Auth -->|Pass| DB[("User DB")]
    end

    Node2 --> API

    %% ==========================================
    %% 4. 進階樣式定義 (ClassDef & Styles)
    %% 語法：classDef [樣式名] fill:[色碼],stroke:[色碼],color:[文字色]
    %% ==========================================

    %% 定義三種通用樣式
    classDef blueStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef redStyle fill:#ffebee,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5,color:#c62828
    classDef greenStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:4px,rx:10,ry:10

    %% 套用樣式
    class Node1,API blueStyle
    class Node3,Auth redStyle
    
    %% 直接在節點後用 ::: 套用
    SpecialNode["🚀 快速套用樣式"]:::greenStyle
    
    End --> SpecialNode

    %% ==========================================
    %% 5. 特殊排版與 HTML Hacks
    %% ==========================================

    %% 技巧：隱藏連結 (~~~) 用來調整上下位置但不畫線
    Group1 ~~~ FooterNote

    %% 技巧：使用 div 與 HTML 標籤來排版複雜文字
    %% 注意：classDef noteStyle 設為無邊框
    FooterNote["
    <div style='width:300px; text-align:left; color:#666;'>
      💡 <b>語法Tips：</b><br/>
      1. 換行請用 <code>&lt;br/&gt;</code><br/>
      2. 隱形連結使用 <code>~~~</code> 可調整版面<br/>
      3. 文字包在 <code>&quot;&quot;</code> 內才支援特殊符號
    </div>
    "]:::noteStyle

    %% 定義隱形樣式
    classDef noteStyle fill:none,stroke:none
    
    %% 連線樣式 (linkStyle)
    linkStyle 0 stroke:#ff9800,stroke-width:4px;
  
    %% =========================================================================
    %% 其他圖表類型與主題樣式連動教學 (Other Diagrams & Theme Styling Guide)
    %% =========================================================================
    
    %% 💡 預覽器獨家：Mermaid 序列圖 (Sequence Diagram) 配色微調教學
    %% -------------------------------------------------------------------------
    %% 系統支援利用 CSS 變數，完美讓圖表配色跟隨目前主題或您的自訂樣式自動切換：
    %%
    %% 🎨 參與者 (Actor - 圖表中的角色方塊) 樣式變數：
    %%   --mermaid-actor-bg      : 角色方塊的背景色 (例如：#e0f2fe 或 var(--brand-secondary))
    %%   --mermaid-actor-text    : 角色文字的顏色   (例如：#0369a1 或 var(--theme-text-color))
    %%   --mermaid-actor-border  : 角色方塊的邊框色 (例如：#0ea5e9 或 var(--code-border))
    %%
    %% 📝 備忘錄 (Note - 圖表中的註解方塊) 樣式變數：
    %%   --mermaid-note-bg       : 備忘錄背景色     (例如：#fef9c3 或 var(--code-bg))
    %%   --mermaid-note-text     : 備忘錄文字顏色   (例如：#854d0e 或 var(--theme-text-color))
    %%   --mermaid-note-border   : 備忘錄邊框色     (例如：#eab308 或 var(--code-border))
    %%
    %% 🛠️ 具體如何使用與微調 (Mermaid 模式已完美原生支援！)：
    %%   您現在可以直接在此 Mermaid 文件中，或是在您的 Markdown 文件中嵌入 <style> 標籤，
    %%   來即時覆寫預覽區樣式。例如，您可取消下方 <style> 區塊與 sequenceDiagram 的註解（刪除 %%）
    %%   即可直接在右側即時體驗深邃的「🌌 午夜極光」配色：
    %%
    %% <style>
    %% .prose {
    %%     --mermaid-actor-bg: #1e1b4b;     /* 參與者深靛藍背景 */
    %%     --mermaid-actor-text: #c084fc;   /* 參與者亮紫文字 */
    %%     --mermaid-actor-border: #6366f1; /* 參與者靛藍邊框 */
    %%     --mermaid-note-bg: #064e3b;      /* 備忘錄深綠背景 */
    %%     --mermaid-note-text: #34d399;    /* 備忘錄亮綠文字 */
    %%     --mermaid-note-border: #059669;  /* 備忘錄綠色邊框 */
    %%     --mermaid-line: #818cf8;          /* 連線箭頭主色 */
    %% }
    %% </style>
    %%
    %% 👇 取消下方序列圖的註解 (刪除每行最前方的 %%) 即可立即體驗與預覽：
    
    %% sequenceDiagram
    %%     actor 用戶 as 👤 用戶
    %%     participant 系統 as 💻 編輯器系統
    %%     participant 資料庫 as 🗄️ IndexedDB
    %%     
    %%     用戶->>系統: 1. 輸入 Markdown 或 Mermaid 程式碼
    %%     Note right of 系統: 這裡的 Note 樣式<br/>由 --mermaid-note-* 變數控制
    %%     系統->>資料庫: 2. 自動非同步持久化
    %%     資料庫-->>系統: 3. 回傳成功狀態
    %%     系統-->>用戶: 4. 即時在右側渲染優美畫面
    %%     Note left of 用戶: 這裡的 Actor 樣式<br/>由 --mermaid-actor-* 變數控制