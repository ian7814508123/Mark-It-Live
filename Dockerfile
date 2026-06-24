# ====================================
# Stage 1: 構建階段 (Build Stage)
# ====================================
FROM node:24.14.0-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴（利用 Docker 快取掛載加速）
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 複製所有原始碼
COPY . .

# 執行生產構建
RUN npm run build

# ====================================
# Stage 2: 生產階段 (Production Stage)
# ====================================
FROM nginx:alpine

# 複製自定義 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 從構建階段複製靜態檔案到 nginx 目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製並設定 Nginx 啟動腳本 (動態生成 Google 驗證檔)
COPY generate-verify.sh /docker-entrypoint.d/99-generate-verify.sh
RUN chmod +x /docker-entrypoint.d/99-generate-verify.sh

# 暴露 80 端口
EXPOSE 80

# 健康檢查（可選，但建議加上）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
