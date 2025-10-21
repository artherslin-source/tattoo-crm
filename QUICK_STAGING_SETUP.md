# 🚀 Railway Staging 環境 - 5 分鐘快速設置

## ⚡ 超快速設置（複製貼上即可）

### 第 1 步：連結 Railway 專案

```bash
# 在專案根目錄執行

# 連結後端
cd backend
railway link
# 👆 選擇: tattoo-crm-backend-staging

# 連結前端  
cd ../frontend
railway link
# 👆 選擇: tattoo-crm-frontend-staging

cd ..
```

### 第 2 步：獲取你的 Railway URLs

前往 [Railway Dashboard](https://railway.app)，找到你的 URLs：

1. 開啟 `tattoo-crm-backend-staging` 專案
2. 點擊服務名稱
3. 在 "Settings" 標籤下找到 "Domains"，複製 URL（例如：`tattoo-crm-backend-staging.up.railway.app`）
4. 對前端專案重複相同步驟

### 第 3 步：更新配置檔案

編輯 `.staging-config` 檔案，加入你的 URLs：

```bash
JWT_SECRET="Z6v7NfUZgaosvIDkxE8JyuZafRongFqMFvJwNLvg2xE="
NODE_ENV="staging"
BACKEND_URL="https://你的後端URL.up.railway.app"
FRONTEND_URL="https://你的前端URL.up.railway.app"
```

**⚠️ 重要：** 記得加上 `https://` 前綴！

### 第 4 步：設置環境變數並部署

```bash
# 設置後端環境變數
./setup-staging-simple.sh 2

# 設置前端環境變數
./setup-staging-simple.sh 3

# 部署
./setup-staging-simple.sh 4
```

### 第 5 步：驗證部署

```bash
# 測試後端（替換成你的 URL）
curl https://你的後端URL.up.railway.app/health

# 預期回應：{"status":"ok","timestamp":"..."}
```

在瀏覽器開啟前端 URL，測試登入功能。

---

## 📋 完整逐步指令（手動設置）

如果自動化腳本有問題，可以手動執行：

### 1. 連結專案

```bash
cd backend
railway link  # 選擇 tattoo-crm-backend-staging
cd ../frontend
railway link  # 選擇 tattoo-crm-frontend-staging
cd ..
```

### 2. 設置後端環境變數

```bash
cd backend

# 生成並設置 JWT Secret
railway variables set JWT_SECRET="$(openssl rand -base64 32)"

# 設置環境
railway variables set NODE_ENV="staging"

# 設置 CORS（替換成你的前端 URL）
railway variables set CORS_ORIGIN="https://你的前端URL.up.railway.app"

# 確認設置
railway variables
```

### 3. 設置前端環境變數

```bash
cd ../frontend

# 設置後端 API URL（替換成你的後端 URL）
railway variables set NEXT_PUBLIC_API_BASE_URL="https://你的後端URL.up.railway.app"

# 設置環境
railway variables set NODE_ENV="staging"

# 確認設置
railway variables
```

### 4. 部署

```bash
# 部署後端
cd backend
railway up

# 等待完成後，部署前端
cd ../frontend
railway up
```

---

## 🔍 如何找到 Railway URLs

### 方法 1：使用 CLI

```bash
# 後端
cd backend
railway status
# 查找 "Service URL" 或 "Deployment URL"

# 前端
cd ../frontend  
railway status
```

### 方法 2：使用 Dashboard

1. 前往 https://railway.app
2. 選擇 `tattoo-crm-backend-staging` 或 `tattoo-crm-frontend-staging`
3. 點擊服務
4. 前往 "Settings" → "Domains"
5. 複製顯示的 URL

### 方法 3：檢查最近的部署

1. 在 Railway Dashboard 中
2. 前往 "Deployments" 標籤
3. 查看最新的部署記錄
4. URL 會顯示在部署資訊中

---

## ✅ 驗證檢查清單

完成設置後，請確認：

### 後端檢查

```bash
# 1. 環境變數已設置
cd backend
railway variables

# 應該看到：
# - DATABASE_URL (Railway 自動提供)
# - JWT_SECRET (32+ 字元)
# - NODE_ENV=staging
# - CORS_ORIGIN (前端 URL)

# 2. 測試健康檢查
curl https://你的後端URL/health

# 3. 查看日誌
railway logs --tail 50

# 應該看到：
# ✅ DATABASE_URL 驗證通過
# → Running Prisma migrate deploy...
# 🚀 Server is running on port XXXX
```

### 前端檢查

```bash
# 1. 環境變數已設置
cd frontend
railway variables

# 應該看到：
# - NEXT_PUBLIC_API_BASE_URL (後端 URL)
# - NODE_ENV=staging

# 2. 查看日誌
railway logs --tail 50

# 應該看到：
# ▲ Next.js 15.x.x
# ✓ Ready in XXXms

# 3. 測試網站
open https://你的前端URL
```

### 瀏覽器檢查

開啟前端 URL，按 F12 打開開發者工具：

**Console 標籤應該顯示：**
```
🔍 API Base URL: https://你的後端URL.up.railway.app
🔍 Environment: staging
```

**Network 標籤：**
- 測試登入或其他功能
- 確認 API 請求發送到正確的後端 URL
- 無 CORS 錯誤

---

## 🆘 遇到問題？

### 問題 1: railway link 失敗

**錯誤：** `No linked project found`

**解決：**
```bash
railway login  # 重新登入
railway link   # 然後再次連結
```

### 問題 2: DATABASE_URL 未設置

**解決：** Railway 應該自動提供 PostgreSQL。如果沒有：

1. 前往 Railway Dashboard
2. 選擇後端服務
3. 點擊 "New" → "Database" → "Add PostgreSQL"
4. Railway 會自動設置 `DATABASE_URL`

### 問題 3: CORS 錯誤

**錯誤（瀏覽器 Console）：**
```
Access to fetch at '...' has been blocked by CORS policy
```

**解決：**
```bash
cd backend
railway variables set CORS_ORIGIN="https://你的前端URL"
railway up --detach  # 重新部署
```

### 問題 4: 前端顯示 localhost:4000

**原因：** 環境變數未設置或未重新 build

**解決：**
```bash
cd frontend
railway variables set NEXT_PUBLIC_API_BASE_URL="https://你的後端URL"
railway up --detach  # 必須重新部署
```

### 問題 5: Prisma Migration 失敗

**查看日誌：**
```bash
cd backend
railway logs
```

**如果看到 schema 錯誤：**
```bash
railway run npx prisma db push
```

---

## 📊 部署後監控

### 查看即時日誌

```bash
# 後端
cd backend
railway logs --tail 100

# 前端
cd frontend
railway logs --tail 100
```

### 查看部署狀態

```bash
railway status
```

### 重新部署

```bash
# 後端
cd backend
railway up --detach

# 前端
cd frontend
railway up --detach
```

---

## 🎯 下一步

部署成功後：

1. **測試所有功能**
   - 登入/登出
   - CRUD 操作
   - 檔案上傳
   - 權限控制

2. **設置監控**
   - Railway Dashboard 提供基本監控
   - 考慮加入錯誤追蹤（如 Sentry）

3. **備份資料庫**
   - Railway 提供自動備份
   - 可以手動匯出：`railway run npx prisma db pull`

4. **文檔化**
   - 記錄環境變數
   - 更新團隊文檔
   - 建立 runbook

---

## 📚 詳細文檔

- [後端部署詳解](backend/README_STAGING.md)
- [前端部署詳解](frontend/README_STAGING_FRONTEND.md)
- [環境變數完整說明](RAILWAY_VARIABLES_STAGING.md)
- [完整設置報告](STAGING_SETUP_COMPLETE.md)

---

## 💡 小技巧

### 快速查看所有環境變數

```bash
# 後端
cd backend && railway variables && cd ..

# 前端  
cd frontend && railway variables && cd ..
```

### 一鍵重新部署全部

```bash
cd backend && railway up --detach && cd ../frontend && railway up --detach && cd ..
```

### 同時查看兩個服務的日誌

開兩個終端視窗：

```bash
# 終端 1
cd backend && railway logs

# 終端 2
cd frontend && railway logs
```

---

**🎉 祝部署順利！如有問題，請參考詳細文檔或檢查 Railway 日誌。**

