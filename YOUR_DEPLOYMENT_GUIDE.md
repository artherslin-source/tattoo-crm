# 🎯 你的 Railway 部署指南

## ✅ 目前狀況

你已經有：
- ✅ PostgreSQL 資料庫在 Railway 運行中
- ✅ DATABASE_URL 已經由 Railway 提供
- ✅ 後端和資料庫在同一個 Railway 專案中

**非常好！** 這是正確的生產環境配置。

---

## 🔧 正確的環境變數設定

### Railway 後端服務環境變數

由於你已經有 PostgreSQL 資料庫，請設定以下環境變數：

```bash
# ✅ DATABASE_URL 
# Railway 應該已經自動設定這個變數（當你連接 PostgreSQL 服務時）
# 如果沒有，請手動添加：
DATABASE_URL=postgresql://postgres:TSAzRfDGdVTUjnEzOMPoiegosoARCXWM@postgres.railway.internal:5432/railway

# ✅ JWT_SECRET（必須手動設定）
JWT_SECRET=請改成你的超長隨機密鑰

# ✅ PORT（建議設定）
PORT=4000

# ✅ NODE_ENV（必須設定）
NODE_ENV=production
```

### 🔐 產生安全的 JWT_SECRET

在終端機執行：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

複製輸出的字串作為 `JWT_SECRET`。

---

## 📝 部署步驟

### Step 1: 提交程式碼更改

我已經幫你：
1. ✅ 更新 `schema.prisma` 從 `sqlite` 改為 `postgresql`
2. ✅ 創建所有必要的 Railway 配置檔案

現在提交這些更改：

```bash
cd /Users/jerrylin/tattoo-crm-1
git add .
git commit -m "fix: 切換到 PostgreSQL 並修復 Railway 部署配置"
git push origin main
```

### Step 2: 檢查 Railway 資料庫連接

1. 進入 Railway Dashboard
2. 選擇你的**後端服務**
3. 點擊 **Variables** 標籤
4. 確認 `DATABASE_URL` 變數存在

**如果 `DATABASE_URL` 已經存在：**
- ✅ Railway 已經自動連接了資料庫
- 確認值類似於：`postgresql://postgres:...@postgres.railway.internal:5432/railway`

**如果 `DATABASE_URL` 不存在：**
1. 回到專案首頁
2. 點擊後端服務
3. 在 Settings 中找到 "Service Variables"
4. 點擊 "New Variable"
5. 選擇 "Add Reference" → 選擇 PostgreSQL 服務 → `DATABASE_URL`

### Step 3: 設定其他必要環境變數

在同一個 Variables 頁面，添加：

```bash
JWT_SECRET=你剛才產生的隨機字串
PORT=4000
NODE_ENV=production
```

### Step 4: 確認 Root Directory

在後端服務的 Settings 中：
- Root Directory = `backend`

### Step 5: 觸發部署

Git push 後 Railway 應該自動部署。如果沒有：
1. 進入後端服務
2. 點擊右上角 **⋮** → **Redeploy**

---

## ⚠️ 重要：資料庫 Migrations

### 情況 A：資料庫是新的（沒有資料）

如果這是一個全新的資料庫，Railway 部署時會自動執行 migrations：

```bash
# package.json 中的 start:prod 已經包含：
npx prisma migrate deploy
```

這會自動創建所有必要的表格。

### 情況 B：資料庫已有資料（從 SQLite 遷移）

如果你之前在本地用 SQLite 有資料，現在切換到 PostgreSQL：

1. **選項 1：重新開始（推薦用於開發階段）**
   - Railway 部署時會自動創建空的 PostgreSQL 表格
   - 可以重新建立測試資料

2. **選項 2：遷移現有資料（複雜）**
   - 需要匯出 SQLite 資料
   - 轉換並匯入到 PostgreSQL
   - 通常用於有重要資料的情況

**對於開發/測試階段，建議選擇選項 1。**

---

## 🔍 驗證部署成功

### 查看建構日誌

在 Railway 後端服務的 "Deployments" 標籤，查看最新的部署日誌：

