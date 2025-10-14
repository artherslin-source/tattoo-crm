# 本地開發環境設定指南

## ⚠️ 重要變更說明

由於生產環境使用 PostgreSQL，Prisma schema 已更新為 `postgresql` provider。

## 🔧 本地開發選項

您有兩種方式進行本地開發：

### 選項 A: 使用 Docker PostgreSQL（推薦）

**優點**：
- ✅ 與生產環境完全一致
- ✅ 避免資料庫差異導致的問題
- ✅ 簡單啟動和停止

#### 1. 建立 Docker Compose 檔案

建立 `docker-compose.yml` 在 `backend/` 目錄：

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: tattoo-crm-postgres
    environment:
      POSTGRES_USER: tattoo_user
      POSTGRES_PASSWORD: tattoo_password
      POSTGRES_DB: tattoo_crm_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 2. 啟動 PostgreSQL

```bash
cd backend
docker-compose up -d
```

#### 3. 設定本地環境變數

建立 `backend/.env` 檔案：

```bash
# 資料庫
DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev"

# JWT
JWT_SECRET="local-dev-secret-key"

# 應用程式
NODE_ENV="development"
PORT=4000

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:4001"
```

#### 4. 初始化資料庫

```bash
# 生成 Prisma Client
npx prisma generate

# 執行 migrations
npx prisma migrate dev

# 匯入種子資料
npx prisma db seed
```

#### 5. 啟動開發伺服器

```bash
npm run start:dev
```

#### 6. 停止 PostgreSQL（當不需要時）

```bash
docker-compose down
```

---

### 選項 B: 使用本機安裝的 PostgreSQL

如果您已經安裝了 PostgreSQL：

#### 1. 建立資料庫

```bash
# 連線到 PostgreSQL
psql -U postgres

# 建立資料庫和使用者
CREATE DATABASE tattoo_crm_dev;
CREATE USER tattoo_user WITH PASSWORD 'tattoo_password';
GRANT ALL PRIVILEGES ON DATABASE tattoo_crm_dev TO tattoo_user;
\q
```

#### 2. 設定 .env（同選項 A 的步驟 3）

#### 3. 執行 migrations（同選項 A 的步驟 4）

---

### 選項 C: 仍使用 SQLite（不推薦）

⚠️ **警告**：使用 SQLite 可能導致與生產環境不一致的問題

如果您仍想使用 SQLite：

#### 1. 暫時修改 schema

**方法 1**: 使用環境變數切換（需修改 schema.prisma）

編輯 `prisma/schema.prisma`:

```prisma
datasource db {
  provider = env("DATABASE_PROVIDER")  // 改為使用環境變數
  url      = env("DATABASE_URL")
}
```

在 `.env` 中設定：
```bash
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./prisma/dev.db"
```

**方法 2**: 手動切換（簡單但容易忘記）

在本地開發時，暫時修改 `schema.prisma`：
```prisma
datasource db {
  provider = "sqlite"  // 本地開發時使用
  url      = env("DATABASE_URL")
}
```

⚠️ **重要**：記得在 commit 前改回 `postgresql`！

---

## 🚀 快速開始（使用 Docker）

```bash
# 1. 安裝依賴
cd backend
npm install

# 2. 啟動 PostgreSQL
docker-compose up -d

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env，使用上面提供的 PostgreSQL 連線字串

# 4. 初始化資料庫
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# 5. 啟動開發伺服器
npm run start:dev
```

## 🔍 常見問題

### Q1: Docker PostgreSQL 連線失敗

**錯誤**:
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**解決方法**:
```bash
# 檢查 PostgreSQL 是否在運行
docker-compose ps

# 重啟 PostgreSQL
docker-compose restart

# 查看日誌
docker-compose logs postgres
```

### Q2: Port 5432 已被佔用

**錯誤**:
```
Error: Port 5432 is already in use
```

**解決方法**:

選項 1: 停止本機的 PostgreSQL
```bash
# macOS
brew services stop postgresql

# Linux
sudo systemctl stop postgresql
```

選項 2: 修改 `docker-compose.yml` 使用不同的 port
```yaml
ports:
  - "5433:5432"  # 使用 5433
```

然後更新 `.env`:
```bash
DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5433/tattoo_crm_dev"
```

### Q3: Migration 失敗

**錯誤**:
```
Error: Migration failed
```

**解決方法**:
```bash
# 重置資料庫
npx prisma migrate reset

# 重新執行 migrations
npx prisma migrate dev
```

### Q4: Prisma Studio 無法開啟

```bash
# 確保資料庫正在運行
docker-compose ps

# 啟動 Prisma Studio
npx prisma studio
```

訪問 http://localhost:5555

## 📊 資料庫管理工具

### 推薦工具

1. **Prisma Studio** (內建)
   ```bash
   npx prisma studio
   ```

2. **pgAdmin** (網頁介面)
   - 下載：https://www.pgadmin.org/
   - 連線資訊同 .env 中的設定

3. **TablePlus** (macOS/Windows)
   - 下載：https://tableplus.com/
   - 輕量且美觀

4. **DBeaver** (跨平台，免費)
   - 下載：https://dbeaver.io/

## 🧹 清理資料

### 重置資料庫
```bash
npx prisma migrate reset
```

### 清空所有資料但保留 schema
```bash
npx prisma db push --force-reset
```

### 刪除 Docker 資料（完全重置）
```bash
docker-compose down -v
docker-compose up -d
npx prisma migrate dev
```

## 📚 更多資源

- [Prisma 文件](https://www.prisma.io/docs)
- [PostgreSQL Docker 映像](https://hub.docker.com/_/postgres)
- [Docker Compose 文件](https://docs.docker.com/compose/)

---

**最後更新**: 2025-10-14

