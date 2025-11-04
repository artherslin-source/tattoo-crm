#!/bin/bash

# 購物車與規格系統測試腳本
# 測試後端 API 的完整功能

echo "🚀 開始測試購物車與規格系統..."
echo ""

# 設定 API 基礎 URL
API_BASE="http://localhost:4000"

# 顏色輸出
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 測試函數
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    local token=$6
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[測試 $TOTAL_TESTS]${NC} $test_name"
    
    if [ -n "$token" ]; then
        AUTH_HEADER="Authorization: Bearer $token"
    else
        AUTH_HEADER=""
    fi
    
    if [ "$method" = "GET" ]; then
        if [ -n "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint" -H "$AUTH_HEADER")
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint")
        fi
    else
        if [ -n "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
                -H "Content-Type: application/json" \
                -H "$AUTH_HEADER" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, Got $http_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "$body"
    fi
    echo ""
}

# ============================================
# 第一部分：健康檢查
# ============================================
echo -e "${YELLOW}=== 第一部分：健康檢查 ===${NC}"
test_api "檢查後端健康狀態" "GET" "/health" "" "200"

# ============================================
# 第二部分：獲取管理員 Token（需要先登入）
# ============================================
echo -e "${YELLOW}=== 第二部分：管理員登入 ===${NC}"

# 嘗試登入（使用您系統中的管理員帳號）
echo "請輸入管理員 Email（或按 Enter 使用預設 admin@tattoocrm.com）:"
read -r ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@tattoocrm.com}

echo "請輸入管理員密碼（或按 Enter 使用預設 password123）:"
read -rs ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-password123}

echo ""
echo "嘗試登入為: $ADMIN_EMAIL"

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .access_token // empty')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo -e "${RED}❌ 無法獲取管理員 Token，跳過需要認證的測試${NC}"
    echo "登入響應: $LOGIN_RESPONSE"
    ADMIN_TOKEN=""
else
    echo -e "${GREEN}✅ 成功獲取管理員 Token${NC}"
fi
echo ""

# ============================================
# 第三部分：獲取現有服務
# ============================================
echo -e "${YELLOW}=== 第三部分：獲取現有服務 ===${NC}"

SERVICES_RESPONSE=$(curl -s -X GET "$API_BASE/services")
echo "$SERVICES_RESPONSE" | jq '.' 2>/dev/null || echo "$SERVICES_RESPONSE"

