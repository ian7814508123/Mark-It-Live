## 🎉 Electron 桌面版設置完成！

### 📊 設置總結

你的 Markdown Live Previewer 現在已配置好 Electron 桌面應用。以下是完整的設置摘要：

---

## 🌿 Git 分支結構

```
origin/main (遠程主分支 - 網頁版)
│
├── main (本地主分支 - ✅ 完全未受影響)
│
└── electron-desktop (本地 Electron 分支 - ✨ 新建立)
    └── 所有桌面應用代碼都在這裡
```

### 重要特點：
- ✅ **main** 分支保持原始狀態，可隨時上傳到 GitHub
- ✅ **electron-desktop** 分支獨立開發，不影響 main
- ✅ 可隨時在兩個分支之間切換

---

## 📁 新增文件

在 `electron-desktop` 分支中添加了：

### 核心 Electron 文件
```
electron/
├── main.ts          - Electron 主進程（應用窗口、菜單等）
├── preload.ts       - 安全的 IPC 通信橋接
└── tsconfig.json    - TypeScript 配置
```

### 配置文件（已更新）
```
package.json         - 添加了 Electron 依賴和 scripts
vite.config.ts       - 更新以支持 Electron（向後兼容）
```

### 文檔和輔助工具
```
ELECTRON-SETUP.md           - 詳細的開發指南
SETUP-CHECKLIST.md          - 檢查表和快速參考
start-electron-dev.bat      - 一鍵開發啟動（Windows）
build-installer.bat         - 一鍵打包構建（Windows）
.gitignore-electron         - 忽略 Electron 構建文件
```

---

## 🚀 立即開始使用

### 方案 A：使用啟動腳本（推薦 for Windows）

1. **開發模式**
   - 雙擊 `start-electron-dev.bat`
   - 或在終端運行：`npm run dev-electron`

2. **打包構建**
   - 雙擊 `build-installer.bat`
   - 或在終端運行：`npm run electron-build`

### 方案 B：手動命令行方式

```bash
# 首次設置 - 安裝依賴
npm install

# 開發模式 - 同時運行 Vite 和 Electron
npm run dev-electron

# 構建打包 - 生成 .exe 執行檔
npm run electron-build
```

---

## 📦 輸出文件

構建完成後，在 `dist/` 目錄中找到：

| 文件名 | 用途 | 大小 |
|--------|------|------|
| `Markdown Live Previewer Setup 0.0.0.exe` | 安裝程序（含卸載） | ~150-200 MB |
| `Markdown Live Previewer 0.0.0.exe` | 便攜版（無需安裝） | ~150-200 MB |

**可直接分享給用戶使用！**

---

## 🔄 分支管理命令

```bash
# 查看當前分支
git branch

# 切換到網頁版本（main）
git checkout main

# 切換到桌面版本（electron-desktop）
git checkout electron-desktop

# 查看分支提交歷史
git log --oneline -5 electron-desktop
git log --oneline -5 main
```

---

## 💡 開發工作流程

### 典型日常工作流：

```
1. 日常開發
   └─ git checkout electron-desktop
   └─ npm run dev-electron
   └─ 編輯代碼（自動熱更新）

2. 需要測試網頁版時
   └─ git checkout main
   └─ npm run dev

3. 完成開發，準備發佈時
   └─ git checkout electron-desktop
   └─ npm run electron-build
   └─ 在 dist/ 中找到 .exe 文件
```

---

## 🔗 代碼共享

### React 組件 - 兩個版本共享
```
src/
├── components/      ← 兩個版本都使用
├── hooks/          ← 兩個版本都使用
├── services/       ← 兩個版本都使用
└── App.tsx         ← 兩個版本都使用
```

### Electron 特定代碼 - 僅在 electron-desktop
```
electron/
├── main.ts         ← 僅在 electron-desktop
└── preload.ts      ← 僅在 electron-desktop
```

這樣可以：
- ✅ 修改 `src/` 中的代碼，兩個版本都更新
- ✅ Electron 功能專門在 `electron/` 中開發
- ✅ 最大化代碼復用

---

## ❓ 常見問題

### Q: 我的更改會影響 main 分支嗎？
**A:** 不會！你現在在 `electron-desktop` 分支上。任何更改都只影響此分支。

### Q: 如何將更改同步到 GitHub？
**A:** 
```bash
# 僅推送 electron-desktop 分支
git push origin electron-desktop

# main 分支保持不動（除非你明確 push）
```

### Q: 如果 main 分支有更新，如何同步？
**A:**
```bash
# 拉取最新的 main
git fetch origin

# 將 main 的更改 rebase 到 electron-desktop
git rebase origin/main

# 解決任何衝突後繼續
```

### Q: 開發過程中卡住了怎麼辦？
**A:** 查看 `ELECTRON-SETUP.md` 詳細文檔，或回到 main 分支重新開始。

---

## 📊 技術棧

| 層 | 技術 | 說明 |
|---|------|------|
| 前端框架 | React 19 + TypeScript | 與網頁版相同 |
| 構建工具 | Vite | 快速開發和構建 |
| 桌面框架 | Electron 32 | 跨平台應用 |
| 打包工具 | electron-builder | 生成安裝程序 |
| 編輯器 | CodeMirror 6 | Markdown 和 Mermaid |

---

## ✨ 下一步建議

1. **立即測試**
   ```bash
   npm install
   npm run dev-electron
   ```

2. **自定義配置**
   - 修改 `electron/main.ts` 中的應用名稱、圖標等
   - 更新 `package.json` 中的 `build` 配置

3. **開發新功能**
   - 在 `src/` 中編寫 React 組件
   - 在 `electron/` 中添加特定于桌面的功能
   - 使用 IPC 通信（見 `electron/preload.ts`）

4. **準備發佈**
   ```bash
   npm run electron-build
   ```
   - 生成 .exe 文件
   - 分享給用戶

---

## 📚 相關資源

- [Electron 官方文檔](https://www.electronjs.org/docs) - Electron 框架
- [electron-builder 文檔](https://www.electron.build/) - 打包工具
- [Vite 官方文檔](https://vitejs.dev/) - 構建工具
- [ELECTRON-SETUP.md](./ELECTRON-SETUP.md) - 詳細指南
- [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md) - 快速檢查表

---

## 🎯 核心優勢

✅ **完全分離** - 網頁版和桌面版獨立開發  
✅ **代碼復用** - 共享 React 組件和邏輯  
✅ **跨平台** - 支持 Windows、Mac、Linux  
✅ **簡單打包** - 一個命令生成安裝程序  
✅ **易于維護** - 清晰的文件結構和配置  

---

**準備好開始了嗎？** 🚀

```bash
npm install && npm run dev-electron
```

祝你開發順利！💪
