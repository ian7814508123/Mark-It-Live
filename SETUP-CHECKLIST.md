# Electron 桌面應用 - 設置完成檢查表

## ✅ 已完成的工作

- [x] **Git 分支分離**
  - ✅ 創建了 `electron-desktop` 分支
  - ✅ Main 分支保持原汁原味，未受任何影響
  - ✅ 提交到分支歷史記錄

- [x] **Electron 項目結構**
  - ✅ 創建 `/electron` 目錄
  - ✅ 添加 `electron/main.ts` - 主進程
  - ✅ 添加 `electron/preload.ts` - IPC 橋接
  - ✅ 添加 `electron/tsconfig.json` - TypeScript 配置

- [x] **Package.json 配置**
  - ✅ 添加 electron-dev 腳本
  - ✅ 添加 electron-build 腳本
  - ✅ 添加 dev-electron（並行運行）腳本
  - ✅ 添加 Electron 依賴和工具依賴
  - ✅ 配置 electron-builder 打包規則

- [x] **Vite 配置更新**
  - ✅ 支持 Electron 的動態 base 路徑
  - ✅ 保持原有的網頁版本配置

- [x] **文件和輔助工具**
  - ✅ ELECTRON-SETUP.md 完整文檔
  - ✅ start-electron-dev.bat 快速啟動腳本
  - ✅ build-installer.bat 打包腳本
  - ✅ .gitignore-electron 忽略配置

## 📋 下一步操作

### 第 1 步：安裝依賴
```bash
npm install
```
**預計時間**: 3-5 分鐘（首次）

### 第 2 步：測試開發環境
```bash
npm run dev-electron
```
或雙擊 `start-electron-dev.bat`

**預期結果**:
- 終端顯示 Vite 開發服務器啟動消息
- 幾秒後 Electron 應用窗口打開
- 展示 Markdown 編輯器界面

### 第 3 步：測試打包
```bash
npm run electron-build
```
或雙擊 `build-installer.bat`

**預期結果**:
- `dist/` 目錄中生成可執行文件
  - `Markdown Live Previewer Setup 0.0.0.exe` - 安裝程序
  - `Markdown Live Previewer 0.0.0.exe` - 便攜版

## 📊 分支管理

### 查看分支狀態
```bash
# 查看當前分支
git branch

# 查看所有分支（包括遠程）
git branch -a

# 查看分支歷史
git log --oneline -5
```

### 分支切換
```bash
# 切換到網頁版本
git checkout main

# 切換到桌面版本
git checkout electron-desktop
```

## 🔍 驗證清單

- [x] `electron-desktop` 分支已創建
- [x] 分支已包含所有 Electron 文件
- [x] `main` 分支完全未受影響
- [x] `package.json` 已更新（僅在 electron-desktop）
- [x] Vite 配置已更新（向後兼容）
- [x] 快速啟動腳本已準備

## 💾 重要文件位置

```
electron-desktop 分支獨有文件：
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── tsconfig.json
├── ELECTRON-SETUP.md          (詳細文檔)
├── start-electron-dev.bat     (開發啟動器)
├── build-installer.bat        (打包啟動器)
├── package.json               (已更新)
└── vite.config.ts             (已更新)
```

## ⚡ 快速命令參考

| 命令 | 功能 |
|------|------|
| `npm install` | 安裝所有依賴 |
| `npm run dev-electron` | 開發模式（推薦） |
| `npm run dev` | 僅開發 Vite 服務器 |
| `npm run electron-dev` | 僅運行 Electron |
| `npm run build` | 構建 Vite 應用 |
| `npm run electron-build` | 完整打包流程 |
| `npm run electron-dist` | 僅運行 electron-builder |

## 🎯 關鍵要點

1. ✨ **完全分離** - 此分支上的所有更改都不會影響 main
2. 🔄 **代碼共享** - `src/` 目錄中的代碼在兩個版本中可用
3. 🛠️ **開發便利** - 一鍵啟動，一鍵打包
4. 📦 **跨平台** - 配置支持 Windows、macOS、Linux

## 🚀 開始開發

準備好開始了嗎？執行：
```bash
npm install && npm run dev-electron
```

祝你開發順利！🎉
