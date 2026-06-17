# 🛠️ 開發與部署完整指南 (Development & Deployment Comprehensive Guide)

本文件提供  Mark It Live 的一站式技術指南，涵蓋本地開發環境設定、Docker 容器化部署、GitHub Pages 自動化部屬、多種雲端平台託管方案以及自訂網域 DNS 設定與驗證。

---

## ⚙️ 1. 本地開發環境 (Local Development)

### 前置要求
*   **Node.js**: 建議使用 v22 或更高版本（專案 `package.json` 限制為 `>=22`）。
*   **npm**: 隨 Node.js 安裝的套件管理器。

### 安裝步驟
1. 複製專案庫或下載原始碼。
2. 在終端機執行安裝依賴：
   ```bash
   npm install
   ```

### 本地開發指令

#### 🚀 啟動開發伺服器
```bash
npm run dev
```
預設會運行在 `http://localhost:3000` (或 `http://localhost:5173`，視埠口占用而定)。  
*提示：專案配置已預設 `host: "0.0.0.0"`，允許區域網路內的其他裝置透過您的本地 IP 進行訪問。*

#### 📦 構建生產版本
```bash
npm run build
```
構建後的靜態檔案將存放在 `dist/` 目錄中，並包含預先拆分好的模組（Mermaid, Vega, MathJax 等），以加速首頁載入。

#### 💻 本地預覽生產版本
```bash
npm run preview
```
這會啟動一個本地伺服器來測試構建後的靜態資源，確保在打包後所有功能皆能正常運作。

---

## 🐳 2. Docker 部署 (推薦用於生產環境)

使用 Docker 部署可以獲得 100% 一致的運行環境，且專案已內建生產級的 Nginx 反向代理配置。

### 🚀 快速啟動

#### 方式 A：使用 Docker Compose（推薦）
```bash
# 構建並在背景啟動
docker-compose up -d

# 查看運行日誌
docker-compose logs -f

# 停止容器
docker-compose down
```
訪問網址：`http://localhost:8080`。

#### 方式 B：直接使用 Docker CLI 指令
```bash
# 構建 Docker 映像檔
docker build -t markdown-previewer:latest .

# 運行容器 (映射本地 8080 埠)
docker run -d \
  --name markdown-previewer \
  -p 8080:80 \
  markdown-previewer:latest

# 查看日誌
docker logs -f markdown-previewer

# 停止並刪除容器
docker stop markdown-previewer
docker rm markdown-previewer
```

### 🔧 進階配置與健康檢查
*   **自訂埠口**：若要將容器運行在其他埠口（例如 3000），只需修改 `docker-compose.yml` 中的 `ports` 段落為 `"3000:80"`，或在 CLI 中執行 `-p 3000:80`。
*   **自訂子路徑 (Base Path)**：若要部署在子路徑下（如 `/app/`），可在構建時傳入引數：
    ```bash
    docker build -t markdown-previewer:latest --build-arg VITE_BASE_PATH=/app/ .
    ```
*   **容器健康檢查**：容器內建了自動健康檢測，每 30 秒自動檢測 Nginx 狀態。您可以使用以下指令查看：
    ```bash
    docker inspect --format='{{.State.Health.Status}}' markdown-previewer
    ```

### 🔍 故障排除 (Troubleshooting)
*   **容器無法啟動**：使用 `docker logs markdown-previewer` 查看 Nginx 啟動錯誤，通常是因為埠口已被本地其他服務占用。
*   **重新構建並清除快取**：若程式碼有修改但 Docker 映像檔未更新，可執行：
    ```bash
    docker-compose build --no-cache
    ```

---

## 📦 3. GitHub Pages 部署

本專案已設定好自動化部署，非常適合靜態網頁託管。

### 📍 快速啟用自動化部署
1. **推送程式碼**：將專案推送到您的 GitHub 倉庫。
2. **配置 Pages 權限**：
   - 進入該 Repository 的 **Settings** (設定) > **Pages** (頁面)。
   - 在 **Build and deployment** > **Source** 中，選擇 **GitHub Actions**。
3. **自動部署**：
   - 每次推送至 `main` 分支時，GitHub Actions 會自動執行 `Deploy to GitHub Pages` 工作流。
   - 完成後即可在 Actions 分頁看到綠色勾勾，並獲得專屬網站連結。

