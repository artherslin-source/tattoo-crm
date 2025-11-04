#!/bin/bash

# 測試新的價格體系

API="http://localhost:4000"

echo "========================================="
echo "測試新的價格體系"
echo "========================================="
echo ""

# 獲取服務ID
SERVICE_ID=$(curl -s $API/services | jq -r '.[0].id')
echo "使用服務 ID: $SERVICE_ID"
echo ""

# 測試 1: 5-6cm 黑白 (應該是 2000元)
echo "【測試 1】5-6cm + 黑白 (預期: 2000元)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"5-6cm",
      "color":"黑白"
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, price: .finalPrice}'
echo ""

# 測試 2: 5-6cm 彩色 (應該是 3000元 = 2000 + 1000)
echo "【測試 2】5-6cm + 彩色 (預期: 3000元)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"5-6cm",
      "color":"彩色"
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, price: .finalPrice}'
echo ""

# 測試 3: 10-11cm 黑白 (應該是 7000元)
echo "【測試 3】10-11cm + 黑白 (預期: 7000元)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"10-11cm",
      "color":"黑白"
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, price: .finalPrice}'
echo ""

# 測試 4: 10-11cm 彩色 (應該是 8000元 = 7000 + 1000)
echo "【測試 4】10-11cm + 彩色 (預期: 8000元)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"10-11cm",
      "color":"彩色"
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, price: .finalPrice}'
echo ""

# 測試 5: 16-17cm 黑白 (應該是 14000元)
echo "【測試 5】16-17cm + 黑白 (預期: 14000元)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"16-17cm",
      "color":"黑白"
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, price: .finalPrice}'
echo ""

# 測試 6: 16-17cm 彩色 (應該是 14000元，特殊情況不加價)
echo "【測試 6】16-17cm + 彩色 (預期: 14000元 - 特殊情況)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"16-17cm",
      "color":"彩色"
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, price: .finalPrice}'
echo ""

# 測試 7: 10-11cm 彩色 + 設計費 3000元
echo "【測試 7】10-11cm + 彩色 + 設計費3000 (預期: 11000元 = 8000 + 3000)"
curl -s -X POST $API/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'"$SERVICE_ID"'",
    "selectedVariants":{
      "size":"10-11cm",
      "color":"彩色",
      "design_fee": 3000
    },
    "notes":"包含設計費"
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, design_fee: .selectedVariants.design_fee, price: .finalPrice}'
echo ""

echo "========================================="
echo "測試完成！"
echo "========================================="
echo ""
echo "價格對照表："
echo "  5-6cm:   黑白 2000  / 彩色 3000"
echo "  6-7cm:   黑白 3000  / 彩色 4000"
echo "  7-8cm:   黑白 4000  / 彩色 5000"
echo "  8-9cm:   黑白 5000  / 彩色 6000"
echo "  9-10cm:  黑白 6000  / 彩色 7000"
echo "  10-11cm: 黑白 7000  / 彩色 8000"
echo "  11-12cm: 黑白 8000  / 彩色 9000"
echo "  12-13cm: 黑白 9000  / 彩色 10000"
echo "  13-14cm: 黑白 10000 / 彩色 11000"
echo "  14-15cm: 黑白 11000 / 彩色 12000"
echo "  15-16cm: 黑白 12000 / 彩色 13000"
echo "  16-17cm: 黑白 14000 / 彩色 14000 ⭐ 特殊"
echo ""
echo "設計費: 另外估價（管理後台輸入）"

