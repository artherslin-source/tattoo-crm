# 🔄 Git 分支部署工作流程指南

## 📋 概述

本專案使用 Git 分支對應部署環境的模式，通過 GitHub Actions 自動部署到 Railway。

```
staging 分支  →  Railway Staging 環境
main 分支     →  Railway Production 環境
```

---

## 🌳 分支策略

### 分支架構

```
main (production)
  ↑
  ├── staging
  │     ↑
  │     └── feature/* (功能分支)
  │     └── bugfix/* (修復分支)
```

### 分支說明

| 分支 | 用途 | 部署目標 | 保護規則 |
|------|------|----------|---------|
| `main` | 生產環境 | Railway Production | ✅ 需要 PR 審核 |
| `staging` | 測試環境 | Railway Staging | ⚠️ 可直接推送 |
| `feature/*` | 功能開發 | 不自動部署 | - |
| `bugfix/*` | 錯誤修復 | 不自動部署 | - |

---

## 🚀 日常開發流程

### 1️⃣ 開發新功能

```bash
# 從 staging 創建功能分支
git checkout staging
git pull origin staging
git checkout -b feature/新功能名稱

# 開發並提交
git add .
git commit -m "feat: 實作新功能"

# 推送到遠端
git push origin feature/新功能名稱

# 在 GitHub 創建 PR 合併到 staging
```

### 2️⃣ 部署到 Staging 測試

```bash
# 方法 1：合併 PR 後自動部署
# 在 GitHub 上合併 PR 到 staging 分支
# ✨ 自動觸發部署

# 方法 2：直接在 staging 修改並推送
git checkout staging
git pull origin staging

# 修改代碼
git add .
git commit -m "fix: 修復問題"
git push origin staging
# ✨ 自動觸發部署
```

### 3️⃣ 部署到 Production

```bash
# 確認 staging 測試通過後

# 創建 PR 從 staging 到 main
git checkout main
git pull origin main

# 在 GitHub 創建 PR: staging → main
# 經過審核和測試後，合併 PR
# ✨ 自動觸發部署到 production
```

---

## 📝 提交訊息規範

使用 Conventional Commits 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 類型

| Type | 說明 | 範例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): 新增 OAuth 登入` |
| `fix` | 修復 bug | `fix(api): 修復會員查詢錯誤` |
| `docs` | 文檔更新 | `docs: 更新部署指南` |
| `style` | 格式調整 | `style: 修正縮排` |
| `refactor` | 重構 | `refactor(orders): 優化訂單邏輯` |
| `test` | 測試 | `test: 新增單元測試` |
| `chore` | 雜項 | `chore: 更新依賴` |

### 範例

```bash
# 好的提交訊息
git commit -m "feat(frontend): 新增預約日曆檢視"
git commit -m "fix(backend): 修復 JWT token 驗證問題"
git commit -m "docs: 更新 API 文檔"

# 不好的提交訊息
git commit -m "update"
git commit -m "fix bug"
git commit -m "修改"
```

---

## 🔄 常用 Git 指令

### 切換分支並保持代碼整潔

```bash
# 查看當前狀態
git status

# 暫存當前修改
git stash

# 切換分支
git checkout staging

# 恢復暫存的修改
git stash pop
```

### 同步遠端變更

```bash
# 更新本地 staging
git checkout staging
git pull origin staging

# 更新本地 main
git checkout main
git pull origin main
```

### 合併分支

```bash
# 將 feature 分支合併到 staging
git checkout staging
git pull origin staging
git merge feature/新功能
git push origin staging
```

### 解決衝突

```bash
# 發生衝突時
git status  # 查看衝突文件

# 手動編輯衝突文件，解決衝突標記
# <<<<<<< HEAD
# ... 你的變更
# =======
# ... 衝突的變更
# >>>>>>> branch-name

# 標記為已解決
git add 解決的文件

# 完成合併
git commit
```

---

## 🎯 推送代碼觸發部署

### Staging 部署

```bash
# 後端修改
cd backend
# 修改代碼...
git add backend/
git commit -m "fix(backend): 修復登入問題"
git push origin staging
# ✨ 自動部署後端到 staging

# 前端修改
cd frontend
# 修改代碼...
git add frontend/
git commit -m "feat(frontend): 新增儀表板"
git push origin staging
# ✨ 自動部署前端到 staging

