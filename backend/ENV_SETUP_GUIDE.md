# 環境變數設定指南

## 📋 環境變數清單

### 必要變數

| 變數名稱 | 說明 | 本地開發範例 | 生產環境範例 |
|---------|------|------------|-------------|
| `DATABASE_URL` | 資料庫連線字串 | `file:./prisma/dev.db` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | JWT 加密密鑰 | `dev-secret-key` | 32+ 字元的隨機字串 |
| `NODE_ENV` | 執行環境 | `development` | `production` |
| `PORT` | 伺服器埠號 | `4000` | `4000` |

### 可選變數

| 變數名稱 | 說明 | 預設值 | 範例 |
|---------|------|-------|------|
| `CORS_ORIGIN` | 允許的前端來源 | `http://localhost:3000` | `https://app.example.com` |

## 🖥️ 本地開發環境設定

1. 建立 `.env` 檔案在 `backend/` 目錄：

```bash
# backend/.env

# 資料庫 - 使用 SQLite
DATABASE_URL="file:./prisma/dev.db"

# JWT 密鑰
JWT_SECRET="local-development-secret-key"

# 環境
NODE_ENV="development"
PORT=4000

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:4001"
```

2. 初始化資料庫：

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

3. 啟動開發伺服器：

```bash
npm run start:dev
```

## 🚀 Railway 生產環境設定

### 自動設定（推薦）

1. 在 Railway 新增 PostgreSQL 服務
2. 在後端服務的 Variables 頁面設定：

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<用密碼生成器產生 32+ 字元>
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend.railway.app
```

### 手動設定

如果您要使用外部 PostgreSQL：

```bash
DATABASE_URL=postgresql://username:password@host:5432/database
JWT_SECRET=<用密碼生成器產生 32+ 字元>
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend.railway.app
```

## 🔐 JWT_SECRET 生成方法

### 方法 1: 使用 Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 方法 2: 使用 OpenSSL

```bash
openssl rand -hex 32
```

### 方法 3: 線上工具

訪問 https://randomkeygen.com/ 並選擇 "Fort Knox Passwords"

## 🔍 環境變數驗證

### 檢查本地環境

```bash
cd backend
npm run start:dev
```

應該看到：
```
🚀 Server is running on port 4000
📝 Environment: development
```

### 檢查生產環境

在 Railway Dashboard 查看部署日誌，應該看到：
```
✅ DATABASE_URL 驗證通過
📊 使用 PostgreSQL 資料庫
🚀 Server is running on port 4000
📝 Environment: production
```

## ⚠️ 常見錯誤

### 錯誤 1: `DATABASE_URL` 未設定

```
❌ 無法啟動生產模式：未設定 DATABASE_URL 環境變數。
```

**解決方法**: 在 Railway Variables 中新增 `DATABASE_URL`

### 錯誤 2: `DATABASE_URL` 格式錯誤

```
❌ 無法啟動生產模式：DATABASE_URL 必須為 PostgreSQL 連線字串。
```

**解決方法**: 
- 確認格式為 `postgresql://...`
- 或使用 Railway 變數引用：`${{Postgres.DATABASE_URL}}`

### 錯誤 3: Prisma 連線失敗

```
Error: P1001: Can't reach database server
```

**解決方法**:
1. 檢查 PostgreSQL 服務是否正在運行
2. 檢查連線字串是否正確
3. 檢查網路/防火牆設定

## 📚 相關資源

- [Railway 環境變數文件](https://docs.railway.app/develop/variables)
- [Prisma 環境變數](https://www.prisma.io/docs/guides/development-environment/environment-variables)
- [NestJS 配置](https://docs.nestjs.com/techniques/configuration)

---

最後更新: 2025-10-14

