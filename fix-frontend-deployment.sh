#!/bin/bash

# 前端部署修復腳本
# 此腳本會自動推送修復的程式碼到 GitHub，觸發 Railway 重新部署

set -e

echo "🎯 開始修復前端部署錯誤..."

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
git commit -m "fix: Resolve TypeScript compilation errors in frontend

- Add index signature [key: string]: unknown to all Branch interfaces
- Create unified Branch type definition in types/branch.ts
- Fix BranchLike compatibility issues
- Resolve compilation error in admin/artists/page.tsx

Fixes: Type error in admin/artists/page.tsx:86:67"

# 嘗試推送到 GitHub
echo "📤 推送到 GitHub..."
if git push origin main; then
    echo "✅ 程式碼已成功推送到 GitHub"
    echo "🔄 Railway 將自動觸發前端重新部署"
    echo ""
    echo "📋 接下來請在 Railway Dashboard 中："
    echo "1. 前往您的前端服務"
    echo "2. 點擊 'Deployments' 標籤"
    echo "3. 監控部署進度"
    echo ""
    echo "🎯 預期的成功日誌："
    echo "   ✓ Compiled successfully in 9.9s"
    echo "   ✓ Linting and checking validity of types completed"
    echo "   ✓ Collecting page data"
    echo "   ✓ Generating static pages"
    echo ""
    echo "🎉 前端部署修復完成！"
else
    echo "❌ 推送到 GitHub 失敗"
    echo "💡 請手動執行以下命令："
    echo "   git push origin main"
    echo ""
    echo "或者設定 GitHub 認證："
    echo "   git config --global credential.helper store"
    echo "   git push origin main"
    echo "   (然後輸入您的 GitHub 用戶名和密碼/Token)"
    echo ""
    echo "📖 詳細指南請參考：FRONTEND_FIX_REPORT.md"
fi
