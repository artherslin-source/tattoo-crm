# ✅ Git 分支自動部署工作流程設定完成

## 📋 已完成項目總覽

所有 Git 分支自動部署設定已完成！以下是詳細報告。

---

## 🗂️ 建立或修改的檔案清單

### 1. GitHub Actions Workflows（核心）

| 檔案路徑 | 用途 | 狀態 |
|---------|------|------|
| `.github/workflows/deploy-backend.yml` | 後端自動部署 workflow | ✅ 新建 |
| `.github/workflows/deploy-frontend.yml` | 前端自動部署 workflow | ✅ 新建 |
| `.github/workflows/README.md` | Workflows 使用說明 | ✅ 新建 |

### 2. 文檔檔案

| 檔案路徑 | 用途 | 狀態 |
|---------|------|------|
| `GIT_WORKFLOW_GUIDE.md` | Git 工作流程完整指南 | ✅ 新建 |
| `GITHUB_SECRETS_SETUP.md` | GitHub Secrets 設定教學 | ✅ 新建 |
| `DEPLOYMENT_AUTOMATION_COMPLETE.md` | 本文件（設定完成報告） | ✅ 新建 |

---

## 📝 Workflow 完整內容

### 🔧 後端部署 Workflow

**檔案：** `.github/workflows/deploy-backend.yml`

<details>
<summary>點擊展開完整內容</summary>

```yaml
name: Deploy Backend to Railway

on:
  push:
    branches:
      - main
      - staging
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: 🔍 Checkout code
        uses: actions/checkout@v4

      - name: 📝 Set environment variables
        id: set-env
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            if [ "${{ inputs.environment }}" == "staging" ]; then
              BRANCH="staging"
              PROJECT="tattoo-crm-backend-staging"
            else
              BRANCH="main"
              PROJECT="tattoo-crm-backend"
            fi
          else
            BRANCH="${GITHUB_REF#refs/heads/}"
            if [ "$BRANCH" == "staging" ]; then
              PROJECT="tattoo-crm-backend-staging"
            elif [ "$BRANCH" == "main" ]; then
              PROJECT="tattoo-crm-backend"
            else
              echo "❌ Unknown branch: $BRANCH"
              exit 1
            fi
          fi
          
          echo "branch=$BRANCH" >> $GITHUB_OUTPUT
          echo "project=$PROJECT" >> $GITHUB_OUTPUT
          echo "🌿 Branch: $BRANCH"
          echo "📦 Project: $PROJECT"

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: 📦 Install Railway CLI
        run: npm install -g @railway/cli

      - name: 🔐 Verify Railway Token
        run: |
          if [ -z "${{ secrets.RAILWAY_TOKEN }}" ]; then
            echo "❌ RAILWAY_TOKEN is not set in GitHub Secrets"
            exit 1
          fi
          echo "✅ Railway token verified"

      - name: 🚀 Deploy to Railway
        working-directory: ./backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          echo "📦 Deploying backend to ${{ steps.set-env.outputs.project }}..."
          
          # Link to the correct Railway project
          railway link ${{ steps.set-env.outputs.project }} || {
            echo "❌ Failed to link to Railway project"
            exit 1
          }
          
          # Deploy
          railway up --detach || {
            echo "❌ Deployment failed"
            exit 1
          }
          
          echo "✅ Backend deployed successfully to ${{ steps.set-env.outputs.branch }} environment"

      - name: 📊 Deployment Summary
        if: success()
        run: |
          echo "## ✅ Deployment Successful" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** ${{ steps.set-env.outputs.branch }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Project:** ${{ steps.set-env.outputs.project }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Time:** $(date -u)" >> $GITHUB_STEP_SUMMARY

      - name: 💬 Notify on Failure
        if: failure()
        run: |
          echo "## ❌ Deployment Failed" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** ${{ steps.set-env.outputs.branch }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Project:** ${{ steps.set-env.outputs.project }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Please check the logs above for details." >> $GITHUB_STEP_SUMMARY
```

</details>

**特點：**
- ✅ 自動偵測分支（staging/main）
- ✅ 只在 `backend/` 目錄變更時觸發
- ✅ 支援手動觸發
- ✅ 自動連結到正確的 Railway 專案
- ✅ 部署狀態摘要
- ✅ 錯誤處理和通知

---

### 🎨 前端部署 Workflow

**檔案：** `.github/workflows/deploy-frontend.yml`

<details>
<summary>點擊展開完整內容</summary>

