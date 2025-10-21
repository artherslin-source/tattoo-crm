# GitHub Actions Workflows

本目錄包含自動部署到 Railway 的 GitHub Actions workflows。

## 📋 Workflows

### 1. `deploy-backend.yml`
自動部署後端到 Railway。

**觸發條件：**
- Push 到 `main` 或 `staging` 分支，且修改了 `backend/` 目錄
- 手動觸發（workflow_dispatch）

**部署目標：**
- `staging` 分支 → `tattoo-crm-backend-staging`
- `main` 分支 → `tattoo-crm-backend` (production)

### 2. `deploy-frontend.yml`
自動部署前端到 Railway。

**觸發條件：**
- Push 到 `main` 或 `staging` 分支，且修改了 `frontend/` 目錄
- 手動觸發（workflow_dispatch）

**部署目標：**
- `staging` 分支 → `tattoo-crm-frontend-staging`
- `main` 分支 → `tattoo-crm-frontend` (production)

## 🔐 必要的 GitHub Secrets

在 GitHub Repository 設定中需要添加以下 Secret：

| Secret Name | 說明 | 如何獲取 |
|------------|------|---------|
| `RAILWAY_TOKEN` | Railway API Token | 1. 登入 Railway<br>2. 前往 Account Settings<br>3. 點擊 "Tokens"<br>4. 創建新 token |

### 設定 Secrets 步驟

1. 前往 GitHub Repository
2. Settings → Secrets and variables → Actions
3. 點擊 "New repository secret"
4. Name: `RAILWAY_TOKEN`
5. Value: 貼上你的 Railway token
6. 點擊 "Add secret"

## 🚀 手動觸發部署

### 方法 1：使用 GitHub UI

1. 前往 Repository 的 "Actions" 標籤
2. 選擇要執行的 workflow（Backend 或 Frontend）
3. 點擊 "Run workflow" 按鈕
4. 選擇環境：
   - `staging` - 部署到 staging 環境
   - `production` - 部署到 production 環境
5. 點擊 "Run workflow" 確認

### 方法 2：使用 GitHub CLI

```bash
# 部署 Backend 到 staging
gh workflow run deploy-backend.yml -f environment=staging

# 部署 Backend 到 production
gh workflow run deploy-backend.yml -f environment=production

# 部署 Frontend 到 staging
gh workflow run deploy-frontend.yml -f environment=staging

# 部署 Frontend 到 production
gh workflow run deploy-frontend.yml -f environment=production
```

## 📝 自動部署流程

### Staging 環境
```bash
# 1. 切換到 staging 分支
git checkout staging

# 2. 合併或直接修改代碼
git merge develop
# 或
# 直接在 staging 分支修改

# 3. 提交並推送
git add .
git commit -m "feat: 新功能"
git push origin staging

# ✨ GitHub Actions 會自動部署到 staging 環境
```

### Production 環境
```bash
# 1. 確認 staging 測試通過

# 2. 切換到 main 分支
git checkout main

# 3. 合併 staging
git merge staging

# 4. 推送
git push origin main

# ✨ GitHub Actions 會自動部署到 production 環境
```

## 🔍 查看部署狀態

### 在 GitHub
1. 前往 Repository 的 "Actions" 標籤
2. 查看最近的 workflow runs
3. 點擊具體的 run 查看詳細日誌

### 在 Railway
1. 登入 Railway Dashboard
2. 選擇對應的專案
3. 查看 "Deployments" 標籤

## ⚠️ 注意事項

### 環境變數
- Workflows **不會**覆蓋 Railway 上已設定的環境變數
- 確保在 Railway 上已正確設定：
  - Backend: `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV`, `CORS_ORIGIN`
  - Frontend: `NEXT_PUBLIC_API_BASE_URL`, `NODE_ENV`

### 分支保護
建議在 GitHub 設定分支保護規則：

**main 分支：**
- 要求 Pull Request 審核
- 要求狀態檢查通過
- 禁止強制推送

**staging 分支：**
- 要求狀態檢查通過
- 允許直接推送（用於快速測試）

## 🐛 故障排除

### 部署失敗：Railway Token 無效
```
❌ RAILWAY_TOKEN is not set in GitHub Secrets
```

**解決：**
1. 檢查 GitHub Secrets 是否正確設定 `RAILWAY_TOKEN`
2. 確認 token 沒有過期
3. 重新生成 Railway token

### 部署失敗：無法連結專案
```
❌ Failed to link to Railway project
```

**解決：**
1. 確認 Railway 專案名稱正確
2. 確認 token 有權限訪問該專案

### 部署成功但服務未啟動

**檢查：**
1. 前往 Railway Dashboard 查看日誌
2. 檢查環境變數是否正確
3. 確認 `railway-start.sh` 腳本可執行

## 📚 相關文檔

- [Railway CLI 文檔](https://docs.railway.app/develop/cli)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [後端部署指南](../../backend/README_STAGING.md)
- [前端部署指南](../../frontend/README_STAGING_FRONTEND.md)