**應該看到：**
```
✅ npm install
✅ npm run build
   - npx prisma generate (成功)
   - npx nest build (成功)
✅ npm run start:prod
   - npx prisma migrate deploy (成功)
   - 🚀 Backend running on port 4000
   - 📝 Environment: production
```

### 測試資料庫連接

部署成功後，Railway 會提供一個 URL（例如：`https://tattoo-backend-production.up.railway.app`）

測試 API：
```bash
# 測試後端是否運行
curl https://your-backend.railway.app

# 如果有健康檢查端點
curl https://your-backend.railway.app/health
```

---

## 🐛 常見問題

### Q1: "Cannot find module '/app/dist/main.js'"

**原因：** 建構步驟沒有執行

**解決方案：**
1. 確認 `railway.json` 和 `nixpacks.toml` 存在於 `backend` 資料夾
2. 確認 Root Directory = `backend`
3. 檢查建構日誌，看 `npm run build` 是否執行
4. 手動觸發重新部署

### Q2: Prisma 相關錯誤

**症狀：**
```
Error: P1001: Can't reach database server
```

**解決方案：**
1. 確認 `DATABASE_URL` 環境變數已正確設定
2. 確認 PostgreSQL 服務正在運行
3. 確認後端服務已連接到 PostgreSQL 服務
4. 檢查 DATABASE_URL 格式：
   - ✅ `postgresql://...@postgres.railway.internal:5432/railway`
   - ❌ 不要使用外部 URL（`tcp.railway.app`）

### Q3: Migration 失敗

**症狀：**
```
Error: Migration failed to apply
```

**解決方案：**
1. 檢查 `schema.prisma` 的 provider 是否為 `postgresql` ✅
2. 確認資料庫是空的（如果是新資料庫）
3. 如果需要，可以在本地重新生成 migrations：
   ```bash
   cd backend
   npx prisma migrate dev --name init_postgresql
   git add prisma/migrations
   git commit -m "chore: 為 PostgreSQL 重新生成 migrations"
   git push
   ```

---

## 📊 部署檢查清單

**準備階段：**
- [x] 已更新 `schema.prisma` 為 `postgresql` ✅
- [x] 已創建 Railway 配置檔案 ✅
- [ ] 已提交並推送程式碼到 Git

**Railway 設定：**
- [ ] `DATABASE_URL` 已設定（應該自動存在）
- [ ] `JWT_SECRET` 已設定
- [ ] `PORT=4000` 已設定
- [ ] `NODE_ENV=production` 已設定
- [ ] Root Directory = `backend`

**驗證：**
- [ ] 建構日誌無錯誤
- [ ] 應用程式成功啟動
- [ ] 日誌顯示 "Backend running on port 4000"
- [ ] 可以訪問後端 URL
- [ ] 資料庫連接正常

---

## 🎨 前端部署

後端部署成功後，設定前端：

### 前端環境變數
```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NODE_ENV=production
```

### 前端 Root Directory
```
frontend
```

---

## 🎯 總結

**你的情況比文件中的範例更好！** 因為：

1. ✅ 你已經使用 PostgreSQL（生產環境標準）
2. ✅ Railway 已經自動管理資料庫連接
3. ✅ 不需要手動設定複雜的資料庫 URL

**只需要：**
1. 提交程式碼（schema.prisma 已更新）
2. 設定 `JWT_SECRET`, `PORT`, `NODE_ENV`
3. 確認 `DATABASE_URL` 存在
4. 部署！

---

## 🚀 立即行動

```bash
# 1. 提交程式碼
cd /Users/jerrylin/tattoo-crm-1
git add .
git commit -m "fix: 切換到 PostgreSQL 並修復 Railway 部署"
git push origin main

# 2. 前往 Railway Dashboard
# 3. 設定環境變數（JWT_SECRET, PORT, NODE_ENV）
# 4. 檢查部署日誌
```

**祝部署成功！** 🎉

如有問題，參考 [DEPLOYMENT_FIX_SUMMARY.md](./DEPLOYMENT_FIX_SUMMARY.md) 的故障排除章節。

