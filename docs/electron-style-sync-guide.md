# 🔄 從 origin/main 同步樣式到 origin/electron-desktop 的方法說明

本文件旨在提供 **Markdown Live Previewer** 開發團隊一份安全、標準化且零衝突的「樣式同步與衝突處理解決方案」。這份指南將協助開發者在不破壞 Electron 桌面端特有功能（如預覽列印、頁尾隱藏、離線載入等）的前提下，完美繼承網頁版最新的美學樣式。

---

## 📌 背景與動機 (Background & Motivation)

*   **網頁主幹 (`origin/main`)**：作為本專案的主線，包含最新的功能模組、11 種精美的主題 CSS 檔案（`src/styles/themes/`）、AST 渲染插件的樣式（如 GitHub Alerts 警示盒、MathJax 斷行）以及最新的 CSS 變數配置。
*   **桌面分支 (`origin/electron-desktop`)**：專門為桌面端打造，具備離線運行能力。為了確保桌面端用戶的最佳體驗，它在部分 UI 上做了「客製化裁減」或「功能調整」（例如隱藏頁尾廣告、特定列印 API 特判等）。

為了讓桌面端與網頁版保持視覺設計的一致性，我們必須定期將 `origin/main` 的樣式同步至 `origin/electron-desktop`。

---

## 🛠️ 同步樣式三大核心方案 (Core Sync Strategies)

根據不同的開發場景，我們提供以下三種同步策略。

### 方案 A：精準樣式同步 (Selective Style Sync) —— ⭐ 極力推薦！

如果您**只希望引進新的 CSS 樣式、主題色系、或 UI 視覺修正**，而不希望改動任何 Electron 專屬的主線 TypeScript 邏輯或設定檔，這是**最安全、100% 零衝突**的方案。

#### 💻 執行步驟：

1.  **切換至桌面分支並確保工作目錄乾淨：**
    ```bash
    git checkout electron-desktop
    git status
    ```
    *(如果有未提交的修改，請先 `git stash` 暫存。)*

2.  **拉取遠端最新變更：**
    ```bash
    git fetch origin
    ```

3.  **使用 `git checkout` 精準拉取樣式檔案：**
    這會將 `origin/main` 分支上的樣式檔案直接覆蓋至您當前的桌面分支，而不會影響任何代碼邏輯：
    ```bash
    # 同步全域樣式與主題資料夾
    git checkout origin/main -- src/index.css src/styles/ public/index.css
    ```

4.  **檢查異動並提交：**
    ```bash
    git status
    # 預期只會看到樣式檔案被修改
    git commit -m "style: 同步來自 origin/main 的最新樣式與主題色系"
    ```

---

### 方案 B：完整變更合併 (Full Rebase Sync) —— 適用於功能與樣式同步

當您在 `origin/main` 開發了新功能且調整了樣式，想將**所有代碼與樣式一次性完整同步**到桌面版時適用此方案。

#### 💻 執行步驟：

1.  **切換至桌面分支：**
    ```bash
    git checkout electron-desktop
    ```

2.  **執行拉取與衍合 (Rebase)：**
    ```bash
    git fetch origin
    git rebase origin/main
    ```
    *說明：`git rebase` 會將桌面端的專屬修改（如 Electron 主進程、特定 API 特判）「浮」在最新的網頁版代碼之上，這能保持 Commit 歷史的線性與乾淨。*

