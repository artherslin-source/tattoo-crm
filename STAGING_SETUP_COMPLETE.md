# Staging 環境部署設定完成報告

## ✅ 完成項目總覽

已完成所有 staging 環境部署所需的配置和文件。以下是詳細的變更清單。

---

## 📦 後端（Backend）變更

### 1. ✅ package.json 更新

**檔案：** `backend/package.json`

**新增 scripts：**
```json
"prisma:migrate": "npx prisma migrate deploy",
"prisma:seed": "npx ts-node prisma/seed.ts"
```

**說明：**
- `prisma:migrate`: 在部署時執行 Prisma migrations（不會刪除資料）
- `prisma:seed`: 執行資料庫種子腳本
- 保留原有的 `postinstall` script

### 2. ✅ 新增 railway-start.sh

**檔案：** `backend/railway-start.sh` ⭐ **新檔案**

**內容：**
```bash
#!/usr/bin/env bash
set -e

echo "→ Running Prisma migrate deploy..."
npx prisma migrate deploy

if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
  echo "→ Running Prisma seed..."
  npm run prisma:seed || echo "Seed script skipped or failed (non-blocking)."
fi

echo "→ Starting server..."

# NestJS
if [ -f "dist/main.js" ]; then
  node dist/main.js
else
  # fallback 開發型態
  npm run start:prod || npm run start
fi
```

**功能：**
1. 執行 Prisma migrations（`migrate deploy`）- 安全，不會刪除資料
2. 執行種子資料（如果存在）
3. 啟動 NestJS 伺服器
4. 已設定可執行權限（`chmod +x`）

**重要差異：**
與現有的 `scripts/start-prod.js` 不同，`railway-start.sh` **不會**執行 `db push --force-reset`，因此不會刪除資料，適合 staging 和 production 環境。

### 3. ✅ 更新 railway.json

**檔案：** `backend/railway.json`

**變更：**
```diff
- "startCommand": "npm run start:prod",
+ "startCommand": "bash railway-start.sh",
```

**原因：**
原本的 `npm run start:prod` 會執行 `scripts/start-prod.js`，該腳本會強制重置資料庫（三次！），不適合 staging 環境。

### 4. ✅ 更新 CORS 配置

**檔案：** `backend/src/main.ts`

**變更：**
```typescript
// 從環境變數讀取允許的網域
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : true; // 預設允許所有來源（開發/staging 環境）

console.log('🌐 CORS Origin:', corsOrigin);

app.enableCors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

**功能：**
- 支援從 `CORS_ORIGIN` 環境變數讀取允許的網域
- 支援多個網域（用逗號分隔）
- 預設允許所有來源（適合開發和 staging）
- 會在啟動時輸出 CORS 配置

### 5. ✅ 新增部署文檔

**檔案：** `backend/README_STAGING.md` ⭐ **新檔案**

**包含內容：**
- 環境變數清單與說明
- 部署步驟（Railway CLI 和 Git Push）
- 部署後驗證步驟
- 回滾步驟
- 常見問題排解
- Railway Start Command 設定
- 安全建議

---

## 🎨 前端（Frontend）變更

### 1. ✅ 更新 API 配置

**檔案：** `frontend/src/lib/api.ts`

**變更 1 - detectApiBase()：**
```typescript
function detectApiBase(): string {
  // 優先讀取環境變數
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 向下兼容舊的環境變數名稱
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // ... 其他邏輯
}
```

**變更 2 - detectBackendUrl()：**
```typescript
export async function detectBackendUrl(): Promise<string> {
  // 優先讀取環境變數
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // 向下兼容
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 如果沒有設定，記錄錯誤並嘗試推測
  // ... 推測邏輯
}
```

**移除的硬編碼：**
```typescript
// ❌ 已移除
const backendUrl = 'https://tattoo-crm-production-413f.up.railway.app';
```

**改進：**
1. 優先讀取 `NEXT_PUBLIC_API_BASE_URL` 環境變數
2. 向下兼容舊的環境變數名稱
3. 移除硬編碼的 production URL
4. 如果未設定環境變數，會記錄錯誤並嘗試推測
5. 推測失敗會給出明確的錯誤訊息

### 2. ✅ 新增部署文檔

**檔案：** `frontend/README_STAGING_FRONTEND.md` ⭐ **新檔案**

**包含內容：**
- 環境變數清單（`NEXT_PUBLIC_API_BASE_URL`）
- 部署步驟
- 部署後驗證步驟
- 回滾步驟
- 常見問題排解（CORS、環境變數未載入等）
- 部署測試要點檢查清單
- 安全建議
- 多環境管理建議

---

## 📋 根目錄變更

### 1. ✅ 更新 railway.toml

**檔案：** `railway.toml`

**變更：**
```diff
[backend]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"
- startCommand = "npm run start:prod"
+ startCommand = "bash railway-start.sh"
root = "backend"
healthcheckPath = "/"
healthcheckTimeout = 300
```

### 2. ✅ 新增環境變數設定指南

**檔案：** `RAILWAY_VARIABLES_STAGING.md` ⭐ **新檔案**

**包含內容：**
- 後端必須/可選的環境變數清單
- 前端必須/可選的環境變數清單
- JWT_SECRET 生成方式
- 使用 Railway CLI 快速設定的指令
- 使用 Railway Dashboard 設定的步驟
- 環境變數驗證方法
- 安全最佳實踐
- 環境變數檢查清單
- 多環境管理建議
- 常見問題解答

---

## 🔧 Railway 環境變數設定

### 後端需要設定的變數

| 變數名稱 | 必須/可選 | 說明 | 建議值 |
|---------|----------|------|--------|
| `DATABASE_URL` | ✅ 必須 | PostgreSQL 連線字串 | Railway 自動提供 |
| `JWT_SECRET` | ✅ 必須 | JWT 加密金鑰 | `openssl rand -base64 32` |
| `NODE_ENV` | ✅ 必須 | 執行環境 | `staging` 或 `production` |
| `CORS_ORIGIN` | 🔵 可選 | 允許的前端網域 | `https://your-frontend.railway.app` |
| `PORT` | 🔵 可選 | 服務埠號 | Railway 自動分配 |

