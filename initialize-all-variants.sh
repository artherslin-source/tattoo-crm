#!/bin/bash

# 為所有服務初始化規格的快速腳本

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}為所有服務初始化規格${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 設定 API URL（請根據環境修改）
read -p "請輸入 API URL（按 Enter 使用 localhost:4000）: " API_URL
API_URL=${API_URL:-http://localhost:4000}

echo ""
echo -e "${BLUE}使用 API: $API_URL${NC}"
echo ""

# 登入獲取 Token
echo -e "${BLUE}[1] 請登入管理員帳號${NC}"
read -p "Email: " ADMIN_EMAIL
read -sp "Password: " ADMIN_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .access_token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ 登入失敗！${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ 登入成功！${NC}"
echo ""

# 獲取所有服務
echo -e "${BLUE}[2] 獲取所有服務...${NC}"
SERVICES=$(curl -s "$API_URL/services")
SERVICE_COUNT=$(echo "$SERVICES" | jq 'length')

echo -e "${GREEN}找到 $SERVICE_COUNT 個服務${NC}"
echo ""

# 選擇模板
echo -e "${BLUE}[3] 選擇規格模板${NC}"
echo "1) basic    - 基礎（6個尺寸 + 2種顏色）"
echo "2) standard - 標準（12個尺寸 + 2種顏色 + 部位 + 設計費）⭐ 推薦"
echo "3) advanced - 進階（standard + 風格 + 複雜度）"
echo "4) full     - 完整（所有規格）"
echo ""
read -p "請選擇模板 (1-4, 預設為 2): " TEMPLATE_CHOICE

case $TEMPLATE_CHOICE in
  1) TEMPLATE="basic" ;;
  3) TEMPLATE="advanced" ;;
  4) TEMPLATE="full" ;;
  *) TEMPLATE="standard" ;;
esac

echo -e "${GREEN}選擇的模板: $TEMPLATE${NC}"
echo ""

# 為每個服務初始化規格
echo -e "${BLUE}[4] 開始初始化規格...${NC}"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

echo "$SERVICES" | jq -r '.[] | @base64' | while read -r row; do
  SERVICE=$(echo "$row" | base64 --decode)
  SERVICE_ID=$(echo "$SERVICE" | jq -r '.id')
  SERVICE_NAME=$(echo "$SERVICE" | jq -r '.name')
  HAS_VARIANTS=$(echo "$SERVICE" | jq -r '.hasVariants')
  
  echo -e "${BLUE}處理: $SERVICE_NAME (ID: $SERVICE_ID)${NC}"
  
  # 檢查是否已有規格
  if [ "$HAS_VARIANTS" = "true" ]; then
    echo -e "${YELLOW}  ⚠️  已有規格，跳過${NC}"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    echo ""
    continue
  fi
  
  # 初始化規格
  INIT_RESPONSE=$(curl -s -X POST "$API_URL/admin/service-variants/initialize/$SERVICE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"template\":\"$TEMPLATE\"}")
  
  SUCCESS=$(echo "$INIT_RESPONSE" | jq -r '.success // false')
  
  if [ "$SUCCESS" = "true" ]; then
    COUNT=$(echo "$INIT_RESPONSE" | jq -r '.count // 0')
    echo -e "${GREEN}  ✅ 成功！創建了 $COUNT 個規格${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${RED}  ❌ 失敗！${NC}"
    echo "  $INIT_RESPONSE"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  echo ""
  sleep 0.5  # 避免請求過快
done

# 等待子進程完成
wait

echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}初始化完成！${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "統計："
echo "  成功: $SUCCESS_COUNT 個服務"
echo "  跳過: $SKIP_COUNT 個服務（已有規格）"
echo "  失敗: $FAIL_COUNT 個服務"
echo ""
echo "請重新訪問前端，現在應該可以選擇規格了！"
echo ""