# 提取第一個服務的 ID
SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ]; then
    echo -e "${YELLOW}⚠️  沒有現有服務，將創建測試服務${NC}"
    
    if [ -n "$ADMIN_TOKEN" ]; then
        CREATE_SERVICE_RESPONSE=$(curl -s -X POST "$API_BASE/admin/services" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -d '{
                "name": "測試服務 - 小型圖騰",
                "description": "用於測試規格系統的服務",
                "price": 3000,
                "durationMin": 120,
                "category": "Arm",
                "isActive": true
            }')
        
        SERVICE_ID=$(echo "$CREATE_SERVICE_RESPONSE" | jq -r '.id // empty')
        
        if [ -n "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
            echo -e "${GREEN}✅ 成功創建測試服務: $SERVICE_ID${NC}"
        else
            echo -e "${RED}❌ 創建測試服務失敗${NC}"
            echo "$CREATE_SERVICE_RESPONSE"
        fi
    else
        echo -e "${RED}❌ 需要管理員權限來創建服務${NC}"
    fi
else
    echo -e "${GREEN}✅ 使用現有服務: $SERVICE_ID${NC}"
fi
echo ""

# 如果沒有服務 ID，無法繼續測試
if [ -z "$SERVICE_ID" ] || [ "$SERVICE_ID" = "null" ]; then
    echo -e "${RED}❌ 無法獲取服務 ID，測試中止${NC}"
    exit 1
fi

# ============================================
# 第四部分：測試規格管理 API
# ============================================
if [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}=== 第四部分：測試規格管理 API ===${NC}"
    
    # 測試 1: 初始化基礎模板
    test_api "初始化基礎規格模板" "POST" "/admin/service-variants/initialize/$SERVICE_ID" \
        '{"template":"basic"}' "201" "$ADMIN_TOKEN"
    
    sleep 1
    
    # 測試 2: 獲取服務規格
    test_api "獲取服務的所有規格" "GET" "/admin/service-variants/service/$SERVICE_ID" "" "200" "$ADMIN_TOKEN"
    
    # 測試 3: 重新初始化為標準模板
    test_api "重新初始化為標準模板" "POST" "/admin/service-variants/initialize/$SERVICE_ID" \
        '{"template":"standard"}' "201" "$ADMIN_TOKEN"
    
    sleep 1
    
    # 測試 4: 再次獲取規格（應該看到更多規格）
    VARIANTS_RESPONSE=$(curl -s -X GET "$API_BASE/admin/service-variants/service/$SERVICE_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    echo -e "${BLUE}[測試]${NC} 查看標準模板的規格"
    echo "$VARIANTS_RESPONSE" | jq '.'
    echo ""
    
    # 提取一個規格 ID 用於測試
    VARIANT_ID=$(echo "$VARIANTS_RESPONSE" | jq -r '.size[0].id // empty')
    
    if [ -n "$VARIANT_ID" ] && [ "$VARIANT_ID" != "null" ]; then
        # 測試 5: 更新規格（停用）
        test_api "停用特定規格" "PATCH" "/admin/service-variants/$VARIANT_ID" \
            '{"isActive":false}' "200" "$ADMIN_TOKEN"
        
        # 測試 6: 再次更新規格（啟用）
        test_api "重新啟用規格" "PATCH" "/admin/service-variants/$VARIANT_ID" \
            '{"isActive":true,"priceModifier":1500}' "200" "$ADMIN_TOKEN"
    fi
    
    # 測試 7: 創建自訂規格
    test_api "創建自訂規格" "POST" "/admin/service-variants" \
        '{
            "serviceId":"'"$SERVICE_ID"'",
            "type":"custom",
            "name":"加急服務",
            "description":"7天內完成",
            "priceModifier":2000,
            "durationModifier":0,
            "isRequired":false
        }' "201" "$ADMIN_TOKEN"
    
    # 測試 8: 初始化進階模板
    test_api "初始化進階模板（包含風格和複雜度）" "POST" "/admin/service-variants/initialize/$SERVICE_ID" \
        '{"template":"advanced"}' "201" "$ADMIN_TOKEN"
    
    sleep 1
    
    # 測試 9: 查看進階模板的規格
    ADVANCED_VARIANTS=$(curl -s -X GET "$API_BASE/admin/service-variants/service/$SERVICE_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    echo -e "${BLUE}[查看]${NC} 進階模板的規格統計"
    echo "$ADVANCED_VARIANTS" | jq '{
        "尺寸數量": (.size | length),
        "顏色數量": (.color | length),
        "部位數量": (.position | length),
        "風格數量": (.style | length),
        "複雜度數量": (.complexity | length)
    }'
    echo ""
    
else
    echo -e "${YELLOW}⚠️  跳過規格管理 API 測試（需要管理員權限）${NC}"
    echo ""
fi

# ============================================
# 第五部分：測試購物車 API（訪客模式）
# ============================================
echo -e "${YELLOW}=== 第五部分：測試購物車 API（訪客模式）===${NC}"

# 測試 1: 獲取空購物車
test_api "獲取空購物車" "GET" "/cart" "" "200"

# 測試 2: 加入購物車
test_api "加入購物車（訪客）" "POST" "/cart/items" \
    '{
        "serviceId":"'"$SERVICE_ID"'",
        "selectedVariants":{
            "size":"10x10cm",
            "color":"割線"
        },
        "notes":"希望在手臂外側"
    }' "201"

sleep 1

# 測試 3: 查看購物車
CART_RESPONSE=$(curl -s -X GET "$API_BASE/cart")
echo -e "${BLUE}[查看]${NC} 購物車內容"
echo "$CART_RESPONSE" | jq '.'
echo ""

CART_ITEM_ID=$(echo "$CART_RESPONSE" | jq -r '.items[0].id // empty')

if [ -n "$CART_ITEM_ID" ] && [ "$CART_ITEM_ID" != "null" ]; then
    # 測試 4: 更新購物車項目
    test_api "更新購物車項目" "PATCH" "/cart/items/$CART_ITEM_ID" \
        '{
            "selectedVariants":{
                "size":"15x15cm",
                "color":"黑白"
            },
            "notes":"改為15x15cm黑白"
        }' "200"
    
    sleep 1
    
    # 測試 5: 再次查看購物車（確認更新）
    test_api "確認購物車更新" "GET" "/cart" "" "200"
fi

# ============================================
# 第六部分：測試結帳流程
# ============================================
echo -e "${YELLOW}=== 第六部分：測試結帳流程 ===${NC}"

# 獲取分店 ID
BRANCHES_RESPONSE=$(curl -s -X GET "$API_BASE/branches")
BRANCH_ID=$(echo "$BRANCHES_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$BRANCH_ID" ] && [ "$BRANCH_ID" != "null" ]; then
    test_api "結帳（創建預約和訂單）" "POST" "/cart/checkout" \
        '{
            "branchId":"'"$BRANCH_ID"'",
            "preferredDate":"2025-11-15T00:00:00.000Z",
            "preferredTimeSlot":"14:00",
            "customerName":"測試用戶",
            "customerPhone":"0912345678",
            "customerEmail":"test@example.com",
            "specialRequests":"測試結帳流程"
        }' "201"
else
    echo -e "${YELLOW}⚠️  沒有分店資料，跳過結帳測試${NC}"
fi

# ============================================
# 測試結果總結
# ============================================
echo ""
echo "================================================"
echo -e "${YELLOW}📊 測試結果總結${NC}"
echo "================================================"
echo -e "總測試數: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通過: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失敗: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有測試通過！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED_TESTS 個測試失敗${NC}"
    exit 1
fi

