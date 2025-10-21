#!/usr/bin/env bash

# Railway Staging 一鍵部署腳本
# 此腳本會引導你完成所有部署步驟

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}"
echo "=========================================="
echo "🚀 Railway Staging 環境一鍵部署"
echo "=========================================="
echo -e "${NC}"
echo ""

# 檢查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI 未安裝${NC}"
    echo "請執行: npm install -g @railway/cli"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI 已安裝${NC}"

# 檢查登入狀態
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ 未登入 Railway${NC}"
    echo "請執行: railway login"
    exit 1
fi

RAILWAY_USER=$(railway whoami)
echo -e "${GREEN}✅ 已登入 Railway: ${RAILWAY_USER}${NC}"
echo ""

# 載入配置
if [ -f ".staging-config" ]; then
    source .staging-config
    echo -e "${GREEN}✅ 已載入配置檔案${NC}"
    echo -e "   JWT_SECRET: ${JWT_SECRET:0:20}...${NC}"
    echo -e "   NODE_ENV: ${NODE_ENV}${NC}"
else
    echo -e "${RED}❌ 找不到 .staging-config 檔案${NC}"
    echo "這不應該發生，讓我重新生成..."
    JWT_SECRET=$(openssl rand -base64 32)
    cat > .staging-config << EOF
JWT_SECRET="$JWT_SECRET"
NODE_ENV="staging"
EOF
    echo -e "${GREEN}✅ 已重新生成配置${NC}"
fi

echo ""
echo -e "${YELLOW}=========================================="
echo "📋 步驟 1: 連結並選擇服務"
echo "==========================================${NC}"
echo ""
echo "我需要你手動執行以下步驟（因為 Railway CLI 需要互動式選擇）："
echo ""
echo -e "${CYAN}1. 後端服務：${NC}"
echo "   cd backend"
echo "   railway service"
echo "   ${YELLOW}👆 如果有服務，選擇它；如果沒有，創建新服務${NC}"
echo ""
echo -e "${CYAN}2. 前端服務：${NC}"
echo "   cd ../frontend"
echo "   railway service"
echo "   ${YELLOW}👆 如果有服務，選擇它；如果沒有，創建新服務${NC}"
echo ""
echo "   cd .."
echo ""
read -p "按 Enter 繼續，完成後按 Enter... " -r
echo ""

# 檢查後端服務
echo -e "${BLUE}🔍 檢查後端服務連結...${NC}"
cd backend
if railway variables &> /dev/null; then
    echo -e "${GREEN}✅ 後端服務已連結${NC}"
    BACKEND_SERVICE_OK=true
else
    echo -e "${YELLOW}⚠️  後端服務未連結或無法訪問${NC}"
    echo "請確保已執行 'railway service' 選擇服務"
    BACKEND_SERVICE_OK=false
fi
cd ..

# 檢查前端服務
echo -e "${BLUE}🔍 檢查前端服務連結...${NC}"
cd frontend
if railway variables &> /dev/null; then
    echo -e "${GREEN}✅ 前端服務已連結${NC}"
    FRONTEND_SERVICE_OK=true
else
    echo -e "${YELLOW}⚠️  前端服務未連結或無法訪問${NC}"
    echo "請確保已執行 'railway service' 選擇服務"
    FRONTEND_SERVICE_OK=false
fi
cd ..

if [ "$BACKEND_SERVICE_OK" = false ] || [ "$FRONTEND_SERVICE_OK" = false ]; then
    echo ""
    echo -e "${RED}❌ 請先完成服務連結，然後重新執行此腳本${NC}"
    echo ""
    echo "快速連結命令："
    echo "  cd backend && railway service && cd .."
    echo "  cd frontend && railway service && cd .."
    echo ""
    exit 1
fi

echo ""
echo -e "${YELLOW}=========================================="
echo "🔧 步驟 2: 設置後端環境變數"
echo "==========================================${NC}"
echo ""

cd backend

echo -e "${BLUE}📝 設置 JWT_SECRET...${NC}"
railway variables --set "JWT_SECRET=$JWT_SECRET"

echo -e "${BLUE}📝 設置 NODE_ENV...${NC}"
railway variables --set "NODE_ENV=$NODE_ENV"

if [ ! -z "$FRONTEND_URL" ]; then
    echo -e "${BLUE}📝 設置 CORS_ORIGIN...${NC}"
    railway variables --set "CORS_ORIGIN=$FRONTEND_URL"
else
    echo -e "${YELLOW}⚠️  未設置 FRONTEND_URL，跳過 CORS_ORIGIN 設置${NC}"
    echo "   部署後需要手動設置：railway variables --set \"CORS_ORIGIN=前端URL\""
fi

echo ""
echo -e "${GREEN}✅ 後端環境變數設置完成${NC}"
echo ""
echo -e "${CYAN}目前的環境變數：${NC}"
railway variables

cd ..

echo ""
echo -e "${YELLOW}=========================================="
echo "🎨 步驟 3: 設置前端環境變數"
echo "==========================================${NC}"
echo ""

