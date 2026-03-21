# 📚 Electron 開發指南

*深入開發細節，適合詳細學習*

---

## 📋 目錄

1. [快速開始](#快速開始)
2. [項目結構](#項目結構)
3. [開發模式](#開發模式)
4. [構建打包](#構建打包)
5. [配置詳情](#配置詳情)
6. [常見問題](#常見問題)

---

## 快速開始

### 環境要求
- Node.js >= 22.0.0
- npm >= 10.0.0
- Windows/macOS/Linux 系統

### 首次安裝

```bash
# 1. 確保在 electron-desktop 分支
git checkout electron-desktop

# 2. 安裝依賴
npm install

# 3. 驗證安裝
npm list electron
npm list electron-builder
```

### 驗證安裝成功

```bash
# 查看 Electron 版本
npx electron --version

# 應該輸出類似: v31.7.7
```

---

## 項目結構

### 完整項目佈局

```
markdown-live-previewer/
│
├── src/                                ← React 代碼（共享）
│   ├── components/
│   │   ├── CodeMirrorEditor.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── Header.tsx
│   │   ├── HistorySidebar.tsx
│   │   ├── SEOContent.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAppSettings.ts
│   │   ├── useDocumentStorage.ts
│   │   └── useImageStorage.ts
│   ├── services/
│   │   ├── excelParser.ts
│   │   └── tableParser.ts
│   ├── App.tsx                         ← 主應用組件
│   ├── index.tsx                       ← 網頁版入口
│   ├── index.css                       ← 全局樣式
│   └── types.ts
│
├── electron/                           ← Electron 代碼（僅桌面版）
│   ├── main.ts                         ← 主進程源代碼
│   ├── main.js                         ← 編譯後的主進程
│   ├── preload.ts                      ← 預加載腳本源代碼
│   ├── preload.js                      ← 編譯後的預加載腳本
│   └── tsconfig.json                   ← TypeScript 配置
│
├── public/                             ← 靜態資源（共享）
│   ├── favicon.svg                     ← 應用圖示（SVG）
│   ├── favicon.ico                     ← 應用圖示（ICO，打包用）
│   ├── index.css                       ← 網頁 CSS
│   ├── defaults/                       ← 默認示例
│   └── image/
│
├── docs/                               ← 文檔
│   ├── ELECTRON-INDEX.md               ← 文檔索引
│   ├── electron-quick-reference.md     ← 快速參考
│   ├── electron-development-guide.md   ← 本文檔
│   ├── electron-architecture.md        ← 架構設計
│   ├── electron-icon-setup.md          ← 圖示配置
│   └── electron-setup-checklist.md     ← 檢查清單
│
├── package.json                        ← 配置文件（已更新）
├── vite.config.ts                      ← Vite 配置（已更新）
├── tsconfig.json                       ← TypeScript 配置（主）
├── index.html                          ← 網頁版入口 HTML
│
├── start-electron-dev.bat              ← 開發啟動腳本
├── build-installer.bat                 ← 打包構建腳本
│
├── dist/                               ← 構建輸出（生成）
│   ├── *.exe                           ← 生成的可執行文件
│   └── ...
│
└── node_modules/                       ← 依賴包
```

---

## 開發模式

### 方式 1：同時運行 Vite + Electron（推薦）

```bash
npm run dev-electron
```

**做了什麼：**
1. 啟動 Vite 開發伺服器（http://localhost:5173）
2. 編譯 Electron 主進程（electron/main.ts → electron/main.js）
3. 啟動 Electron 應用窗口
4. 連接到 Vite 開發伺服器
5. 打開開發者工具（DevTools）

**實時開發：**
- 編輯 `src/` 中的 React 代碼 → 自動熱更新
- 編輯 `electron/main.ts` → 需要重啟應用

**停止開發：**
- 按 `Ctrl+C` 停止所有進程

### 方式 2：手動分步運行

適合需要分別控制的情況。

#### 終端 1：啟動 Vite 開發伺服器

```bash
npm run dev
```

輸出示例：
```
  VITE v6.4.1  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

#### 終端 2：啟動 Electron

等待 Vite 完全啟動後（確保能看到上面的輸出），在新終端運行：

```bash
npm run electron-dev
```

輸出示例：
```
[Electron] isDev: true
[Electron] app.isPackaged: false
[Electron] NODE_ENV: undefined
Loading URL: http://localhost:5173
```

**好處：**
- 可分別控制 Vite 和 Electron
- 便於獨立調試
- 如果 Electron 崩潰，Vite 仍在運行

### 方式 3：僅運行 Vite（開發網頁版）

```bash
npm run dev
```

然後在瀏覽器打開 http://localhost:5173

適合測試不涉及 Electron 特定功能的代碼。

---

## 開發工作流程

### 編輯 React 代碼（常見情況）

1. 啟動開發環境
   ```bash
   npm run dev-electron
   ```

2. 編輯文件（例如 `src/components/Editor.tsx`）
   ```
   ✏️ 修改代碼
   ```

3. 保存文件
   - Vite 自動檢測變化
   - 代碼重新編譯
   - Electron 窗口自動重新加載（熱更新）

4. 在 Electron 窗口中測試
   - F12 打開開發者工具
   - 查看控制台輸出
   - 檢查網絡請求

### 編輯 Electron 代碼（偶爾情況）

1. 編輯文件（例如 `electron/main.ts`）
   ```
   ✏️ 修改菜單、窗口配置等
   ```

2. 保存文件
   - TypeScript 自動編譯（electron/main.js）
   - 但 Electron 應用不會自動重啟

3. 手動重啟
   - 關閉 Electron 窗口
   - 窗口會自動重新打開
   - 或按 Ctrl+R（在 Electron 窗口中）

---

## 🔄 同步網頁版更新

當您在 `main` 分支開發了新功能，想同步至桌面版時：

1. **確保在桌面分支**
   ```bash
   git checkout electron-desktop
   ```

2. **拉取並重新套用 (Rebase)**
   ```bash
   git fetch origin
   git rebase main
   ```

這會將桌面版的專屬修改「浮」在最新的網頁版代碼之上，保持代碼最前沿。

---

## 構建打包

### 完整構建流程

```bash
npm run electron-build
```

**執行步驟：**
1. ✓ 運行 `npm run build`
   - Vite 打包前端代碼到 `dist/`
   - 包括所有 React 組件、樣式、資源

2. ✓ 運行 `npm run electron-dist`
   - 編譯 `electron/main.ts` → `electron/main.js`
   - 運行 electron-builder
   - 打包為 Windows .exe 文件

3. ✓ 生成輸出文件
   - `dist/Markdown Live Previewer Setup 0.0.0.exe`
   - `dist/Markdown Live Previewer 0.0.0.exe`

### 分步構建

如果需要逐步調試，可分別運行：

```bash
# 步驟 1：Vite 前端構建
npm run build

# 檢查 dist/ 目錄是否生成正確
ls dist/

# 步驟 2：編譯 Electron
npm run compile-electron

# 檢查 electron/main.js 是否生成
ls electron/main.js

# 步驟 3：electron-builder 打包
npm run electron-dist
```

### 構建輸出

成功後 `dist/` 目錄包含：

```
dist/
├── index.html              ← 網頁入口
├── assets/                 ← 前端資源
│   ├── index-*.js
│   ├── index-*.css
│   └── ...（大量文件）
├── Markdown Live Previewer Setup 0.0.0.exe
├── Markdown Live Previewer 0.0.0.exe
├── win-unpacked/           ← 未打包的文件（中間產物）
└── builder-effective-config.yaml
```

---

## 配置詳情

### package.json 配置

#### 入口點
```json
{
  "main": "electron/main.js"
}
```

指定 Electron 主進程文件。

#### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",                      // Vite 開發伺服器
    "build": "vite build",              // Vite 生產構建
    "preview": "vite preview",          // 預覽生產構建
    
    "compile-electron": "tsc electron/main.ts --outDir electron ...",  // 編譯 Electron
    "electron-dev": "npm run compile-electron && electron .",          // 運行 Electron
    "electron-build": "npm run build && npm run electron-dist",        // 完整構建
    "electron-dist": "npm run compile-electron && electron-builder",   // 打包
    
    "dev-electron": "concurrently npm:dev npm:electron-dev",           // 並行運行
    "dev-electron-wait": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron-dev\""  // 帶等待
  }
}
```

#### electron-builder 配置

```json
{
  "build": {
    "appId": "com.markdownlivepreviewer.app",
    "productName": "Markdown Live Previewer",
    "directories": {
      "buildResources": "public"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "icon": "public/favicon.ico",
      "certificateFile": null,
      "sign": null
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### vite.config.ts 配置

```typescript
const isElectron = process.env.VITE_BUILD_ELECTRON === 'true';

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/',  // Electron 使用相對路徑
  // ... 其他配置
});
```

### electron/main.ts 要點

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 環境中定義 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 檢測開發環境
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 開發時連接到 Vite 伺服器
  const url = isDev 
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(url);
};

app.on('ready', createWindow);
```

---

## 常見問題

### Q1：啟動時卡住
**症狀：** `npm run dev-electron` 後沒反應

**解決：**
```bash
# 檢查端口 5173 是否被占用
netstat -ano | findstr :5173

# 如果被占用，改用分步方式
npm run dev              # 終端 1
npm run electron-dev     # 終端 2（5 秒後）
```

### Q2：依賴缺失
**症狀：** 找不到 electron 或其他包

**解決：**
```bash
npm install
npm list electron
```

### Q3：Electron 窗口空白
**症狀：** 窗口打開但什麼都不顯示

**解決：**
1. 檢查 Vite 是否運行中
2. 檢查開發者工具的 Console 標籤
3. 檢查 Network 標籤確認連接到 http://localhost:5173

### Q4：打包失敗 - 圖示問題
**症狀：** `cannot execute cause=exit status 2`

**解決：**
1. 確保 `public/favicon.ico` 存在
2. 確保是有效的 ICO 格式
3. 參考 [圖示設定指南](./electron-icon-setup.md)

### Q5：修改代碼後沒變化
**症狀：** 編輯後應用沒有更新

**原因和解決：**
- **編輯 src/ 但窗口沒更新** - 刷新頁面（Ctrl+R）或重新啟動
- **編輯 electron/main.ts** - 必須重新啟動應用

### Q6：如何切回網頁版開發
**解決：**
```bash
git checkout main
npm run dev
```

### Q7：需要清除快取
**症狀：** 構建時出現奇怪的錯誤

**解決：**
```bash
rm -r node_modules package-lock.json    # Linux/macOS
rmdir /s node_modules package-lock.json # Windows

npm install
npm run electron-build
```

---

## 🔗 相關文件

- [快速參考卡](./electron-quick-reference.md) - 命令速查
- [完整設置指南](./electron-complete-setup.md) - 設置概覽
- [架構設計](./electron-architecture.md) - 技術細節
- [檢查清單](./electron-setup-checklist.md) - 故障排除

---

**需要幫助？** 查看 [文檔索引](./ELECTRON-INDEX.md)

---

**最後更新：2026 年 3 月 22 日**
