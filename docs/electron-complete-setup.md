# 📌 Electron 完整設置指南

*5 分鐘了解全貌*

---

## 🎉 項目狀態

你的 Markdown Live Previewer 已成功配置 Electron 桌面應用！以下是完整的設置摘要。

---

## 🌿 Git 分支結構

```
origin/main (遠程主分支 - GitHub)
    ↓
main (本地主分支 - 網頁版)
    ├─ 100% 原始狀態 ✅
    ├─ 無任何更改
    └─ 隨時可推送到 GitHub

electron-desktop (本地桌面分支)
    ├─ 新增 Electron 代碼
    ├─ 共享 src/ 組件
    └─ 完全獨立開發
```

### 重要特性
- ✅ **main 分支保護** - 完全不受影響
- ✅ **獨立開發** - 可同時開發兩個版本
- ✅ **隨時切換** - `git checkout main` 或 `git checkout electron-desktop`

---

## 📁 新增文件清單

### 核心 Electron 文件
```
electron/
├── main.ts              - Electron 主進程（窗口、菜單、系統集成）
├── preload.ts           - 預加載腳本（安全的 IPC 通信）
├── preload.js           - 編譯後的 preload 腳本
├── main.js              - 編譯後的主進程代碼
└── tsconfig.json        - TypeScript 編譯配置
```

### 配置文件（已更新）
```
package.json
├─ "main": "electron/main.js"
├─ "scripts": Electron 相關命令
├─ "devDependencies": electron, electron-builder 等
└─ "build": electron-builder 配置

vite.config.ts
└─ 已更新支持 Electron（向後兼容網頁版）
```

### 開發工具
```
start-electron-dev.bat          - 一鍵開發啟動（Windows）
build-installer.bat             - 一鍵打包構建（Windows）
docs/
├── ELECTRON-INDEX.md           - 文檔索引
├── electron-quick-reference.md - 快速參考卡
├── electron-development-guide.md - 詳細開發指南
├── electron-architecture.md    - 技術架構
├── electron-icon-setup.md      - 圖示設定
└── electron-setup-checklist.md - 檢查清單
```

---

## 🚀 立即開始使用

### 方案 A：使用批次檔（推薦 Windows 用戶）

#### 開發模式
1. 雙擊 `start-electron-dev.bat`
2. 等待 Vite 和 Electron 啟動
3. Electron 窗口會自動打開
4. 編輯代碼後自動熱更新

#### 打包構建
1. 雙擊 `build-installer.bat`
2. 等待構建完成
3. 在 `dist/` 中找到 `.exe` 文件

### 方案 B：使用命令行

#### 開發模式
```bash
npm run dev-electron
```

#### 打包構建
```bash
npm run electron-build
```

### 方案 C：手動分步運行

#### 開發模式
```bash
# 終端 1
npm run dev

# 終端 2（5 秒後）
npm run electron-dev
```

#### 打包構建
```bash
# 步驟 1：Vite 打包
npm run build

# 步驟 2：electron-builder 打包
npm run electron-dist
```

---

## 📦 構建輸出

成功構建後，在 `dist/` 目錄中找到：

### Windows 安裝程序
```
Markdown Live Previewer Setup 0.0.0.exe
├─ 帶安裝向導
├─ 可選擇安裝位置
├─ 創建開始菜單捷徑
├─ 支持卸載
└─ 大小：~150-200 MB
```

### Windows 便攜版
```
Markdown Live Previewer 0.0.0.exe
├─ 無需安裝
├─ 直接運行
├─ 配置保存在本地
└─ 大小：~150-200 MB
```

**兩個都可以直接分享給用戶！**

---

## 🔄 日常開發流程

### 開始開發
```bash
# 1. 確保在桌面分支
git checkout electron-desktop

# 🔄 2. 同步最新網頁版更新 (Rebase)
git fetch origin
git rebase main

# 3. 安裝依賴（如有新的包）
npm install

# 4. 啟動開發環境
npm run dev-electron
```

### 開發中
```
編輯 src/ 中的 React 代碼
    ↓
保存文件
    ↓
Vite 熱更新
    ↓
Electron 窗口自動重新加載
    ↓
F12 打開開發者工具調試
```

