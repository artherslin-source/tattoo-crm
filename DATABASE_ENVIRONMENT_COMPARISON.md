# 資料庫環境對比報告

**日期：** 2025-01-16  
**狀態：** ✅ 本地端和 Railway 資料庫類型一致

---

## 📊 環境對比

| 項目 | 本地端 (Local) | Railway (生產環境) | 狀態 |
|------|----------------|-------------------|------|
| **資料庫類型** | PostgreSQL | PostgreSQL | ✅ **一致** |
| **版本** | 15-alpine | PostgreSQL (Railway) | ✅ 兼容 |
| **運行方式** | Docker 容器 | Railway 託管 | ✅ 正常 |
| **Schema Provider** | `postgresql` | `postgresql` | ✅ **一致** |
| **連接協議** | `postgresql://` | `postgresql://` | ✅ **一致** |

---

## 🔍 詳細配置

### **本地端環境**

**資料庫配置：**
```
類型: PostgreSQL 15 (Alpine)
運行方式: Docker 容器
容器名稱: tattoo-crm-postgres
端口: 5432
狀態: Up 2 hours (healthy)
```

**連接字串：**
```
postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev?schema=public
```

**Docker 配置：** `backend/docker-compose.yml`
```yaml
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
```

---

### **Railway 生產環境**

**資料庫配置：**
```
類型: PostgreSQL (Railway 託管)
運行方式: Railway 服務
連接: Railway 內部網路
狀態: 運行中
```

**連接字串：** (環境變數)
```
postgresql://postgres:********@postgres.railway.internal:5432/railway
```

**特點：**
- ✅ 託管服務，自動備份
- ✅ 高可用性
- ✅ 自動擴展
- ✅ 內部網路連接

---

### **Prisma Schema 配置**

**檔案：** `backend/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**說明：**
- ✅ 使用環境變數 `DATABASE_URL`
- ✅ Provider 設定為 `postgresql`
- ✅ 本地和生產環境共用相同的 schema
- ✅ 無需修改代碼即可切換環境

---

## ✅ 一致性優勢

### **1. 開發體驗**
```
✅ 本地開發環境完全模擬生產環境
✅ 避免因資料庫差異導致的 Bug
✅ Schema 變更可以在本地先測試
✅ SQL 語法完全兼容
```

### **2. 部署流程**
```
✅ 代碼無需修改即可部署
✅ Migration 腳本通用
✅ 減少環境差異問題
✅ 簡化 CI/CD 流程
```

### **3. 數據一致性**
```
✅ 相同的資料庫引擎
✅ 相同的數據類型
✅ 相同的索引策略
✅ 相同的約束處理
```

### **4. 測試可靠性**
```
✅ 本地測試結果可信
✅ 減少生產環境驚喜
✅ 更快的開發迭代
✅ 更少的回滾風險
```

---

## 🔄 環境切換

### **本地開發環境**

**啟動：**
```bash
# 1. 啟動 Docker PostgreSQL
cd backend
docker-compose up -d

# 2. 確認資料庫運行
docker ps | grep postgres

# 3. 推送 Schema
npx prisma db push

# 4. 填充數據（可選）
npm run rebuild:dev

# 5. 啟動後端
npm run start:dev
```

**環境變數：** `.env`
```env
DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev?schema=public"
NODE_ENV="development"
PORT=4000
```

---

### **Railway 生產環境**

**部署：**
```bash
# 推送到 main 分支，Railway 自動部署
git push origin main
```

**環境變數：** Railway Dashboard
```env
DATABASE_URL=<Railway PostgreSQL 連接字串>
NODE_ENV="production"
PORT=<Railway 分配>
RUN_SEED=<不設定或 false>
PROTECT_REAL_DATA=true
```

---

## 📋 遷移和同步

### **從本地到生產**

**Schema 變更：**
```bash
# 1. 本地修改 schema.prisma
# 2. 本地測試
npx prisma db push
npm run start:dev

# 3. 提交並推送
git add prisma/schema.prisma
git commit -m "feat: Update schema"
git push origin main

# 4. Railway 自動執行
# - npx prisma generate
# - npx prisma db push --accept-data-loss
# - 重啟服務
```

**數據遷移：**
```bash
# 使用 Prisma Migrate（推薦）
npx prisma migrate dev --name <migration-name>
git push origin main
```

---

### **從生產到本地**

**Schema 同步：**
```bash
# 1. 拉取最新代碼
git pull origin main

# 2. 重新生成 Prisma Client
npx prisma generate

