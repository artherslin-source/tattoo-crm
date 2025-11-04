#!/bin/bash

# 測試規格啟用/停用功能

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API="http://localhost:4000"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}測試規格啟用/停用功能${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 登入
echo -e "${BLUE}[1] 登入管理員帳號...${NC}"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"12345678"}' \
  | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ 登入失敗${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 登入成功${NC}"
echo ""

# 獲取服務
SERVICE_ID=$(curl -s "$API/services" | jq -r '.[0].id')
SERVICE_NAME=$(curl -s "$API/services" | jq -r '.[0].name')
echo -e "${BLUE}[2] 使用服務: $SERVICE_NAME${NC}"
echo "   ID: $SERVICE_ID"
echo ""

# 獲取規格（管理端 API）
echo -e "${BLUE}[3] 獲取所有規格（管理端）...${NC}"
ALL_VARIANTS=$(curl -s "$API/admin/service-variants/service/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$ALL_VARIANTS" | jq '{
  size總數: (.size | length),
  size啟用數: (.size | map(select(.isActive)) | length),
  color總數: (.color | length),
  color啟用數: (.color | map(select(.isActive)) | length)
}'
echo ""

# 獲取第一個尺寸規格的 ID
VARIANT_ID=$(echo "$ALL_VARIANTS" | jq -r '.size[0].id')
VARIANT_NAME=$(echo "$ALL_VARIANTS" | jq -r '.size[0].name')
VARIANT_ACTIVE=$(echo "$ALL_VARIANTS" | jq -r '.size[0].isActive')

echo -e "${BLUE}[4] 測試切換規格: $VARIANT_NAME${NC}"
echo "   ID: $VARIANT_ID"
echo "   當前狀態: $VARIANT_ACTIVE"
echo ""

# 切換狀態
echo -e "${YELLOW}[5] 切換規格狀態...${NC}"
if [ "$VARIANT_ACTIVE" = "true" ]; then
  NEW_STATE="false"
  ACTION="停用"
else
  NEW_STATE="true"
  ACTION="啟用"
fi

TOGGLE_RESULT=$(curl -s -X PATCH "$API/admin/service-variants/$VARIANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"isActive\":$NEW_STATE}")

echo -e "${GREEN}✅ 已$ACTION規格: $VARIANT_NAME${NC}"
echo ""

# 等待一下
sleep 1

# 驗證管理端 API
echo -e "${BLUE}[6] 驗證管理端 API...${NC}"
ADMIN_VARIANTS=$(curl -s "$API/admin/service-variants/service/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN")

ADMIN_SIZE_COUNT=$(echo "$ADMIN_VARIANTS" | jq '.size | length')
ADMIN_SIZE_ACTIVE=$(echo "$ADMIN_VARIANTS" | jq '.size | map(select(.isActive)) | length')

echo "   尺寸總數: $ADMIN_SIZE_COUNT"
echo "   尺寸啟用: $ADMIN_SIZE_ACTIVE"
echo ""

# 驗證公開 API（顧客端使用）
echo -e "${BLUE}[7] 驗證公開 API（顧客端）...${NC}"
PUBLIC_VARIANTS=$(curl -s "$API/services/$SERVICE_ID/variants")

PUBLIC_SIZE_COUNT=$(echo "$PUBLIC_VARIANTS" | jq '.size | length')

echo "   尺寸可見數: $PUBLIC_SIZE_COUNT"
echo ""

# 對比
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}結果對比${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo "管理端 API（所有規格）："
echo "  - 尺寸總數: $ADMIN_SIZE_COUNT"
echo "  - 尺寸啟用: $ADMIN_SIZE_ACTIVE"
echo ""

echo "公開 API（顧客可見）："
echo "  - 尺寸可見: $PUBLIC_SIZE_COUNT"
echo ""

if [ "$ADMIN_SIZE_ACTIVE" = "$PUBLIC_SIZE_COUNT" ]; then
  echo -e "${GREEN}✅ 測試通過！公開 API 正確過濾了停用的規格${NC}"
else
  echo -e "${RED}❌ 測試失敗！數量不符${NC}"
fi

echo ""
echo "說明："
echo "  - 管理端 API 返回所有規格（包含停用的）"
echo "  - 公開 API 只返回啟用的規格"
echo "  - 顧客只能看到啟用的規格"
echo ""

# 恢復原狀態
echo -e "${BLUE}[8] 恢復原狀態...${NC}"
curl -s -X PATCH "$API/admin/service-variants/$VARIANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"isActive\":$VARIANT_ACTIVE}" > /dev/null

echo -e "${GREEN}✅ 已恢復${NC}"
echo ""