cd frontend

echo -e "${BLUE}📝 設置 NODE_ENV...${NC}"
railway variables --set "NODE_ENV=$NODE_ENV"

if [ ! -z "$BACKEND_URL" ]; then
    echo -e "${BLUE}📝 設置 NEXT_PUBLIC_API_BASE_URL...${NC}"
    railway variables --set "NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL"
else
    echo -e "${YELLOW}⚠️  未設置 BACKEND_URL，跳過 API_BASE_URL 設置${NC}"
    echo "   部署後需要手動設置：railway variables --set \"NEXT_PUBLIC_API_BASE_URL=後端URL\""
fi

echo ""
echo -e "${GREEN}✅ 前端環境變數設置完成${NC}"
echo ""
echo -e "${CYAN}目前的環境變數：${NC}"
railway variables

cd ..

echo ""
echo -e "${YELLOW}=========================================="
echo "🚀 步驟 4: 部署到 Railway"
echo "==========================================${NC}"
echo ""

read -p "是否現在開始部署？ (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消部署${NC}"
    echo ""
    echo "如需手動部署，執行："
    echo "  cd backend && railway up --detach"
    echo "  cd frontend && railway up --detach"
    exit 0
fi

echo ""
echo -e "${BLUE}📦 部署後端...${NC}"
cd backend
railway up --detach
echo -e "${GREEN}✅ 後端部署已啟動${NC}"
echo ""

cd ..

echo -e "${BLUE}🎨 部署前端...${NC}"
cd frontend
railway up --detach
echo -e "${GREEN}✅ 前端部署已啟動${NC}"
echo ""

cd ..

echo ""
echo -e "${GREEN}=========================================="
echo "✅ 部署已啟動！"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}📊 監控部署狀態：${NC}"
echo ""
echo "後端日誌："
echo "  cd backend && railway logs"
echo ""
echo "前端日誌："
echo "  cd frontend && railway logs"
echo ""

# 等待幾秒讓部署開始
sleep 3

echo -e "${YELLOW}正在獲取服務 URLs...${NC}"
echo ""

# 嘗試獲取後端 URL
echo -e "${CYAN}後端 URL:${NC}"
cd backend
BACKEND_DOMAIN=$(railway domain 2>&1 | head -1 || echo "請執行 'cd backend && railway domain' 查看")
echo "  $BACKEND_DOMAIN"
cd ..

# 嘗試獲取前端 URL
echo -e "${CYAN}前端 URL:${NC}"
cd frontend
FRONTEND_DOMAIN=$(railway domain 2>&1 | head -1 || echo "請執行 'cd frontend && railway domain' 查看")
echo "  $FRONTEND_DOMAIN"
cd ..

echo ""
echo -e "${YELLOW}=========================================="
echo "🔍 下一步：驗證部署"
echo "==========================================${NC}"
echo ""
echo "1. 等待 2-3 分鐘讓部署完成"
echo ""
echo "2. 查看後端日誌，確認看到："
echo "   ${GREEN}✅ DATABASE_URL 驗證通過${NC}"
echo "   ${GREEN}→ Running Prisma migrate deploy...${NC}"
echo "   ${GREEN}🚀 Server is running on port XXXX${NC}"
echo ""
echo "   cd backend && railway logs"
echo ""
echo "3. 查看前端日誌，確認看到："
echo "   ${GREEN}▲ Next.js 15.x.x${NC}"
echo "   ${GREEN}✓ Ready in XXXms${NC}"
echo ""
echo "   cd frontend && railway logs"
echo ""
echo "4. 測試後端健康檢查："
echo "   curl https://你的後端URL/health"
echo ""
echo "5. 開啟前端網站測試"
echo ""

# 如果 URLs 未設置，提示需要更新
if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}⚠️  重要提示：${NC}"
    echo ""
    echo "獲得服務 URLs 後，需要更新環境變數並重新部署："
    echo ""
    echo "1. 編輯 .staging-config，加入："
    echo "   BACKEND_URL=\"https://你的後端URL\""
    echo "   FRONTEND_URL=\"https://你的前端URL\""
    echo ""
    echo "2. 更新並重新部署："
    echo "   cd backend && railway variables --set \"CORS_ORIGIN=https://前端URL\" && railway up --detach"
    echo "   cd frontend && railway variables --set \"NEXT_PUBLIC_API_BASE_URL=https://後端URL\" && railway up --detach"
    echo ""
fi

echo -e "${GREEN}=========================================="
echo "🎉 部署腳本執行完成！"
echo "==========================================${NC}"
echo ""
echo "📚 更多文檔："
echo "  - EXECUTE_NOW.md - 詳細執行指南"
echo "  - QUICK_STAGING_SETUP.md - 快速設置指南"
echo "  - backend/README_STAGING.md - 後端部署指南"
echo "  - frontend/README_STAGING_FRONTEND.md - 前端部署指南"
echo ""

