# 前端 Railway 部署指南

## 📋 前提條件

確保後端已經成功部署到 Railway，並且知道後端的 URL（例如：`https://your-backend.up.railway.app`）

## 🔧 環境變數設定

在 Railway 前端服務的 **Variables** 頁面，添加以下環境變數：

```bash
# 必須設定 - 後端 API URL
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app

# Node 環境
NODE_ENV=production
```

**重要提示：**
- `NEXT_PUBLIC_API_URL` 必須是完整的 URL（包含 `https://`）
- **不要**在結尾加上斜線 `/`
- 例如：`https://tattoo-backend.up.railway.app` ✅
- 錯誤：`https://tattoo-backend.up.railway.app/` ❌

## 🚀 部署步驟

### 1. 創建 Railway 專案（如果還沒有）

1. 登入 [Railway](https://railway.app)
2. 點擊 "New Project"
3. 選擇 "Deploy from GitHub repo"
4. 選擇你的 repository

### 2. 設定 Root Directory

1. 進入 Railway 前端服務設定
2. 找到 **Root Directory**
3. 設定為 `frontend`

### 3. 設定環境變數

按照上面的環境變數設定章節添加必要的變數。

### 4. 觸發部署

推送程式碼到 GitHub，Railway 會自動部署：

```bash
git add .
git commit -m "feat: 配置前端 Railway 部署"
git push origin main
```

## 🔍 驗證部署

### 1. 檢查建構日誌

在 Railway Dashboard 查看建構日誌，確保沒有錯誤。

### 2. 測試前端

打開 Railway 提供的 URL，檢查：
- ✅ 頁面能正常載入
- ✅ 能連接到後端 API
- ✅ 登入功能正常運作

### 3. 檢查 API 連線

打開瀏覽器的開發者工具（F12），查看 Network 標籤：
- 確認 API 請求指向正確的後端 URL
- 沒有 CORS 錯誤
- API 回應正常

## ⚠️ 常見問題

### Q1: CORS 錯誤

**症狀：**
```
Access to fetch at 'https://backend.railway.app/api/...' 
from origin 'https://frontend.railway.app' has been blocked by CORS policy
```

**解決方案：**
1. 確認後端的 `NODE_ENV` 設定為 `production`（生產環境預設允許所有來源）
2. 或在後端設定 `CORS_ORIGIN` 環境變數：
   ```bash
   CORS_ORIGIN=https://your-frontend.railway.app
   ```

### Q2: API 請求失敗

**症狀：**
```
NEXT_PUBLIC_API_URL is not set and no browser origin is available
```

**解決方案：**
1. 檢查 Railway 環境變數中是否有 `NEXT_PUBLIC_API_URL`
2. 確認變數值正確（包含 `https://`）
3. 重新觸發部署

### Q3: 環境變數沒有生效

**解決方案：**
1. Railway 的環境變數需要重新建構才會生效
2. 修改環境變數後，手動觸發重新部署
3. 確認變數名稱正確（Next.js 要求以 `NEXT_PUBLIC_` 開頭才能在客戶端使用）

### Q4: 建構時間過長

**解決方案：**
1. 檢查 `node_modules` 大小
2. 考慮使用 Railway 的快取功能
3. 優化 `package.json` 依賴

## 🎯 生產環境優化

### 1. 自訂域名

在 Railway 服務設定中：
1. 點擊 "Settings"
2. 找到 "Domains"
3. 添加你的自訂域名
4. 設定 DNS 記錄（Railway 會提供指示）

### 2. 環境變數管理

使用 Railway 的 Shared Variables 功能：
- 可在多個服務間共享變數
- 便於管理不同環境的配置

### 3. 效能優化

考慮添加以下環境變數：

```bash
# 啟用 Next.js 優化
NEXT_TELEMETRY_DISABLED=1

# 圖片優化
NEXT_SHARP_PATH=/tmp/node_modules/sharp
```

### 4. 監控與分析

- 使用 Railway 的內建日誌系統
- 考慮整合 Vercel Analytics 或 Google Analytics
- 設定錯誤追蹤（如 Sentry）

## 📱 完整部署檢查清單

部署前確認：

- [ ] 後端已成功部署並可訪問
- [ ] 已設定 `NEXT_PUBLIC_API_URL` 環境變數
- [ ] Root Directory 設定為 `frontend`
- [ ] 推送最新程式碼到 GitHub
- [ ] Railway 建構成功
- [ ] 前端頁面可以正常訪問
- [ ] API 連線正常，沒有 CORS 錯誤
- [ ] 登入/登出功能正常
- [ ] 所有主要功能可以運作

## 🔗 相關資源

- [Next.js 環境變數文件](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Railway 文件](https://docs.railway.app/)
- 後端部署指南：`backend/RAILWAY_DEPLOYMENT.md`
- 總體修復說明：`DEPLOYMENT_FIX_SUMMARY.md`

## 💡 提示

如果你使用 Vercel 部署前端而非 Railway：

1. 環境變數設定方式類似
2. 在 Vercel Dashboard 的 Settings → Environment Variables 添加
3. `NEXT_PUBLIC_API_URL` 設定為 Railway 後端 URL
4. Vercel 的建構和部署通常更快

無論使用哪個平台，確保前後端能正確通訊是關鍵！

