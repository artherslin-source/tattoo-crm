# 🗄️ 資料庫設置指南

## ⚠️ 重要說明

本專案支持兩種資料庫配置：

### 本地開發環境 - SQLite
- **資料庫類型**: SQLite
- **資料庫文件**: `backend/prisma/dev.db`
- **優點**: 簡單、快速、無需額外設置

### Railway 生產環境 - PostgreSQL
- **資料庫類型**: PostgreSQL
- **連接**: Railway 提供的 PostgreSQL 實例
- **優點**: 適合生產環境、支持並發連接

---

## 🔧 本地開發設置

### 步驟 1: 確認資料庫配置

確保 `backend/prisma/schema.prisma` 使用 SQLite：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 步驟 2: 確認環境變數

確保 `backend/.env` 包含：

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_ACCESS_SECRET="local-dev-secret-key-12345"
JWT_REFRESH_SECRET="local-dev-refresh-secret-key-67890"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:4001,http://localhost:3000"
```

### 步驟 3: 初始化資料庫

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 推送資料庫結構
npx prisma db push

# 填充測試數據
npx ts-node prisma/seed.ts
```

---

## 🌐 Railway 生產環境設置

### 步驟 1: 更新 schema.prisma

**注意**: 部署到 Railway 前，需要將 `schema.prisma` 改為 PostgreSQL：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 步驟 2: Railway 環境變數

確保在 Railway Dashboard 中設置：

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
JWT_ACCESS_SECRET=your-production-secret-key
JWT_REFRESH_SECRET=your-production-refresh-key
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=https://tattoo-crm-production.up.railway.app
```

### 步驟 3: 部署流程

```bash
# 1. 修改 schema.prisma 為 postgresql
# 2. 提交變更
git add backend/prisma/schema.prisma
git commit -m "chore: 更新資料庫配置為 PostgreSQL (Railway)"
git push origin main

# 3. Railway 會自動部署並執行：
# - npm run build
# - npx prisma db push --accept-data-loss
# - node dist/main.js
```

---

## 📊 測試帳號

種子腳本會創建以下測試帳號：

### 管理員帳號 (BOSS)
- **帳號**: `admin@test.com`
- **密碼**: `12345678`
- **權限**: 最高權限，可訪問所有功能

### 分店經理帳號
- **帳號**: `manager1@test.com`, `manager2@test.com`
- **密碼**: `12345678`
- **權限**: 管理所屬分店

### 刺青師帳號
- **帳號**: `artist1@test.com`, `artist2@test.com`, `artist3@test.com`
- **密碼**: `12345678`
- **權限**: 管理自己的預約和作品集

### 會員帳號
- **帳號**: `member1@test.com` ~ `member12@test.com`
- **密碼**: `12345678`
- **權限**: 一般會員功能

---

## 🔄 資料庫重置

### 本地開發環境

如果需要重置本地資料庫：

```bash
cd backend

# 刪除舊資料庫
rm prisma/dev.db

# 重新創建資料庫
npx prisma db push

# 重新填充數據
npx ts-node prisma/seed.ts
```

### Railway 生產環境

**警告**: 重置生產資料庫會刪除所有數據！

如果必須重置：
1. 在 Railway Dashboard 刪除並重新創建 PostgreSQL 服務
2. 更新後端服務的 `DATABASE_URL` 環境變數
3. 觸發重新部署

---

## 🛠️ 常用命令

### Prisma 命令

```bash
# 生成 Prisma Client
npx prisma generate

# 推送資料庫結構（用於開發）
npx prisma db push

# 創建遷移（用於生產）
npx prisma migrate dev --name migration_name

# 應用遷移到生產環境
npx prisma migrate deploy

# 打開資料庫管理介面
npx prisma studio

# 填充測試數據
npx ts-node prisma/seed.ts
```

---

## 📝 注意事項

1. **本地開發使用 SQLite**
   - 簡單快速
   - 不需要額外設置
   - 數據存儲在 `backend/prisma/dev.db`

2. **Railway 使用 PostgreSQL**
   - 適合生產環境
   - 支持並發
   - 需要修改 `schema.prisma`

3. **切換資料庫時記得**
   - 更新 `schema.prisma` 的 `provider`
   - 更新 `DATABASE_URL` 環境變數
   - 重新生成 Prisma Client (`npx prisma generate`)

4. **不要提交資料庫文件**
   - `dev.db` 已在 `.gitignore` 中
   - 每個開發者應該有自己的本地資料庫

---

## 🔍 故障排除

### 問題 1: "User not found" 登入錯誤

**原因**: 資料庫中沒有用戶數據

**解決**:
```bash
cd backend
npx ts-node prisma/seed.ts
```

### 問題 2: "provider 'postgresql' ... does not match ... 'sqlite'"

**原因**: `schema.prisma` 和 `DATABASE_URL` 不匹配

**解決**: 確保本地開發使用 SQLite 配置：
- `schema.prisma`: `provider = "sqlite"`
- `.env`: `DATABASE_URL="file:./prisma/dev.db"`

### 問題 3: Prisma Client 錯誤

**原因**: Prisma Client 需要重新生成

**解決**:
```bash
npx prisma generate
```

---

**最後更新**: 2025-10-09

