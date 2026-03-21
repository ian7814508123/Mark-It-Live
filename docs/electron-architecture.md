# 🏗️ Electron 架構與設計

*深入了解技術架構*

---

## 系統架構概覽

### 高層架構

```
┌─────────────────────────────────────────────────────┐
│        Markdown Live Previewer - 統一代碼庫        │
└─────────────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────▼────┐                  ┌────▼─────┐
   │ main 分支 │                  │ electron │
   │ (網頁版) │                  │ -desktop │
   └────┬────┘                  │ (桌面版) │
        │                       └────┬─────┘
   ┌────▼────────────┐         ┌─────▼──────────┐
   │  npm run dev    │         │ npm run        │
   │ Vite Server    │         │ dev-electron  │
   │ Port 5173      │         │ Vite + Electron │
   └────┬────────────┘         └─────┬──────────┘
        │                             │
   ┌────▼────────────┐         ┌─────▼──────────┐
   │ Web App        │         │ Desktop App    │
   │ Browser       │         │ Electron Window│
   │ http://...    │         │ .exe 執行檔    │
   └────────────────┘         └────────────────┘
```

---

## 代碼共享模式

### 三層架構

```
┌─────────────────────────────────────┐
│  應用層（應用邏輯）                   │
│  src/components/App.tsx             │
│  src/pages/                         │
└──────────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │  業務層（共享代碼）    │
    │  src/components/   │
    │  src/hooks/        │
    │  src/services/     │
    └──────────┬──────────┘
               │
┌──────────────▼──────────────┬───────────────────┐
│ 呈現層                       │ 系統層             │
│ src/App.tsx （React）        │ electron/main.ts  │
│ 客戶端路由、UI 狀態管理      │ （窗口、菜單）     │
└──────────────┬──────────────┴────────┬──────────┘
               │ 網頁版本               │ 桌面版本
               │                       │
        ┌──────▼────────┐      ┌──────▼────────┐
        │ Web Platform  │      │ Electron      │
        │ DOM API      │      │ Native API    │
        └──────────────┘      └───────────────┘
```

---

## 文件結構與職責

### 共享代碼（兩個版本都用）

```
src/
├── components/           (80% 共享)
│   ├── CodeMirrorEditor.tsx    → 編輯器邏輯
│   ├── MarkdownPreview.tsx     → 預覽器邏輯
│   ├── Header.tsx              → 頭部菜單
│   ├── HistorySidebar.tsx      → 歷史記錄
│   └── ...其他組件
│
├── hooks/                (100% 共享)
│   ├── useAppSettings.ts       → 應用設置管理
│   ├── useDocumentStorage.ts   → 文件存儲管理
│   └── useImageStorage.ts      → 圖片存儲管理
│
├── services/             (100% 共享)
│   ├── excelParser.ts          → Excel 解析
│   └── tableParser.ts          → 表格解析
│
├── App.tsx               (95% 共享 - 99% 相同)
│   └── 需要改變的:
│       • Electron 特定的菜單處理
│       • 系統托盤集成（可選）
│
└── index.tsx            (50% 共享)
    ├── 網頁版: React 根入口
    └── Electron 版: 呈現進程入口
```

### Electron 特定代碼（僅桌面版）

```
electron/
├── main.ts                    (120 行)
│   ├── 窗口管理
│   ├── 應用菜單
│   ├── 系統托盤（可選）
│   ├── IPC 事件處理
│   └── 應用生命周期
│
└── preload.ts                 (30 行)
    ├── 安全的 IPC 橋接
    ├── 上下文隔離
    └── API 暴露給渲染進程
```

---

## 進程架構

### Electron 進程模型