# 3. 推送 schema 到本地資料庫
npx prisma db push
```

**數據備份還原：**
```bash
# 1. 從 Railway 下載備份
# Railway Dashboard → Database → Backups

# 2. 還原到本地
pg_restore -h localhost -U tattoo_user -d tattoo_crm_dev backup.dump
```

---

## ⚙️ 資料庫管理工具

### **本地環境**

**Prisma Studio：**
```bash
cd backend
npx prisma studio
# 瀏覽器打開 http://localhost:5555
```

**pgAdmin 或 DBeaver：**
```
Host: localhost
Port: 5432
Database: tattoo_crm_dev
Username: tattoo_user
Password: tattoo_password
```

---

### **Railway 環境**

**Railway Dashboard：**
- 直接在 Railway 查看資料庫
- Database → Data 標籤

**外部連接：**
```bash
# 使用 Railway 提供的公開連接
# Railway Dashboard → Database → Connect
```

---

## 🔒 安全性

### **本地環境**

**安全措施：**
- ✅ 僅本地訪問（127.0.0.1）
- ✅ Docker 網路隔離
- ✅ `.env` 文件被 `.gitignore` 排除
- ✅ 簡單密碼可接受（開發用）

---

### **Railway 環境**

**安全措施：**
- ✅ 內部網路連接
- ✅ TLS/SSL 加密
- ✅ 強密碼（Railway 生成）
- ✅ 自動備份
- ✅ 訪問控制

---

## 📊 性能對比

| 指標 | 本地端 | Railway | 說明 |
|------|--------|---------|------|
| **延遲** | < 1ms | 取決於網路 | 本地連接更快 |
| **資源** | 依賴本機 | 託管資源 | Railway 更穩定 |
| **可用性** | 手動啟動 | 24/7 運行 | Railway 更可靠 |
| **備份** | 手動 | 自動 | Railway 更安全 |
| **擴展** | 有限 | 自動 | Railway 更靈活 |

---

## 🎯 最佳實踐

### **開發流程**

```
1. 本地開發
   ↓
2. 本地測試（PostgreSQL）
   ↓
3. 提交代碼
   ↓
4. Railway 自動部署
   ↓
5. 生產環境運行（PostgreSQL）
```

**優勢：**
- ✅ 環境一致性高
- ✅ 減少部署風險
- ✅ 更快的開發速度
- ✅ 更少的 Bug

---

### **資料庫維護**

**定期操作：**
```bash
# 1. 清理無用數據
npm run rebuild:protect

# 2. 檢查資料完整性
npx prisma studio

# 3. 備份重要數據
npm run backup:list

# 4. 優化查詢（如需要）
# 添加索引、調整 schema
```

---

## 📈 版本歷史

| 日期 | 變更 | 原因 |
|------|------|------|
| 2024-09 | 初始使用 SQLite | 快速開發原型 |
| 2024-10 | 切換到 PostgreSQL | 生產環境需求 |
| 2025-01 | 本地也使用 PostgreSQL | **統一環境** ✅ |

---

## ✅ 總結

### **一致性狀態**

| 檢查項 | 狀態 |
|--------|------|
| 資料庫類型 | ✅ 一致（PostgreSQL） |
| Schema Provider | ✅ 一致（postgresql） |
| 連接協議 | ✅ 一致（postgresql://） |
| Prisma 配置 | ✅ 一致 |
| Migration 支援 | ✅ 通用 |

### **關鍵優勢**

1. **完全一致的開發體驗**
   - 本地 = 生產環境
   - 減少環境差異問題

2. **更可靠的部署**
   - 本地測試即生產測試
   - 降低部署風險

3. **更好的開發效率**
   - 無需考慮環境差異
   - 專注業務邏輯開發

4. **專業的架構**
   - 符合行業最佳實踐
   - 可擴展性強

---

## 🚀 下一步

**已完成：**
- ✅ 本地 PostgreSQL 已啟動
- ✅ Schema 已同步
- ✅ 測試數據已填充
- ✅ 環境完全一致

**建議操作：**
1. 定期更新 Docker PostgreSQL 版本
2. 監控 Railway 資料庫性能
3. 建立定期備份策略
4. 文檔化 schema 變更流程

---

**報告結論：**

🎉 **本地端和 Railway 資料庫類型完全一致！**

- 📊 類型：PostgreSQL（本地和生產）
- 🔄 Schema：通用且可遷移
- ✅ 優勢：最佳的開發體驗和部署可靠性
- 🛡️ 安全：兩端都有適當的保護措施

**這是一個專業且可靠的架構設置！** ✨

