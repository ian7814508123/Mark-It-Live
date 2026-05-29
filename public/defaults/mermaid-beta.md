---
title: 色彩實驗室
---
<style>
.prose {
    --mermaid-actor-bg: #1e1b4b;     
    --mermaid-actor-text: #c084fc;   
    --mermaid-actor-border: #6366f1; 
    --mermaid-note-bg: #064e3b;      
    --mermaid-note-text: #34d399;    
    --mermaid-note-border: #059669;  
    --mermaid-line: #818cf8;          
}
</style>

sequenceDiagram
    actor 使用者 as 👤 使用者
    participant 預覽器 as 💻 即時預覽器
    
    使用者->>預覽器: 1. 在 Markdown 中編寫圖表與 <style>
    Note right of 預覽器: 此 Note 樣式受 --mermaid-note-* 影響
    預覽器-->>使用者: 2. 預覽器自動抓取變數並完美套用！