```
操作系統
    │
┌───▼────────────────────────────────┐
│  Electron 應用進程                   │
│  ┌────────────────────────────────┐│
│  │ 主進程 (electron/main.ts)       ││
│  │ • 應用生命周期管理              ││
│  │ • 窗口創建/銷毀               ││
│  │ • 菜單、對話框                  ││
│  │ • 系統事件處理                  ││
│  │ • 文件系統訪問                  ││
│  └────────┬───────────────────────┘│
│           │ IPC 通信               │
│  ┌────────▼───────────────────────┐│
│  │ 渲染進程 (Chromium)             ││
│  │ • React 應用運行               ││
│  │ • DOM 渲染                     ││
│  │ • 用戶交互                      ││
│  │ • 網絡請求                      ││
│  └────────────────────────────────┘│
└────────────────────────────────────┘
```

### IPC 通信

```
渲染進程 (src/App.tsx)
    │
    │ ipcRenderer.invoke('get-app-version')
    │
    ▼─────────────────────
    
主進程 (electron/main.ts)
    │ ipcMain.handle('get-app-version', () => ...)
    │
    ▼ 返回版本信息
    
    ──────────────────────
    ▲
    │
    │ 返回值
    │
渲染進程
```

---

## 開發工作流程

### 網頁版本工作流

```
1. 編輯代碼
   src/components/Editor.tsx
   
2. 保存文件
   
3. Vite 熱更新
   ├─ 重新編譯模塊
   ├─ 發送更新信號
   └─ 瀏覽器刷新
   
4. 即時看到變化
   http://localhost:5173
   
5. npm run build
   ├─ TypeScript 編譯
   ├─ Vite 打包
   └─ 生成 dist/
   
6. 上傳到服務器或 GitHub Pages
```

### 桌面版本工作流

```
1. 編輯 React 代碼
   src/components/Editor.tsx
   
2. 保存文件
   
3. Vite 熱更新
   ├─ 重新編譯模塊
   ├─ 發送更新信號
   └─ Electron 窗口自動重新加載
   
4. 在 Electron 窗口中看到變化
   
5. 編輯 Electron 代碼
   electron/main.ts
   
6. 保存文件
   ├─ TypeScript 自動編譯
   ├─ electron/main.js 更新
   └─ 需要手動重啟 Electron（或按 Ctrl+R）
   
7. npm run electron-build
   ├─ npm run build (Vite 打包)
   ├─ npm run compile-electron (tsc 編譯)
   └─ electron-builder 打包
   
8. 生成 dist/*.exe
   ├─ Setup 版本（含安裝程序）
   └─ Portable 版本（直接運行）
   
9. 分享給用戶
```

---

## 技術棧

### 核心技術

```
前端框架
├── React 19.2.3          (UI 框架)
├── TypeScript            (類型安全)
└── Vite 6.4.1            (打包工具)

Markdown & 編輯
├── CodeMirror 6          (代碼編輯器)
├── react-markdown        (Markdown 渲染)
├── remark-gfm            (Markdown 語法)
└── rehype-*              (HTML 處理)

圖表與可視化
├── Mermaid 11.12.2       (流程圖等)
├── Vega-Lite 6           (數據可視化)
└── MathJax               (數學公式)

桌面應用框架
├── Electron 31.7.7       (桌面框架)
└── electron-builder 24   (打包工具)

其他工具
├── Tailwind CSS          (樣式)
├── XLSX                  (Excel 處理)
├── PDF-lib               (PDF 生成)
└── localStorage API      (本地存儲)
```

---

## 配置決策

### 為什麼選擇 Electron？

✅ **代碼共享** - 前後端都用 JavaScript/TypeScript  
✅ **快速開發** - 使用熟悉的 React + Node.js 技術棧  
✅ **跨平台** - 一份代碼支持 Windows、macOS、Linux  
✅ **系統集成** - 訪問文件系統、系統菜單、托盤等  
✅ **離線運行** - 完整的本地應用，無需服務器  

### 為什麼選擇 electron-builder？

✅ **自動化** - 自動生成安裝程序和便攜版  
✅ **簽名支持** - 支持代碼簽名（代碼真實性驗證）  
✅ **多平台** - 單個配置支持 Windows、macOS、Linux  
✅ **更新機制** - 內置自動更新支持  

