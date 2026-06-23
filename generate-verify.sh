#!/bin/sh

# ==============================================================================
# Nginx Entrypoint Script: 動態生成 Google Search Console 驗證檔
# 目的：解決 Render Docker 部署時，Secret Files (/etc/secrets) 在 Build 階段不可見，
#       導致 Vite 插件無法於 npm run build 時生成驗證檔的問題。
# 動作：在 Nginx 啟動前，從 /etc/secrets (或環境變數) 讀取 ID，並於 runtime 寫入 HTML。
# ==============================================================================

# 1. 嘗試從 Render 的 /etc/secrets 讀取環境變數 (假設掛載的 Secret File 名為 .env)
# 這裡我們嘗試解析出 VITE_GOOGLE_VERIFY_ID
if [ -f "/etc/secrets/.env" ]; then
    echo "[Entrypoint] Found /etc/secrets/.env, sourcing variables..."
    export $(grep -v '^#' /etc/secrets/.env | xargs)
fi

# 2. 如果存在 VITE_GOOGLE_VERIFY_ID，就在 Nginx 根目錄生成對應的 .html
if [ -n "$VITE_GOOGLE_VERIFY_ID" ]; then
    FILE_PATH="/usr/share/nginx/html/${VITE_GOOGLE_VERIFY_ID}.html"
    echo "google-site-verification: ${VITE_GOOGLE_VERIFY_ID}.html" > "$FILE_PATH"
    echo "[Entrypoint] Successfully generated Google verification file: ${VITE_GOOGLE_VERIFY_ID}.html"
else
    echo "[Entrypoint] VITE_GOOGLE_VERIFY_ID not found in env or secrets, skipping generation."
fi
