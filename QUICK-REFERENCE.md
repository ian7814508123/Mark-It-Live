## ⚡ 快速參考卡 - Electron 開發

### 🎯 快速命令

```bash
# 安裝依賴（首次）
npm install

# 🚀 開發模式（推薦）
npm run dev-electron

# 📦 構建打包
npm run electron-build

# 🌐 僅開發網頁版
npm run dev

# 🖥️ 僅運行 Electron
npm run electron-dev
```

---

### 🌿 Git 分支命令

```bash
# 查看當前分支
git branch

# 切換到網頁版
git checkout main

# 切換到桌面版
git checkout electron-desktop

# 查看分支差異
git diff main electron-desktop --stat
```

---

### 📁 文件位置

| 文件/文件夾 | 用途 | 位置 |
|-----------|------|------|
| React 代碼 | 共享組件和邏輯 | `src/` |
| Electron 代碼 | 桌面應用特定 | `electron/` |
| 構建輸出 | .exe 文件 | `dist/` |
| 文檔 | 開發指南 | 根目錄 |

---

### 🔑 三個關鍵文檔

| 文檔 | 適用場景 |
|-----|---------|
| `ELECTRON-COMPLETE.md` | 📌 了解完整設置 |
| `ELECTRON-SETUP.md` | 📚 詳細開發指南 |
| `SETUP-CHECKLIST.md` | ✅ 快速檢查表 |

---

### ⚙️ 配置文件位置

```
package.json
  ├─ "scripts" 
  │    └─ Electron 相關命令
  ├─ "devDependencies"
  │    └─ Electron 工具
  └─ "build"
       └─ electron-builder 配置

vite.config.ts
  └─ 已支持 Electron（向後兼容）

electron/main.ts
  └─ Electron 主進程（應用窗口、菜單等）

electron/preload.ts
  └─ IPC 通信橋接
```

---

### 📊 分支結構快速圖

```
main (GitHub)
  ↓ (git fetch)
origin/main (遠程)
  ↓ (git pull)
main (本地/網頁版)
  
electron-desktop (本地/桌面版)
  ├─ 完全獨立開發
  ├─ 共享 src/ 代碼
  └─ 不影響 main
```

---

### 🚨 常見問題速查

| 問題 | 解決方案 |
|------|---------|
| 啟動卡住 | 確保端口 5173 未被占用 |
| 依賴缺失 | 運行 `npm install` |
| 分支混亂 | 運行 `git branch` 確認當前位置 |
| 需要回滾 | `git checkout main` 回到網頁版 |

---

### ✨ 開發流程速查

```
1️⃣  準備
   git checkout electron-desktop
   npm install

2️⃣  開發
   npm run dev-electron
   ✏️ 編輯代碼...

3️⃣  測試
   應用自動熱更新
   F12 打開開發者工具

4️⃣  構建
   npm run electron-build
   📦 .exe 文件生成在 dist/

5️⃣  分享
   找到 dist/ 中的 .exe
   分享給用戶
```

---

### 📱 支持的平台

- ✅ **Windows** - .exe 安裝程序和便攜版
- ✅ **macOS** - .dmg 和 .zip
- ✅ **Linux** - AppImage 和 .deb

當前主要配置: Windows

---

### 🔗 相關鏈接

- 詳細文檔: [ELECTRON-SETUP.md](./ELECTRON-SETUP.md)
- 完整指南: [ELECTRON-COMPLETE.md](./ELECTRON-COMPLETE.md)
- 檢查表: [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md)

---

### 💾 重要提醒

✅ **Main 分支保護** - 永遠不會被 electron-desktop 影響  
✅ **獨立開發** - 桌面版和網頁版可同時開發  
✅ **一鍵打包** - `npm run electron-build` 生成可執行文件  

---

**需要幫助？** 查看相應的文檔或重新檢查本檢查表。🎯
