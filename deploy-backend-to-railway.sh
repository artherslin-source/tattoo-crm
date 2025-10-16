#!/bin/bash

# 部署後端服務到 Railway
# 此腳本將後端代碼推送到 GitHub，觸發 Railway 部署

set -e

echo "🚀 開始部署後端服務到 Railway..."
echo ""

# 檢查是否在正確的目錄
if [ ! -f "backend/package.json" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 git 狀態
echo "📋 檢查 Git 狀態..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  發現未提交的更改，正在提交..."
    git add .
    git commit -m "feat: Deploy backend service to Railway

部署後端服務到 Railway

包含：
- 後端 API 服務
- 資料庫連接配置
- 環境變數設定
- 生產環境啟動腳本

目標：讓前端能夠正常訪問後端 API"
else
    echo "✅ Git 工作目錄乾淨"
fi

# 推送到 GitHub
echo ""
echo "📤 推送代碼到 GitHub..."
git push origin main

echo ""
echo "✅ 後端部署已啟動！"
echo ""
echo "📋 部署步驟："
echo "1. 代碼已推送到 GitHub"
echo "2. Railway 將自動檢測到變更"
echo "3. 開始構建和部署後端服務"
echo ""
echo "⏱️  預計部署時間：3-5 分鐘"
echo ""
echo "🔍 部署完成後，請檢查："
echo "- Railway Dashboard 中的後端服務狀態"
echo "- 後端 API 是否可訪問"
echo "- 前端是否能正常獲取數據"
echo ""
echo "📞 如需協助，請查看 Railway 部署日誌"
