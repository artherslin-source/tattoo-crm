# 🚨 後端崩潰緊急修復 - 完整指南

> **修復日期**: 2025-10-14  
> **問題**: Railway 生產環境後端服務無法啟動  
> **狀態**: ✅ 已修復程式碼，等待部署

---

## 📋 快速導覽

- 🔥 [立即修復步驟](#-立即修復步驟) - 最快恢復服務的步驟
- 📖 [詳細文件](#-詳細文件) - 完整的修復和設定指南
- 🔍 [問題分析](#-問題分析) - 了解問題的根本原因
- ✅ [驗證清單](#-驗證清單) - 確保修復成功

---

## 🔥 立即修復步驟

### 前提條件
- ✅ 有 Railway 帳號的訪問權限
- ✅ 有專案的 Git 倉庫權限

### 步驟 1: 在 Railway 新增 PostgreSQL 資料庫（5 分鐘）

1. 登入 [Railway Dashboard](https://railway.app/)
2. 選擇您的專案
3. 點擊 **"+ New"** → **"Database"** → **"PostgreSQL"**
4. 等待資料庫建立完成（通常 1-2 分鐘）

### 步驟 2: 設定環境變數（3 分鐘）

1. 點選您的**後端服務**（backend）
2. 前往 **"Variables"** 標籤
3. 新增或更新以下變數：

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=請執行下方命令生成
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend-url.railway.app
```

**生成 JWT_SECRET**（在您的終端機執行）:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

複製輸出的字串，貼到 Railway 的 `JWT_SECRET` 變數中。

### 步驟 3: 推送程式碼（2 分鐘）

```bash
# 確保您在專案根目錄
cd /Users/jerrylin/tattoo-crm

# 提交變更
git add .
git commit -m "fix: Update to PostgreSQL for production deployment"

# 推送到 GitHub
git push origin main
```

### 步驟 4: 驗證部署（5 分鐘）

1. 在 Railway Dashboard，前往後端服務的 **"Deployments"** 標籤
2. 等待部署完成
3. 查看部署日誌，確認看到：
   ```
   ✅ DATABASE_URL 驗證通過
   📊 使用 PostgreSQL 資料庫
   🚀 Server is running on port 4000
   ```

4. 測試 API：
   ```bash
   curl https://your-backend-url.railway.app/
   ```
   應該會收到回應（而不是錯誤）

---

## 📖 詳細文件

### 核心修復文件

| 文件 | 用途 | 重要性 |
|------|------|--------|
| [CRISIS_RESOLUTION_SUMMARY.md](./CRISIS_RESOLUTION_SUMMARY.md) | 問題診斷與解決方案總覽 | ⭐⭐⭐⭐⭐ |
| [BACKEND_PRODUCTION_FIX.md](./BACKEND_PRODUCTION_FIX.md) | 生產環境詳細修復指南 | ⭐⭐⭐⭐⭐ |
| [ENV_SETUP_GUIDE.md](./backend/ENV_SETUP_GUIDE.md) | 環境變數完整設定手冊 | ⭐⭐⭐⭐ |
| [LOCAL_DEVELOPMENT_GUIDE.md](./backend/LOCAL_DEVELOPMENT_GUIDE.md) | 本地開發環境設定 | ⭐⭐⭐⭐ |

### 快速參考

| 文件 | 用途 |
|------|------|
| [backend/env.example](./backend/env.example) | 環境變數範例檔案 |
| [backend/docker-compose.yml](./backend/docker-compose.yml) | 本地 PostgreSQL Docker 設定 |

---

## 🔍 問題分析

### 發生了什麼？

**錯誤訊息**:
```
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Error validating datasource `db`: the URL must start with the protocol `file:`.
```

### 根本原因

1. **資料庫配置不一致**
   - Prisma schema 原設定為 `sqlite`
   - 生產環境腳本要求 `postgresql`
   - 導致啟動時驗證失敗

2. **環境變數配置錯誤**
   - Railway 的 `DATABASE_URL` 格式不正確
   - 或未正確設定 PostgreSQL 連線字串

### 已修復的檔案

| 檔案 | 變更內容 |
|------|---------|
| `backend/prisma/schema.prisma` | provider: `sqlite` → `postgresql` |
| `backend/scripts/start-prod.js` | 改善錯誤訊息和驗證邏輯 |
| + 多個文件檔案 | 建立完整的部署和開發指南 |

---

## ✅ 驗證清單

### Railway 設定確認

- [ ] PostgreSQL 資料庫服務已建立
- [ ] `DATABASE_URL` 設定為 `${{Postgres.DATABASE_URL}}`
- [ ] `JWT_SECRET` 已設定（32+ 字元的隨機字串）
- [ ] `NODE_ENV` 設定為 `production`
- [ ] `PORT` 設定為 `4000`
- [ ] `CORS_ORIGIN` 設定為前端 URL

### 程式碼確認

- [ ] `prisma/schema.prisma` 的 provider 為 `postgresql`
- [ ] `scripts/start-prod.js` 已更新
- [ ] 程式碼已 commit 並 push 到 GitHub

### 部署確認

- [ ] Railway 自動部署已觸發
- [ ] 部署日誌無錯誤訊息
- [ ] 看到 "✅ DATABASE_URL 驗證通過"
- [ ] 看到 "🚀 Server is running on port 4000"
- [ ] API 端點回應正常
- [ ] 前端可以連線到後端

### 本地開發確認（選擇性）

- [ ] Docker PostgreSQL 已設定
- [ ] 本地 `.env` 檔案已建立
- [ ] `npm run start:dev` 可以正常啟動
- [ ] Prisma Studio 可以訪問 (`npx prisma studio`)

---

## 🆘 遇到問題？

### 常見錯誤及解決方法

#### 1. DATABASE_URL 仍然報錯

**症狀**: 部署時仍然看到 P1012 錯誤

**檢查**:
1. Railway Variables 中的 `DATABASE_URL` 值
2. 確認使用 `${{Postgres.DATABASE_URL}}` 語法
3. PostgreSQL 服務名稱是否為 "Postgres"（如果不是，調整變數引用）

**解決**:
```bash
# 在 Railway Variables 中設定
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 如果 PostgreSQL 服務名稱不同，例如 "Database"
DATABASE_URL=${{Database.DATABASE_URL}}
```

#### 2. Migration 失敗

**症狀**: 
```
Error: Migration failed
```

**解決**:
1. 檢查 PostgreSQL 服務是否正在運行
2. 檢查 `DATABASE_URL` 連線字串是否正確
3. 可能需要手動執行 migration（透過 Railway CLI）

#### 3. 應用程式啟動失敗

**症狀**: 部署成功但應用程式無法啟動

**檢查**:
1. 所有環境變數是否已設定
2. `JWT_SECRET` 是否存在
3. 查看完整的部署日誌

#### 4. 本地開發無法連線資料庫

**症狀**: 
```
Error: P1001: Can't reach database server
```

**解決**:
```bash
# 檢查 Docker 是否運行
docker-compose ps

# 如果沒運行，啟動它
docker-compose up -d

# 檢查日誌
docker-compose logs postgres
```

---

## 📞 需要更多協助

### 文件索引

1. **部署問題** → [BACKEND_PRODUCTION_FIX.md](./BACKEND_PRODUCTION_FIX.md)
2. **環境變數** → [ENV_SETUP_GUIDE.md](./backend/ENV_SETUP_GUIDE.md)
3. **本地開發** → [LOCAL_DEVELOPMENT_GUIDE.md](./backend/LOCAL_DEVELOPMENT_GUIDE.md)
4. **問題總覽** → [CRISIS_RESOLUTION_SUMMARY.md](./CRISIS_RESOLUTION_SUMMARY.md)

### 檢查順序

1. 先檢查 Railway 環境變數設定
2. 再檢查部署日誌
3. 然後測試 API 端點
4. 最後檢查前端連線

---

## 📊 預期時程

| 階段 | 預計時間 | 說明 |
|------|---------|------|
| Railway PostgreSQL 建立 | 1-2 分鐘 | 自動建立 |
| 環境變數設定 | 2-3 分鐘 | 手動設定 |
| 程式碼推送 | 1 分鐘 | Git 操作 |
| Railway 自動部署 | 3-5 分鐘 | 自動觸發 |
| 驗證和測試 | 2-3 分鐘 | 手動測試 |
| **總計** | **10-15 分鐘** | - |

---

## 🎯 成功標準

部署成功後，您應該能夠：

- ✅ 訪問後端 API 端點並收到回應
- ✅ 前端可以成功呼叫後端 API
- ✅ 使用者可以登入/註冊
- ✅ 資料可以正常儲存和讀取
- ✅ Railway 日誌無錯誤訊息

---

## 📝 後續建議

### 短期（本週）
1. 測試所有主要功能
2. 驗證前後端整合
3. 確認資料持久化正常

### 中期（本月）
1. 設定資料庫自動備份
2. 建立監控和告警
3. 撰寫 API 文件

### 長期
1. 實施 CI/CD pipeline
2. 設定自動化測試
3. 效能監控與優化

---

**狀態**: 🟡 程式碼已修復，等待部署  
**優先級**: 🔴 最高  
**預計修復時間**: 10-15 分鐘

---

## 📌 重要提醒

1. ⚠️ **務必保存 JWT_SECRET**: 這個值在生成後要妥善保存
2. ⚠️ **本地開發環境**: 現在使用 PostgreSQL，請參考本地開發指南
3. ⚠️ **環境隔離**: 確保本地和生產環境的配置檔案正確分離
4. ⚠️ **資料備份**: 在執行任何資料庫變更前，建議先備份

---

**最後更新**: 2025-10-14  
**文件版本**: 1.0  
**維護者**: AI Assistant

