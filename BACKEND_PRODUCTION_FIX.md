# 後端生產環境崩潰修復指南

## 🔴 問題摘要

**錯誤**: Prisma schema validation - Error code: P1012  
**原因**: DATABASE_URL 環境變數格式不正確，導致 Prisma 無法正確連接資料庫

## 🔍 根本原因分析

1. **Prisma Schema** 原本設定為 `sqlite` provider
2. **生產環境啟動腳本** (`start-prod.js`) 要求使用 PostgreSQL
3. **Railway 環境變數** 中的 `DATABASE_URL` 格式錯誤或使用了 SQLite 格式

## ✅ 已執行的修復

### 1. 更新 Prisma Schema
- **檔案**: `backend/prisma/schema.prisma`
- **變更**: 將 provider 從 `sqlite` 改為 `postgresql`

```prisma
datasource db {
  provider = "postgresql"  // 原本是 "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2. 改進生產環境啟動腳本
- **檔案**: `backend/scripts/start-prod.js`
- **變更**:
  - 使用 `prisma migrate deploy` 取代 `prisma db push`
  - 改善錯誤訊息，提供更清楚的設定指引
  - 新增 DATABASE_URL 驗證通過的確認訊息

## 🚀 Railway 部署步驟

### Step 1: 在 Railway 新增 PostgreSQL 資料庫

1. 登入 Railway Dashboard
2. 進入您的專案
3. 點擊 **"+ New"** → 選擇 **"Database"** → 選擇 **"PostgreSQL"**
4. Railway 會自動建立 PostgreSQL 服務

### Step 2: 設定後端服務的環境變數

1. 點選您的**後端服務** (backend)
2. 前往 **"Variables"** 標籤
3. 確認或新增以下環境變數：

```bash
# 必要環境變數
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway 自動提供
JWT_SECRET=your-secure-random-string-here
NODE_ENV=production
PORT=4000

# 可選環境變數
CORS_ORIGIN=https://your-frontend-url.railway.app
```

#### 📝 重要說明：

- `${{Postgres.DATABASE_URL}}` 是 Railway 的特殊語法，會自動引用 PostgreSQL 服務的連線字串
- 如果您的 PostgreSQL 服務名稱不是 "Postgres"，請相應調整（例如：`${{PostgreSQL.DATABASE_URL}}`）
- `JWT_SECRET` 請使用強密碼生成器產生，至少 32 個字元

### Step 3: 執行資料庫遷移

由於從 SQLite 轉換到 PostgreSQL，需要重新建立資料庫結構：

**選項 A: 透過 Railway Dashboard** (推薦)

1. 在 Railway 後端服務的 **"Deployments"** 標籤
2. 點擊最新的部署，查看日誌
3. 系統會自動執行 `prisma migrate deploy`
4. 確認部署成功

**選項 B: 本地執行遷移** (進階)

```bash
cd backend

# 建立新的 migration
npx prisma migrate dev --name init_postgresql

# 推送到 Railway
git add .
git commit -m "Migration to PostgreSQL"
git push origin main
```

### Step 4: 重新部署

修改完成後，推送程式碼：

```bash
git add .
git commit -m "Fix: Update database to PostgreSQL for production"
git push origin main
```

Railway 會自動觸發重新部署。

## 🔄 本地開發環境設定

本地開發仍然使用 SQLite，請確保本地的 `.env` 檔案：

```bash
# backend/.env (本地開發)
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="local-development-secret"
PORT=4000
NODE_ENV=development
```

## 📊 驗證部署成功

### 1. 檢查 Railway 日誌

在 Railway Dashboard 中查看部署日誌，應該看到：

```
✅ DATABASE_URL 驗證通過
📊 使用 PostgreSQL 資料庫
▶ 生成 Prisma Client
▶ 編譯 TypeScript 專案
▶ 執行資料庫遷移
▶ 匯入預設種子資料
▶ 啟動 NestJS 伺服器
🚀 Server is running on port 4000
```

### 2. 測試 API 端點

使用後端的公開 URL 測試：

```bash
# 健康檢查
curl https://your-backend.railway.app/

# 測試登入 API
curl -X POST https://your-backend.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

## 🛠️ 故障排除

### 問題 1: DATABASE_URL 格式錯誤

**症狀**: 仍然看到 "the URL must start with the protocol `file:`" 錯誤

**解決方法**:
1. 檢查 Railway 環境變數中的 `DATABASE_URL`
2. 確認格式為 `postgresql://user:password@host:port/database`
3. 或使用 Railway 變數引用：`${{Postgres.DATABASE_URL}}`

### 問題 2: Migration 失敗

**症狀**: "Prisma migrate" 命令失敗

**解決方法**:
```bash
# 重置並重新建立 migrations
cd backend
rm -rf prisma/migrations
npx prisma migrate dev --name init_postgresql
git add .
git commit -m "Reset migrations for PostgreSQL"
git push origin main
```

### 問題 3: 種子資料匯入失敗

**症狀**: `npx ts-node prisma/seed.ts` 失敗

**解決方法**:
1. 檢查 `prisma/seed.ts` 是否與 PostgreSQL 相容
2. 暫時註解掉 `start-prod.js` 中的 seed 步驟
3. 手動在 Railway 執行 seed (透過 CLI 或直接修改資料庫)

## 📚 相關文件

- [Prisma PostgreSQL 設定指南](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Railway PostgreSQL 文件](https://docs.railway.app/databases/postgresql)
- [NestJS 生產環境部署](https://docs.nestjs.com/techniques/database#production)

## ⚠️ 注意事項

1. **資料遷移**: 從 SQLite 轉換到 PostgreSQL 時，現有資料需要手動遷移
2. **型別差異**: SQLite 和 PostgreSQL 在某些資料型別上有差異，請檢查 schema
3. **備份**: 在執行任何資料庫變更前，請先備份重要資料
4. **環境隔離**: 確保本地開發（SQLite）和生產環境（PostgreSQL）的設定檔案正確分離

## 🎉 完成確認清單

- [ ] Prisma schema 已更新為 `postgresql`
- [ ] Railway 已新增 PostgreSQL 服務
- [ ] 環境變數 `DATABASE_URL` 正確設定
- [ ] 環境變數 `JWT_SECRET` 已設定
- [ ] 程式碼已推送到 Railway
- [ ] 部署日誌顯示成功
- [ ] API 端點可以正常訪問
- [ ] 資料庫連線正常
- [ ] 種子資料已匯入

---

**修復日期**: 2025-10-14  
**修復人員**: AI Assistant  
**版本**: v1.0

