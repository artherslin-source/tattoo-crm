# Railway 環境變數設定清單 - Staging 環境

本文件列出在 Railway staging 環境中需要設定的所有環境變數。

## 🔧 後端（Backend）環境變數

在 Railway 後端服務的 Variables 頁面中設定以下變數：

### ✅ 必須設定（Required）

```bash
# 資料庫連線字串（Railway PostgreSQL 自動提供）
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT 加密金鑰（請使用強密碼，至少 32 字元）
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# 執行環境
NODE_ENV=staging
```

### 🔑 JWT_SECRET 生成方式

使用以下任一方式生成強密碼：

```bash
# 方法 1: 使用 openssl（推薦）
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 線上生成器
# 訪問 https://generate-secret.vercel.app/32
```

### 🌐 可選設定（Optional）

```bash
# CORS 允許的前端網域（多個用逗號分隔）
# 建議明確指定，不要使用 * 在生產環境
CORS_ORIGIN=https://your-frontend-staging.railway.app

# 服務埠號（Railway 通常會自動分配，不需手動設定）
PORT=4000
```

---

## 🎨 前端（Frontend）環境變數

在 Railway 前端服務的 Variables 頁面中設定以下變數：

### ✅ 必須設定（Required）

```bash
# 後端 API 完整 URL（包含 https://）
NEXT_PUBLIC_API_BASE_URL=https://your-backend-staging.railway.app

# 執行環境
NODE_ENV=staging
```

### 📝 注意事項

1. **NEXT_PUBLIC_** 前綴：
   - Next.js 要求瀏覽器可訪問的環境變數必須以 `NEXT_PUBLIC_` 開頭
   - 不要在這類變數中存放敏感資訊（API keys、密碼等）

2. **後端 URL 格式**：
   - 必須包含協議（`https://`）
   - 不要在結尾加斜線（`/`）
   - 範例：`https://backend-staging.up.railway.app`

---

## 🚀 快速設定步驟

### 使用 Railway CLI 設定

#### 後端環境變數

```bash
cd backend

# 連結到後端服務
railway link

# 設定環境變數
railway variables set DATABASE_URL="postgresql://..." \
  JWT_SECRET="$(openssl rand -base64 32)" \
  NODE_ENV="staging" \
  CORS_ORIGIN="https://your-frontend-staging.railway.app"
```

#### 前端環境變數

```bash
cd ../frontend

# 連結到前端服務
railway link

# 設定環境變數
railway variables set \
  NEXT_PUBLIC_API_BASE_URL="https://your-backend-staging.railway.app" \
  NODE_ENV="staging"
```

### 使用 Railway Dashboard 設定

