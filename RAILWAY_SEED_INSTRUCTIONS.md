# 🚂 Railway 資料庫種子填充說明

## ✅ 自動填充（已配置）

後端服務在 Railway 部署時會**自動執行**以下操作：

1. 生成 Prisma Client
2. 推送資料庫結構到 PostgreSQL (`npx prisma db push`)
3. **自動填充測試數據** (`npx ts-node prisma/seed.ts`)
4. 啟動應用程式

這些操作已配置在 `backend/package.json` 的 `start:prod` 腳本中。

---

## 📊 自動創建的測試帳號

### 管理員帳號 (BOSS)
- **帳號**: `admin@test.com`
- **密碼**: `12345678`
- **權限**: 最高權限

### 分店經理
- **帳號**: `manager1@test.com`, `manager2@test.com`
- **密碼**: `12345678`

### 刺青師
- **帳號**: `artist1@test.com`, `artist2@test.com`, `artist3@test.com`
- **密碼**: `12345678`

### 會員
- **帳號**: `member1@test.com` ~ `member12@test.com`
- **密碼**: `12345678`

---

## 📝 種子數據內容

自動填充的數據包括：

✅ **2 個分店**
- 三重店
- 東港店

✅ **3 個刺青師**
- 陳震宇（東港店）
- 黃晨洋（三重店）
- 林承葉（三重店）

✅ **10 個服務項目**
- 小圖案刺青、半臂刺青、全臂刺青等

✅ **12 個會員**
- 包含會員等級和餘額資料

✅ **24 個預約**
- 每位刺青師 8 個預約
- 部分已完成並生成訂單

✅ **15 個訂單**
- 包含待結帳和已結帳狀態
- 部分訂單有分期付款記錄

---

## 🔄 重新填充數據（如需要）

如果需要重置 Railway 資料庫並重新填充數據：

### 方法 1: 透過 Railway Dashboard

1. 進入 Railway Dashboard
2. 選擇後端服務 (Backend Service)
3. 點擊右上角的三個點 (...) > Restart
4. 系統會自動執行 `start:prod` 腳本，包含種子填充

### 方法 2: 重新部署

1. 推送任何變更到 GitHub
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push origin main
   ```
2. Railway 會自動重新部署並填充數據

### 方法 3: 手動執行（需要 Railway CLI）

```bash
# 連接到 Railway 服務
railway link

# 執行種子腳本
railway run npm run seed
```

---

## ⚠️ 注意事項

### 本地開發 vs Railway

**本地開發（SQLite）**:
- `backend/prisma/schema.prisma`: `provider = "sqlite"`
- `backend/.env`: `DATABASE_URL="file:./prisma/dev.db"`
- 手動執行: `npx ts-node prisma/seed.ts`

**Railway 生產環境（PostgreSQL）**:
- `backend/prisma/schema.prisma`: `provider = "postgresql"`
- Railway 環境變數: `DATABASE_URL=postgresql://...`
- 自動執行: 包含在 `start:prod` 腳本中

### 避免數據丟失

⚠️ **警告**: `npx prisma db push --accept-data-loss` 會重置資料庫！

如果 Railway 資料庫已有重要數據：
1. **不要**重新部署後端
2. 改用 Prisma Migrate: `npx prisma migrate deploy`
3. 手動執行種子腳本（如果需要）

---

## 🐛 故障排除

### 問題 1: "User not found" 登入錯誤

**可能原因**: 
- Railway PostgreSQL 資料庫為空
- 種子腳本執行失敗

**解決方案**:
1. 檢查 Railway 部署日誌，確認種子腳本是否成功執行
2. 查找日誌中的 `🎉 Seeding 完成！` 訊息
3. 如果沒有看到，觸發重新部署

### 問題 2: 種子腳本執行失敗

**可能原因**:
- `ts-node` 未安裝
- 資料庫連接失敗
- schema 和資料庫不同步

**解決方案**:
1. 確認 `ts-node` 在 `dependencies` 中（已配置）
2. 確認 Railway `DATABASE_URL` 環境變數正確
3. 檢查部署日誌的詳細錯誤訊息

### 問題 3: 資料重複錯誤

**症狀**: `Unique constraint failed on the fields: (email)`

**原因**: 資料庫已有相同 email 的用戶

**解決方案**: 
種子腳本會自動清理舊數據，但如果失敗：
1. 在 Railway Dashboard 刪除並重新創建 PostgreSQL 服務
2. 觸發後端重新部署

---

## 📋 部署檢查清單

部署到 Railway 前，確認：

- ✅ `backend/prisma/schema.prisma` 使用 `postgresql`
- ✅ `backend/package.json` 包含種子腳本在 `start:prod`
- ✅ `ts-node` 在 `dependencies` 中
- ✅ Railway 環境變數 `DATABASE_URL` 已設置
- ✅ Railway 環境變數 `JWT_ACCESS_SECRET` 已設置
- ✅ Railway 環境變數 `JWT_REFRESH_SECRET` 已設置

部署後驗證：

- ✅ 檢查部署日誌中的 `🎉 Seeding 完成！`
- ✅ 使用 `admin@test.com` / `12345678` 登入
- ✅ 檢查首頁是否顯示服務和刺青師

---

**最後更新**: 2025-10-09

