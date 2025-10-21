#!/usr/bin/env bash

# Staging 环境健康检查脚本

echo "=========================================="
echo "🔍 Staging 环境健康检查"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd backend

echo -e "${BLUE}1. 检查环境变量${NC}"
echo "----------------------------"

# 检查 JWT_SECRET
if railway variables 2>/dev/null | grep -q "JWT_SECRET"; then
    echo -e "${GREEN}✅ JWT_SECRET 已设置${NC}"
else
    echo -e "${RED}❌ JWT_SECRET 未设置${NC}"
    echo "   修复: railway variables --set \"JWT_SECRET=\$(openssl rand -base64 32)\""
fi

# 检查 DATABASE_URL
if railway variables 2>/dev/null | grep -q "DATABASE_URL"; then
    echo -e "${GREEN}✅ DATABASE_URL 已设置${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL 未设置（应该由 Railway 自动提供）${NC}"
fi

# 检查 NODE_ENV
if railway variables 2>/dev/null | grep -q "NODE_ENV"; then
    echo -e "${GREEN}✅ NODE_ENV 已设置${NC}"
else
    echo -e "${YELLOW}⚠️  NODE_ENV 未设置${NC}"
fi

echo ""
echo -e "${BLUE}2. 检查服务状态${NC}"
echo "----------------------------"

railway status 2>/dev/null || echo -e "${RED}无法获取服务状态${NC}"

echo ""
echo -e "${BLUE}3. 获取服务 URL${NC}"
echo "----------------------------"

BACKEND_URL=$(railway domain 2>&1 | head -1)
echo "后端 URL: $BACKEND_URL"

echo ""
echo -e "${BLUE}4. 测试健康检查${NC}"
echo "----------------------------"

if [[ $BACKEND_URL == https://* ]]; then
    echo "测试 $BACKEND_URL/health ..."
    
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
    RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ 健康检查成功${NC}"
        echo "   回应: $RESPONSE_BODY"
    else
        echo -e "${RED}❌ 健康检查失败 (HTTP $HTTP_CODE)${NC}"
        echo "   回应: $RESPONSE_BODY"
    fi
else
    echo -e "${YELLOW}⚠️  无法获取后端 URL，跳过健康检查${NC}"
fi

echo ""
echo -e "${BLUE}5. 查看最近的日志${NC}"
echo "----------------------------"

echo "执行: railway logs"
echo ""

railway logs 2>&1 | tail -30

echo ""
echo "=========================================="
echo "检查完成"
echo "=========================================="
echo ""
echo "💡 提示："
echo "  - 如需查看完整日志: cd backend && railway logs"
echo "  - 如需重新部署: cd backend && railway up --detach"
echo "  - 如需查看所有环境变量: cd backend && railway variables"
echo ""