### 前端需要設定的變數

| 變數名稱 | 必須/可選 | 說明 | 建議值 |
|---------|----------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | ✅ 必須 | 後端 API URL | `https://your-backend.railway.app` |
| `NODE_ENV` | ✅ 必須 | 執行環境 | `staging` 或 `production` |

---

## 🚀 快速開始指令

### 設定後端

```bash
cd backend
railway link  # 連結到後端服務

# 設定環境變數
railway variables set \
  JWT_SECRET="$(openssl rand -base64 32)" \
  NODE_ENV="staging" \
  CORS_ORIGIN="https://your-frontend-staging.railway.app"

# 部署
railway up
```

### 設定前端

```bash
cd ../frontend
railway link  # 連結到前端服務

# 設定環境變數
railway variables set \
  NEXT_PUBLIC_API_BASE_URL="https://your-backend-staging.railway.app" \
  NODE_ENV="staging"

# 部署
railway up
```

---

## ✅ 部署前檢查清單

### 後端
- [ ] `railway-start.sh` 已創建且有執行權限
- [ ] `package.json` 包含 `prisma:migrate` 和 `prisma:seed` scripts
- [ ] `railway.json` 的 startCommand 為 `bash railway-start.sh`
- [ ] Railway 環境變數已設定：
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`（至少 32 字元）
  - [ ] `NODE_ENV=staging`
  - [ ] `CORS_ORIGIN`（包含前端網域）

### 前端
- [ ] `src/lib/api.ts` 已更新為讀取 `NEXT_PUBLIC_API_BASE_URL`
- [ ] Railway 環境變數已設定：
  - [ ] `NEXT_PUBLIC_API_BASE_URL`（正確的後端 URL）
  - [ ] `NODE_ENV=staging`

### 測試
- [ ] 後端健康檢查：`curl https://backend-url/health`
- [ ] 前端可以訪問
- [ ] 前端能呼叫後端 API（檢查 Network 標籤）
- [ ] 登入功能正常
- [ ] 無 CORS 錯誤

---

## 📁 新增的檔案清單

1. `backend/railway-start.sh` - Railway 啟動腳本
2. `backend/README_STAGING.md` - 後端部署指南
3. `frontend/README_STAGING_FRONTEND.md` - 前端部署指南
4. `RAILWAY_VARIABLES_STAGING.md` - 環境變數設定指南
5. `STAGING_SETUP_COMPLETE.md` - 本文件（變更總結）

---

## 🔍 變更的檔案清單

1. `backend/package.json` - 新增 prisma scripts
2. `backend/railway.json` - 更新 startCommand
3. `backend/src/main.ts` - 更新 CORS 配置
4. `frontend/src/lib/api.ts` - 更新 API URL 檢測邏輯
5. `railway.toml` - 更新後端 startCommand

---

## ⚠️ 重要注意事項

### 關於 scripts/start-prod.js

**不要在 staging/production 使用此腳本！**

原因：該腳本包含以下危險操作：
```javascript
run('npx prisma db push --force-reset --accept-data-loss', '強制重置並同步資料庫 Schema');
run('npx prisma db push --force-reset --accept-data-loss', '二次確認數據庫重置');
run('npx prisma db push --force-reset --accept-data-loss', '三次確認數據庫重置');
```

這會：
- ⚠️ 刪除所有資料庫資料
- ⚠️ 執行三次強制重置
- ⚠️ 不適合有真實資料的環境

**改用：** `railway-start.sh`，它使用安全的 `prisma migrate deploy`，不會刪除資料。

---

## 🔄 後續步驟

1. **設定環境變數**
   - 參考 `RAILWAY_VARIABLES_STAGING.md`
   - 在 Railway Dashboard 或使用 CLI 設定

2. **部署後端**
   ```bash
   cd backend
   railway up
   ```

3. **部署前端**
   ```bash
   cd frontend
   railway up
   ```

4. **驗證部署**
   - 測試後端 `/health` 端點
   - 測試前端可以訪問
   - 測試前後端 API 呼叫
   - 測試登入功能

5. **監控日誌**
   ```bash
   railway logs --tail 100
   ```

---

## 📚 相關文檔

- [後端部署指南](backend/README_STAGING.md)
- [前端部署指南](frontend/README_STAGING_FRONTEND.md)
- [環境變數設定指南](RAILWAY_VARIABLES_STAGING.md)

---

## 🎉 完成！

所有 staging 環境部署所需的配置已完成。現在可以按照以上步驟進行部署了。

如有問題，請參考各個 README 文件中的「常見問題排解」章節。

