#!/bin/bash

# Railway 自動部署腳本
# 此腳本會自動推送程式碼到 GitHub，觸發 Railway 重新部署

set -e

echo "🚀 開始自動部署到 Railway..."

# 檢查 Git 狀態
echo "📋 檢查 Git 狀態..."
if [ -n "$(git status --porcelain)" ]; then
    echo "✅ 發現未提交的變更"
else
    echo "ℹ️ 沒有未提交的變更"
    exit 0
fi

# 添加所有變更
echo "📦 添加所有變更到 Git..."
git add .

# 提交變更
echo "💾 提交變更..."
git commit -m "fix: Update to PostgreSQL for production deployment

- Update Prisma schema from sqlite to postgresql
- Improve production startup script with better error handling
- Add comprehensive deployment and development guides
- Fix DATABASE_URL validation for Railway deployment

Resolves: P1012 Prisma schema validation error"

# 嘗試推送到 GitHub
echo "📤 推送到 GitHub..."
if git push origin main; then
    echo "✅ 程式碼已成功推送到 GitHub"
    echo "🔄 Railway 將自動觸發重新部署"
    echo ""
    echo "📋 接下來請在 Railway Dashboard 中："
    echo "1. 前往您的後端服務 (tattoo-crm)"
    echo "2. 點擊 'Variables' 標籤"
    echo "3. 設定以下環境變數："
    echo ""
    echo "   DATABASE_URL=\${{Postgres.DATABASE_URL}}"
    echo "   JWT_SECRET=<請使用下方命令生成>"
    echo "   NODE_ENV=production"
    echo "   PORT=4000"
    echo "   CORS_ORIGIN=https://your-frontend-url.railway.app"
    echo ""
    echo "🔐 生成 JWT_SECRET："
    echo "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    echo ""
    echo "📊 監控部署狀態："
    echo "   - 前往 Railway Dashboard"
    echo "   - 查看 'Deployments' 標籤"
    echo "   - 等待看到 '✅ DATABASE_URL 驗證通過'"
    echo ""
    echo "🎉 部署完成後，您的後端服務將恢復正常！"
else
    echo "❌ 推送到 GitHub 失敗"
    echo "💡 請手動執行以下命令："
    echo "   git push origin main"
    echo ""
    echo "或者設定 GitHub 認證："
    echo "   git config --global credential.helper store"
    echo "   git push origin main"
    echo "   (然後輸入您的 GitHub 用戶名和密碼/Token)"
fi
