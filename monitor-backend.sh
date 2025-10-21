#!/bin/bash

echo "🔍 後端修復監控腳本"
echo "=================="

# 等待部署完成
echo "⏳ 等待部署完成 (5 分鐘)..."
sleep 300

# 檢查部署狀態
echo "📊 檢查部署狀態..."
cd backend && railway status

# 測試健康檢查
echo "🏥 測試健康檢查..."
for i in {1..10}; do
    echo "嘗試 $i/10..."
    response=$(curl -s https://carefree-determination-production-1f1f.up.railway.app/health)
    if [[ $response == *"ok"* ]]; then
        echo "✅ 後端健康檢查通過！"
        echo "回應: $response"
        break
    else
        echo "❌ 健康檢查失敗: $response"
        if [ $i -eq 10 ]; then
            echo "🚨 所有健康檢查嘗試都失敗了！"
            exit 1
        fi
        sleep 30
    fi
done

# 測試登入功能
echo "🔐 測試登入功能..."
login_response=$(curl -s -X POST https://carefree-determination-production-1f1f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

if [[ $login_response == *"accessToken"* ]]; then
    echo "✅ 登入功能正常！"
    echo "回應: $login_response"
else
    echo "❌ 登入功能失敗: $login_response"
fi

# 測試用戶資訊 API
echo "👤 測試用戶資訊 API..."
if [[ $login_response == *"accessToken"* ]]; then
    token=$(echo $login_response | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    user_response=$(curl -s -H "Authorization: Bearer $token" \
      https://carefree-determination-production-1f1f.up.railway.app/users/me)
    
    if [[ $user_response == *"role"* ]]; then
        echo "✅ 用戶資訊 API 正常！"
        echo "回應: $user_response"
    else
        echo "❌ 用戶資訊 API 失敗: $user_response"
    fi
fi

echo "🎉 監控完成！"
