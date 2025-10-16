#!/bin/bash

echo "🚀 Railway 前端修復自動部署腳本"
echo "=================================="
echo ""

# 後端服務 URL
BACKEND_URL="https://tattoo-crm-production-413f.up.railway.app"

echo "📋 修復方案已推送到 GitHub"
echo "• 提交 ID: b8d2bee"
echo "• 修復文件: fix-railway-frontend-api.sh, RAILWAY_FRONTEND_FIX_GUIDE.md"
echo "• 後端 URL: $BACKEND_URL"
echo ""

echo "🔧 下一步：設置 Railway 環境變數"
echo ""

echo "方法 1：Railway Dashboard（推薦）"
echo "--------------------------------"
echo "1. 登入 Railway Dashboard: https://railway.app"
echo "2. 選擇前端專案: tattoo-crm-production"
echo "3. 進入 Variables 標籤"
echo "4. 點擊 \"+ New Variable\""
echo "5. 設置："
echo "   Key: NEXT_PUBLIC_API_URL"
echo "   Value: $BACKEND_URL"
echo "6. 點擊 \"Add\""
echo ""

echo "方法 2：Railway CLI"
echo "------------------"
echo "1. 安裝 Railway CLI:"
echo "   npm install -g @railway/cli"
echo ""
echo "2. 登入並設置："
echo "   railway login"
echo "   railway link"
echo "   railway variables --set \"NEXT_PUBLIC_API_URL=$BACKEND_URL\""
echo ""

echo "⏱️ 設置完成後："
echo "• Railway 會自動重新部署前端（2-3 分鐘）"
echo "• 前端將正確連接到後端服務"
echo "• 所有管理頁面將顯示數據"
echo ""

echo "🔍 驗證步驟："
echo "1. 等待部署完成"
echo "2. 訪問前端網站"
echo "3. 檢查管理頁面是否顯示數據"
echo "4. 測試登入功能"
echo ""

echo "📞 如果遇到問題："
echo "• 檢查 Railway Dashboard 中的部署日誌"
echo "• 確認環境變數已正確設置"
echo "• 驗證後端服務是否正常運行"
echo ""

echo "✅ 準備就緒！請按照上述方法設置環境變數。"
