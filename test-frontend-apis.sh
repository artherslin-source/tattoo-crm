#!/bin/bash

echo "🔐 登入並獲取 Token..."
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"12345678"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登入失敗"
  exit 1
fi

echo "✅ Token 已獲取: ${TOKEN:0:50}..."
echo ""

echo "📊 測試各個 API 端點（模擬前端調用）："
echo "=================================================="
echo ""

echo "1️⃣ 服務項目 API (GET /admin/services)"
echo "---"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:4001" \
  http://localhost:4000/admin/services)
echo "響應類型: $(echo $RESPONSE | jq 'type')"
echo "數據數量: $(echo $RESPONSE | jq 'length')"
echo ""

echo "2️⃣ 刺青師 API (GET /admin/artists)"
echo "---"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:4001" \
  http://localhost:4000/admin/artists)
echo "響應類型: $(echo $RESPONSE | jq 'type')"
echo "數據數量: $(echo $RESPONSE | jq 'length')"
echo "完整響應:"
echo $RESPONSE | jq '.' | head -30
echo ""

echo "3️⃣ 預約 API (GET /admin/appointments)"
echo "---"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:4001" \
  http://localhost:4000/admin/appointments)
echo "響應類型: $(echo $RESPONSE | jq 'type')"
if [ "$(echo $RESPONSE | jq 'type')" = '"object"' ]; then
  echo "對象結構: $(echo $RESPONSE | jq 'keys')"
else
  echo "數據數量: $(echo $RESPONSE | jq 'length')"
fi
echo ""

echo "4️⃣ 訂單 API (GET /admin/orders)"
echo "---"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:4001" \
  http://localhost:4000/admin/orders)
echo "響應類型: $(echo $RESPONSE | jq 'type')"
echo "對象結構: $(echo $RESPONSE | jq 'keys')"
echo "訂單數量: $(echo $RESPONSE | jq '.orders | length')"
echo ""

echo "5️⃣ 會員 API (GET /admin/members)"
echo "---"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:4001" \
  http://localhost:4000/admin/members)
echo "響應類型: $(echo $RESPONSE | jq 'type')"
echo "對象結構: $(echo $RESPONSE | jq 'keys')"
echo "會員數量: $(echo $RESPONSE | jq '.data | length')"
echo ""

echo "=================================================="
echo "✅ API 測試完成"

