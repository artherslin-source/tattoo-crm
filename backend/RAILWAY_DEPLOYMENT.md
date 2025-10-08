# Railway 部署指南

## 問題診斷

之前的部署失敗是因為 Railway 沒有執行建構步驟，導致 `dist/main.js` 檔案不存在。

## 已修復的問題

1. ✅ 創建了 `railway.json` - 明確指定建構和啟動命令
2. ✅ 創建了 `nixpacks.toml` - Railway 的建構系統配置
3. ✅ 更新了 `package.json` - 添加 `postinstall` 和更新 `start:prod` scripts

## 部署步驟

### 1. 在 Railway 設定環境變數

進入 Railway 專案的 Variables 設定，添加以下環境變數：

```bash
# 必須設定的環境變數
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=your-very-secret-jwt-key-here
PORT=4000
NODE_ENV=production
```

### 2. 如果使用 PostgreSQL（推薦用於生產環境）

如果你想使用 PostgreSQL 而非 SQLite：

1. 在 Railway 中添加 PostgreSQL 服務
2. 將 `DATABASE_URL` 設定為 Railway 提供的 PostgreSQL 連接字串
3. 更新 `prisma/schema.prisma`：

```prisma
datasource db {
  provider = "postgresql"  // 改成 postgresql
  url      = env("DATABASE_URL")
}
```

4. 重新生成 migration：
```bash
npx prisma migrate dev --name switch_to_postgresql
```

### 3. 提交並推送更改

```bash
git add .
git commit -m "fix: Add Railway deployment configuration"
git push origin main
```

### 4. Railway 會自動部署

Railway 會檢測到新的配置並：
1. 執行 `npm install`（會觸發 `postinstall` script，生成 Prisma Client）
2. 執行 `npm run build`（編譯 TypeScript 並生成 Prisma Client）
3. 執行 `npm run start:prod`（運行資料庫 migrations 並啟動應用）

## 驗證部署

部署成功後，你可以通過以下方式驗證：

1. 檢查 Railway 日誌，應該會看到：
   ```
   Application is running on: http://[host]:[port]
   ```

2. 測試 API endpoint：
   ```bash
   curl https://your-railway-app.railway.app/api
   ```

## 常見問題

### Q: 還是看到 "Cannot find module '/app/dist/main.js'" 錯誤？

**A:** 確保：
1. `railway.json` 和 `nixpacks.toml` 在 `backend` 資料夾的根目錄
2. Railway 設定中的 Root Directory 設定為 `backend`
3. 重新觸發部署（可以在 Railway Dashboard 手動重新部署）

### Q: Prisma 相關錯誤？

**A:** 確保在 Railway 中設定了正確的 `DATABASE_URL` 環境變數

### Q: Port 相關錯誤？

**A:** Railway 會自動提供 `PORT` 環境變數，確保你的應用監聽 `process.env.PORT || 4000`

## 下一步優化建議

1. **使用 PostgreSQL**: SQLite 不適合生產環境，建議切換到 PostgreSQL
2. **設定 CORS**: 確保前端可以正確連接到後端 API
3. **添加健康檢查**: 添加 `/health` endpoint 用於監控
4. **環境變數管理**: 使用 Railway 的 Shared Variables 功能管理環境變數
5. **設定 Custom Domain**: 為你的 API 設定自訂域名

