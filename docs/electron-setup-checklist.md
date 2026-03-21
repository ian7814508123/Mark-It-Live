# ✅ Electron 設置檢查清單

*逐步驗證和故障排除*

---

## 📋 環境檢查

### 1. Node.js 和 NPM

```bash
# 檢查 Node.js 版本
node --version
# 應該 >= v22.0.0

# 檢查 NPM 版本
npm --version
# 應該 >= v10.0.0
```

**✅ 期望結果：**
```
node: v22.14.0
npm: 10.9.0
```

**❌ 如果失敗：**
- 下載並安裝 [Node.js LTS](https://nodejs.org/)
- 重新打開終端

---

### 2. Git

```bash
# 檢查 Git 是否安裝
git --version

# 查看當前分支
git branch

# 應該看到類似輸出：
# electron-desktop
# * main
```

**✅ 期望結果：**
```
git version 2.x.x
* electron-desktop
  main
```

**❌ 如果沒有 electron-desktop 分支：**
```bash
# 創建分支
git checkout -b electron-desktop
```

---

### 3. 項目文件

```bash
# 檢查關鍵文件是否存在
ls -la package.json
ls -la electron/main.ts
ls -la src/App.tsx
ls -la public/favicon.svg
```

**✅ 期望結果：**
所有文件都存在

**❌ 如果缺少文件：**
確保在正確的項目目錄下

---

## 📦 依賴檢查

### 1. 安裝依賴

```bash
# 首次或依賴不完整時
npm install

# 等待安裝完成（通常 2-5 分鐘）
```

**✅ 期望結果：**
```
added 821 packages
```

**❌ 如果失敗：**
```bash
# 清除快取並重試
npm cache clean --force
npm install
```

---

### 2. 驗證 Electron

```bash
# 檢查 Electron 是否正確安裝
npm list electron

# 應該顯示：
# markdown-live-previewer@0.0.0 ..../node_modules/.bin/electron
# └── electron@31.7.7
```

**✅ 期望版本：** `electron@31.7.7`

**❌ 如果版本不對：**
```bash
npm install electron@31.7.7 --save-dev
```

---

### 3. 驗證 electron-builder

```bash
npm list electron-builder

# 應該顯示：
# └── electron-builder@24.13.3
```

**✅ 期望版本：** `electron-builder@24.13.3`

---

## 🚀 開發環境測試

### 1. 啟動 Vite 開發伺服器

```bash
npm run dev
```

**✅ 期望輸出：**
```
✓ built in 234 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

**✅ 驗證：**
- 打開瀏覽器訪問 http://localhost:5173
- 應該看到 Markdown Live Previewer 應用
- 按 `Ctrl+C` 停止

**❌ 如果出現「端口被占用」：**
```bash
# 更換端口
npm run dev -- --port 5174

# 或者找出占用端口 5173 的進程
lsof -i :5173        # macOS/Linux
netstat -ano | findstr :5173  # Windows
```

---

### 2. 啟動 Electron

```bash
# 確保已編譯 Electron
npm run compile-electron

# 啟動 Electron
npm run electron-dev
```

**✅ 期望輸出：**
```
[Electron] isDev: true
[Electron] app.isPackaged: false
Loading URL: http://localhost:5173
```

**✅ 驗證：**
- Electron 窗口打開
- 看到 Markdown Live Previewer 內容
- F12 打開開發者工具
- 按 `Alt+F4` 或關閉窗口停止

**❌ 常見問題：**

| 問題 | 解決方案 |
|------|--------|
| 窗口空白 | 確保 Vite 運行在 5173，查看 DevTools Console |
| 找不到 preload.js | 運行 `npm run compile-electron` |
| 崩潰 | 查看錯誤日誌，清除 node_modules 重裝 |

---

### 3. 同時運行 Vite + Electron

```bash
# 推薦方式
npm run dev-electron

# 或帶等待的版本
npm run dev-electron-wait
```

**✅ 期望結果：**
- Vite 開發伺服器啟動
- Electron 窗口自動打開
- 代碼變化自動熱更新

**✅ 驗證開發流程：**
```
1. 編輯 src/components/Editor.tsx
2. 保存文件
3. Electron 窗口自動重新加載
4. 看到更改生效
```

---

## 🎨 圖示配置檢查

### 1. 轉換圖示

```bash
# 檢查 SVG 文件是否存在
ls public/favicon.svg

# 應該看到文件存在
```

**✅ 期望結果：**
```
public/favicon.svg
```

---

### 2. 放置 ICO 文件

```bash
# 將轉換後的 favicon.ico 放在 public/
# 驗證文件存在
ls public/favicon.ico

# 驗證文件格式（可選）
file public/favicon.ico
# 應該輸出類似: "MS Windows icon resource"
```

**✅ 期望結果：**
```
public/
├── favicon.svg
└── favicon.ico    ← 新增的轉換版本
```

**❌ 如果 ICO 不存在：**
- 查看 [圖示設定指南](./electron-icon-setup.md)
- 進行 SVG 到 ICO 轉換

---

## 🏗️ 構建檢查

### 1. Vite 生產構建

```bash
npm run build
```

**✅ 期望輸出：**
```
✓ 5289 modules transformed
✓ built in 17.83s
```

**✅ 驗證：**
```bash
# 檢查 dist 目錄
ls dist/
# 應該包含 index.html 和 assets/
```

**❌ 如果構建失敗：**
```bash
# 清除舊構建
rm -rf dist/
npm run build
```

---

### 2. Electron 編譯

```bash
npm run compile-electron
```

**✅ 期望結果：**
```bash
# 應該生成 main.js
ls electron/main.js
```

**❌ 如果失敗：**
```bash
# 檢查 TypeScript 配置
cat electron/tsconfig.json
```

---

### 3. 完整構建

```bash
npm run electron-build
```

**✅ 期望過程：**
```
> npm run build          (Vite 打包)
✓ built in 17.83s

> npm run compile-electron (TypeScript 編譯)

> electron-builder       (打包)
✓ Packaging ...
✓ 2 files created
```

**✅ 驗證輸出：**
```bash
# 檢查生成的 EXE 文件
ls dist/*.exe
# 應該看到：
# Markdown Live Previewer Setup 0.0.0.exe
# Markdown Live Previewer 0.0.0.exe
```

**❌ 常見問題：**

| 錯誤 | 原因 | 解決方案 |
|------|------|--------|
| `cannot execute` | ICO 格式錯誤 | 重新轉換 SVG 為 ICO |
| `file not found` | 圖示文件缺失 | 創建 favicon.ico |
| `symbolic link error` | 7-Zip 問題 | 清除快取重試 |

---

## 📊 功能測試

### 1. 基本功能

```
✅ 代碼編輯
   - 在左側編輯區輸入 Markdown
   - 確認右側預覽更新

✅ Markdown 預覽
   - 測試各種 Markdown 語法
   - 標題、列表、代碼塊等

✅ 工具功能
   - 圖片上傳
   - 表格生成
   - PDF 合併（如適用）

✅ 菜單功能
   - 點擊菜單項
   - 確認功能正常
```

---

### 2. Electron 特定功能

```
✅ 窗口功能
   - 調整窗口大小
   - 最小化、最大化、關閉

✅ 快捷鍵
   - Ctrl+N 新建
   - Ctrl+O 打開
   - Ctrl+S 保存

✅ 文件存儲
   - 打開本地文件
   - 保存到本地磁盤
   - 驗證數據持久化

✅ DevTools
   - 按 F12 打開
   - 查看控制台無錯誤
```

---

## 📦 發布檢查

### 1. EXE 文件驗證

```bash
# 檢查文件大小（應該 150-300 MB）
ls -lh dist/*.exe

# 檢查文件完整性
file dist/*.exe
```

**✅ 期望結果：**
```
-rw-r--r-- 1 user  200M Markdown Live Previewer Setup 0.0.0.exe
-rw-r--r-- 1 user  190M Markdown Live Previewer 0.0.0.exe
```

---

### 2. 運行測試

```bash
# 雙擊或命令行運行 EXE
dist/Markdown\ Live\ Previewer\ 0.0.0.exe

# 或安裝版本
dist/Markdown\ Live\ Previewer\ Setup\ 0.0.0.exe
```

**✅ 驗證：**
- 應用啟動成功
- 主要功能正常
- 無錯誤或崩潰

---

### 3. 分享準備

```
✅ 選擇合適的版本
   - Setup 版本：給普通用戶（帶安裝程序）
   - Portable 版本：給高級用戶（直接運行）

✅ 創建版本說明
   - 功能介紹
   - 系統要求
   - 更新日誌

✅ 上傳到分發平台
   - GitHub Releases
   - 公司內部存儲
   - 其他分發渠道
```

---

## 🐛 故障排除快速參考

### 常見問題速查表

| 症狀 | 可能原因 | 快速檢查 |
|------|--------|--------|
| 無法啟動開發 | Node 未安裝 | `node --version` |
| 依賴缺失 | npm install 失敗 | `npm install` 重試 |
| Vite 端口衝突 | 端口被占用 | 更改端口或關閉占用進程 |
| Electron 窗口空白 | Vite 未運行 | 確保 Vite 運行在 5173 |
| 打包失敗 - 圖示 | ICO 不存在 | 創建 public/favicon.ico |
| 打包失敗 - 7-Zip | 快取損壞 | 清除 AppData\Local\electron-builder\Cache |
| 分支混亂 | 切換錯誤 | `git branch` 查看，`git checkout` 切換 |

---

### 重置環境

如果遇到複雜問題，嘗試完整重置：

```bash
# 1. 清除依賴
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. 清除構建產物
rm -rf dist/ electron/*.js

# 3. 清除快取
rm -rf $APPDATA/Local/electron-builder/Cache  # Windows

# 4. 重新安裝
npm install

# 5. 重新構建
npm run electron-build
```

---

## 📝 檢查清單模板

複製下面的清單用於日常開發檢查：

```
[ ] 確認在 electron-desktop 分支
[ ] 依賴已安裝 (npm install)
[ ] Vite 開發伺服器正常
[ ] Electron 應用正常啟動
[ ] 代碼熱更新工作
[ ] 主要功能測試通過
[ ] DevTools 無錯誤
[ ] 準備構建 (npm run electron-build)
[ ] 生成的 EXE 正常運行
[ ] 功能測試通過
```

---

## 📞 需要幫助？

查看相應的文檔：

- 🚀 **開發問題** → [開發指南](./electron-development-guide.md)
- ⚡ **命令忘記** → [快速參考](./electron-quick-reference.md)
- 🎨 **圖示問題** → [圖示設定](./electron-icon-setup.md)
- 🏗️ **架構問題** → [架構設計](./electron-architecture.md)

---

**最後更新：2026 年 3 月 22 日**
