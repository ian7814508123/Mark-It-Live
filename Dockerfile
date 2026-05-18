# ====================================
# Stage 1: 構建階段 (Build Stage)
# ====================================
FROM node:24.14.0-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package 與 lock 檔案
COPY package.json pnpm-lock.yaml* ./

# 安裝依賴（利用 Docker 快取掛載加速）
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 複製所有原始碼
COPY . .

# 執行生產構建
RUN pnpm run build

# ====================================
# Stage 2: 生產階段 (Production Stage)
# ====================================
FROM nginx:alpine

# 複製自定義 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 從構建階段複製靜態檔案到 nginx 目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 健康檢查（可選，但建議加上）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
