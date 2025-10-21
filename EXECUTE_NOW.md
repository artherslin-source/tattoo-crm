# 🚀 立即執行部署 - 最終步驟

## ✅ 已完成的配置

我已經幫你完成：
- ✅ 所有程式碼配置
- ✅ Railway 專案連結（backend 和 frontend）
- ✅ JWT Secret 生成
- ✅ 部署腳本創建
- ✅ 完整文檔

## 🎯 現在只需 2 個手動步驟

Railway CLI 的某些操作需要互動式選擇，所以需要你手動執行最後兩個步驟。

---

## 步驟 1️⃣：創建或選擇 Railway 服務

### 後端服務

```bash
cd backend
railway service
```

**會看到選項：**
- 如果有現有服務：選擇對應的服務
- 如果沒有服務：選擇 "Create a new service" 並命名為 `backend`

### 前端服務

```bash
cd ../frontend
railway service
```

**會看到選項：**
- 如果有現有服務：選擇對應的服務
- 如果沒有服務：選擇 "Create a new service" 並命名為 `frontend`

```bash
cd ..
```

---

## 步驟 2️⃣：一鍵部署

### 方法 A：使用我創建的部署腳本（推薦）

```bash
# 部署後端
./deploy-backend.sh

# 等待後端部署完成（約 2-3 分鐘）

# 部署前端
./deploy-frontend.sh
```

### 方法 B：手動執行

```bash
# 後端
cd backend

# 設置環境變數
railway variables --set "JWT_SECRET=Z6v7NfUZgaosvIDkxE8JyuZafRongFqMFvJwNLvg2xE="
railway variables --set "NODE_ENV=staging"

# 如果知道前端 URL，設置 CORS
# railway variables --set "CORS_ORIGIN=https://你的前端URL"

# 部署
railway up --detach

cd ..

# 前端
cd frontend

# 設置環境變數
railway variables --set "NODE_ENV=staging"

# 如果知道後端 URL，設置 API URL
# railway variables --set "NEXT_PUBLIC_API_BASE_URL=https://你的後端URL"

# 部署
railway up --detach

cd ..
```

---

## 🔍 獲取 Railway URLs

部署完成後，獲取服務 URLs：

```bash
# 後端 URL
cd backend
railway domain

# 前端 URL
cd ../frontend
railway domain
```

如果命令失敗，前往 [Railway Dashboard](https://railway.app)：
1. 選擇專案
2. 點擊服務
3. 在 "Settings" → "Domains" 查看 URL

---

## 🔄 如果需要設置 CORS 和 API URL

在獲得 URLs 後：

### 更新後端 CORS

```bash
cd backend
railway variables --set "CORS_ORIGIN=https://你的前端URL"
railway up --detach
cd ..
```

### 更新前端 API URL

```bash
cd frontend
railway variables --set "NEXT_PUBLIC_API_BASE_URL=https://你的後端URL"
railway up --detach
cd ..
```

---

## ✅ 驗證部署

### 1. 檢查後端

```bash
# 查看日誌
cd backend
railway logs --tail 50

# 測試健康檢查（替換成實際 URL）
curl https://你的後端URL/health
```

**預期看到：**
```
✅ DATABASE_URL 驗證通過
→ Running Prisma migrate deploy...
→ Running Prisma seed...
🚀 Server is running on port XXXX
```

### 2. 檢查前端

```bash
# 查看日誌
cd frontend
railway logs --tail 50
```

**預期看到：**
```
▲ Next.js 15.x.x
✓ Ready in XXXms
```

### 3. 測試網站

開啟前端 URL，按 F12：

**Console 應顯示：**
```
🔍 API Base URL: https://你的後端URL
🔍 Environment: staging
```

---

## 🆘 遇到問題？

### 問題：找不到服務

```bash
cd backend  # 或 frontend
railway service
# 選擇或創建服務
```

### 問題：DATABASE_URL 未設置

```bash
cd backend
railway service
# 然後在 Railway Dashboard 中添加 PostgreSQL 服務
```

步驟：
1. 前往 Railway Dashboard
2. 選擇 `tattoo-crm-backend-staging` 專案
3. 點擊 "New" → "Database" → "Add PostgreSQL"
4. Railway 會自動設置 `DATABASE_URL`

### 問題：CORS 錯誤

確保後端的 `CORS_ORIGIN` 包含前端完整 URL：

```bash
cd backend
railway variables --set "CORS_ORIGIN=https://完整的前端URL.up.railway.app"
railway up --detach
```

---

## 📊 監控部署

### 即時日誌

```bash
# 後端
cd backend && railway logs

# 前端（新終端窗口）
cd frontend && railway logs
```

### 查看所有環境變數

```bash
# 後端
cd backend && railway variables

# 前端
cd frontend && railway variables
```

---

## 🎯 完整檢查清單

### 後端部署

- [ ] 已執行 `railway service` 選擇/創建服務
- [ ] 已設置 `JWT_SECRET`
- [ ] 已設置 `NODE_ENV=staging`
- [ ] 已執行 `railway up`
- [ ] 部署成功（檢查日誌）
- [ ] `/health` 端點回應正常
- [ ] 獲得後端 URL
- [ ] 已設置 `CORS_ORIGIN`（用前端 URL）

### 前端部署

- [ ] 已執行 `railway service` 選擇/創建服務
- [ ] 已設置 `NODE_ENV=staging`
- [ ] 已設置 `NEXT_PUBLIC_API_BASE_URL`（用後端 URL）
- [ ] 已執行 `railway up`
- [ ] 部署成功（檢查日誌）
- [ ] 網站可以開啟
- [ ] Console 顯示正確的 API URL
- [ ] 無 CORS 錯誤

### 功能測試

- [ ] 可以登入
- [ ] 資料載入正常
- [ ] API 呼叫成功
- [ ] 無錯誤訊息

---

## 💡 快速命令參考

```bash
# 選擇服務
cd backend && railway service
cd frontend && railway service

# 部署（方法 1 - 使用腳本）
./deploy-backend.sh
./deploy-frontend.sh

# 部署（方法 2 - 手動）
cd backend && railway up --detach
cd frontend && railway up --detach

# 查看日誌
cd backend && railway logs
cd frontend && railway logs

# 查看 URL
cd backend && railway domain
cd frontend && railway domain

# 查看環境變數
cd backend && railway variables
cd frontend && railway variables

# 重新部署
cd backend && railway up --detach
cd frontend && railway up --detach
```

---

## 🚀 開始執行

**現在就執行這兩個命令開始部署：**

```bash
# 1. 選擇服務
cd backend && railway service && cd ..
cd frontend && railway service && cd ..

# 2. 部署
./deploy-backend.sh
./deploy-frontend.sh
```

**🎉 就這麼簡單！**

---

## 📚 需要更多幫助？

- [完整設置指南](STAGING_SETUP_COMPLETE.md)
- [快速設置指南](QUICK_STAGING_SETUP.md)
- [環境變數說明](RAILWAY_VARIABLES_STAGING.md)
- [後端部署指南](backend/README_STAGING.md)
- [前端部署指南](frontend/README_STAGING_FRONTEND.md)

