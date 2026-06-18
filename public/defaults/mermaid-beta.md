---
title: Mermaid 進階擴充實驗室
---

%% 這份文件展示了 Mark It Live  如何無縫整合最新的 **Mermaid 11** 語法與自訂樣式。

%% 1. 全新形狀擴充語法 (Extensible Shapes)

%% 除了點擊畫面上的節點使用「工具列」切換常見形狀外，你也可以在左側編輯器直接使用官方最新的 `@{ shape: xxx }` 語法，解鎖幾十種專業繪圖符號：


flowchart LR
    %% 先定義節點與文字
    N1["人工操作"]
    N2["多重文件"]
    N3["子程序"]
    N4["圓柱資料庫"]

    %% 使用 @{ shape } 語法套用特殊外觀
    N1@{ shape: proc }
    N2@{ shape: docs }
    N3@{ shape: subproc }
    N4@{ shape: cylinder }

    N1 --> N2 --> N3 --> N4