### 構建發布
```bash
# 當準備發布時
npm run electron-build

# 等待完成
# 在 dist/ 中找到 .exe 文件
# 分享給用戶
```

### 切換到網頁版(main)
```bash
git checkout main
npm run dev
```

---

## ⚙️ 配置詳情

### Electron 依賴
- **electron@31.7.7** - Electron 框架
- **electron-builder@24.13.3** - 打包工具

### 支持的構建目標
- ✅ Windows NSIS (安裝程序)
- ✅ Windows Portable (便攜版)
- ⚪ macOS (已配置，需要 Apple 簽名)
- ⚪ Linux (已配置)

### 關鍵配置
```json
{
  "build": {
    "appId": "com.markdownlivepreviewer.app",
    "productName": "Markdown Live Previewer",
    "files": ["dist/**/*", "electron/**/*"],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "public/favicon.ico"
    }
  }
}
```

---

## 🔑 三個關鍵概念

### ① 共享代碼
```
src/ ← React 組件、邏輯、樣式
  ↓
兩個版本都能用
  ├─ npm run dev       (網頁版)
  └─ npm run dev-electron (桌面版)
```

### ② 獨立構建
```
main 分支          electron-desktop 分支
    ↓                      ↓
npm run dev         npm run dev-electron
    ↓                      ↓
網頁應用             桌面應用
http://localhost    Electron 窗口
```

### ③ 工具鏈
```
編輯代碼
  ↓ (npm run build)
Vite 構建 → dist/
  ↓ (npm run electron-dist)
electron-builder 打包
  ↓
.exe 文件 (可直接運行)
```

---

## 📊 分支比較

| 功能 | main 分支 | electron-desktop 分支 |
|------|---------|-------------------|
| React 組件 | ✅ | ✅ |
| Electron | ❌ | ✅ |
| npm run dev | ✅ | ✅ |
| npm run dev-electron | ❌ | ✅ |
| 網頁應用 | ✅ | ✅ |
| 桌面應用 | ❌ | ✅ |
| .exe 文件 | ❌ | ✅ |

---

## 🔗 分支管理命令

### 查看分支
```bash
git branch                    # 本地分支
git branch -r                # 遠程分支
git branch -a                # 所有分支
```

### 切換分支
```bash
git checkout main            # 切換到網頁版
git checkout electron-desktop # 切換到桌面版
```

### 查看差異
```bash
git diff main electron-desktop        # 查看所有差異
git diff main electron-desktop --stat # 查看文件統計
```

### 更新分支
```bash
git pull origin main         # 更新網頁版
git fetch origin             # 從遠程獲取最新信息
```

---

## ✨ 核心優勢

✅ **代碼共享** - 編寫一次，兩個版本都能用  
✅ **分支隔離** - 完全獨立，互不影響  
✅ **快速切換** - `git checkout` 即可切換版本  
✅ **簡單構建** - 一條命令生成可執行文件  
✅ **即時測試** - 熱更新支持，快速迭代  

---

## 🎯 下一步

1. **配置圖示**（可選）
   - 查看 [圖示設定指南](./electron-icon-setup.md)
   - 或跳過此步，使用默認圖示

2. **開始開發**
   - `npm run dev-electron` 啟動開發
   - 編輯 `src/` 中的代碼

3. **構建發布**
   - `npm run electron-build` 生成 .exe
   - 在 `dist/` 中找到文件
   - 分享給用戶

4. **參考文檔**
   - [快速參考卡](./electron-quick-reference.md) - 命令速查
   - [開發指南](./electron-development-guide.md) - 詳細說明
   - [檢查清單](./electron-setup-checklist.md) - 故障排除

---

## 💡 建議

- 📚 **新手** - 先讀本文件，再讀開發指南
- ⚡ **急著開發** - 直接用快速參考卡查命令
- 🐛 **遇到問題** - 查看檢查清單的故障排除部分
- 🏗️ **深入理解** - 閱讀架構文檔

---

**恭喜！你已準備好進行 Electron 開發了！** 🚀

---

**最後更新：2026 年 3 月 22 日**