# 同時修改前後端
git add backend/ frontend/
git commit -m "feat: 新增完整功能"
git push origin staging
# ✨ 自動部署前後端到 staging
```

### Production 部署

```bash
# 確認 staging 測試通過

# 合併到 main
git checkout main
git pull origin main
git merge staging
git push origin main
# ✨ 自動部署到 production

# 或使用 PR（推薦）
# 1. 在 GitHub 創建 PR: staging → main
# 2. 審核通過後合併
# 3. 自動部署
```

---

## 🛠️ 手動觸發部署

### 使用 GitHub UI

1. 前往 https://github.com/artherslin-source/tattoo-crm/actions
2. 選擇 workflow：
   - `Deploy Backend to Railway`
   - `Deploy Frontend to Railway`
3. 點擊 "Run workflow"
4. 選擇環境：
   - `staging` - 部署到測試環境
   - `production` - 部署到生產環境
5. 點擊 "Run workflow" 確認

### 使用 GitHub CLI

```bash
# 安裝 GitHub CLI（如果還沒安裝）
brew install gh  # macOS
# 或
# sudo apt install gh  # Linux

# 登入
gh auth login

# 手動部署後端到 staging
gh workflow run deploy-backend.yml -f environment=staging

# 手動部署前端到 production
gh workflow run deploy-frontend.yml -f environment=production
```

---

## 📊 監控部署狀態

### 1. GitHub Actions

```
https://github.com/artherslin-source/tattoo-crm/actions
```

查看：
- ✅ 部署成功/失敗狀態
- 📋 詳細日誌
- ⏱️ 部署時間

### 2. Railway Dashboard

```
https://railway.app
```

查看：
- 🚀 部署狀態
- 📊 服務健康狀況
- 📝 運行日誌

---

## ⚠️ 注意事項

### 環境變數管理

**❌ 不要在代碼中：**
- 硬編碼 API keys
- 提交 `.env` 檔案
- 包含敏感資訊

**✅ 正確做法：**
- 在 Railway 上設定環境變數
- 使用 `.env.example` 作為範本
- GitHub Actions 會使用 Railway 上的環境變數

### 分支保護建議

在 GitHub Settings → Branches 設定：

**main 分支：**
```yaml
保護規則：
✅ Require pull request reviews before merging
✅ Require status checks to pass before merging
✅ Require branches to be up to date before merging
✅ Restrict who can push to matching branches
❌ Allow force pushes
❌ Allow deletions
```

**staging 分支：**
```yaml
保護規則：
✅ Require status checks to pass before merging
✅ Require branches to be up to date before merging
⚠️ Allow direct pushes (for quick testing)
❌ Allow force pushes
❌ Allow deletions
```

---

## 🔥 緊急情況處理

### 回滾 Production 部署

```bash
# 方法 1：回滾到上一個 commit
git checkout main
git revert HEAD
git push origin main
# ✨ 自動部署回滾版本

# 方法 2：在 Railway Dashboard 手動回滾
# 1. 前往 Railway → 選擇服務
# 2. Deployments 標籤
# 3. 選擇穩定的版本
# 4. 點擊 "Redeploy"
```

### Hotfix 流程

```bash
# 1. 從 main 創建 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/緊急修復

# 2. 修復並測試
git add .
git commit -m "fix: 緊急修復 XXX 問題"

# 3. 合併到 main
git checkout main
git merge hotfix/緊急修復
git push origin main
# ✨ 自動部署

# 4. 同步到 staging
git checkout staging
git merge main
git push origin staging

# 5. 刪除 hotfix 分支
git branch -d hotfix/緊急修復
git push origin --delete hotfix/緊急修復
```

---

## 📚 相關資源

- [GitHub Actions 文檔](.github/workflows/README.md)
- [後端部署指南](backend/README_STAGING.md)
- [前端部署指南](frontend/README_STAGING_FRONTEND.md)
- [環境變數設定](RAILWAY_VARIABLES_STAGING.md)

---

## 💡 最佳實踐

1. **小而頻繁的提交** - 每個提交只做一件事
2. **清晰的提交訊息** - 使用 Conventional Commits 格式
3. **先測試再部署** - 在 staging 充分測試後再上 production
4. **使用 PR** - main 分支的變更都通過 PR
5. **監控日誌** - 部署後檢查 Railway 日誌確認正常運行
6. **定期同步** - 保持本地分支與遠端同步

---

**🎉 設定完成！現在你可以開始使用自動化部署工作流程了。**

