# 🚀 GitHub Actions 部署指南

## 📋 正確的部署流程

**Cursor → GitHub staging → Railway (透過 GitHub Actions)**

## 🔧 設置 GitHub Secrets

### 1. 獲取 Railway Token
```bash
# 在本地執行
railway login
railway auth
```

### 2. 設置 GitHub Secrets
前往: https://github.com/artherslin-source/tattoo-crm/settings/secrets/actions

添加以下 Secret:
- **Name**: `RAILWAY_TOKEN`
- **Value**: 從 `railway auth` 獲取的 token

## 🚀 觸發部署

### 方法 1: 自動觸發 (推薦)
當你推送代碼到 `staging` 分支時，GitHub Actions 會自動觸發：

```bash
# 在 Cursor 中修改代碼後
git add .
git commit -m "你的修改描述"
git push origin staging
```

### 方法 2: 手動觸發
1. 前往: https://github.com/artherslin-source/tattoo-crm/actions
2. 選擇 "Deploy Backend to Railway" 或 "Deploy Frontend to Railway"
3. 點擊 "Run workflow"
4. 選擇分支: `staging`
5. 點擊 "Run workflow"

## 📊 監控部署狀態

### 檢查 GitHub Actions
1. 前往: https://github.com/artherslin-source/tattoo-crm/actions
2. 查看工作流程狀態
3. 點擊具體的工作流程查看詳細日誌

### 檢查 Railway 部署
1. 前往: https://railway.app/dashboard
2. 查看 `tattoo-crm-backend-staging` 和 `tattoo-crm-frontend-staging` 項目
3. 檢查部署日誌

## 🔍 故障排除

### 如果 GitHub Actions 失敗
1. 檢查 `RAILWAY_TOKEN` 是否正確設置
2. 檢查 Railway 項目名稱是否正確
3. 查看 GitHub Actions 日誌中的錯誤信息

### 如果部署成功但功能異常
1. 檢查 Railway 環境變數設置
2. 檢查後端健康狀態
3. 檢查前端 API 連接

## 📋 當前狀態

- ✅ GitHub Actions 工作流程已設置
- ✅ 代碼已推送到 staging 分支
- ⏳ 等待 GitHub Actions 自動觸發或手動觸發
- ⏳ 等待 Railway 部署完成

## 🎯 下一步

1. **檢查 GitHub Actions**: https://github.com/artherslin-source/tattoo-crm/actions
2. **手動觸發部署** (如果沒有自動觸發)
3. **等待部署完成**
4. **測試功能**
