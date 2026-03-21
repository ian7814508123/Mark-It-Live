# Electron 桌面應用開發指南

## 📋 當前設置說明

你現在處於 `electron-desktop` 分支，此分支獨立於 main 分支開發 Electron 桌面應用版本。

### 分支結構：
```
main (原始網頁版本 - 不受影響)
└─ electron-desktop (Electron 桌面版本 - 此處開發)
```

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 開發模式

#### 選項 A：同時運行 Vite 開發服務器和 Electron（推薦）
```bash
npm run dev-electron
```

這會在終端打開兩個進程：
- Vite 開發服務器（http://localhost:5173）
- Electron 應用窗口

#### 選項 B：手動分步運行
```bash
# 終端 1 - 開始 Vite 開發服務器
npm run dev

# 終端 2 - 開始 Electron
npm run electron-dev
```

### 3. 生成可執行文件

#### 構建並打包為 Windows 安裝程序
```bash
npm run electron-build
```

這會生成：
- **NSIS 安裝程序**（帶安裝向導的 .exe）
- **便攜版**（無需安裝的 .exe）

文件位置：`dist/` 目錄

#### 針對特定平台構建
```bash
# Windows
npm run electron-build -- --win

# macOS
npm run electron-build -- --mac

# Linux
npm run electron-build -- --linux
```

## 📁 項目結構

```
project-root/
├── src/                          # React 源代碼（共享）
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── App.tsx
│   └── index.tsx
├── electron/                     # Electron 特定代碼
│   ├── main.ts                  # Electron 主進程
│   ├── preload.ts               # Preload 腳本
│   └── tsconfig.json
├── public/                       # 靜態資源
├── package.json                  # 包含 Electron 配置
├── vite.config.ts               # Vite 配置（已更新）
├── tsconfig.json
└── dist/                         # 構建輸出
```

## 🔧 配置詳情

### package.json 新增內容

#### Scripts：
- `electron-dev` - 直接運行 Electron
- `electron-build` - 構建 Vite 並打包 Electron
- `electron-dist` - 運行 electron-builder
- `dev-electron` - 同時運行開發服務器和 Electron

#### DevDependencies：
- `electron` - Electron 框架
- `electron-builder` - 打包工具
- `electron-is-dev` - 環境檢測
- `concurrently` - 並行運行命令
- `wait-on` - 等待服務器啟動

#### Build 配置：
- Windows NSIS 安裝程序（帶卸載選項）
- 便攜 .exe 版本
- macOS .dmg 和 .zip
- Linux AppImage 和 .deb

### Vite 配置更新

已更新 `vite.config.ts`：
- 使用 `VITE_ELECTRON=true` 環境變量時，base 路徑變為 `./`（適合本地文件加載）
- 保持默認 `/` 用於網頁版本

## 💡 開發提示

### 熱重載
當你修改代碼時：
- React 組件自動熱重載（由 Vite 提供）
- Electron 主進程修改需要手動重啟應用

### 訪問 Electron 功能

在你的 React 組件中使用 IPC 通信：

```typescript
// 調用主進程方法
const version = await window.electron.getAppVersion();
```

### 調試

Electron 開發模式自動打開開發者工具 (F12)

## 📦 發佈/分享打包文件

構建完成後，在 `dist/` 目錄中找到：
- `Markdown Live Previewer Setup 0.0.0.exe` - 安裝程序版
- `Markdown Live Previewer 0.0.0.exe` - 便攜版

可以直接分享給用戶使用。

## ⚠️ 重要提醒

1. **Main 分支未受影響** ✅
   - main 分支仍然是原始的網頁版本
   - 可以隨時切換回 main

2. **代碼共享**
   - `src/` 目錄中的代碼在兩個版本中都可用
   - Electron 版本額外有 `electron/` 特定代碼

3. **合併策略**
   - 如果 main 有更新，可以 rebase 此分支
   - 衝突極少，因為只添加了新文件

## 🔄 切換分支

```bash
# 回到 main（網頁版本）
git checkout main

# 回到 Electron 開發
git checkout electron-desktop
```

## 🐛 常見問題

### Q: 啟動時出現"找不到 Electron"
A: 運行 `npm install` 確保所有依賴都已安裝

### Q: Vite 和 Electron 同時啟動失敗
A: 確保端口 5173 未被占用

### Q: 無法生成打包文件
A: 在 Windows 上執行，需要 Windows 環境進行 NSIS 打包

## 📚 相關資源

- [Electron 官方文檔](https://www.electronjs.org/docs)
- [Electron Builder 文檔](https://www.electron.build/)
- [Vite 官方文檔](https://vitejs.dev/)

## 🎯 下一步

1. ✅ 已完成基礎設置
2. 👉 運行 `npm install` 安裝依賴
3. 運行 `npm run dev-electron` 測試開發環境
4. 根據需要修改 Electron 配置（app 名稱、圖標等）
5. 運行 `npm run electron-build` 生成可執行文件

祝開發順利！🚀
