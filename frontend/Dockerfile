# Zeabur / Docker 部署用：Next.js standalone 建置與執行
# 請在 Zeabur 將此服務的 Root Directory 設為 frontend

FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# 建置時需要 NEXT_PUBLIC_*，Zeabur 會從環境變數注入
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# standalone 輸出：僅含必要檔案，並依 process.env.PORT 啟動
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Zeabur 會設定 PORT，standalone 的 server.js 會自動使用
CMD ["node", "server.js"]
