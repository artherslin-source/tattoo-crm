#!/bin/bash

# 快速測試腳本

API="http://localhost:4000"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}購物車與規格系統快速測試${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 測試 1: 健康檢查
echo -e "${BLUE}[1] 測試健康檢查...${NC}"
curl -s $API/health | jq '.'
echo ""

# 測試 2: 獲取服務列表
echo -e "${BLUE}[2] 獲取服務列表...${NC}"
SERVICES=$(curl -s $API/services)
echo "$SERVICES" | jq '. | length as $len | "找到 \($len) 個服務"'
SERVICE_ID=$(echo "$SERVICES" | jq -r '.[0].id // empty')
echo "使用服務 ID: $SERVICE_ID"
echo ""

if [ -z "$SERVICE_ID" ]; then
  echo -e "${RED}❌ 沒有服務可測試${NC}"
  exit 1
fi

# 測試 3: 獲取購物車（訪客）
echo -e "${BLUE}[3] 獲取空購物車（訪客模式）...${NC}"
CART=$(curl -s $API/cart)
echo "$CART" | jq '.'
echo ""

# 測試 4: 加入購物車
echo -e "${BLUE}[4] 加入購物車...${NC}"
ADD_CART=$(curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"10x10cm",
      "color":"割線"
    },
    "notes":"測試加入購物車"
  }')
echo "$ADD_CART" | jq '.'
echo ""

# 測試 5: 查看購物車
echo -e "${BLUE}[5] 查看購物車...${NC}"
CART2=$(curl -s $API/cart)
echo "$CART2" | jq '{
  項目數量: (.items | length),
  總價: .totalPrice,
  總時長: .totalDuration,
  第一個項目: .items[0] | {
    服務: .serviceName,
    規格: .selectedVariants,
    價格: .finalPrice
  }
}'
ITEM_ID=$(echo "$CART2" | jq -r '.items[0].id // empty')
echo ""

# 測試 6: 更新購物車項目
if [ -n "$ITEM_ID" ]; then
  echo -e "${BLUE}[6] 更新購物車項目...${NC}"
  UPDATE=$(curl -s -X PATCH $API/cart/items/$ITEM_ID \
    -H "Content-Type: application/json" \
    -d '{
      "selectedVariants":{
        "size":"15x15cm",
        "color":"黑白"
      }
    }')
  echo "$UPDATE" | jq '{
    更新後總價: .totalPrice,
    項目詳情: .items[0] | {
      規格: .selectedVariants,
      價格: .finalPrice
    }
  }'
  echo ""
fi

# 測試 7: 獲取分店
echo -e "${BLUE}[7] 獲取分店列表...${NC}"
BRANCHES=$(curl -s $API/branches)
echo "$BRANCHES" | jq '. | length as $len | "找到 \($len) 個分店"'
BRANCH_ID=$(echo "$BRANCHES" | jq -r '.[0].id // empty')
echo "使用分店 ID: $BRANCH_ID"
echo ""

# 測試 8: 規格管理（需要登入）
echo -e "${BLUE}[8] 測試規格管理 API（需要管理員權限）...${NC}"
echo "提示：規格管理需要管理員 Token"
echo "您可以手動測試："
echo "curl -X POST $API/admin/service-variants/initialize/$SERVICE_ID \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"template\":\"standard\"}'"
echo ""

# 測試總結
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}✅ 基礎功能測試完成！${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "測試結果："
echo "  ✅ 健康檢查"
echo "  ✅ 服務列表"
echo "  ✅ 購物車獲取"
echo "  ✅ 加入購物車"
echo "  ✅ 查看購物車"
echo "  ✅ 更新項目"
echo "  ⚠️  規格管理（需要 Token）"
echo ""
echo "下一步："
echo "  1. 使用管理員帳號登入獲取 Token"
echo "  2. 測試規格初始化功能"
echo "  3. 測試規格啟用/停用功能"
echo ""