```yaml
name: Deploy Frontend to Railway

on:
  push:
    branches:
      - main
      - staging
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: 🔍 Checkout code
        uses: actions/checkout@v4

      - name: 📝 Set environment variables
        id: set-env
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            if [ "${{ inputs.environment }}" == "staging" ]; then
              BRANCH="staging"
              PROJECT="tattoo-crm-frontend-staging"
            else
              BRANCH="main"
              PROJECT="tattoo-crm-frontend"
            fi
          else
            BRANCH="${GITHUB_REF#refs/heads/}"
            if [ "$BRANCH" == "staging" ]; then
              PROJECT="tattoo-crm-frontend-staging"
            elif [ "$BRANCH" == "main" ]; then
              PROJECT="tattoo-crm-frontend"
            else
              echo "❌ Unknown branch: $BRANCH"
              exit 1
            fi
          fi
          
          echo "branch=$BRANCH" >> $GITHUB_OUTPUT
          echo "project=$PROJECT" >> $GITHUB_OUTPUT
          echo "🌿 Branch: $BRANCH"
          echo "📦 Project: $PROJECT"

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: 📦 Install Railway CLI
        run: npm install -g @railway/cli

      - name: 🔐 Verify Railway Token
        run: |
          if [ -z "${{ secrets.RAILWAY_TOKEN }}" ]; then
            echo "❌ RAILWAY_TOKEN is not set in GitHub Secrets"
            exit 1
          fi
          echo "✅ Railway token verified"

      - name: 🚀 Deploy to Railway
        working-directory: ./frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          echo "📦 Deploying frontend to ${{ steps.set-env.outputs.project }}..."
          
          # Link to the correct Railway project
          railway link ${{ steps.set-env.outputs.project }} || {
            echo "❌ Failed to link to Railway project"
            exit 1
          }
          
          # Deploy
          railway up --detach || {
            echo "❌ Deployment failed"
            exit 1
          }
          
          echo "✅ Frontend deployed successfully to ${{ steps.set-env.outputs.branch }} environment"

      - name: 📊 Deployment Summary
        if: success()
        run: |
          echo "## ✅ Deployment Successful" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** ${{ steps.set-env.outputs.branch }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Project:** ${{ steps.set-env.outputs.project }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Time:** $(date -u)" >> $GITHUB_STEP_SUMMARY

      - name: 💬 Notify on Failure
        if: failure()
        run: |
          echo "## ❌ Deployment Failed" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** ${{ steps.set-env.outputs.branch }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Project:** ${{ steps.set-env.outputs.project }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Please check the logs above for details." >> $GITHUB_STEP_SUMMARY
```

</details>

**特點：**
- ✅ 自動偵測分支（staging/main）
- ✅ 只在 `frontend/` 目錄變更時觸發
- ✅ 支援手動觸發
- ✅ 自動連結到正確的 Railway 專案
- ✅ 部署狀態摘要
- ✅ 錯誤處理和通知

---

## 🔐 GitHub Secrets 設定

### 需要新增的 Secret

| Secret Name | 用途 | 必要性 | 如何獲取 |
|------------|------|--------|---------|
| `RAILWAY_TOKEN` | Railway API token，用於部署 | ✅ 必須 | 見下方說明 |

### 獲取 RAILWAY_TOKEN

1. **登入 Railway**
   ```
   https://railway.app
   ```

2. **前往 Account Settings**
   - 點擊右上角頭像
   - 選擇 "Account Settings"

3. **創建 Token**
   - 前往 "Tokens" 標籤
   - 點擊 "Create New Token"
   - 輸入名稱：`github-actions-deploy`
   - 點擊 "Create"
   - **立即複製 token**（只顯示一次！）

4. **在 GitHub 設定 Secret**
   ```
   Repository → Settings → Secrets and variables → Actions
   → New repository secret
   
   Name: RAILWAY_TOKEN
   Value: [貼上 Railway token]
   ```

**詳細教學：** 查看 `GITHUB_SECRETS_SETUP.md`

---

## 🚀 手動觸發 Workflow

### 方法 1：使用 GitHub UI（推薦）

1. **前往 Actions 頁面**
   ```
   https://github.com/artherslin-source/tattoo-crm/actions
   ```

2. **選擇 Workflow**
   - 點擊左側 "Deploy Backend to Railway" 或 "Deploy Frontend to Railway"

3. **觸發部署**
   - 點擊右上角 "Run workflow" 按鈕
   - 選擇環境：
     - `staging` - 部署到測試環境
     - `production` - 部署到生產環境
   - 點擊 "Run workflow" 確認

### 方法 2：使用 GitHub CLI

```bash
# 安裝 GitHub CLI（如果還沒安裝）
brew install gh  # macOS
# 或
sudo apt install gh  # Linux
# 或
winget install GitHub.cli  # Windows

# 登入
gh auth login

# 部署後端到 staging
gh workflow run deploy-backend.yml -f environment=staging

# 部署後端到 production
gh workflow run deploy-backend.yml -f environment=production

# 部署前端到 staging
gh workflow run deploy-frontend.yml -f environment=staging

# 部署前端到 production
gh workflow run deploy-frontend.yml -f environment=production
```

---

## 💻 推送分支觸發自動部署

### Staging 環境部署

