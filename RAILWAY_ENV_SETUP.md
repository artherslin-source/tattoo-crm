# Railway 環境變數設定指南

## 🎯 基於您的 PostgreSQL 服務設定

根據您提供的 Railway 截圖，我看到您的 PostgreSQL 服務已經建立完成。現在需要將這些變數設定到您的後端服務中。

## 📋 需要設定的環境變數

### 在 Railway Dashboard 中設定

1. **前往您的後端服務**
   - 在左側導航欄中，點擊 **"tattoo-crm"** 服務（不是 Postgres 服務）
   - 點擊 **"Variables"** 標籤

2. **新增以下環境變數**

```bash
# 資料庫連線（使用 Railway 變數引用）
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT 密鑰（請使用下方命令生成）
JWT_SECRET=<請生成並填入>

# 應用程式設定
NODE_ENV=production
PORT=4000

# CORS 設定（請替換為您的前端 URL）
CORS_ORIGIN=https://your-frontend.railway.app
```

## 🔐 生成 JWT_SECRET

在您的終端機執行以下命令：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

複製輸出的字串，貼到 Railway 的 `JWT_SECRET` 變數中。

## 📊 從您的截圖中獲取的資訊

您的 PostgreSQL 服務提供以下變數：

- **DATABASE_URL**: `postgresql://postgres:TSAzRfDGdVTUjnEzOMPoiegosoARCXWM@postgres.railway.internal:5432/railway`
- **DATABASE_PUBLIC_URL**: `postgresql://postgres:TSAzRfDGdVTUjnEzOMPoiegosoARCXWM@turntable.proxy.rlwy.net:25281/railway`

## 🚀 自動化部署流程

### 方法 1: 使用自動化腳本

```bash
# 執行自動部署腳本
./deploy-to-railway.sh
```

### 方法 2: 手動推送

```bash
# 推送程式碼到 GitHub
git push origin main
```

## 📈 監控部署進度

1. **在 Railway Dashboard 中**：
   - 前往 `tattoo-crm` 服務
   - 點擊 **"Deployments"** 標籤
   - 查看最新的部署狀態

2. **預期的成功日誌**：
   ```
   ✅ DATABASE_URL 驗證通過
   📊 使用 PostgreSQL 資料庫
   ▶ 生成 Prisma Client
   ▶ 編譯 TypeScript 專案
   ▶ 執行資料庫遷移
   ▶ 匯入預設種子資料
   ▶ 啟動 NestJS 伺服器
   🚀 Server is running on port 4000
   📝 Environment: production
   ```

## 🔍 故障排除

### 如果部署失敗

1. **檢查環境變數**：
   - 確認 `DATABASE_URL` 設定為 `${{Postgres.DATABASE_URL}}`
   - 確認 `JWT_SECRET` 已設定
   - 確認 `NODE_ENV=production`

2. **檢查 PostgreSQL 服務**：
   - 確認 PostgreSQL 服務正在運行
   - 確認連線字串正確

3. **查看完整日誌**：
   - 在 Railway Dashboard 中查看部署日誌
   - 尋找錯誤訊息

### 常見錯誤

| 錯誤 | 解決方法 |
|------|---------|
| `P1012: DATABASE_URL must start with file:` | 確認使用 `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET not set` | 在 Railway Variables 中設定 JWT_SECRET |
| `Migration failed` | 檢查 PostgreSQL 服務狀態 |

## ✅ 驗證部署成功

### 1. API 健康檢查

```bash
# 測試後端 API
curl https://your-backend.railway.app/

# 應該回傳 200 OK
```

### 2. 資料庫連線測試

```bash
# 測試登入 API
curl -X POST https://your-backend.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### 3. 前端連線測試

確認前端可以成功呼叫後端 API。

## 📞 需要協助？

如果在設定過程中遇到問題：

1. **查看詳細指南**: [CRISIS_FIX_README.md](./CRISIS_FIX_README.md)
2. **環境變數問題**: [backend/ENV_SETUP_GUIDE.md](./backend/ENV_SETUP_GUIDE.md)
3. **生產部署問題**: [BACKEND_PRODUCTION_FIX.md](./BACKEND_PRODUCTION_FIX.md)

---

**重要提醒**: 請確保在 `tattoo-crm` 服務（不是 Postgres 服務）中設定這些環境變數！
