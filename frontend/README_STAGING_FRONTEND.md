# Frontend Staging 部署指南

本文件說明如何將前端（Next.js）部署到 Railway 的 staging 環境。

## 📋 必要環境變數清單

在 Railway 專案的 Variables 頁面中，需要設定以下環境變數：

### 必須設定的變數

| 變數名稱 | 說明 | 範例值 |
|---------|------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | 後端 API 完整 URL | `https://your-backend.railway.app` |
| `NODE_ENV` | 執行環境 | `staging` 或 `production` |

### 可選變數

| 變數名稱 | 說明 | 預設值 | 範例值 |
|---------|------|-------|-------|
| `PORT` | 服務埠號 | `3000` | Railway 會自動分配，通常不需設定 |

### Railway 自動提供的變數

以下變數由 Railway 自動設定，無需手動配置：
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE_NAME`
- `RAILWAY_PROJECT_NAME`

## 🔧 部署前檢查清單

### 1. 確認 API 配置

已修改 `src/lib/api.ts`，現在會優先讀取 `NEXT_PUBLIC_API_BASE_URL` 環境變數：

```typescript
// 優先讀取環境變數
if (process.env.NEXT_PUBLIC_API_BASE_URL) {
  return process.env.NEXT_PUBLIC_API_BASE_URL;
}
```

### 2. 確認 package.json scripts

目前的 scripts 配置：
- ✅ `build`: `next build`
- ✅ `start`: `next start -H 0.0.0.0 -p $PORT`

### 3. 確認 Next.js 配置

檢查 `next.config.js` 或 `next.config.ts`，確認沒有硬編碼的 API URL。

## 🚀 部署步驟

### 方法一：使用 Railway CLI（推薦）

```bash
# 1. 切換到前端目錄
cd frontend

# 2. 確認已連結到正確的 Railway 專案
railway status

# 3. 設定環境變數（首次部署）
railway variables set NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app

# 4. 部署到 staging 環境
railway up

# 5. 查看部署日誌
railway logs
```

### 方法二：使用 Railway Dashboard

1. 登入 Railway Dashboard
2. 選擇前端服務
3. 前往 "Variables" 頁面
4. 新增 `NEXT_PUBLIC_API_BASE_URL` 變數
5. 前往 "Deployments" 頁面
6. 點擊 "Deploy" 或推送程式碼觸發部署

## 📊 部署後驗證

### 1. 檢查服務狀態

```bash
# 查看 Railway 日誌
railway logs --tail 50

# 應該看到：
# ▲ Next.js 15.x.x
# - Local:        http://0.0.0.0:XXXX
# ✓ Ready in XXXms
```

### 2. 檢查環境變數載入

在瀏覽器開發者工具的 Console 中，應該會看到：

```
🔍 API Base URL: https://your-backend.railway.app
🔍 Current hostname: your-frontend.railway.app
🔍 Environment: production
```

### 3. 測試前後端連線

1. 開啟前端網站：`https://your-frontend.railway.app`
2. 打開瀏覽器開發者工具（F12）
3. 前往 Network 標籤
4. 嘗試登入或其他 API 操作
5. 確認請求發送到正確的後端 URL

### 4. 檢查 API 呼叫

```bash
# 在瀏覽器 Console 中執行
console.log('API Base:', process.env.NEXT_PUBLIC_API_BASE_URL);

# 或查看 Network 標籤中的請求 URL
```

## 🔄 回滾步驟

如果部署失敗，可以快速回滾：

```bash
# 使用 Railway CLI 回滾
railway rollback

# 或在 Railway Dashboard 中：
# 1. 前往專案的 Deployments 頁面
# 2. 找到上一個成功的部署
# 3. 點擊 "Redeploy" 按鈕
```

## 🔍 常見問題排解

### 問題 1: API 請求失敗（CORS 錯誤）

**錯誤訊息（Console）：**
```
Access to fetch at 'https://backend...' from origin 'https://frontend...' 
has been blocked by CORS policy
```

**解決方法：**
1. 確認後端的 CORS 設定包含前端網域
2. 在後端 Railway Variables 中設定：
   ```
   CORS_ORIGIN=https://your-frontend.railway.app
   ```
