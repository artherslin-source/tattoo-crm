# 本地 PostgreSQL 開發環境設置指南

## 📋 目錄
1. [為什麼要使用 PostgreSQL](#為什麼要使用-postgresql)
2. [安裝 Docker](#安裝-docker)
3. [啟動 PostgreSQL](#啟動-postgresql)
4. [配置環境變量](#配置環境變量)
5. [初始化數據庫](#初始化數據庫)
6. [日常使用](#日常使用)
7. [常見問題](#常見問題)

---

## 🎯 為什麼要使用 PostgreSQL

### 優點 ✅
- **環境一致性**：本地和生產環境（Railway）完全相同
- **避免差異**：SQLite 和 PostgreSQL 有些 SQL 語法不同
- **真實測試**：測試結果更可靠
- **配置簡化**：一個 `schema.prisma` 適用所有環境
- **功能完整**：PostgreSQL 支持更多高級功能

### 影響 ⚠️
- 需要安裝 Docker Desktop
- 需要約 50-100MB 內存運行 PostgreSQL 容器
- 開發前需要啟動 Docker 容器
- 現有 SQLite 數據需要重新初始化

---

## 📦 安裝 Docker

### macOS

#### 方法 1：使用 Homebrew（推薦）
```bash
# 安裝 Homebrew（如果還沒有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 Docker Desktop
brew install --cask docker

# 啟動 Docker Desktop
open /Applications/Docker.app
```

#### 方法 2：手動下載
1. 訪問 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. 下載並安裝 Docker Desktop
3. 啟動 Docker Desktop 應用

### 驗證安裝
```bash
docker --version
docker-compose --version
```

**期望輸出**：
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

---

## 🚀 啟動 PostgreSQL

### 1. 啟動 PostgreSQL 容器

```bash
cd /Users/jerrylin/tattoo-crm/backend
docker-compose up -d
```

**說明**：
- `up`：啟動服務
- `-d`：後台運行（detached mode）

**期望輸出**：
```
[+] Running 2/2
 ✔ Network backend_default              Created
 ✔ Container tattoo-crm-postgres        Started
```

### 2. 驗證容器運行

```bash
docker-compose ps
```

**期望輸出**：
```
NAME                   STATUS    PORTS
tattoo-crm-postgres    Up        0.0.0.0:5432->5432/tcp
```

### 3. 查看日誌（可選）

```bash
docker-compose logs -f postgres
```

按 `Ctrl+C` 退出日誌查看。

---

## ⚙️ 配置環境變量

### 1. 備份現有 .env

```bash
cd /Users/jerrylin/tattoo-crm/backend
cp .env .env.sqlite.backup
```

### 2. 更新 .env 文件

編輯 `backend/.env`，修改 `DATABASE_URL`：

```env
# Database - 使用 PostgreSQL
DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev"

# JWT Secrets
JWT_ACCESS_SECRET="local-dev-secret-key-12345"
JWT_REFRESH_SECRET="local-dev-refresh-secret-key-67890"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# Server
PORT=4000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:4001,http://localhost:3000"
```

**重要**：確保 `DATABASE_URL` 的格式正確：
```
postgresql://[用戶名]:[密碼]@[主機]:[端口]/[數據庫名]
```

---

## 🗄️ 初始化數據庫

### 方法 1：使用自動化腳本（推薦）

我們提供了一個自動化腳本：

```bash
cd /Users/jerrylin/tattoo-crm/backend
./scripts/setup-local-postgres.sh
```

這個腳本會自動：
1. ✅ 檢查 Docker 是否運行
2. ✅ 啟動 PostgreSQL 容器
3. ✅ 等待數據庫就緒
4. ✅ 生成 Prisma Client
5. ✅ 運行數據庫遷移
6. ✅ 執行種子數據
7. ✅ 驗證數據

### 方法 2：手動步驟

```bash
cd /Users/jerrylin/tattoo-crm/backend

# 1. 生成 Prisma Client
npx prisma generate

# 2. 運行數據庫遷移
npx prisma migrate deploy

# 3. 執行種子數據
npx prisma db seed

# 4. 驗證數據
npx ts-node scripts/verify-data.ts
```

### 驗證結果

**期望看到**：
```
📊 數據庫數據驗證

🏪 分店數據：
   總數: 2 個

   1. 三重店
      用戶數: 9
      刺青師: 2
      ...

   2. 東港店
      用戶數: 8
      刺青師: 1
      ...
```

---

## 💻 日常使用

### 啟動開發環境

```bash
# 1. 啟動 PostgreSQL（如果還沒運行）
cd /Users/jerrylin/tattoo-crm/backend
docker-compose up -d

# 2. 啟動後端服務
npm run start:dev
```

### 停止 PostgreSQL

```bash
cd /Users/jerrylin/tattoo-crm/backend
docker-compose down
```

**注意**：這不會刪除數據，數據保存在 Docker volume 中。

### 完全清理（包括數據）

```bash
cd /Users/jerrylin/tattoo-crm/backend
docker-compose down -v
```

**警告**：`-v` 會刪除所有數據！

### 重置數據庫

```bash
cd /Users/jerrylin/tattoo-crm/backend

# 方法 1：使用腳本
./scripts/reseed.sh

# 方法 2：手動
npx ts-node scripts/reset-database.ts
npx prisma db seed
```

---

## 🔧 常用命令

### Docker 相關

```bash
# 查看運行中的容器
docker-compose ps

# 查看日誌
docker-compose logs -f postgres

# 重啟容器
docker-compose restart

# 停止容器
docker-compose stop

# 啟動容器
docker-compose start

# 完全移除（包括數據）
docker-compose down -v
```

### 數據庫相關

```bash
# 連接到 PostgreSQL（使用 psql）
docker-compose exec postgres psql -U tattoo_user -d tattoo_crm_dev

# 在 psql 中常用命令：
\l          # 列出所有數據庫
\dt         # 列出所有表
\d User     # 查看 User 表結構
\q          # 退出 psql

# 使用 Prisma Studio 查看數據
npx prisma studio
```

### Prisma 相關

```bash
# 生成 Prisma Client
npx prisma generate

# 運行遷移
npx prisma migrate deploy

# 創建新遷移
npx prisma migrate dev --name your_migration_name

# 重置數據庫
npx prisma migrate reset

# 查看數據
npx prisma studio
```

---

## 🛠️ 常見問題

### Q1: Docker Desktop 無法啟動

**A**: 
1. 確保系統滿足要求（macOS 10.15 或更高）
2. 重啟電腦
3. 重新安裝 Docker Desktop

### Q2: 端口 5432 已被佔用

**A**: 
```bash
# 查看佔用端口的進程
lsof -i :5432

# 如果是另一個 PostgreSQL，可以停止它
brew services stop postgresql

# 或修改 docker-compose.yml 中的端口映射
ports:
  - "5433:5432"  # 使用 5433 而不是 5432
```

然後更新 `.env` 中的 `DATABASE_URL`：
```env
DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5433/tattoo_crm_dev"
```

### Q3: 連接數據庫失敗

**A**:
```bash
# 1. 檢查容器是否運行
docker-compose ps

# 2. 查看容器日誌
docker-compose logs postgres

# 3. 測試連接
docker-compose exec postgres pg_isready -U tattoo_user

# 4. 重啟容器
docker-compose restart
```

### Q4: 數據丟失了

**A**:
數據存儲在 Docker volume 中，除非執行 `docker-compose down -v`，否則不會丟失。

恢復數據：
```bash
# 重新運行種子數據
npx prisma db seed
```

### Q5: 想切換回 SQLite

**A**:
```bash
# 1. 停止 PostgreSQL
docker-compose down

# 2. 恢復 .env
cp .env.sqlite.backup .env

# 3. 修改 schema.prisma（不推薦，會導致生產環境問題）
# provider = "sqlite"

# 4. 重新生成 Prisma Client
npx prisma generate
```

**注意**：不推薦切換回 SQLite，因為會導致生產環境配置不一致。

### Q6: 如何備份數據

**A**:
```bash
# 導出數據
docker-compose exec postgres pg_dump -U tattoo_user tattoo_crm_dev > backup.sql

# 恢復數據
docker-compose exec -T postgres psql -U tattoo_user tattoo_crm_dev < backup.sql
```

---

## 📊 性能對比

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| 啟動速度 | ⚡ 極快 | 🐢 需要啟動容器 |
| 內存佔用 | 💚 極低 | 💛 中等（50-100MB） |
| 功能完整性 | 💛 基本功能 | 💚 完整功能 |
| 環境一致性 | ❌ 與生產不同 | ✅ 與生產相同 |
| 並發支持 | ❌ 有限 | ✅ 優秀 |
| 適用場景 | 原型開發 | 正式開發 |

---

## 🎯 最佳實踐

### 1. 開發流程

```bash
# 每天開始工作
cd /Users/jerrylin/tattoo-crm/backend
docker-compose up -d
npm run start:dev

# 工作結束
# PostgreSQL 可以一直運行，或者：
docker-compose stop
```

### 2. 團隊協作

- ✅ 所有開發者使用相同的 Docker 配置
- ✅ 將 `docker-compose.yml` 提交到 Git
- ❌ 不要提交 `.env` 文件（使用 `.env.example`）

### 3. 數據管理

- ✅ 定期運行種子數據保持數據新鮮
- ✅ 使用 Prisma Studio 查看和編輯數據
- ❌ 不要在生產環境運行 `db push --accept-data-loss`

---

## 📚 相關資源

- [Docker 官方文檔](https://docs.docker.com/)
- [PostgreSQL 官方文檔](https://www.postgresql.org/docs/)
- [Prisma 文檔](https://www.prisma.io/docs/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)

---

## 🆘 獲取幫助

如果遇到問題：

1. 查看本文檔的「常見問題」部分
2. 查看 Docker 容器日誌：`docker-compose logs postgres`
3. 查看後端日誌：檢查終端輸出
4. 重啟容器：`docker-compose restart`
5. 完全重置：`docker-compose down -v && docker-compose up -d`

---

**最後更新**: 2025-10-15  
**版本**: 1.0  
**維護者**: Development Team

