# 部署流程規範 / Deployment Workflow

## ⚠️ 重要規則

**嚴禁在本機執行 `railway up` 或 `railway deploy` 指令！**

所有部署必須透過 GitHub push 觸發 Railway 自動部署。

---

## 📋 分支與環境對應

### Staging 環境
- **GitHub 分支**: `staging`
- **Railway 前端專案**: `tattoo-crm-frontend-staging`
  - 專案 ID: `a8c43aa6-9470-4c65-b801-23343c6e1472`
  - 部署 URL: https://tattoo-crm-frontend-staging-production.up.railway.app
- **Railway 後端專案**: `tattoo-crm-backend-staging`
  - 專案 ID: `474d507c-ae28-4d23-857f-317cc8a9bca6`
  - 部署 URL: https://tattoo-crm-backend-staging-production.up.railway.app

### Production 環境
- **GitHub 分支**: `main`
- **Railway 前端專案**: `tattoo-crm-frontend` (production)
- **Railway 後端專案**: `tattoo-crm-backend` (production)

---

## 🚀 部署步驟

### 1. 開發流程

```bash
# 1. 確保在正確的分支上
git checkout staging  # 或 main

# 2. 進行開發和測試
# ...

# 3. 提交變更
git add .
git commit -m "feat: your feature description"

# 4. 推送到 GitHub（這將自動觸發 Railway 部署）
git push origin staging  # 或 main
```

### 2. Railway 自動部署

推送後，Railway 會自動：
1. 檢測到 GitHub 分支變更
2. 觸發對應環境的前端和後端部署
3. 執行 build 和啟動腳本
4. 部署完成後服務會自動上線

### 3. 監控部署狀態

#### 方式一：Railway Dashboard
1. 登入 Railway Dashboard
2. 選擇對應的專案
3. 查看 Deployments 頁面

#### 方式二：GitHub Actions (如有設定)
1. 前往 GitHub Actions 頁面
2. 查看最新的 workflow run

---

## 📦 環境變數設定

### Staging 環境

#### 前端 (`tattoo-crm-frontend-staging`)
```bash
NEXT_PUBLIC_API_BASE_URL=https://tattoo-crm-backend-staging-production.up.railway.app
NODE_ENV=staging
```

#### 後端 (`tattoo-crm-backend-staging`)
```bash
DATABASE_URL=<Railway PostgreSQL URL>
NODE_ENV=staging
JWT_SECRET=<your-strong-staging-secret>
JWT_REFRESH_SECRET=<your-strong-staging-refresh-secret>
CORS_ORIGIN=https://tattoo-crm-frontend-staging-production.up.railway.app
PORT=4000
```

### Production 環境

#### 前端 (`tattoo-crm-frontend`)
```bash
NEXT_PUBLIC_API_BASE_URL=https://<your-production-backend>.up.railway.app
NODE_ENV=production
```

#### 後端 (`tattoo-crm-backend`)
```bash
DATABASE_URL=<Railway PostgreSQL URL>
NODE_ENV=production
JWT_SECRET=<your-strong-production-secret>
JWT_REFRESH_SECRET=<your-strong-production-refresh-secret>
CORS_ORIGIN=https://<your-production-frontend>.up.railway.app
PORT=4000
```

---

## 🔧 Railway 專案設定

### 1. 連接 GitHub Repository

在 Railway Dashboard 中：
1. 進入專案 Settings
2. 點擊 "Connect Repo"
3. 選擇 `artherslin-source/tattoo-crm`
4. 設定對應的分支：
   - Staging: `staging`
   - Production: `main`

### 2. 啟用自動部署

1. 在專案 Settings 中
2. 確認 "Auto Deploy" 已啟用
3. 設定部署觸發條件：
   - Branch: `staging` 或 `main`
   - Path: (可選) 只在特定目錄變更時部署

### 3. Build 和啟動設定

#### 前端
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Root Directory**: `frontend`

#### 後端
- **Build Command**: `npm run build`
- **Start Command**: `bash railway-start.sh`
- **Root Directory**: `backend`

---

## ❌ 禁止的操作

### 不要在本機執行以下指令：

```bash
# ❌ 禁止
railway up
railway up --detach
railway deploy
railway up --service <service-name>

# ❌ 也禁止直接修改 Railway 變數後手動觸發部署
```

### 為什麼？

1. **一致性**: 確保所有部署都經過 Git 版本控制
2. **可追溯性**: 每次部署都有對應的 commit
3. **團隊協作**: 避免本機環境差異導致的問題
4. **審計**: 所有變更都有記錄

---

## 🆘 緊急回滾

如果部署出現問題：

### 方式一：Git Revert
```bash
# 1. 回退到上一個穩定的 commit
git revert HEAD

# 2. 推送
git push origin staging  # 或 main
```

### 方式二：Railway Dashboard
1. 進入專案的 Deployments 頁面
2. 找到上一個穩定的部署
3. 點擊 "Redeploy"

---

## 📝 部署檢查清單

### 部署前
- [ ] 已在本地測試所有功能
- [ ] 已更新必要的環境變數
- [ ] 已提交所有變更到 Git
- [ ] Commit message 清晰描述變更內容

### 部署後
- [ ] 前端可以正常訪問
- [ ] 後端 API 健康檢查通過 (`GET /api/health/simple`)
- [ ] 登入功能正常
- [ ] 關鍵功能測試通過
- [ ] 檢查 Railway logs 無異常錯誤

---

## 🔍 問題排查

### 部署失敗

1. **檢查 Railway Logs**:
   ```
   Railway Dashboard → 專案 → Deployments → 最新部署 → Logs
   ```

2. **常見問題**:
   - Build 失敗: 檢查 `package.json` 的 scripts
   - 啟動失敗: 檢查環境變數是否正確設定
   - 資料庫連接失敗: 檢查 `DATABASE_URL`

### 前端無法連接後端

1. **檢查環境變數**:
   - `NEXT_PUBLIC_API_BASE_URL` 是否正確
   - 注意: 前端需要重新 build 才能吃到新的環境變數

2. **檢查 CORS**:
   - 後端 `CORS_ORIGIN` 是否包含前端 URL

3. **檢查網路**:
   - 前端 Console 是否有 CORS 或 Network 錯誤
   - 後端是否正常運行

---

## 📞 聯絡資訊

如有問題，請聯絡：
- DevOps 負責人: [Your Contact]
- Railway 專案管理員: [Admin Contact]

---

**最後更新**: 2025-10-23
**版本**: 1.0.0

