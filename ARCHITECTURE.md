# 📊 Markdown Live Previewer - 完整架構圖

## 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                 Markdown Live Previewer                     │
│                   (統一代碼庫)                               │
└─────────────────────────────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
        ┌───────▼────────┐    ┌──────▼────────┐
        │    Main 分支    │    │ Electron 分支 │
        │   (網頁版本)    │    │  (桌面版本)   │
        └───────┬────────┘    └──────┬────────┘
                │                     │
        ┌───────▼────────┐    ┌──────▼────────┐
        │ npm run dev    │    │npm run        │
        │ Vite Server    │    │dev-electron  │
        │ Port 5173      │    │ Electron App │
        └───────┬────────┘    └──────┬────────┘
                │                     │
        ┌───────▼────────┐    ┌──────▼────────┐
        │  Web App       │    │ Desktop App   │
        │  http://...    │    │ Window (.exe) │
        └────────────────┘    └───────────────┘
```

---

## 代碼共享結構

```
project-root/
│
├─ src/                    ◄─── 共享代碼 (兩個版本都使用)
│  ├─ components/          • React 組件
│  ├─ hooks/              • 自定義 Hook
│  ├─ services/           • 業務邏輯
│  ├─ App.tsx            • 主應用
│  └─ index.tsx          • 入口
│
├─ electron/               ◄─── 僅 electron-desktop 分支
│  ├─ main.ts            • Electron 主進程
│  ├─ preload.ts         • IPC 通信
│  └─ tsconfig.json      • TS 配置
│
├─ public/                 ◄─── 共享資源
│  ├─ index.css
│  ├─ favicon.svg
│  └─ ...
│
└─ docs/                   ◄─── 文檔 (Electron 分支新增)
   ├─ ELECTRON-SETUP.md        • 詳細指南
   ├─ ELECTRON-COMPLETE.md     • 完整摘要
   ├─ SETUP-CHECKLIST.md       • 檢查表
   ├─ QUICK-REFERENCE.md       • 快速參考
   ├─ start-electron-dev.bat   • 啟動腳本
   └─ build-installer.bat      • 打包腳本
```

---

## 開發工作流程

### 網頁版本 (main 分支)

```
編輯 src/
    ↓
npm run dev
    ↓
Vite 熱更新
    ↓
瀏覽器預覽 (http://localhost:5173)
    ↓
npm run build
    ↓
dist/ (靜態文件)
```

### 桌面版本 (electron-desktop 分支)

```
編輯 src/
    ↓
npm run dev-electron
    ↓
Vite 熱更新 + Electron 窗口
    ↓
應用窗口預覽
    ↓
npm run electron-build
    ↓
Electron-builder 打包
    ↓
dist/ (.exe 安裝程序)
```

### 代碼修改同步

```
修改 src/ 中的代碼
    ↓
兩個版本都自動受影響
    ↓
無需重複修改
```

---

## 構建過程詳解

### 開發模式

```
npm run dev-electron
    │
    ├─ npm run dev (Vite)
    │   └─ localhost:5173 (React App)
    │
    └─ npm run electron-dev (Electron)
        └─ 連接到 http://localhost:5173
            └─ Electron 窗口加載 web app
```

### 生產打包

```
npm run electron-build
    │
    ├─ npm run build (Vite)
    │   └─ 生成 dist/ (靜態文件)
    │
    └─ npm run electron-dist (electron-builder)
        ├─ 打包 Electron + dist/
        │
        ├─ Windows
        │   ├─ NSIS 安裝程序 (.exe)
        │   └─ 便攜版 (.exe)
        │
        ├─ macOS
        │   ├─ DMG 安裝器 (.dmg)
        │   └─ ZIP 壓縮包 (.zip)
        │
        └─ Linux
            ├─ AppImage (.AppImage)
            └─ DEB 包 (.deb)
```

---

## Git 分支分離模式

```
GitHub 遠程
    │
    ├─ main (origin/main) ◄─── 網頁版本
    │   ↓
    └─ 本地 main
        │
        └─ 本地 electron-desktop ◄─── 桌面版本 (新建)
            (可選) ↓ push to origin
                └─ remote electron-desktop
```

### 分支隔離優勢

✅ **main 分支不受影響**
- 可隨時推送到 GitHub
- 網頁版本獨立發展
- 無需擔心破壞網頁版

✅ **桌面版獨立開發**
- 可自由實驗
- 隨時拉取 main 的更新
- 保持代碼同步

✅ **靈活合併策略**
- 可以合併回 main（可選）
- 可以保持分離
- 完全由你決定

---

## 技術棧對比

| 組件 | 網頁版 | 桌面版 |
|------|--------|--------|
| 前端框架 | React 19 | React 19 |
| 構建工具 | Vite | Vite |
| 桌面框架 | - | Electron |
| 打包工具 | - | electron-builder |
| 運行環境 | 瀏覽器 | 獨立應用 |
| 發佈方式 | Web Server | .exe 文件 |

---

## 功能特性

### 兩版本通用

- ✅ Markdown 實時編輯
- ✅ Mermaid 圖表
- ✅ 數學公式
- ✅ 代碼高亮
- ✅ 主題切換
- ✅ 導出功能

### 桌面版特有（可擴展）

- 💡 本地文件訪問
- 💡 系統托盤集成
- 💡 快捷鍵自定義
- 💡 更新檢查
- 💡 系統菜單

---

## 文件大小估計

| 項目 | 大小 |
|------|------|
| src/ (React 代碼) | ~50-100 KB |
| node_modules/ (依賴) | ~500-800 MB |
| dist/ (Web 構建) | ~2-5 MB |
| electron-builder 輸出 | ~150-200 MB |

> 注：最終的 .exe 文件為便攜版，可直接運行，無需用戶安裝 Node.js

---

## 版本發佈示例

### 版本 1.0.0

```
網頁版:
  https://yoursite.com/markdown-live-previewer

桌面版:
  Download: Markdown-Live-Previewer-1.0.0-Setup.exe
  Portable: Markdown-Live-Previewer-1.0.0.exe
  
  GitHub Releases:
  ├─ Setup 版本 (含安裝向導)
  ├─ 便攜版本 (直接運行)
  └─ 源代碼 (ZIP)
```

---

## 快速參考

### 常用命令

```bash
# 開發
git checkout electron-desktop
npm install
npm run dev-electron

# 測試
npm run dev
npm run build

# 發佈
npm run electron-build
# 找到: dist/Markdown Live Previewer Setup 0.0.0.exe
```

### 文檔速查

- 🚀 **快速開始**: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
- 📚 **詳細指南**: [ELECTRON-SETUP.md](./ELECTRON-SETUP.md)
- 📋 **完整摘要**: [ELECTRON-COMPLETE.md](./ELECTRON-COMPLETE.md)
- ✅ **檢查表**: [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md)

---

## 下一步

1. ✅ 架構已就位
2. 👉 運行 `npm install`
3. 測試 `npm run dev-electron`
4. 自定義應用名稱、圖標
5. 構建 `npm run electron-build`
6. 分享 .exe 文件

---

**祝你開發順利！** 🚀
