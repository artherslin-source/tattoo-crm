#!/bin/bash

echo "🚀 部署本地數據到 Railway"
echo "=========================="
echo ""

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

echo "📋 部署步驟："
echo "1. 提交所有本地更改"
echo "2. 推送到 GitHub"
echo "3. Railway 自動部署"
echo "4. 設定環境變數觸發數據重建"
echo ""

# 步驟 1: 提交更改
echo "📝 步驟 1: 提交本地更改..."
git add -A
git commit -m "feat: Deploy with complete test data

部署包含完整測試數據的版本

包含數據：
- 2 個分店（三重店、東港店）
- 3 個刺青師
- 12 個會員（有儲值餘額）
- 19 個服務項目
- 24 個預約
- 15 個訂單（含分期）

Railway 部署後需要設定：
RUN_SEED=true
PROTECT_REAL_DATA=false

以觸發數據重建"

if [ $? -ne 0 ]; then
    echo "❌ Git commit 失敗"
    exit 1
fi

echo "✅ 本地更改已提交"
echo ""

# 步驟 2: 推送到 GitHub
echo "📤 步驟 2: 推送到 GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Git push 失敗"
    exit 1
fi

echo "✅ 代碼已推送到 GitHub"
echo ""

# 步驟 3: 等待部署
echo "⏳ 步驟 3: Railway 正在自動部署..."
echo "   請等待 2-3 分鐘讓 Railway 完成部署"
echo ""

# 步驟 4: 提供環境變數設定指南
echo "🔧 步驟 4: 設定 Railway 環境變數"
echo "================================"
echo ""
echo "請在 Railway Dashboard 中設定以下環境變數："
echo ""
echo "1. 訪問: https://railway.app/dashboard"
echo "2. 找到 'tattoo-crm-backend' 服務"
echo "3. 點擊進入服務詳情"
echo "4. 切換到 'Variables' 標籤"
echo "5. 添加以下環境變數："
echo ""
echo "   RUN_SEED=true"
echo "   PROTECT_REAL_DATA=false"
echo ""
echo "6. 保存後，Railway 會自動重新部署"
echo "7. 部署完成後，Railway 會有完整的測試數據"
echo ""

# 步驟 5: 提供測試指南
echo "🧪 步驟 5: 測試部署結果"
echo "======================"
echo ""
echo "部署完成後，訪問以下 URL 測試："
echo ""
echo "前端: https://tattoo-crm-production.up.railway.app"
echo "後端: https://tattoo-crm-backend-production.up.railway.app"
echo ""
echo "測試帳號："
echo "管理員: admin@test.com / 12345678"
echo "三重店經理: manager1@test.com / 12345678"
echo "東港店經理: manager2@test.com / 12345678"
echo ""
echo "預期數據："
echo "- 管理服務項目: 19 個"
echo "- 管理刺青師: 3 個"
echo "- 管理預約: 24 個"
echo "- 管理訂單: 15 個"
echo "- 管理會員: 12 個"
echo ""

echo "🎉 部署腳本執行完成！"
echo ""
echo "下一步："
echo "1. 等待 Railway 部署完成（2-3 分鐘）"
echo "2. 設定環境變數 RUN_SEED=true 和 PROTECT_REAL_DATA=false"
echo "3. 等待重新部署完成"
echo "4. 測試前端頁面數據顯示"
echo ""
echo "如有問題，請查看 Railway 部署日誌。"
