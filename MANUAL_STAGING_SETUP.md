# Railway Staging 環境手動設置指南

## 🎯 快速開始 - 3 步驟完成設置

### 步驟 1️⃣: 連結 Railway 專案

#### 後端連結

```bash
cd backend
railway link
```

**選擇：** `tattoo-crm-backend-staging`

#### 前端連結

```bash
cd ../frontend
railway link
```

**選擇：** `tattoo-crm-frontend-staging`

---

### 步驟 2️⃣: 設置環境變數

#### 2.1 生成 JWT Secret

```bash
# 在根目錄執行
openssl rand -base64 32
```

**複製輸出的字串**，下面會用到。

#### 2.2 設置後端環境變數

```bash
cd backend

# 設置 JWT Secret（替換成上面生成的）
railway variables set JWT_SECRET="YOUR_GENERATED_SECRET_HERE"

# 設置 Node 環境
railway variables set NODE_ENV="staging"

# 設置 CORS（替換成你的前端 URL）
railway variables set CORS_ORIGIN="https://your-frontend-staging.up.railway.app"

# 驗證設置
railway variables
```

**📝 注意：** `CORS_ORIGIN` 需要替換成實際的前端 Railway URL

#### 2.3 設置前端環境變數

```bash
cd ../frontend

# 設置後端 API URL（替換成你的後端 URL）
railway variables set NEXT_PUBLIC_API_BASE_URL="https://your-backend-staging.up.railway.app"

# 設置 Node 環境
railway variables set NODE_ENV="staging"

# 驗證設置
railway variables
```

**📝 注意：** `NEXT_PUBLIC_API_BASE_URL` 需要替換成實際的後端 Railway URL

---

### 步驟 3️⃣: 部署

#### 3.1 部署後端

```bash
cd backend
railway up
```

等待部署完成，查看日誌：

```bash
railway logs
```

**確認看到：**
```
✅ DATABASE_URL 驗證通過
📊 使用 PostgreSQL 資料庫
→ Running Prisma migrate deploy...
→ Running Prisma seed...
🚀 Server is running on port XXXX
```

#### 3.2 部署前端

```bash
cd ../frontend
railway up
```

等待部署完成，查看日誌：

```bash
railway logs
```

**確認看到：**
```
▲ Next.js 15.x.x
✓ Ready in XXXms
```

---

## 🔍 獲取 Railway URLs

如果你不知道後端和前端的 URL：

### 方法 1: 使用 CLI

```bash
# 後端
cd backend
railway status

# 前端
cd ../frontend
railway status
```

### 方法 2: 使用 Dashboard

1. 前往 [Railway Dashboard](https://railway.app)
2. 選擇專案
3. 點擊服務
4. 在 "Deployments" 或 "Settings" 標籤中查看 URL

---

## ✅ 驗證部署

### 1. 測試後端

```bash
# 替換成你的後端 URL
curl https://your-backend-staging.up.railway.app/health
```

**預期回應：**
```json
{"status":"ok","timestamp":"2025-10-21T..."}
```

### 2. 測試前端

在瀏覽器開啟前端 URL，打開開發者工具（F12）：

**Console 應該顯示：**
```
🔍 API Base URL: https://your-backend-staging.up.railway.app
🔍 Current hostname: your-frontend-staging.up.railway.app
🔍 Environment: staging
```

### 3. 測試 API 連線

在前端嘗試登入或其他 API 操作，確認：
- ✅ 無 CORS 錯誤
- ✅ API 請求成功
- ✅ 資料正確載入

---

## 🔄 如果需要重新部署

```bash
# 後端
cd backend
railway up --detach

# 前端
cd frontend
railway up --detach
```

---

## 📊 監控部署

### 即時日誌

```bash
# 後端
cd backend
railway logs --tail 50

# 前端
cd frontend
railway logs --tail 50
```

### 查看環境變數

```bash
# 後端
cd backend
railway variables

# 前端
cd frontend
railway variables
```

---

## 🆘 常見問題

### Q: 找不到 DATABASE_URL？

Railway 會自動提供 PostgreSQL 的 `DATABASE_URL`。如果沒有：

1. 在 Railway Dashboard 中
2. 前往後端服務
3. 點擊 "New Variable"
4. 選擇 "Add a Database" → PostgreSQL
5. Railway 會自動設置 `DATABASE_URL`

### Q: CORS 錯誤？

確認後端的 `CORS_ORIGIN` 包含前端完整 URL：

```bash
cd backend
railway variables set CORS_ORIGIN="https://your-frontend-staging.up.railway.app"
railway up --detach  # 重新部署
```

### Q: 前端環境變數未載入？

Next.js 的環境變數在 build 時就被打包進去，所以：

1. 確認變數名稱以 `NEXT_PUBLIC_` 開頭
2. **必須重新部署**前端：
   ```bash
   cd frontend
   railway up --detach
   ```

### Q: Prisma Migration 失敗？

如果看到 migration 錯誤：

```bash
cd backend
railway run npx prisma migrate reset  # ⚠️ 會刪除資料
# 或
railway run npx prisma db push  # 同步 schema
```

---

## 📋 完整環境變數檢查清單

### 後端 (backend)

- [ ] `DATABASE_URL` - Railway 自動提供
- [ ] `JWT_SECRET` - 已生成並設置（至少 32 字元）
- [ ] `NODE_ENV` - 設為 `staging`
- [ ] `CORS_ORIGIN` - 設為前端 URL

### 前端 (frontend)

- [ ] `NEXT_PUBLIC_API_BASE_URL` - 設為後端 URL（含 https://）
- [ ] `NODE_ENV` - 設為 `staging`

---

## 🎉 完成後的測試清單

- [ ] 後端 `/health` 端點回應正常
- [ ] 前端網站可以開啟
- [ ] 前端 Console 顯示正確的 API URL
- [ ] 登入功能正常
- [ ] 可以載入資料（預約、訂單等）
- [ ] 無 CORS 錯誤
- [ ] 無 API 連線錯誤

---

## 📚 更多資訊

- [後端詳細指南](backend/README_STAGING.md)
- [前端詳細指南](frontend/README_STAGING_FRONTEND.md)
- [環境變數完整說明](RAILWAY_VARIABLES_STAGING.md)

