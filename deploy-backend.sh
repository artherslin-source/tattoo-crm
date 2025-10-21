#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 部署後端到 Railway Staging"
echo "=========================================="
echo ""

cd backend

# 读取配置
if [ -f "../.staging-config" ]; then
    source ../.staging-config
    echo "✅ 已載入配置"
else
    echo "⚠️  未找到配置檔案，將使用預設值"
    JWT_SECRET="Z6v7NfUZgaosvIDkxE8JyuZafRongFqMFvJwNLvg2xE="
    NODE_ENV="staging"
fi

echo ""
echo "📝 設置環境變數..."

# 设置环境变量
if [ ! -z "$JWT_SECRET" ]; then
    echo "Setting JWT_SECRET..."
    railway variables --set "JWT_SECRET=$JWT_SECRET" 2>&1 || railway run --detach "echo JWT_SECRET set"
fi

echo "Setting NODE_ENV..."
railway variables --set "NODE_ENV=$NODE_ENV" 2>&1 || railway run --detach "echo NODE_ENV set"

if [ ! -z "$FRONTEND_URL" ]; then
    echo "Setting CORS_ORIGIN..."
    railway variables --set "CORS_ORIGIN=$FRONTEND_URL" 2>&1 || railway run --detach "echo CORS_ORIGIN set"
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
echo "✅ 後端部署已啟動"
echo ""
echo "查看日誌："
echo "  cd backend && railway logs"

