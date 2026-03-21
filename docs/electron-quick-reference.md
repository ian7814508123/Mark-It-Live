# ⚡ 快速參考卡 - Electron 開發

*2 分鐘快速上手*

---

## 🎯 核心命令

### 開發流程
```bash
# 首次設置
npm install

# 開發模式（推薦 - 同時運行 Vite + Electron）
npm run dev-electron

# 或按需分別運行
npm run dev              # 終端 1：Vite 開發伺服器
npm run electron-dev     # 終端 2：Electron 應用
```

### 構建打包
```bash
# 完整構建 - 包括 Vite 打包 + electron-builder 打包
npm run electron-build

# 或分步運行
npm run build            # 步驟 1：Vite 前端構建
npm run electron-dist    # 步驟 2：electron-builder 打包
```

---

## 🌿 分支命令

```bash
# 查看當前分支
git branch

# 切換到網頁版本
git checkout main

# 切換到桌面版本
git checkout electron-desktop

# 🔄 同步最新網頁版更新 (同步 main 功能)
git fetch origin
git rebase main

# 查看兩個分支的差異
git diff main electron-desktop --stat
```

---

## 📁 重要位置

| 位置 | 用途 | 說明 |
|------|------|------|
| `src/` | React 源代碼 | 網頁版和桌面版共享 |
| `electron/main.ts` | Electron 主進程 | 窗口、菜單、系統集成 |
| `electron/preload.ts` | IPC 通信 | 安全的進程間通信 |
| `dist/` | 構建輸出 | .exe 文件生成位置 |
| `package.json` | 配置文件 | Electron 依賴和 scripts |

---

## 📊 開發工作流

```
1. git checkout electron-desktop    ← 確保在桌面分支
2. npm run dev-electron             ← 啟動開發環境
3. 編輯代碼 (src/ 或 electron/)     ← 代碼自動熱更新
4. 在 Electron 窗口中測試          ← F12 打開開發者工具
5. npm run electron-build           ← 構建 .exe 文件
6. 在 dist/ 中找到可執行文件       ← 可分享給用戶
```

---

## 🚨 常見問題速查

| 問題 | 命令/解決方案 |
|------|---------------|
| Vite 說端口被占用 | 改用 `npm run electron-dev` 先單獨運行 Electron，檢查端口 5173 |
| 依賴缺失報錯 | `npm install` |
| 不確定當前分支 | `git branch` |
| 要回到網頁版 | `git checkout main` |
| 分支合併後沒代碼 | 再執行 `git checkout electron-desktop` |
| 打包失敗 | 檢查 `public/favicon.ico` 是否存在 |

---

## 📦 Windows 批次檔

對於 Windows 用戶，可雙擊以下檔案：

```
start-electron-dev.bat     ← 一鍵開發啟動
build-installer.bat        ← 一鍵打包構建
```

---

## 🎯 三個關鍵概念

### ① 分支隔離
- `main` = 網頁版本（原始、不受影響）
- `electron-desktop` = 桌面版本（新增、獨立開發）

### ② 代碼共享
- `src/` 中的組件和邏輯兩個版本都能用
- `electron/` 中的代碼只有桌面版用

### ③ 構建工具鏈
```
編輯代碼 → Vite 打包 → electron-builder 打包 → .exe 文件
```

---

## 🔑 三個關鍵文檔

| 文檔 | 何時閱讀 |
|-----|---------|
| [ELECTRON-INDEX.md](./ELECTRON-INDEX.md) | 📌 文檔總覽 |
| [electron-development-guide.md](./electron-development-guide.md) | 📚 需要詳細指南 |
| [electron-setup-checklist.md](./electron-setup-checklist.md) | ✅ 需要故障排除 |

---

## ✨ 記住這三個

✅ `npm run dev-electron` - 開發時用這個  
✅ `npm run electron-build` - 打包時用這個  
✅ `git branch` - 分支迷茫時用這個  

---

## 📲 輸出文件位置

```
dist/
├── Markdown Live Previewer Setup 0.0.0.exe    (安裝版)
└── Markdown Live Previewer 0.0.0.exe          (便攜版)
```

兩個都可以直接分享給用戶！

---

**需要更詳細的信息？** 查看 [文檔索引](./ELECTRON-INDEX.md)

**需要故障排除？** 查看 [檢查清單](./electron-setup-checklist.md)
