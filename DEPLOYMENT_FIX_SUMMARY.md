# Railway 部署問題修復總結

## 🔍 問題診斷

從日誌檔案 `logs/backend/logs.1759917098010.json` 分析，發現以下錯誤：

```
Error: Cannot find module '/app/dist/main.js'
```

**根本原因：** Railway 在部署時沒有執行建構步驟，導致 TypeScript 程式碼沒有被編譯成 JavaScript，`dist` 資料夾不存在。

## ✅ 已執行的修復

### 1. 創建 Railway 配置檔案

#### `backend/railway.json`
- 明確指定建構命令：`npm install && npm run build`
- 明確指定啟動命令：`npm run start:prod`
- 設定重啟策略：失敗時自動重啟，最多 10 次

#### `backend/nixpacks.toml`
- 配置 Nixpacks 建構系統
- 指定 Node.js 20 版本
- 定義安裝、建構和啟動階段

### 2. 更新 `backend/package.json`

**新增的 scripts：**
- `postinstall`: 在安裝依賴後自動生成 Prisma Client
- 更新 `start:prod`: 在啟動前執行資料庫 migrations

```json
"scripts": {
  "postinstall": "npx prisma generate",
  "start:prod": "npx prisma migrate deploy && node dist/main.js"
}
```

### 3. 優化 `backend/src/main.ts`

**改進項目：**
- ✅ 移除多餘的 `dotenv` 引用（使用 NestJS ConfigModule）
- ✅ 改進 CORS 配置，支援生產環境
- ✅ 監聽所有網路介面（`0.0.0.0`）
- ✅ 添加環境資訊日誌輸出

### 4. 創建部署指南

- 📄 `backend/RAILWAY_DEPLOYMENT.md` - 詳細的部署步驟和故障排除指南

## 🚀 部署步驟

### 步驟 1: 在 Railway 設定環境變數

進入 Railway 後端服務的 **Variables** 頁面，添加：

```bash
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=your-very-secure-jwt-secret-key-change-this
PORT=4000
NODE_ENV=production
```

**可選環境變數：**
```bash
CORS_ORIGIN=https://your-frontend-domain.com
```

### 步驟 2: 設定 Root Directory（如果需要）

如果你的 Railway 專案指向整個 repo：
1. 進入 Railway 服務設定
2. 找到 **Root Directory** 設定
3. 設定為 `backend`

### 步驟 3: 提交並推送更改

```bash
git add .
git commit -m "fix: 修復 Railway 部署問題 - 添加建構配置"
git push origin main
```

### 步驟 4: 觸發重新部署

Railway 會自動檢測到 push 並開始部署。你也可以手動在 Railway Dashboard 觸發重新部署。

## 📊 部署流程說明

部署成功時，Railway 會執行以下步驟：

1. **Clone Repository** - 拉取最新程式碼
2. **Install Dependencies** (`npm install`)
   - 觸發 `postinstall` script
   - 自動生成 Prisma Client
3. **Build** (`npm run build`)
   - 生成 Prisma Client
   - 編譯 TypeScript → JavaScript
   - 產生 `dist` 資料夾
4. **Start** (`npm run start:prod`)
   - 執行資料庫 migrations
   - 啟動應用程式

## 🔍 驗證部署成功

### 檢查日誌

在 Railway Dashboard 查看日誌，應該會看到：

```
🚀 Backend running on port 4000
📝 Environment: production
```

### 測試 API

使用 Railway 提供的 URL 測試：

```bash
# 健康檢查（如果有）
curl https://your-backend.railway.app/health

# 測試 API
curl https://your-backend.railway.app/api
```

## ⚠️ 常見問題與解決方案

### Q1: 仍然看到 "Cannot find module" 錯誤？

**解決方案：**
1. 確認 `railway.json` 和 `nixpacks.toml` 在 `backend` 資料夾根目錄
2. 檢查 Railway 的 Root Directory 是否設定為 `backend`
3. 在 Railway Dashboard 手動觸發重新部署
4. 檢查建構日誌，確認 `npm run build` 有被執行

### Q2: Prisma 相關錯誤？

**解決方案：**
1. 確認 `DATABASE_URL` 環境變數已設定
2. 如果使用 SQLite，確保路徑正確
3. 建議生產環境使用 PostgreSQL：
   - 在 Railway 添加 PostgreSQL 服務
   - 更新 `prisma/schema.prisma` 的 provider 為 `postgresql`
   - 使用 Railway 提供的 DATABASE_URL

### Q3: CORS 錯誤？

**解決方案：**
1. 在 Railway 設定 `CORS_ORIGIN` 環境變數為前端 URL
2. 例如：`CORS_ORIGIN=https://your-frontend.vercel.app,https://your-frontend.railway.app`

### Q4: Port 錯誤？

**解決方案：**
- Railway 自動提供 `PORT` 環境變數
- 確保應用程式使用 `process.env.PORT`
- 已在 `main.ts` 中正確設定 ✅

## 🎯 生產環境建議

### 1. 使用 PostgreSQL 替代 SQLite

SQLite 不適合生產環境，建議切換到 PostgreSQL：

**步驟：**
1. 在 Railway 添加 PostgreSQL 服務
2. 連接到後端服務
3. 更新 `schema.prisma`：
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
4. 重新生成 migrations

### 2. 設定環境變數

確保所有敏感資訊都使用環境變數：
- ✅ JWT_SECRET
- ✅ DATABASE_URL
- 建議添加：API keys, 第三方服務憑證等

### 3. 監控與日誌

- 使用 Railway 的內建日誌系統監控應用
- 考慮添加 `/health` endpoint 用於健康檢查
- 設定告警通知

### 4. 自訂域名

在 Railway 服務設定中：
1. 添加 Custom Domain
2. 設定 DNS 記錄
3. 更新前端的 API URL

## 📝 前端配置

確保前端能連接到 Railway 後端：

### Next.js 環境變數

在前端專案中設定：

```env
# .env.local 或 Railway 環境變數
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### API 客戶端配置

檢查 `frontend/src/lib/api.ts`，確保使用環境變數：

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

## 🎉 完成！

按照以上步驟，你的後端應該能在 Railway 上成功部署。如果還有問題，請檢查：

1. Railway 建構日誌
2. Railway 運行日誌
3. 環境變數設定
4. Root Directory 設定

詳細的部署指南請參考 `backend/RAILWAY_DEPLOYMENT.md`。

