#!/usr/bin/env bash

# Railway Staging 環境簡易設置腳本
# 使用方式：./setup-staging-simple.sh <stage>
# stage 1: 生成配置
# stage 2: 設置後端環境變數（需先執行 stage 1 並手動 link）
# stage 3: 設置前端環境變數（需先執行 stage 2）
# stage 4: 部署（需先執行 stage 3）

set -e

STAGE=${1:-"1"}

case $STAGE in
  "1")
    echo "=========================================="
    echo "📋 階段 1: 生成配置"
    echo "=========================================="
    echo ""
    
    # 生成 JWT Secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    echo "✅ 已生成 JWT Secret（已保存到 .staging-config）"
    echo ""
    
    # 保存到臨時檔案
    cat > .staging-config << EOF
JWT_SECRET="$JWT_SECRET"
NODE_ENV="staging"
EOF
    
    echo "📝 請提供以下資訊並更新 .staging-config 檔案："
    echo ""
    echo "   BACKEND_URL=\"https://your-backend-staging.up.railway.app\""
    echo "   FRONTEND_URL=\"https://your-frontend-staging.up.railway.app\""
    echo ""
    echo "🔗 獲取 URL 方式："
    echo "   - 前往 Railway Dashboard: https://railway.app"
    echo "   - 選擇對應的 staging 專案"
    echo "   - 在 Settings 或 Deployments 查看 URL"
    echo ""
    echo "✅ 完成後，請執行以下命令連結專案："
    echo ""
    echo "   cd backend"
    echo "   railway link  # 選擇 tattoo-crm-backend-staging"
    echo "   cd ../frontend"
    echo "   railway link  # 選擇 tattoo-crm-frontend-staging"
    echo "   cd .."
    echo ""
    echo "✅ 連結完成後，編輯 .staging-config 加入 URL，然後執行："
    echo "   ./setup-staging-simple.sh 2"
    echo ""
    ;;
    
  "2")
    echo "=========================================="
    echo "🔧 階段 2: 設置後端環境變數"
    echo "=========================================="
    echo ""
    
    if [ ! -f .staging-config ]; then
      echo "❌ 找不到 .staging-config 檔案"
      echo "請先執行: ./setup-staging-simple.sh 1"
      exit 1
    fi
    
    source .staging-config
    
    if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
      echo "❌ .staging-config 中缺少 BACKEND_URL 或 FRONTEND_URL"
      echo "請編輯 .staging-config 並加入這兩個變數"
      exit 1
    fi
    
    cd backend
    
    if [ ! -f ".railway/config.json" ]; then
      echo "❌ 後端尚未連結到 Railway"
      echo "請先執行: cd backend && railway link"
      exit 1
    fi
    
    echo "📝 設置後端環境變數..."
    railway variables set JWT_SECRET="$JWT_SECRET"
    railway variables set NODE_ENV="$NODE_ENV"
    railway variables set CORS_ORIGIN="$FRONTEND_URL"
    
    echo ""
    echo "✅ 後端環境變數設置完成！"
    echo ""
    echo "📋 已設置的變數："
    railway variables
    
    cd ..
    
    echo ""
    echo "✅ 下一步，執行："
    echo "   ./setup-staging-simple.sh 3"
    echo ""
    ;;
    
  "3")
    echo "=========================================="
    echo "🎨 階段 3: 設置前端環境變數"
    echo "=========================================="
    echo ""
    
    if [ ! -f .staging-config ]; then
      echo "❌ 找不到 .staging-config 檔案"
      exit 1
    fi
    
    source .staging-config
    
    if [ -z "$BACKEND_URL" ]; then
      echo "❌ .staging-config 中缺少 BACKEND_URL"
      exit 1
    fi
    
    cd frontend
    
    if [ ! -f ".railway/config.json" ]; then
      echo "❌ 前端尚未連結到 Railway"
      echo "請先執行: cd frontend && railway link"
      exit 1
    fi
    
    echo "📝 設置前端環境變數..."
    railway variables set NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL"
    railway variables set NODE_ENV="$NODE_ENV"
    
    echo ""
    echo "✅ 前端環境變數設置完成！"
    echo ""
    echo "📋 已設置的變數："
    railway variables
    
    cd ..
    
    echo ""
    echo "✅ 環境變數全部設置完成！"
    echo ""
    echo "🚀 下一步，執行部署："
    echo "   ./setup-staging-simple.sh 4"
    echo ""
    ;;
    
  "4")
    echo "=========================================="
    echo "🚀 階段 4: 部署到 Railway"
    echo "=========================================="
    echo ""
    
    echo "📦 部署後端..."
    cd backend
    railway up --detach
    echo "✅ 後端部署已啟動"
    echo ""
    
    echo "查看後端日誌："
    echo "  cd backend && railway logs"
    echo ""
    
    cd ..
    
    echo "🎨 部署前端..."
    cd frontend
    railway up --detach
    echo "✅ 前端部署已啟動"
    echo ""
    
    echo "查看前端日誌："
    echo "  cd frontend && railway logs"
    echo ""
    
    cd ..
    
    if [ -f .staging-config ]; then
      source .staging-config
      echo "=========================================="
      echo "✅ 部署完成！"
      echo "=========================================="
      echo ""
      echo "📋 你的 Staging 環境："
      echo "  後端: $BACKEND_URL"
      echo "  前端: $FRONTEND_URL"
      echo ""
      echo "🔍 驗證部署："
      echo "  curl $BACKEND_URL/health"
      echo "  open $FRONTEND_URL"
      echo ""
    fi
    
    echo "📚 查看詳細文檔："
    echo "  - backend/README_STAGING.md"
    echo "  - frontend/README_STAGING_FRONTEND.md"
    echo "  - RAILWAY_VARIABLES_STAGING.md"
    echo ""
    ;;
    
  *)
    echo "❌ 無效的階段: $STAGE"
    echo ""
    echo "使用方式："
    echo "  ./setup-staging-simple.sh 1  # 生成配置"
    echo "  ./setup-staging-simple.sh 2  # 設置後端"
    echo "  ./setup-staging-simple.sh 3  # 設置前端"
    echo "  ./setup-staging-simple.sh 4  # 部署"
    exit 1
    ;;
esac

