# Railway 後端部署問題診斷與解決方案

## 🚨 問題確認

### 當前狀態
- ✅ **前端服務**：`https://tattoo-crm-production.up.railway.app` - 正常運行
- ❌ **後端服務**：`https://tattoo-crm-backend-production.up.railway.app` - 不存在（404）

### 根本原因
**Railway 只部署了前端服務，後端服務從未被創建或部署。**

在 Railway 的 Monorepo 架構中，每個服務需要單獨配置和部署。單純推送代碼不會自動創建新服務。

## 📋 完整解決方案

### 方案 A：手動在 Railway Dashboard 創建後端服務（推薦）

#### 步驟 1：登入 Railway Dashboard
1. 訪問：https://railway.app/dashboard
2. 選擇專案：`tattoo-crm`

#### 步驟 2：創建新服務
1. 點擊 **"+ New"** 或 **"Add Service"**
2. 選擇 **"GitHub Repo"**
3. 選擇您的倉庫：`artherslin-source/tattoo-crm`
4. 選擇分支：`main`

#### 步驟 3：配置後端服務
1. **服務名稱**：`backend` 或 `tattoo-crm-backend`
2. **Root Directory**：設置為 `/backend`（重要！）
3. **Build Command**：`npm run build`
4. **Start Command**：`npm run start:prod`

#### 步驟 4：設置環境變數
必須設置以下環境變數：

```bash
# 資料庫連接
DATABASE_URL=<Railway PostgreSQL 連接字串>

# JWT 密鑰
JWT_ACCESS_SECRET=<生成的密鑰>
JWT_REFRESH_SECRET=<生成的密鑰>

# 環境設定
NODE_ENV=production
PORT=4000

# CORS 設定
CORS_ORIGIN=https://tattoo-crm-production.up.railway.app

# 數據保護（可選）
PROTECT_REAL_DATA=true
RUN_SEED=false
```

#### 步驟 5：連接資料庫
1. 如果已有 PostgreSQL 服務：
   - 點擊 **"Variables"** 標籤
   - 點擊 **"Add Reference"**
   - 選擇 PostgreSQL 服務
   - 選擇 `DATABASE_URL`

2. 如果沒有 PostgreSQL：
   - 點擊 **"+ New"**
   - 選擇 **"Database"** → **"PostgreSQL"**
   - 連接到後端服務

#### 步驟 6：獲取後端服務 URL
1. 部署完成後，在服務設置中找到 **"Settings"** → **"Domains"**
2. 複製生成的 URL（例如：`https://tattoo-crm-backend-production.up.railway.app`）

#### 步驟 7：更新前端環境變數
在前端服務中設置：
```bash
NEXT_PUBLIC_API_URL=<後端服務 URL>
```

### 方案 B：使用 Railway CLI（需要認證）

```bash
# 1. 安裝 Railway CLI
npm install -g @railway/cli

# 2. 登入
railway login

# 3. 連接專案
railway link

# 4. 創建後端服務
cd backend
railway up --service backend

# 5. 設置環境變數
railway variables --set DATABASE_URL=<連接字串>
railway variables --set JWT_ACCESS_SECRET=<密鑰>
railway variables --set JWT_REFRESH_SECRET=<密鑰>
railway variables --set NODE_ENV=production
railway variables --set PORT=4000
railway variables --set CORS_ORIGIN=https://tattoo-crm-production.up.railway.app
```

## 🔍 驗證部署

### 1. 檢查後端健康狀態
```bash
curl https://tattoo-crm-backend-production.up.railway.app
```
應該返回：`{"message":"Tattoo CRM API is running"}`

### 2. 檢查後端 API
```bash
curl https://tattoo-crm-backend-production.up.railway.app/api
```
應該返回：`{"message":"Welcome to Tattoo CRM API"}`

### 3. 檢查資料庫連接
```bash
curl https://tattoo-crm-backend-production.up.railway.app/health
```
應該返回：`{"status":"ok","database":"connected"}`

### 4. 測試前端數據獲取
訪問：https://tattoo-crm-production.up.railway.app/admin/services
應該能看到服務列表數據

## 📝 重要提醒

1. **Monorepo 架構**：Railway 不會自動檢測多個服務，必須手動配置每個服務的根目錄
2. **環境變數隔離**：前端和後端的環境變數是分開的，需要分別設置
3. **資料庫共享**：前端和後端應該連接到同一個 PostgreSQL 資料庫
4. **CORS 配置**：後端的 CORS 必須允許前端的域名訪問
5. **域名配置**：確保前端知道後端的正確 URL（通過 `NEXT_PUBLIC_API_URL`）

## 🎯 預期結果

配置完成後：
- ✅ 後端服務獨立運行
- ✅ 前端可以訪問後端 API
- ✅ 數據正常顯示在管理頁面
- ✅ 用戶可以正常操作（登入、新增、修改、刪除）

## 📞 故障排除

### 問題：後端服務 404
- 確認後端服務已創建並部署
- 檢查服務 URL 是否正確
- 查看 Railway 部署日誌

### 問題：前端無法獲取數據
- 檢查 `NEXT_PUBLIC_API_URL` 環境變數
- 檢查後端 CORS 配置
- 檢查瀏覽器控制台的網絡請求

### 問題：資料庫連接失敗
- 確認 `DATABASE_URL` 正確
- 檢查 PostgreSQL 服務狀態
- 確認後端有權限訪問資料庫

### 問題：認證失敗
- 確認 JWT 密鑰已設置
- 檢查前後端的 JWT 配置一致
- 清除瀏覽器 Cookie 和 LocalStorage

## ✅ 下一步

完成後端部署後，請：
1. 驗證所有 API 端點可訪問
2. 測試前端管理頁面功能
3. 確認數據正確顯示
4. 測試用戶操作流程（登入、CRUD）

