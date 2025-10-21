# Backend Staging 部署指南

本文件說明如何將後端部署到 Railway 的 staging 環境。

## 📋 必要環境變數清單

在 Railway 專案的 Variables 頁面中，需要設定以下環境變數：

### 必須設定的變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|-------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | JWT 加密金鑰（生產環境必須使用強密碼） | `your-super-secret-jwt-key-here-min-32-chars` |
| `NODE_ENV` | 執行環境 | `staging` 或 `production` |
| `PORT` | 服務埠號（Railway 會自動設定） | `4000`（可選，Railway 會自動分配） |

### 可選變數（建議設定）

| 變數名稱 | 說明 | 預設值 | 範例值 |
|---------|------|-------|-------|
| `CORS_ORIGIN` | 允許的前端網域（多個用逗號分隔） | `*`（允許所有） | `https://your-frontend.railway.app` |

### Railway 自動提供的變數

以下變數由 Railway 自動設定，無需手動配置：
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE_NAME`
- `RAILWAY_PROJECT_NAME`

## 🔧 部署前檢查清單

### 1. 確認 Prisma 設定

```bash
# 檢查 prisma/schema.prisma 是否設定正確的 provider
provider = "postgresql"
```

### 2. 確認 package.json scripts

已自動添加以下 scripts：
- ✅ `postinstall`: `npx prisma generate`
- ✅ `prisma:migrate`: `npx prisma migrate deploy`
- ✅ `prisma:seed`: `npx ts-node prisma/seed.ts`

### 3. 確認 railway-start.sh

已創建 `railway-start.sh` 啟動腳本，該腳本會：
1. 執行 Prisma migrations
2. 執行種子資料（如果存在）
3. 啟動 NestJS 伺服器

## 🚀 部署步驟

### 方法一：使用 Railway CLI（推薦）

```bash
# 1. 切換到後端目錄
cd backend

# 2. 確認已連結到正確的 Railway 專案
railway status

# 3. 部署到 staging 環境
railway up

# 4. 查看部署日誌
railway logs
```

### 方法二：使用 Git Push

```bash
# 1. 提交變更
git add .
git commit -m "Update staging configuration"

# 2. 推送到 Railway（如果設定了 Git 整合）
git push origin main

# Railway 會自動偵測變更並開始部署
```

## 📊 部署後驗證

### 1. 檢查健康狀態

```bash
# 使用 curl 檢查 API 是否正常運作
curl https://your-backend.railway.app/health

# 預期回應：
# {"status":"ok","timestamp":"2025-10-21T..."}
```

### 2. 檢查資料庫連線

```bash
# 查看 Railway 日誌，確認以下訊息：
railway logs --tail 100

# 應該看到：
# ✅ DATABASE_URL 驗證通過
# 📊 使用 PostgreSQL 資料庫
# → Running Prisma migrate deploy...
# → Running Prisma seed...
# 🚀 Server is running on port XXXX
```

### 3. 檢查 Prisma Migrations

```bash
# 連接到 Railway 環境執行 Prisma Studio（可選）
railway run npx prisma studio
```

### 4. 測試 API 端點

```bash
# 測試公開端點
curl https://your-backend.railway.app/api/branches

# 測試需要認證的端點（需要先取得 token）
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-backend.railway.app/api/admin/users
```

## 🔄 回滾步驟

如果部署失敗，可以快速回滾：

```bash
# 使用 Railway CLI 回滾到上一個版本
railway rollback

# 或在 Railway Dashboard 中：
# 1. 前往專案的 Deployments 頁面
# 2. 找到上一個成功的部署
# 3. 點擊 "Redeploy" 按鈕
```

## 🔍 常見問題排解

### 問題 1: DATABASE_URL 未設定

**錯誤訊息：**
```
❌ 無法啟動生產模式：未設定 DATABASE_URL 環境變數。
```

**解決方法：**
1. 在 Railway Dashboard 中新增 PostgreSQL 服務
2. 將 DATABASE_URL 變數連結到 PostgreSQL 服務
3. 重新部署

### 問題 2: Prisma Migration 失敗

**錯誤訊息：**
```
Error: P3005: The database schema is not empty.
```

**解決方法：**
```bash
# 方法 1: 重置資料庫（⚠️ 會刪除所有資料）
railway run npx prisma migrate reset

# 方法 2: 手動同步 schema
railway run npx prisma db push
```

### 問題 3: 種子資料執行失敗

**錯誤訊息：**
```
Seed script skipped or failed (non-blocking).
```

**說明：**
種子資料失敗不會影響服務啟動。可以手動執行：

```bash
railway run npm run prisma:seed
```

### 問題 4: CORS 錯誤

**錯誤訊息（前端）：**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解決方法：**
在 Railway Variables 中設定 `CORS_ORIGIN`：
```
CORS_ORIGIN=https://your-frontend.railway.app,https://your-other-domain.com
```

## 📝 Railway Start Command 設定

在 Railway 專案設定中，確認 Start Command 為：

```bash
bash railway-start.sh
```

或者在 `railway.json` 中設定：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bash railway-start.sh",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🔐 安全建議

1. **JWT_SECRET**: 使用至少 32 字元的強密碼，可使用以下命令生成：
   ```bash
   openssl rand -base64 32
   ```

2. **DATABASE_URL**: 不要在程式碼中硬編碼，只從環境變數讀取

3. **CORS_ORIGIN**: 在生產環境中不要使用 `*`，明確指定允許的網域

4. **環境變數備份**: 定期備份 Railway 的環境變數設定

## 📚 相關資源

- [Railway 官方文檔](https://docs.railway.app/)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)
- [NestJS 部署指南](https://docs.nestjs.com/deployment)

## 🆘 需要幫助？

- 查看 Railway 日誌：`railway logs`
- 檢查環境變數：`railway variables`
- 進入服務 shell：`railway shell`

