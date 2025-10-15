# 🚀 快速開始：本地 PostgreSQL 設置

## 📋 三步完成設置

### 步驟 1：安裝 Docker Desktop

#### macOS（推薦使用 Homebrew）

```bash
# 安裝 Homebrew（如果還沒有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 Docker Desktop
brew install --cask docker

# 啟動 Docker Desktop
open /Applications/Docker.app
```

**或者手動下載**：
- 訪問 https://www.docker.com/products/docker-desktop/
- 下載並安裝 Docker Desktop for Mac
- 啟動 Docker Desktop 應用

**等待 Docker Desktop 完全啟動**（右上角圖標變綠）

---

### 步驟 2：運行自動設置腳本

```bash
cd /Users/jerrylin/tattoo-crm/backend
./scripts/setup-local-postgres.sh
```

這個腳本會自動完成：
- ✅ 檢查 Docker 是否運行
- ✅ 啟動 PostgreSQL 容器
- ✅ 更新環境變量
- ✅ 初始化數據庫
- ✅ 執行種子數據

**期望輸出**：
```
🎉 本地 PostgreSQL 開發環境設置完成！

📊 數據庫信息：
   主機: localhost
   端口: 5432
   數據庫: tattoo_crm_dev
   用戶: tattoo_user
```

---

### 步驟 3：啟動後端服務

```bash
cd /Users/jerrylin/tattoo-crm/backend
npm run start:dev
```

**完成！** 🎉

---

## 💻 日常使用

### 每天開始工作

```bash
# 1. 確保 Docker Desktop 正在運行
# 2. 啟動 PostgreSQL（如果沒有運行）
cd /Users/jerrylin/tattoo-crm/backend
docker-compose up -d

# 3. 啟動後端服務
npm run start:dev
```

### 停止服務

```bash
# 停止後端服務：按 Ctrl+C

# 停止 PostgreSQL（可選，也可以一直運行）
docker-compose stop
```

---

## 🔧 常用命令

```bash
# 查看 PostgreSQL 狀態
docker-compose ps

# 查看 PostgreSQL 日誌
docker-compose logs -f postgres

# 重啟 PostgreSQL
docker-compose restart

# 連接到數據庫
docker-compose exec postgres psql -U tattoo_user -d tattoo_crm_dev

# 使用 Prisma Studio 查看數據
npx prisma studio

# 重置數據庫
./scripts/reseed.sh
```

---

## ❓ 常見問題

### Q: Docker Desktop 無法啟動？
**A**: 重啟電腦，或重新安裝 Docker Desktop

### Q: 端口 5432 已被佔用？
**A**: 
```bash
# 查看佔用端口的進程
lsof -i :5432

# 停止其他 PostgreSQL
brew services stop postgresql
```

### Q: 連接數據庫失敗？
**A**:
```bash
# 檢查容器狀態
docker-compose ps

# 查看日誌
docker-compose logs postgres

# 重啟容器
docker-compose restart
```

### Q: 想要完全重置？
**A**:
```bash
# 停止並刪除所有數據
docker-compose down -v

# 重新運行設置腳本
./scripts/setup-local-postgres.sh
```

---

## 📚 詳細文檔

- **完整設置指南**: `LOCAL_POSTGRESQL_SETUP.md`
- **數據庫管理**: `DATABASE_RESET_GUIDE.md`
- **緊急修復**: `CRITICAL_FIX_PRODUCTION_DATABASE.md`

---

## 🎯 為什麼要這樣做？

### 優點 ✅
- **環境一致**：本地和生產環境（Railway）完全相同
- **避免問題**：不會再有 SQLite vs PostgreSQL 的差異問題
- **配置簡單**：一個 `schema.prisma` 適用所有環境
- **真實測試**：測試結果更可靠

### 影響 ⚠️
- 需要安裝 Docker Desktop（一次性）
- 需要約 50-100MB 內存運行容器
- 開發前需要確保 Docker 運行

---

## 🆘 需要幫助？

1. 查看 `LOCAL_POSTGRESQL_SETUP.md` 詳細文檔
2. 查看 Docker 日誌：`docker-compose logs postgres`
3. 重啟容器：`docker-compose restart`
4. 完全重置：`docker-compose down -v && ./scripts/setup-local-postgres.sh`

---

**最後更新**: 2025-10-15  
**版本**: 1.0

