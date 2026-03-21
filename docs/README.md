# 📚 Electron 文檔中心

歡迎來到 Markdown Live Previewer Electron 桌面版的文檔中心。

## 🎯 快速導航

### 🚀 我想快速開始
**所需時間：2-5 分鐘**

1. 先讀 [快速參考卡](./electron-quick-reference.md)
2. 運行 `npm run dev-electron`
3. 開始開發！

### 📖 我想了解完整設置
**所需時間：5-10 分鐘**

1. 先讀 [完整設置指南](./electron-complete-setup.md)
2. 了解分支結構
3. 了解如何構建

### 🛠️ 我要進行開發
**所需時間：15-30 分鐘**

1. 讀 [開發指南](./electron-development-guide.md)
2. 配置 [圖示](./electron-icon-setup.md)（可選）
3. 開始開發並構建

### 🏗️ 我想深入技術細節
**所需時間：30+ 分鐘**

1. 讀 [架構設計](./electron-architecture.md)
2. 了解系統架構
3. 理解代碼共享模式

### ✅ 我遇到了問題
**所需時間：5-15 分鐘**

1. 查看 [檢查清單](./electron-setup-checklist.md)
2. 找到相應的故障排除部分
3. 按照步驟解決

---

## 📚 完整文檔列表

| 文檔 | 描述 | 適合人群 | 時長 |
|------|------|---------|------|
| [快速參考卡](./electron-quick-reference.md) | ⚡ 常用命令速查 | 所有人 | 2 分鐘 |
| [完整設置指南](./electron-complete-setup.md) | 📌 設置概覽 | 新手 | 5 分鐘 |
| [開發指南](./electron-development-guide.md) | 📚 詳細開發說明 | 開發者 | 20 分鐘 |
| [架構設計](./electron-architecture.md) | 🏗️ 技術架構詳解 | 高級開發者 | 30 分鐘 |
| [圖示設定](./electron-icon-setup.md) | 🎨 應用圖示配置 | 需要自定義圖示 | 10 分鐘 |
| [檢查清單](./electron-setup-checklist.md) | ✅ 逐步檢查驗證 | 故障排除 | 15 分鐘 |

---

## 🚀 核心命令

```bash
# 開發
npm run dev-electron           # 推薦：同時運行 Vite + Electron
npm run dev                    # 僅開發網頁版
npm run electron-dev           # 僅運行 Electron

# 構建
npm run electron-build         # 完整構建（推薦）
npm run build                  # 僅 Vite 構建
npm run electron-dist          # 僅 electron-builder 打包

# 其他
npm install                    # 安裝依賴
git checkout electron-desktop  # 切換到桌面版分支
```

---

## 📁 文檔結構

```
docs/
├── ELECTRON-INDEX.md                    📋 主索引
├── electron-quick-reference.md          ⚡ 2 分鐘入門
├── electron-complete-setup.md           📌 5 分鐘了解
├── electron-development-guide.md        📚 深入開發
├── electron-architecture.md             🏗️ 技術架構
├── electron-icon-setup.md               🎨 圖示設定
└── electron-setup-checklist.md          ✅ 檢查清單

根目錄/
├── start-electron-dev.bat               🚀 開發啟動（Windows）
├── build-installer.bat                  📦 打包構建（Windows）
├── package.json                         ⚙️ 配置文件
├── vite.config.ts                       🔧 Vite 配置
└── electron/                            💻 Electron 源代碼
    ├── main.ts                              主進程
    └── preload.ts                           IPC 橋接
```

---

## 💡 學習路徑建議

### 路徑 1：快速開始開發
```
快速參考卡 (2 分鐘)
    ↓
npm run dev-electron
    ↓
編輯 src/ 代碼
    ↓
熱更新查看效果
    ↓
npm run electron-build
    ↓
完成！
```

### 路徑 2：完整理解
```
完整設置指南 (5 分鐘)
    ↓
開發指南 (20 分鐘)
    ↓
架構設計 (30 分鐘)
    ↓
圖示設定 (10 分鐘)
    ↓
開始開發
```

### 路徑 3：故障排除
```
檢查清單 (15 分鐘)
    ↓
找到相應的問題
    ↓
按照步驟解決
    ↓
查看相應的詳細文檔
    ↓
恢復正常
```

---

## 🔑 三大核心概念

### 1. 分支隔離
```
main ─────────────────────→ GitHub
(網頁版，完全不受影響)

electron-desktop ─────────→ 本地開發
(桌面版，完全獨立)
```

### 2. 代碼共享
```
src/ (React 組件、邏輯) 
  ↓
兩個版本都能用
  ├─ npm run dev (網頁)
  └─ npm run dev-electron (桌面)
```

### 3. 構建工具鏈
```
編輯代碼 → Vite 打包 → electron-builder → .exe 文件
```

---

## ✨ 核心特性

✅ **代碼共享** - 編寫一次，兩個版本都能用  
✅ **分支隔離** - 完全獨立開發，互不影響  
✅ **快速切換** - 隨時在網頁版和桌面版間切換  
✅ **簡單構建** - 一條命令生成可執行文件  
✅ **熱更新** - 開發時實時看到變化  

---

## 📦 常見任務

### 我要開始開發
```bash
npm run dev-electron
```
👉 查看 [快速參考卡](./electron-quick-reference.md)

### 我要構建發布
```bash
npm run electron-build
```
👉 查看 [完整設置指南](./electron-complete-setup.md)

### 我要配置圖示
```bash
# 轉換 SVG 為 ICO
# 放在 public/favicon.ico
```
👉 查看 [圖示設定](./electron-icon-setup.md)

### 我要切換到網頁版
```bash
git checkout main
npm run dev
```
👉 查看 [快速參考卡](./electron-quick-reference.md)

### 我遇到了錯誤
```bash
# 查看錯誤信息
# 在檢查清單中搜索相同錯誤
```
👉 查看 [檢查清單](./electron-setup-checklist.md)

---

## 🆘 故障排除快速指南

| 問題 | 文檔 |
|------|------|
| 不知道用什麼命令 | [快速參考卡](./electron-quick-reference.md) |
| 不理解如何開始 | [完整設置指南](./electron-complete-setup.md) |
| 遇到構建錯誤 | [檢查清單](./electron-setup-checklist.md) |
| 需要詳細說明 | [開發指南](./electron-development-guide.md) |
| 想了解技術細節 | [架構設計](./electron-architecture.md) |
| 圖示問題 | [圖示設定](./electron-icon-setup.md) |

---

## 💻 系統要求

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0
- **Git** 已安裝
- **Windows/macOS/Linux** 任一系統
- **磁盤空間** 至少 2GB（含 node_modules）

---

## 🔗 外部資源

- [Electron 官方文檔](https://www.electronjs.org/docs)
- [electron-builder 文檔](https://www.electron.build/)
- [Vite 文檔](https://vitejs.dev/)
- [React 文檔](https://react.dev/)

---

## 📝 最後更新

**日期：** 2026 年 3 月 22 日  
**Electron 版本：** 31.7.7  
**electron-builder 版本：** 24.13.3  
**狀態：** ✅ 完整可用

---

## 🎯 下一步

👉 **新手？** 先讀 [快速參考卡](./electron-quick-reference.md)  
👉 **準備開發？** 先讀 [完整設置指南](./electron-complete-setup.md)  
👉 **遇到問題？** 先查 [檢查清單](./electron-setup-checklist.md)  

祝你開發愉快！🚀
