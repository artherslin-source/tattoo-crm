#!/bin/bash

echo "🔍 測試 API 連線腳本"
echo "=================="

# 等待前端部署完成
echo "⏳ 等待前端部署完成 (3 分鐘)..."
sleep 180

# 測試後端健康檢查
echo "🏥 測試後端健康檢查..."
backend_health=$(curl -s https://carefree-determination-production-1f1f.up.railway.app/health)
echo "後端健康檢查: $backend_health"

# 測試前端 API 連線
echo "🌐 測試前端 API 連線..."
frontend_response=$(curl -s https://tattoo-crm-frontend-staging-production.up.railway.app/api/health 2>/dev/null || echo "前端 API 端點不存在")

# 測試登入功能
echo "🔐 測試登入功能..."
login_response=$(curl -s -X POST https://carefree-determination-production-1f1f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

echo "登入回應: $login_response"

# 如果登入成功，測試用戶資訊 API
if [[ $login_response == *"accessToken"* ]]; then
    echo "✅ 登入成功！"
    token=$(echo $login_response | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 提取的 Token: ${token:0:20}..."
    
    echo "👤 測試用戶資訊 API..."
    user_response=$(curl -s -H "Authorization: Bearer $token" \
      https://carefree-determination-production-1f1f.up.railway.app/users/me)
    echo "用戶資訊: $user_response"
    
    if [[ $user_response == *"role"* ]]; then
        echo "✅ 用戶角色獲取成功！"
        role=$(echo $user_response | grep -o '"role":"[^"]*"' | cut -d'"' -f4)
        echo "👑 用戶角色: $role"
    else
        echo "❌ 用戶角色獲取失敗"
    fi
else
    echo "❌ 登入失敗"
fi

echo "🎉 測試完成！"
