# 📚 Electron 桌面版開發文檔索引

## 歡迎使用 Markdown Live Previewer Electron 版

本文件夾包含完整的 Electron 桌面應用開發指南和工具。

---

## 📖 文檔導航

### 🎯 快速開始（新手必讀）
1. **[快速參考卡](./electron-quick-reference.md)** - ⚡ 2 分鐘快速上手
   - 常用命令速查表
   - 分支管理命令
   - 文件位置查詢

2. **[完整設置指南](./electron-complete-setup.md)** - 📌 5 分鐘了解全貌
   - 分支結構說明
   - 新增文件清單
   - 立即開始的步驟

### 📚 詳細開發指南
3. **[Electron 開發指南](./electron-development-guide.md)** - 📚 深入開發細節
   - 詳細的開發步驟
   - 項目結構說明
   - 配置詳情解釋
   - 平台特定構建

4. **[架構與設計](./electron-architecture.md)** - 🏗️ 技術架構文檔
   - 系統架構圖
   - 代碼共享結構
   - 工作流程圖
   - 技術決策說明

### 🛠️ 配置與工具
5. **[圖示設定指南](./electron-icon-setup.md)** - 🎨 應用圖示配置
   - SVG 轉 ICO 的三種方法
   - 檔案放置說明
   - 打包驗證步驟

6. **[快速檢查表](./electron-setup-checklist.md)** - ✅ 逐步檢查清單
   - 環境檢查
   - 依賴驗證
   - 功能測試
   - 打包驗證

---

## 🚀 快速命令

### 開發
```bash
npm install              # 首次安裝依賴
npm run dev-electron    # 開發模式（推薦）
npm run dev             # 僅開發網頁版
npm run electron-dev    # 僅運行 Electron
```

### 構建
```bash
npm run electron-build  # 完整構建打包
npm run build           # 僅 Vite 構建
npm run electron-dist   # 僅 electron-builder 打包
```

### Git 分支
```bash
git checkout main              # 切換到網頁版
git checkout electron-desktop  # 切換到桌面版
git fetch origin && git rebase main  # 🔄 同步網頁版新功能
git branch                     # 查看所有分支
```

---

## 📁 文件結構

```
docs/
├── ELECTRON-INDEX.md                    ← 你在這裡
├── electron-quick-reference.md          ⚡ 2 分鐘入門
├── electron-complete-setup.md           📌 5 分鐘了解
├── electron-development-guide.md        📚 深入開發
├── electron-architecture.md             🏗️ 技術架構
├── electron-icon-setup.md               🎨 圖示設定
├── electron-setup-checklist.md          ✅ 檢查清單
└── ../
    ├── start-electron-dev.bat           🚀 開發啟動（Windows）
    └── build-installer.bat              📦 打包構建（Windows）
```

---

## 🎯 按場景選擇文檔

### 我是新手，從未使用過此項目
👉 先讀 [快速參考卡](./electron-quick-reference.md)

### 我想快速理解整體架構
👉 先讀 [完整設置指南](./electron-complete-setup.md)

### 我要開始開發
👉 先讀 [Electron 開發指南](./electron-development-guide.md)

### 我要構建可執行文件
👉 先讀 [快速檢查表](./electron-setup-checklist.md)

### 我需要配置應用圖示
👉 先讀 [圖示設定指南](./electron-icon-setup.md)

### 我想了解技術細節
👉 先讀 [架構與設計](./electron-architecture.md)

---

## 🌿 分支說明

### `main` 分支（網頁版本）
- 原始版本，完全未受影響
- 用於 Web 應用開發
- 可隨時推送到 GitHub
- 不包含 Electron 相關代碼

### `electron-desktop` 分支（桌面版本）
- 新增 Electron 框架
- 共享 `src/` 代碼
- 獨立開發，不影響 main
- 最終輸出 Windows .exe 文件

---

## ✨ 核心特性

✅ **代碼共享** - 網頁版和桌面版共享 React 組件邏輯  
✅ **分支獨立** - 完全隔離，互不影響  
✅ **開發便捷** - 一條命令啟動完整開發環境  
✅ **打包簡單** - 一條命令生成可執行文件  
✅ **跨平台** - 支持 Windows、macOS、Linux  

---

## 📦 輸出產物

構建完成後會在 `dist/` 目錄生成：

| 文件 | 用途 | 大小 |
|------|------|------|
| `Markdown Live Previewer Setup 0.0.0.exe` | 安裝程序 | ~150-200 MB |
| `Markdown Live Previewer 0.0.0.exe` | 便攜版 | ~150-200 MB |

**可直接分享給用戶使用！**

---

## 🔗 相關資源

- [Electron 官方文檔](https://www.electronjs.org/docs)
- [electron-builder 文檔](https://www.electron.build/)
- [Vite 文檔](https://vitejs.dev/)

---

## 💡 建議

1. **第一次使用**：建議按順序閱讀文檔
2. **日常開發**：使用快速參考卡查詢命令
3. **遇到問題**：查看快速檢查表的故障排除部分
4. **深入學習**：閱讀架構文檔了解設計理念

---

## 🆘 需要幫助？

- 🤔 命令不對？→ 查看 [快速參考卡](./electron-quick-reference.md)
- ❓ 不知道怎麼開始？→ 查看 [完整設置指南](./electron-complete-setup.md)
- ⚙️ 配置有問題？→ 查看 [檢查清單](./electron-setup-checklist.md)
- 🎨 圖示問題？→ 查看 [圖示設定指南](./electron-icon-setup.md)

---

**最後更新：2026 年 3 月 22 日**  
**版本：Electron 31.7.7 + electron-builder 24.13.3**

祝你開發愉快！🚀
