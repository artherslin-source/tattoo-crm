# 🎯 從這裡開始 - Staging 環境部署

## ✅ 已完成的配置

我已經幫你完成以下配置：

### 後端配置
- ✅ 新增 `railway-start.sh` 啟動腳本（安全的 Prisma migrations）
- ✅ 更新 `package.json` 加入 `prisma:migrate` 和 `prisma:seed` scripts
- ✅ 更新 `railway.json` 使用新的啟動腳本
- ✅ 更新 `src/main.ts` 支援 `CORS_ORIGIN` 環境變數
- ✅ 創建完整部署文檔

### 前端配置
- ✅ 更新 `src/lib/api.ts` 使用 `NEXT_PUBLIC_API_BASE_URL` 環境變數
- ✅ 移除硬編碼的 production URL
- ✅ 創建完整部署文檔

### 文檔和工具
- ✅ 環境變數設定指南
- ✅ 快速設置腳本
- ✅ 逐步手動設置指南
- ✅ 完整的問題排解文檔

---

## 🚀 下一步：立即部署（3 個選項）

### 選項 1️⃣：自動化腳本（推薦，最快）

```bash
# 步驟 1: 已完成 ✅（JWT Secret 已生成）

# 步驟 2: 連結 Railway 專案
cd backend
railway link    # 選擇: tattoo-crm-backend-staging
cd ../frontend
railway link    # 選擇: tattoo-crm-frontend-staging
cd ..

# 步驟 3: 編輯 .staging-config 檔案
# 加入你的 Railway URLs：
nano .staging-config
# 或
code .staging-config

# 格式：
# JWT_SECRET="Z6v7NfUZgaosvIDkxE8JyuZafRongFqMFvJwNLvg2xE="  # 已生成
# NODE_ENV="staging"  # 已設定
# BACKEND_URL="https://你的後端URL.up.railway.app"  # 👈 需要加入
# FRONTEND_URL="https://你的前端URL.up.railway.app"  # 👈 需要加入

# 步驟 4: 設置環境變數並部署
./setup-staging-simple.sh 2  # 設置後端
./setup-staging-simple.sh 3  # 設置前端
./setup-staging-simple.sh 4  # 部署
```

### 選項 2️⃣：快速手動設置（5 分鐘）

直接閱讀並執行：
```bash
cat QUICK_STAGING_SETUP.md
```

或在編輯器中開啟：
```bash
code QUICK_STAGING_SETUP.md
```

### 選項 3️⃣：詳細手動設置（包含完整說明）

```bash
cat MANUAL_STAGING_SETUP.md
```

---

## 📝 如何獲取 Railway URLs

你需要兩個 URLs：

### 後端 URL
```bash
cd backend
railway link    # 如果還沒連結
railway status  # 查看 Service URL
```