3. 重新部署後端

### 問題 2: 環境變數未載入

**症狀：**
- Console 顯示 `API Base URL: http://localhost:4000`
- 或推測的錯誤後端 URL

**解決方法：**
1. 確認在 Railway Variables 中設定了 `NEXT_PUBLIC_API_BASE_URL`
2. 注意：Next.js 的環境變數必須以 `NEXT_PUBLIC_` 開頭才能在瀏覽器中使用
3. 重新部署前端（環境變數變更需要重新 build）

```bash
# 重新部署
railway up --detach
```

### 問題 3: 建置失敗

**錯誤訊息：**
```
Error: Failed to compile
```

**解決方法：**
```bash
# 在本地測試建置
npm run build

# 檢查 TypeScript 錯誤
npm run lint

# 修正錯誤後重新部署
```

### 問題 4: 404 或路由錯誤

**症狀：**
- 重新整理頁面後出現 404
- 動態路由不工作

**解決方法：**
這是 Next.js 的正常行為，確認：
1. 使用 `next start` 而非靜態輸出
2. Railway 的 Start Command 正確：`next start -H 0.0.0.0 -p $PORT`

## 🎯 部署測試要點

部署完成後，測試以下功能：

### 基本功能
- [ ] 首頁載入正常
- [ ] 靜態資源（圖片、CSS）載入正常
- [ ] 頁面路由導航正常

### API 整合
- [ ] 登入功能正常
- [ ] 資料載入正常（例如：預約列表、訂單列表）
- [ ] 表單提交正常（例如：新增預約、編輯資料）
- [ ] 檔案上傳正常（如果有）

### 瀏覽器相容性
- [ ] Chrome/Edge 正常
- [ ] Firefox 正常  
- [ ] Safari 正常（如果目標用戶使用 Mac/iOS）

### 效能檢查
- [ ] 首次載入時間 < 3 秒
- [ ] API 回應時間合理
- [ ] 無明顯的渲染延遲

## 📝 Railway Start Command 設定

Railway 會自動偵測 Next.js 專案，但如果需要手動設定：

在 Railway 專案設定中，Start Command 應為：

```bash
next start -H 0.0.0.0 -p $PORT
```

或在 `railway.json` 中設定：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🔐 安全建議

1. **環境變數保護**：
   - 不要在程式碼中硬編碼 API URL 或其他敏感資訊
   - 使用 `NEXT_PUBLIC_` 前綴的變數會暴露給瀏覽器，不要用於敏感資料

2. **HTTPS**：
   - Railway 自動提供 HTTPS，確保所有 API 呼叫使用 HTTPS

3. **CSP（內容安全策略）**：
   - 考慮在 `next.config.js` 中設定 CSP headers

## 🌐 多環境管理

建議為不同環境建立不同的 Railway 服務：

```bash
# 開發環境
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Staging 環境
NEXT_PUBLIC_API_BASE_URL=https://backend-staging.railway.app

# Production 環境
NEXT_PUBLIC_API_BASE_URL=https://backend-production.railway.app
```

## 📚 相關資源

- [Next.js 部署文檔](https://nextjs.org/docs/deployment)
- [Railway Next.js 部署指南](https://docs.railway.app/guides/nextjs)
- [環境變數最佳實踐](https://nextjs.org/docs/basic-features/environment-variables)

## 🆘 需要幫助？

- 查看 Railway 日誌：`railway logs`
- 檢查環境變數：`railway variables`
- 查看建置日誌：`railway logs --deployment`
- Next.js 建置分析：`npm run build -- --debug`

## 🔄 持續整合（CI/CD）

建議設定自動部署：

1. **GitHub 整合**：
   - 在 Railway Dashboard 中連結 GitHub repository
   - 每次推送到指定分支自動部署

2. **環境分支策略**：
   ```
   main -> Production 環境
   staging -> Staging 環境  
   develop -> Development 環境
   ```

3. **部署前檢查**：
   - 設定 GitHub Actions 執行測試
   - 測試通過後才部署到 Railway