```bash
# 切換到 staging 分支
git checkout staging

# 修改後端代碼
cd backend
# ... 修改代碼 ...
git add .
git commit -m "fix(backend): 修復登入問題"
git push origin staging
# ✨ 自動觸發後端部署到 staging

# 修改前端代碼
cd ../frontend
# ... 修改代碼 ...
git add .
git commit -m "feat(frontend): 新增功能"
git push origin staging
# ✨ 自動觸發前端部署到 staging

# 同時修改前後端
cd ..
git add backend/ frontend/
git commit -m "feat: 新增完整功能"
git push origin staging
# ✨ 自動觸發前後端部署到 staging
```

### Production 環境部署

```bash
# 確認 staging 測試通過後

# 切換到 main 分支
git checkout main
git pull origin main

# 合併 staging
git merge staging

# 推送到 main
git push origin main
# ✨ 自動觸發部署到 production

# 或使用 Pull Request（推薦）
# 1. 在 GitHub 創建 PR: staging → main
# 2. 審核通過後合併
# 3. 自動觸發部署
```

---

## 📊 部署流程圖

### 自動部署流程

```
開發者修改代碼
    ↓
提交到 Git（staging/main 分支）
    ↓
GitHub Actions 偵測到變更
    ↓
執行 Workflow
    ├─ 偵測分支
    ├─ 選擇對應的 Railway 專案
    ├─ 連結專案
    ├─ 執行部署
    └─ 回報結果
    ↓
部署完成
    ├─ 成功 ✅
    └─ 失敗 ❌（查看日誌）
```

### 分支對應關係

```
Git 分支              Railway 專案
─────────────────────────────────────────
staging 分支    →    tattoo-crm-backend-staging
                     tattoo-crm-frontend-staging

main 分支       →    tattoo-crm-backend
                     tattoo-crm-frontend
```

---

## ✅ 設定檢查清單

完成以下步驟確保設定正確：

### GitHub 設定
- [ ] 已將所有 workflow 檔案推送到 GitHub
- [ ] 已在 Repository Settings 設定 `RAILWAY_TOKEN` Secret
- [ ] Secret 名稱正確（大小寫敏感）

### Railway 設定
- [ ] 後端 staging 專案名稱：`tattoo-crm-backend-staging`
- [ ] 後端 production 專案名稱：`tattoo-crm-backend`
- [ ] 前端 staging 專案名稱：`tattoo-crm-frontend-staging`
- [ ] 前端 production 專案名稱：`tattoo-crm-frontend`
- [ ] 已設定所有必要的環境變數

### 測試部署
- [ ] 手動觸發 staging 部署測試
- [ ] 推送代碼到 staging 測試自動部署
- [ ] 檢查部署日誌確認成功

---

## 📚 相關文檔

| 文檔 | 用途 |
|------|------|
| [GIT_WORKFLOW_GUIDE.md](GIT_WORKFLOW_GUIDE.md) | Git 工作流程完整指南 |
| [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) | GitHub Secrets 設定教學 |
| [.github/workflows/README.md](.github/workflows/README.md) | Workflows 使用說明 |
| [STAGING_CRASH_FIX.md](STAGING_CRASH_FIX.md) | Staging 崩溃修复报告 |

---

## 🎯 下一步行動

1. **設定 GitHub Secret**
   ```bash
   # 查看詳細步驟
   cat GITHUB_SECRETS_SETUP.md
   ```

2. **測試自動部署**
   ```bash
   # 切換到 staging 分支
   git checkout staging
   
   # 修改任意文件測試
   echo "# Test" >> README.md
   git add README.md
   git commit -m "test: 測試自動部署"
   git push origin staging
   
   # 前往 GitHub Actions 查看執行結果
   ```

3. **閱讀工作流程指南**
   ```bash
   # 查看完整的 Git 工作流程
   cat GIT_WORKFLOW_GUIDE.md
   ```

---

## 🆘 故障排除

### 問題 1：Workflow 沒有觸發

**檢查：**
- 確認推送的分支是 `main` 或 `staging`
- 確認修改的檔案在 `backend/` 或 `frontend/` 目錄
- 檢查 `.github/workflows/` 檔案是否已推送到 GitHub

### 問題 2：RAILWAY_TOKEN 錯誤

**錯誤訊息：**
```
❌ RAILWAY_TOKEN is not set in GitHub Secrets
```

**解決：**
1. 檢查 Secret 名稱是否正確（大小寫敏感）
2. 確認 Secret 已儲存
3. 重新執行 workflow

### 問題 3：連結專案失敗

**錯誤訊息：**
```
❌ Failed to link to Railway project
```

**解決：**
1. 確認 Railway 專案名稱正確
2. 確認 token 有權限訪問該專案
3. 檢查專案是否存在

---

## 🎉 完成！

**你已經成功設定 Git 分支自動部署工作流程！**

現在你可以：
- ✅ 推送代碼到 `staging` 自動部署到測試環境
- ✅ 推送代碼到 `main` 自動部署到生產環境
- ✅ 手動觸發部署到任何環境
- ✅ 查看部署狀態和日誌
- ✅ 享受自動化帶來的便利！

**祝開發順利！🚀**

