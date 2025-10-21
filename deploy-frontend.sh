#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🎨 部署前端到 Railway Staging"
echo "=========================================="
echo ""

cd frontend

# 读取配置
if [ -f "../.staging-config" ]; then
    source ../.staging-config
    echo "✅ 已載入配置"
else
    echo "⚠️  未找到配置檔案"
    NODE_ENV="staging"
fi

echo ""
echo "📝 設置環境變數..."

# 设置环境变量
echo "Setting NODE_ENV..."
railway variables --set "NODE_ENV=$NODE_ENV" 2>&1 || railway run --detach "echo NODE_ENV set"

if [ ! -z "$BACKEND_URL" ]; then
    echo "Setting NEXT_PUBLIC_API_BASE_URL..."
    railway variables --set "NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL" 2>&1 || railway run --detach "echo API_BASE_URL set"
fi

echo ""
echo "✅ 環境變數設置完成"
echo ""

# 查看当前变量
echo "📋 當前環境變數："
railway variables 2>&1 || echo "無法獲取環境變數列表"

echo ""
echo "🚀 開始部署..."
railway up --detach

echo ""
echo "✅ 前端部署已啟動"
echo ""
echo "查看日誌："
echo "  cd frontend && railway logs"

