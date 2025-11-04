#!/bin/bash

# 測試新的尺寸規格

API="http://localhost:4000"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}測試新的尺寸規格系統${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 獲取服務
echo -e "${BLUE}[1] 獲取服務列表...${NC}"
SERVICE_ID=$(curl -s $API/services | jq -r '.[0].id // empty')
echo "使用服務 ID: $SERVICE_ID"
echo ""

if [ -z "$SERVICE_ID" ]; then
  echo "❌ 沒有服務可測試"
  exit 1
fi

# 測試購物車（使用新尺寸）
echo -e "${BLUE}[2] 測試加入購物車（使用新尺寸規格）...${NC}"
echo ""

echo -e "${GREEN}測試 5-6cm:${NC}"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"5-6cm",
      "color":"割線"
    },
    "notes":"測試 5-6cm"
  }' | jq '.items[0] | {
    尺寸: .selectedVariants.size,
    顏色: .selectedVariants.color,
    基礎價: .basePrice,
    最終價: .finalPrice,
    時長: .estimatedDuration
  }'
echo ""

echo -e "${GREEN}測試 10-11cm:${NC}"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"10-11cm",
      "color":"黑白"
    },
    "notes":"測試 10-11cm"
  }' | jq '.items[-1] | {
    尺寸: .selectedVariants.size,
    顏色: .selectedVariants.color,
    基礎價: .basePrice,
    最終價: .finalPrice,
    時長: .estimatedDuration
  }'
echo ""

echo -e "${GREEN}測試 16-17cm（最大）:${NC}"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"16-17cm",
      "color":"全彩"
    },
    "notes":"測試 16-17cm"
  }' | jq '.items[-1] | {
    尺寸: .selectedVariants.size,
    顏色: .selectedVariants.color,
    基礎價: .basePrice,
    最終價: .finalPrice,
    加價說明: "16-17cm 加價 2200 + 全彩 1500",
    時長: .estimatedDuration,
    時長說明: "基礎時長 + 55分鐘 + 45分鐘"
  }'
echo ""

echo -e "${BLUE}[3] 查看完整購物車...${NC}"
curl -s $API/cart | jq '{
  項目總數: (.items | length),
  總價格: .totalPrice,
  總時長: .totalDuration,
  項目列表: .items | map({
    尺寸: .selectedVariants.size,
    顏色: .selectedVariants.color,
    價格: .finalPrice
  })
}'
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}✅ 新尺寸規格測試完成！${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "尺寸規格總覽："
echo "  • 5-6cm   (+0元)    - 基礎價格"
echo "  • 6-7cm   (+200元)  "
echo "  • 7-8cm   (+400元)  "
echo "  • 8-9cm   (+600元)  "
echo "  • 9-10cm  (+800元)  "
echo "  • 10-11cm (+1000元) "
echo "  • 11-12cm (+1200元) "
echo "  • 12-13cm (+1400元) "
echo "  • 13-14cm (+1600元) "
echo "  • 14-15cm (+1800元) "
echo "  • 15-16cm (+2000元) "
echo "  • 16-17cm (+2200元) - 最大尺寸"
echo ""

