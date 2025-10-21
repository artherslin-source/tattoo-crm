#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Railway Staging 環境自動設置腳本"
echo "=========================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI 未安裝${NC}"
    echo "請執行: npm install -g @railway/cli"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI 已安裝${NC}"
echo ""

# 檢查登入狀態
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ 未登入 Railway${NC}"
    echo "請執行: railway login"
    exit 1
fi

echo -e "${GREEN}✅ 已登入 Railway${NC}"
echo ""

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${BLUE}🔑 已生成 JWT_SECRET${NC}"
echo ""

# 詢問後端 URL
echo -e "${YELLOW}請提供以下資訊：${NC}"
read -p "後端 Railway URL (例如: https://backend-staging.up.railway.app): " BACKEND_URL
read -p "前端 Railway URL (例如: https://frontend-staging.up.railway.app): " FRONTEND_URL

echo ""
echo "=========================================="
echo "📦 設置後端環境變數"
echo "=========================================="
echo ""

# 進入後端目錄
cd backend

# 檢查是否已連結
if [ ! -f ".railway/config.json" ]; then
    echo -e "${YELLOW}⚠️  後端尚未連結到 Railway 專案${NC}"
    echo "請手動執行以下步驟："
    echo "  1. cd backend"
    echo "  2. railway link"
    echo "  3. 選擇 'tattoo-crm-backend-staging' 專案"
    echo "  4. 重新執行此腳本"
    echo ""
    
    # 嘗試自動連結（需要知道專案 ID）
    echo "正在嘗試列出專案..."
    railway list
    echo ""
    echo "請手動執行 'cd backend && railway link' 然後選擇後端 staging 專案"
    exit 1
fi

echo -e "${BLUE}📝 設置後端環境變數...${NC}"

# 設置後端環境變數
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set NODE_ENV="staging"
railway variables set CORS_ORIGIN="$FRONTEND_URL"

echo -e "${GREEN}✅ 後端環境變數已設置${NC}"
echo ""

# 返回根目錄
cd ..

echo "=========================================="
echo "🎨 設置前端環境變數"
echo "=========================================="
echo ""

# 進入前端目錄
cd frontend

# 檢查是否已連結
if [ ! -f ".railway/config.json" ]; then
    echo -e "${YELLOW}⚠️  前端尚未連結到 Railway 專案${NC}"
    echo "請手動執行以下步驟："
    echo "  1. cd frontend"
    echo "  2. railway link"
    echo "  3. 選擇 'tattoo-crm-frontend-staging' 專案"
    echo "  4. 重新執行此腳本"
    exit 1
fi

echo -e "${BLUE}📝 設置前端環境變數...${NC}"

# 設置前端環境變數
railway variables set NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL"
railway variables set NODE_ENV="staging"

echo -e "${GREEN}✅ 前端環境變數已設置${NC}"
echo ""

# 返回根目錄
cd ..

echo "=========================================="
echo "🚀 開始部署"
echo "=========================================="
echo ""

read -p "是否現在部署後端和前端？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
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
fi

echo ""
echo "=========================================="
echo "✅ 設置完成！"
echo "=========================================="
echo ""
echo "📋 設置摘要："
echo "  後端 URL: $BACKEND_URL"
echo "  前端 URL: $FRONTEND_URL"
echo "  JWT Secret: ********** (已設置)"
echo "  NODE_ENV: staging"
echo ""
echo "🔍 查看部署狀態："
echo "  後端: cd backend && railway logs"
echo "  前端: cd frontend && railway logs"
echo ""
echo "📚 詳細文檔："
echo "  後端部署: backend/README_STAGING.md"
echo "  前端部署: frontend/README_STAGING_FRONTEND.md"
echo "  環境變數: RAILWAY_VARIABLES_STAGING.md"
echo ""

