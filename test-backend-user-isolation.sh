#!/bin/bash

# 測試後端用戶數據隔離
# 用於驗證 /appointments/my 是否正確過濾用戶數據

BACKEND_URL="https://tattoo-crm-production-413f.up.railway.app"

echo "=================================="
echo "測試後端用戶數據隔離"
echo "=================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試用戶 1
echo "步驟 1: 登入測試用戶 member7@test.com"
echo "--------------------------------------"

LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member7@test.com",
    "password": "12345678"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ 登入失敗！${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ 登入成功${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 解析 JWT
echo "步驟 2: 解析 JWT Token"
echo "--------------------------------------"

# JWT payload 是第二部分
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
# Base64 解碼
DECODED=$(echo $PAYLOAD | base64 -d 2>/dev/null || echo $PAYLOAD | base64 -D 2>/dev/null)

echo "JWT Payload:"
echo "$DECODED" | python3 -m json.tool 2>/dev/null || echo "$DECODED"
echo ""

# 提取 userId
USER_ID=$(echo "$DECODED" | grep -o '"sub":"[^"]*' | cut -d'"' -f4)
if [ -z "$USER_ID" ]; then
  USER_ID=$(echo "$DECODED" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
fi

echo "解析的用戶 ID: $USER_ID"
echo ""

# 查詢預約
echo "步驟 3: 查詢我的預約"
echo "--------------------------------------"

APPOINTMENTS=$(curl -s -X GET "${BACKEND_URL}/appointments/my" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# 計算預約數量
APPOINTMENT_COUNT=$(echo $APPOINTMENTS | grep -o '"id":"[^"]*' | wc -l)
echo "返回的預約數量: $APPOINTMENT_COUNT"
echo ""

# 分析每個預約的 userId
echo "步驟 4: 分析預約的 userId"
echo "--------------------------------------"

echo "$APPOINTMENTS" | python3 -c "
import sys
import json

try:
    data = json.load(sys.stdin)
    
    if not isinstance(data, list):
        print('❌ 返回數據格式錯誤')
        sys.exit(1)
    
    print(f'📊 總預約數: {len(data)}')
    
    # 提取所有 userId
    user_ids = set()
    for apt in data:
        if 'userId' in apt:
            user_ids.add(apt['userId'])
        elif 'user' in apt and 'id' in apt['user']:
            user_ids.add(apt['user']['id'])
    
    print(f'👥 涉及的唯一用戶數: {len(user_ids)}')
    print(f'👥 用戶 ID 列表: {list(user_ids)}')
    
    if len(user_ids) > 1:
        print('🚨 錯誤：返回了多個用戶的預約！')
        print('詳細統計：')
        for uid in user_ids:
            count = sum(1 for apt in data if apt.get('userId') == uid or apt.get('user', {}).get('id') == uid)
            print(f'  - 用戶 {uid[:12]}...: {count} 條預約')
    else:
        print('✅ 正確：只返回一個用戶的預約')
        
except Exception as e:
    print(f'解析錯誤: {e}')
    print('原始數據:')
    print(sys.stdin.read()[:500])
" 2>/dev/null || echo "需要 Python3 來分析數據"

echo ""
echo "=================================="
echo "測試完成"
echo "=================================="

