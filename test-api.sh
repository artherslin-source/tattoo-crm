#!/bin/bash

echo "🧪 測試分店架構與權限隔離功能"
echo "=================================="

# 等待後端啟動
echo "等待後端啟動..."
sleep 10

# 測試登入
echo "1. 測試 BOSS 登入..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}')

echo "登入響應: $LOGIN_RESPONSE"

# 提取 access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 登入失敗，無法獲取 access token"
  exit 1
fi

echo "✅ 登入成功，access token: ${ACCESS_TOKEN:0:20}..."

# 測試獲取用戶資訊
echo -e "\n2. 測試獲取用戶資訊..."
USER_INFO=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/users/me)
echo "用戶資訊: $USER_INFO"

# 測試獲取分店列表
echo -e "\n3. 測試獲取分店列表..."
BRANCHES=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/branches)
echo "分店列表: $BRANCHES"

# 測試獲取用戶列表
echo -e "\n4. 測試獲取用戶列表..."
USERS=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/users)
echo "用戶列表: $USERS"

# 測試獲取預約列表
echo -e "\n5. 測試獲取預約列表..."
APPOINTMENTS=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/appointments/all)
echo "預約列表: $APPOINTMENTS"

# 測試獲取訂單列表
echo -e "\n6. 測試獲取訂單列表..."
ORDERS=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:3000/orders)
echo "訂單列表: $ORDERS"

echo -e "\n🎉 測試完成！"