### ⚙️ 雙模相容路徑設計 (Hybrid Path Policy)
為了同時支援「本地開發」與「GitHub Pages 子路徑託管」，我們在 `vite.config.ts` 中實作了動態路徑策略：
*   **本地開發 (`npm run dev`)**：使用根路徑 `/`。
*   **GitHub Pages (線上部署)**：GitHub Actions 在建置時會自動注入環境變數 `BASE_URL`，系統會自動將資源路徑修正為 `/<repo-name>/`，確保圖片與樣式正確載入，防止 404 錯誤。
*   **手動建置模擬**：
    ```bash
    BASE_URL=/repo-name/ npm run build
    npm run preview
    ```

---

## ☁️ 4. 雲端平台託管方案 (精簡比較)

若您希望獲得獨立的網址且不想要 GitHub Pages 的子路徑限制，推薦使用以下免費或低成本的雲端平台。這些平台皆支援透過 **Dockerfile** 進行一鍵式容器部署：

### 📊 平台快速對比

| 平台 | 免費方案額度 | 部署難度 | 冷啟動時間 | 自訂網域 | 推薦指數 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Render** | ✅ 750 小時/月 (足夠全天候) | ⭐ 超簡單 (GitHub 連結) | ~30-60 秒 (無活動15分後休眠) | ✅ 支援 | ⭐⭐⭐⭐⭐ |
| **Railway** | ✅ $5 免費額度 | ⭐ 超簡單 | 幾乎即時 | ✅ 支援 | ⭐⭐⭐⭐ |
| **Fly.io** | ✅ 3 個 VM + 3GB 儲存 | ⭐⭐ 中等 (需要 CLI 部署) | 幾乎即時 | ✅ 支援 | ⭐⭐⭐⭐ |
| **Google Cloud Run** | ✅ 每月 200 萬次請求 | ⭐⭐⭐ 偏難 (需要 GCP 設定) | 幾秒 (按需計費) | ✅ 支援 | ⭐⭐⭐ |

### 🥇 最佳推薦：Render 部署步驟
1. 註冊並登入 [Render](https://render.com)。
2. 在主控制台點選 **New +** → **Web Service**。
3. 連接您的 GitHub 倉庫。
4. 進行以下配置：
   - **Name**: `markdown-previewer`
   - **Region**: 選擇距離您最近的區域（例如 `Singapore`）。
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
5. 點選 **Create Web Service**。Render 會自動拉取專案、構建 Docker 映像檔並分配一個免費的 `https://[your-app].onrender.com` 網址。

---

## 🌐 5. 自訂網域與 DNS 擁有權驗證 (DNS Settings)

不論使用何種平台，若要綁定自己的專屬網域，通常涉及 DNS 與所有權驗證：

### 1️⃣ DNS 記錄配置 (指向伺服器)
*   **子網域 (如 `preview.yourdomain.com`)**：
    - 在 DNS 提供商（如 Cloudflare, GoDaddy）新增一個 `CNAME` 記錄。
    - **Name**: `preview`
    - **Target**: 您的平台網址（如 `markdown-previewer.onrender.com`）。
*   **根網域 (如 `yourdomain.com`)**：
    - 新增一個 `A` 記錄。
    - **Name**: `@`
    - **Value**: 指向平台提供的 IP 地址（如 Render 預設 IP：`216.24.57.1`，以 Dashboard 顯示為準）。

### 2️⃣ 網域擁有權驗證 (TXT 記錄)
當您需要向 **Google Search Console** 或其他第三方服務證明您擁有該網域時：
1. **獲取驗證值**：從 Google 獲取類似 `google-site-verification=xxxxxx` 的字串。
2. **新增 TXT 記錄**：
   - **Type**: `TXT`
   - **Name**: `@` (或保留空白)
   - **Value**: 貼上剛才獲取的驗證字串。
   - **TTL**: 預設或 `Auto`。

### 3️⃣ 生效檢測與注意事項
*   **本地檢查指令** (Windows PowerShell)：
    ```powershell
    # 檢查 CNAME 解析
    nslookup -type=cname preview.yourdomain.com
    
    # 檢查 TXT 記錄
    nslookup -type=txt yourdomain.com
    ```
*   💡 **Cloudflare Proxy 提示**：若您使用 Cloudflare，請注意其 **Proxy (橘色雲朵)** 模式。若在驗證所有權或申請 SSL 憑證時一直失敗，請先暫時切換為 **DNS Only (灰色雲朵)**，待憑證或驗證生效後，再重新開啟 Proxy。
*   **SSL 憑證**：Render 等託管平台會自動為指向正確的自訂網域申請免費的 Let's Encrypt HTTPS 憑證，無需手動配置。