### 為什麼使用 Vite？

✅ **快速開發** - HMR（熱模塊更新）支持  
✅ **優化構建** - 按需編譯，快速重新構建  
✅ **ESM 原生** - 完整支持 ES 模塊  
✅ **插件體系** - 易於擴展和自定義  

---

## 模塊系統選擇

### 為什麼使用 ESM？

```json
{
  "type": "module"  // package.json 指定 ESM
}
```

**優勢：**
✅ Electron 31+ 完全支持 ESM  
✅ 現代 JavaScript 標準  
✅ 更好的性能和優化  
✅ 與 Vite/TypeScript 無縫集成  

**ESM vs CommonJS：**
```
ESM (現在使用)         CommonJS (舊版)
─────────────         ──────────────
import/export         require/module.exports
import.meta.url       __dirname, __filename
原生支持              需要 polyfill
```

---

## 開發環境檢測

### isDev 邏輯

```typescript
const isDev = !app.isPackaged || 
              process.env.NODE_ENV === 'development' || 
              process.env.VITE_DEV_SERVER_URL !== undefined;
```

**檢查順序：**
1. `!app.isPackaged` - Electron 已打包？
2. `NODE_ENV === 'development'` - 開發模式？
3. `VITE_DEV_SERVER_URL` - Vite 伺服器運行中？

**用途：**
- 開發環境 → 連接到 http://localhost:5173
- 生產環境 → 加載 file:///dist/index.html

---

## 性能考量

### 打包大小

```
Electron 應用典型大小：
├─ Chromium          ~50 MB
├─ Node.js           ~30 MB
├─ React 應用        ~100-200 MB
├─ 依賴包            ~50-100 MB
└─ 總計              ~200-300 MB

優化方向：
✅ 代碼分割 (Code Splitting)
✅ 樹搖 (Tree Shaking)
✅ 動態導入 (Dynamic Import)
✅ 懶加載 (Lazy Loading)
```

### 啟動速度

```
Electron 應用啟動流程：
1. 系統加載 Electron (~500ms)
2. Chromium 初始化 (~1000ms)
3. 加載 React 應用 (~500ms)
4. DOM 渲染 (~300ms)
────────────────────────
總計：~2-3 秒

優化方向：
✅ 預加載 (Preload Script)
✅ 代碼分割
✅ 網絡優化
```

---

## 安全性考量

### 為什麼使用 contextIsolation？

```typescript
webPreferences: {
  contextIsolation: true,      // ✅ 隔離上下文
  nodeIntegration: false,      // ✅ 禁用 Node 整合
  preload: 'preload.js',       // ✅ 安全的 preload 腳本
}
```

**好處：**
✅ 主進程與渲染進程隔離  
✅ 防止 XSS 攻擊  
✅ 限制權限訪問  

### IPC 安全通信

```typescript
// ✅ 安全：通過 IPC 通信
ipcRenderer.invoke('secure-operation', data);

// ❌ 不安全：直接 require
const fs = require('fs');  // 會失敗

// ✅ 推薦：通過 Preload 暴露
contextBridge.exposeInMainWorld('api', {
  readFile: (path) => ipcRenderer.invoke('read-file', path)
});
```

---

## 擴展可能性

### 未來功能可能性

```
系統托盤集成
├─ 快速訪問菜單
├─ 應用通知
└─ 后台運行

自動更新
├─ 檢查更新
├─ 下載更新
└─ 自動安裝

系統集成
├─ 快捷鍵註冊
├─ 文件協會（.md 打開方式）
└─ 深度鏈接支持

性能優化
├─ 工作進程 (Worker)
├─ 本地存儲優化
└─ 緩存機制
```

---

## 相關文件

- [開發指南](./electron-development-guide.md) - 開發流程
- [快速參考](./electron-quick-reference.md) - 命令速查
- [檢查清單](./electron-setup-checklist.md) - 故障排除

---

**最後更新：2026 年 3 月 22 日**