1. 登入 [Railway Dashboard](https://railway.app)
2. 選擇專案
3. 選擇服務（Backend 或 Frontend）
4. 前往 "Variables" 標籤
5. 點擊 "New Variable"
6. 輸入變數名稱和值
7. 點擊 "Add"

---

## 🔍 驗證環境變數設定

### 檢查後端環境變數

```bash
cd backend
railway variables

# 預期輸出應包含：
# DATABASE_URL: postgresql://...
# JWT_SECRET: ****（會被隱藏）
# NODE_ENV: staging
```

### 檢查前端環境變數

```bash
cd frontend
railway variables

# 預期輸出應包含：
# NEXT_PUBLIC_API_BASE_URL: https://...
# NODE_ENV: staging
```

### 測試後端連線

```bash
# 部署後測試健康檢查端點
curl https://your-backend-staging.railway.app/health

# 預期回應：
# {"status":"ok","timestamp":"2025-10-21T..."}
```

### 測試前端配置

1. 開啟前端 URL：`https://your-frontend-staging.railway.app`
2. 打開瀏覽器開發者工具（F12）
3. 前往 Console 標籤
4. 查看輸出：

```
🔍 API Base URL: https://your-backend-staging.railway.app
🔍 Current hostname: your-frontend-staging.railway.app
🔍 Environment: staging
```

---

## 🔐 安全最佳實踐

### 1. JWT_SECRET

- ✅ 使用至少 32 字元的隨機字串
- ✅ 不同環境使用不同的 secret
- ✅ 定期輪換（建議每 3-6 個月）
- ❌ 不要在程式碼中硬編碼
- ❌ 不要提交到 Git repository

### 2. DATABASE_URL

- ✅ 使用 Railway 提供的 PostgreSQL 服務（自動管理）
- ✅ 確保資料庫有定期備份
- ❌ 不要在日誌中輸出完整連線字串
- ❌ 不要在前端程式碼中使用

### 3. CORS_ORIGIN

- ✅ Staging 環境明確指定允許的網域
- ✅ Production 環境不要使用 `*`
- ✅ 使用 HTTPS 網域
- ❌ 開發環境可以用 `*`，但生產環境不要

---

## 📋 環境變數檢查清單

部署前檢查：

### 後端（Backend）
- [ ] `DATABASE_URL` 已設定且格式正確
- [ ] `JWT_SECRET` 已設定且至少 32 字元
- [ ] `NODE_ENV` 設為 `staging` 或 `production`
- [ ] `CORS_ORIGIN` 包含前端網域
- [ ] 所有變數在 Railway Dashboard 中可見

### 前端（Frontend）
- [ ] `NEXT_PUBLIC_API_BASE_URL` 已設定且格式正確（含 https://）
- [ ] `NODE_ENV` 設為 `staging` 或 `production`
- [ ] URL 結尾沒有斜線
- [ ] 所有變數在 Railway Dashboard 中可見

### 測試
- [ ] 後端 `/health` 端點回應正常
- [ ] 前端能成功呼叫後端 API
- [ ] 登入功能正常運作
- [ ] CORS 沒有錯誤
- [ ] 資料庫連線正常

---

## 🔄 環境變數變更後

**重要：** 變更環境變數後，必須重新部署服務才會生效！

### 後端重新部署

```bash
cd backend
railway up --detach
```

### 前端重新部署

```bash
cd frontend
railway up --detach
```

或在 Railway Dashboard 中點擊 "Redeploy"。

---

## 🌍 多環境管理建議

建議為不同環境建立獨立的 Railway 專案或服務：

```
專案結構：
├── tattoo-crm-development
│   ├── backend-dev
│   └── frontend-dev
├── tattoo-crm-staging
│   ├── backend-staging
│   └── frontend-staging
└── tattoo-crm-production
    ├── backend-production
    └── frontend-production
```

### 環境變數對照表

| 變數 | Development | Staging | Production |
|------|------------|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `DATABASE_URL` | Dev DB | Staging DB | Production DB |
| `JWT_SECRET` | 開發用密鑰 | Staging 密鑰 | Production 密鑰（最強） |
| `CORS_ORIGIN` | `*` | Staging 網域 | Production 網域 |

---

## 🆘 常見問題

### Q1: 如何查看已設定的環境變數？

```bash
railway variables
```

### Q2: 如何刪除環境變數？

```bash
railway variables delete VARIABLE_NAME
```

或在 Railway Dashboard 的 Variables 頁面中刪除。

### Q3: 環境變數沒有生效？

1. 確認變數名稱正確（包括大小寫）
2. 確認已重新部署服務
3. 檢查日誌確認變數已載入：`railway logs`

### Q4: 如何備份環境變數？

```bash
# 導出所有環境變數到檔案
railway variables > railway-variables-backup.txt

# 注意：這個檔案包含敏感資訊，不要提交到 Git！
```

### Q5: 前端的 NEXT_PUBLIC_ 變數在瀏覽器看不到？

確認：
1. 變數名稱以 `NEXT_PUBLIC_` 開頭
2. 已重新部署（環境變數在 build 時就被打包進去）
3. 使用 `process.env.NEXT_PUBLIC_VAR_NAME` 讀取

---

## 📚 相關文檔

- [Railway 環境變數文檔](https://docs.railway.app/develop/variables)
- [Next.js 環境變數指南](https://nextjs.org/docs/basic-features/environment-variables)
- [NestJS 配置管理](https://docs.nestjs.com/techniques/configuration)
- [Prisma 連線字串設定](https://www.prisma.io/docs/reference/database-reference/connection-urls)