3.  **解決潛在衝突：**
    由於 `rebase` 可能會觸及 `App.tsx` 或 `vite.config.ts` 等分支特判檔案，若遇到衝突，請使用 VS Code 等編輯器仔細比對，並保留桌面端特有的特判（詳見後文：[桌面端專屬樣式防護機制](#-桌面端專屬樣式防護機制-electron-specific-tweak)）。
    ```bash
    # 解決衝突後繼續 rebase
    git add <衝突檔案>
    git rebase --continue
    ```

---

### 方案 C：單一 Git 提交同步 (Cherry-pick) —— 適用於緊急 Bug 修正

如果 `origin/main` 上有一個緊急的樣式修復 Commit（例如某個主題色字體顏色看不清），您只想將該特定 Commit 同步到桌面版。

#### 💻 執行步驟：

1.  **尋找 Commit Hash：**
    在 `origin/main` 找到該樣式修復的 Commit Hash（例如 `a1b2c3d`）。

2.  **在桌面分支應用該 Commit：**
    ```bash
    git checkout electron-desktop
    git cherry-pick a1b2c3d
    ```
    *如果出現衝突，解決後執行 `git cherry-pick --continue` 即可。*

---

## 🛡️ 桌面端專屬樣式防護機制 (Electron-Specific Tweak)

在進行樣式同步或衝突解決時，**必須絕對保護**桌面分支已建立的以下專屬防護機制，切勿被網頁版的樣式直接覆蓋：

### 1. 頁尾元件的條件隱藏 (`!isElectron`)
桌面端不需要展示網頁端的廣告、AdSense、流量統計或網頁版專屬頁尾。
*   **關鍵程式碼保護 (`App.tsx`)**：
    ```tsx
    // 必須保留此條件渲染，不可直接替換為 <Footer ... />
    {!isElectron && <Footer showIntroTrigger={openDocIds.length > 0} onOpenIntro={() => setIsIntroModalOpen(true)} />}
    ```

### 2. 離線資源與本地靜態路徑 (`VITE_ELECTRON`)
Electron 桌面端是在完全離線的靜態檔案環境中運行。所有靜態資源與 CSS 必須使用相對路徑，否則打包後的 Electron 視窗將會是一片空白。
*   **Vite 配置防護 (`vite.config.ts`)**：
    ```typescript
    const isElectron = process.env.VITE_ELECTRON === 'true';
    // 必須保留相對路徑配置 './'，網頁版則為 '/' 或 '/Markdown-live-previewer/'
    const base = isElectron ? './' : (process.env.BASE_URL ?? '/');
    ```

### 3. 列印與 PDF 輸出樣式微調 (`@media print`)
桌面端列印是調用 Electron 的 `window.electron.print` 進行系統級 PDF 渲染，而非瀏覽器的預設列印。
*   **列印樣式保護 (`App.tsx`)**：
    ```tsx
    // 桌面版移除了 media print 中的 footer 隱藏，因為桌面版根本不渲染 Footer
    header, aside, .tab-bar, section:not(.preview-panel), .status-bar, .floating-controls { display: none !important; }
    ```

### 4. 滾動條樣式與系統相容性
桌面版在多平台（Windows, macOS, Linux）中會自動套用 CSS 滾動條樣式。請確保 `index.html` 或樣式中的 `.custom-scrollbar` 沒有被網頁版覆蓋掉對應的硬體加速屬性。

---

## 🧪 同步後的完整驗證流程 (Post-Sync Verification Workflow)

樣式同步完成後，必須執行以下標準測試以確保桌面端的穩定性，避免「未完成」交付：

### 第一步：啟動本地開發模式測試
```bash
# 啟動並行開發環境，Vite 會以 VITE_ELECTRON=true 狀態載入本地服務
npm run dev-electron
```
*   **檢查重點：**
    1.  開啟軟體，確認主介面 UI 載入正常，無任何破圖或背景空白。
    2.  切換這 **11 種主題**（例如 Academic、Cosmic、Sunset Glow 等），確認 Markdown 預覽畫面與樣式正確變更。
    3.  開啟開發者工具 (F12)，檢查 Console 確保無 `404 Not Found` 資源路徑報錯。

### 第二步：本地預覽列印測試
1.  在編輯器中輸入測試 Markdown。
2.  點擊右上角「列印/匯出 PDF」，確認列印設定彈窗出現。
3.  確認列印的 PDF 預覽中，沒有殘留編輯器側欄、頂部導覽列，只有純淨的預覽文章。

### 第三步：執行打包建置與發布測試
確保實際打包出來的 `.exe` 執行檔沒有任何靜態路徑損壞：
```bash
# 執行完整桌面版打包
npm run electron-build
```
*   **檢查重點：**
    *   建置流程無紅字報錯，且 `dist/` 目錄成功輸出 `Markdown Live Previewer Setup 0.0.0.exe`。
    *   手動點擊安裝生成的綠色免安裝/安裝檔，測試是否能離線順利打開並正常著色。

---

## 📝 總結建議工作流

對於日常的樣式維護，最優雅且無痛的同步流程是：
> 💡 **最佳實踐**：
> 1. 先用 **方案 A (精準樣式同步)** 快速拉取最新 CSS。
> 2. 執行 `npm run dev-electron` 進行基本點收。
> 3. 若樣式正常，直接 `git commit` 並推送到遠端桌面分支。

若在同步過程中遇到任何無法處理的 CSS 衝突，請立即與團隊架構師或 Senior Engineer 協調解決，切勿強制 `--force` 推送！
