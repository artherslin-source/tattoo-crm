#!/bin/bash

# 等待 Railway 部署並自動測試
# 每 30 秒檢查一次，直到修復成功

BACKEND_URL="https://tattoo-crm-production-413f.up.railway.app"
MAX_ATTEMPTS=20  # 最多等待 10 分鐘 (20 * 30秒)
ATTEMPT=0

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=================================="
echo "   Railway 部署監控與自動測試"
echo "=================================="
echo ""
echo -e "${YELLOW}⏰ 等待 Railway 後端重新部署...${NC}"
echo ""
echo "預計時間: 5-10 分鐘"
echo "測試間隔: 30 秒"
echo "最多等待: 10 分鐘"
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  ELAPSED=$((ATTEMPT * 30))
  
  echo -e "${BLUE}[嘗試 $ATTEMPT/$MAX_ATTEMPTS] 已等待 ${ELAPSED} 秒...${NC}"
  
  # 登入並測試
  LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "member7@test.com",
      "password": "12345678"
    }')
  
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}  ❌ 登入失敗，跳過此次測試${NC}"
    sleep 30
    continue
  fi
  
  # 查詢預約
  APPOINTMENTS=$(curl -s -X GET "${BACKEND_URL}/appointments/my" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  # 分析結果
  RESULT=$(echo "$APPOINTMENTS" | python3 -c "
import sys
import json

try:
    data = json.load(sys.stdin)
    if not isinstance(data, list):
        print('error')
        sys.exit(1)
    
    user_ids = set()
    for apt in data:
        if 'userId' in apt:
            user_ids.add(apt['userId'])
        elif 'user' in apt and 'id' in apt['user']:
            user_ids.add(apt['user']['id'])
    
    print(f'{len(data)}|{len(user_ids)}')
except:
    print('error')
" 2>/dev/null)
  
  if [ "$RESULT" == "error" ]; then
    echo -e "${YELLOW}  ⚠️  無法解析響應，可能後端正在重啟${NC}"
    sleep 30
    continue
  fi
  
  APPOINTMENT_COUNT=$(echo $RESULT | cut -d'|' -f1)
  UNIQUE_USERS=$(echo $RESULT | cut -d'|' -f2)
  
  echo "  📊 預約數: $APPOINTMENT_COUNT"
  echo "  👥 用戶數: $UNIQUE_USERS"
  
  if [ "$UNIQUE_USERS" == "1" ]; then
    echo ""
    echo "=================================="
    echo -e "${GREEN}✅✅✅ 修復成功！${NC}"
    echo "=================================="
    echo ""
    echo "測試結果:"
    echo "  ✅ API 只返回一個用戶的預約"
    echo "  ✅ 用戶數據隔離正常"
    echo "  ✅ 安全漏洞已修復"
    echo ""
    echo "請執行以下操作："
    echo "  1. 清除瀏覽器緩存（F12 → Application → Clear Storage）"
    echo "  2. 重新登入"
    echo "  3. 前往「預約紀錄」"
    echo "  4. 確認只顯示您自己的預約"
    echo ""
    exit 0
  else
    echo -e "${YELLOW}  ⚠️  仍返回多個用戶的預約，繼續等待...${NC}"
  fi
  
  echo ""
  
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    sleep 30
  fi
done

echo ""
echo "=================================="
echo -e "${RED}❌ 超時：等待 10 分鐘後仍未修復${NC}"
echo "=================================="
echo ""
echo "可能的問題："
echo "  1. Railway 後端沒有自動重新部署"
echo "  2. 需要手動觸發重新部署"
echo ""
echo "請執行："
echo "  1. 前往 Railway Dashboard"
echo "  2. 選擇 Backend 服務"
echo "  3. 點擊 'Redeploy' 按鈕"
echo "  4. 等待部署完成後重新測試"
echo ""