或前往 [Railway Dashboard](https://railway.app) → `tattoo-crm-backend-staging` → Settings → Domains

### 前端 URL
```bash
cd frontend
railway link    # 如果還沒連結
railway status  # 查看 Service URL
```

或前往 [Railway Dashboard](https://railway.app) → `tattoo-crm-frontend-staging` → Settings → Domains

---

## ⚡ 超快速設置（如果你已知道 URLs）

如果你已經知道後端和前端的 URLs：

```bash
# 1. 編輯配置檔案
cat >> .staging-config << 'EOF'
BACKEND_URL="https://你的後端URL.up.railway.app"
FRONTEND_URL="https://你的前端URL.up.railway.app"
EOF

# 2. 連結專案
cd backend && railway link && cd ..
cd frontend && railway link && cd ..

# 3. 一鍵設置和部署
./setup-staging-simple.sh 2 && \
./setup-staging-simple.sh 3 && \
./setup-staging-simple.sh 4
```

---

## 📋 需要設置的環境變數總覽

### 後端（tattoo-crm-backend-staging）

| 變數 | 值 | 狀態 |
|------|-----|------|
| `DATABASE_URL` | Railway 自動提供 | ✅ 自動 |
| `JWT_SECRET` | 已生成在 `.staging-config` | ✅ 就緒 |
| `NODE_ENV` | `staging` | ✅ 就緒 |
| `CORS_ORIGIN` | 你的前端 URL | ⏳ 待設定 |

### 前端（tattoo-crm-frontend-staging）

| 變數 | 值 | 狀態 |
|------|-----|------|
| `NEXT_PUBLIC_API_BASE_URL` | 你的後端 URL | ⏳ 待設定 |
| `NODE_ENV` | `staging` | ✅ 就緒 |

---

## ✅ 部署後驗證

### 1. 測試後端

```bash
# 替換成你的後端 URL
curl https://你的後端URL/health

# 預期回應
{"status":"ok","timestamp":"2025-10-21T..."}
```

### 2. 測試前端

開啟前端 URL，按 F12：

**Console 應顯示：**
```
🔍 API Base URL: https://你的後端URL
🔍 Environment: staging
```

### 3. 測試登入

前往前端網站，測試登入功能，確認：
- ✅ 可以登入
- ✅ 無 CORS 錯誤
- ✅ 資料載入正常

---

## 🆘 遇到問題？

### 快速診斷

```bash
# 檢查後端日誌
cd backend && railway logs --tail 50

# 檢查前端日誌
cd frontend && railway logs --tail 50

# 檢查環境變數
cd backend && railway variables
cd frontend && railway variables
```

### 常見問題解決

- **CORS 錯誤** → 檢查後端的 `CORS_ORIGIN` 是否包含前端 URL
- **API 連不到** → 檢查前端的 `NEXT_PUBLIC_API_BASE_URL` 是否正確
- **環境變數沒生效** → 記得重新部署（`railway up --detach`）

詳細排錯指南：
- `QUICK_STAGING_SETUP.md` → 常見問題章節
- `backend/README_STAGING.md` → 後端問題排解
- `frontend/README_STAGING_FRONTEND.md` → 前端問題排解

---

## 📚 完整文檔索引

### 快速開始
- **[START_HERE.md](START_HERE.md)** ← 你在這裡
- **[QUICK_STAGING_SETUP.md](QUICK_STAGING_SETUP.md)** ← 5 分鐘快速設置

### 詳細指南
- [MANUAL_STAGING_SETUP.md](MANUAL_STAGING_SETUP.md) - 手動設置逐步指南
- [RAILWAY_VARIABLES_STAGING.md](RAILWAY_VARIABLES_STAGING.md) - 環境變數完整說明
- [STAGING_SETUP_COMPLETE.md](STAGING_SETUP_COMPLETE.md) - 所有變更的詳細報告

### 專案特定文檔
- [backend/README_STAGING.md](backend/README_STAGING.md) - 後端部署指南
- [frontend/README_STAGING_FRONTEND.md](frontend/README_STAGING_FRONTEND.md) - 前端部署指南

### 自動化工具
- `setup-staging-simple.sh` - 分步驟設置腳本
- `setup-staging.sh` - 一鍵設置腳本（需要手動連結）

---

## 🎯 建議的執行順序

1. **閱讀** `QUICK_STAGING_SETUP.md`（2 分鐘）
2. **執行** 連結專案的命令
3. **獲取** Railway URLs
4. **編輯** `.staging-config` 加入 URLs
5. **運行** `./setup-staging-simple.sh 2/3/4`
6. **驗證** 部署結果
7. **測試** 所有功能

---

## 💡 重要提示

1. **JWT Secret 已生成** ✅
   - 位於 `.staging-config` 檔案
   - 請勿分享或提交到 Git

2. **不要使用 `scripts/start-prod.js`** ⚠️
   - 該腳本會刪除所有資料庫資料
   - 已改用安全的 `railway-start.sh`

3. **環境變數變更後必須重新部署** 🔄
   - 特別是前端的 `NEXT_PUBLIC_*` 變數
   - 執行 `railway up --detach` 重新部署

4. **Railway URLs 格式** 🌐
   - 必須包含 `https://`
   - 不要在結尾加 `/`
   - 範例：`https://backend-staging.up.railway.app`

---

## ⏭️ 立即開始

執行以下命令開始設置：

```bash
# 查看快速指南
cat QUICK_STAGING_SETUP.md

# 或直接開始連結專案
cd backend && railway link
```

**🚀 祝部署順利！**

