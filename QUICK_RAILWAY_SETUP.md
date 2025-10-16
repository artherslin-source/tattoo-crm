# Railway 快速設置指南

## 🚨 當前問題
**後端服務未部署到 Railway！** 只有前端服務在運行。

## ⚡ 快速解決方案（5 分鐘）

### 步驟 1：登入 Railway Dashboard
訪問：https://railway.app/dashboard

### 步驟 2：找到您的專案
點擊 `tattoo-crm` 專案

### 步驟 3：創建後端服務
1. 點擊右上角 **"+ New"** 按鈕
2. 選擇 **"GitHub Repo"**
3. 選擇倉庫：`artherslin-source/tattoo-crm`
4. **重要**：在 "Root Directory" 輸入：`backend`
5. 點擊 **"Deploy"**

### 步驟 4：設置環境變數（在新建的後端服務中）
點擊後端服務 → **"Variables"** 標籤 → 添加以下變數：

```
DATABASE_URL=postgresql://...（從現有 PostgreSQL 服務複製）
JWT_ACCESS_SECRET=tattoo-crm-access-secret-2025
JWT_REFRESH_SECRET=tattoo-crm-refresh-secret-2025
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://tattoo-crm-production.up.railway.app
PROTECT_REAL_DATA=true
RUN_SEED=false
```

### 步驟 5：獲取後端 URL
1. 等待部署完成（約 3-5 分鐘）
2. 在後端服務中點擊 **"Settings"** → **"Domains"**
3. 複製生成的 URL（例如：`backend-production-xxxx.up.railway.app`）

### 步驟 6：更新前端環境變數
1. 切換到前端服務
2. 點擊 **"Variables"** 標籤
3. 添加或更新：
```
NEXT_PUBLIC_API_URL=<後端 URL>
```
4. 前端會自動重新部署

### 步驟 7：驗證
1. 訪問後端 URL，應該看到：`{"message":"Tattoo CRM API is running"}`
2. 訪問前端，登入後應該能看到數據

## 🎯 檢查清單
- [ ] 後端服務已創建
- [ ] Root Directory 設置為 `backend`
- [ ] 所有環境變數已設置
- [ ] 後端部署成功
- [ ] 前端環境變數已更新
- [ ] 前端重新部署完成
- [ ] 可以訪問後端 API
- [ ] 前端數據正常顯示

## 📞 需要幫助？
如果遇到問題，請檢查：
1. Railway 部署日誌（有無錯誤）
2. 環境變數是否正確設置
3. 資料庫是否連接成功
4. CORS 配置是否正確

---
**預計完成時間：5-10 分鐘**
