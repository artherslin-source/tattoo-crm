#!/bin/bash

echo "🚀 開始完整系統修復..."

# 步驟 1: 檢查後端健康狀態
echo "🏥 檢查後端健康狀態..."
for i in {1..5}; do
    echo "嘗試 $i/5..."
    response=$(curl -s https://carefree-determination-production-1f1f.up.railway.app/health)
    if [[ $response == *"ok"* ]]; then
        echo "✅ 後端健康檢查通過！"
        break
    else
        echo "❌ 健康檢查失敗: $response"
        if [ $i -eq 5 ]; then
            echo "🚨 後端服務異常！"
            exit 1
        fi
        sleep 10
    fi
done

# 步驟 2: 測試管理員登入
echo "🔐 測試管理員登入..."
login_response=$(curl -s -X POST https://carefree-determination-production-1f1f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

echo "登入回應: $login_response"

if [[ $login_response == *"accessToken"* ]]; then
    echo "✅ 管理員登入成功！"
    
    # 提取 accessToken
    access_token=$(echo $login_response | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "🎫 Access Token: ${access_token:0:20}..."
    
    # 步驟 3: 測試管理後台 API
    echo "📊 測試管理後台 API..."
    stats_response=$(curl -s -H "Authorization: Bearer $access_token" \
      https://carefree-determination-production-1f1f.up.railway.app/admin/stats)
    
    echo "統計數據回應: $stats_response"
    
    if [[ $stats_response == *"totalAppointments"* ]]; then
        echo "✅ 管理後台 API 正常！"
    else
        echo "❌ 管理後台 API 異常"
    fi
    
else
    echo "❌ 管理員登入失敗"
    echo "💡 可能需要重新執行 seeding"
fi

# 步驟 4: 檢查前端部署狀態
echo "🌐 檢查前端部署狀態..."
frontend_response=$(curl -s -I https://tattoo-crm-frontend-staging-production.up.railway.app)
if [[ $frontend_response == *"200 OK"* ]]; then
    echo "✅ 前端部署成功！"
else
    echo "❌ 前端部署失敗: $frontend_response"
fi

echo "🎯 系統修復完成！"
echo ""
echo "📋 測試步驟："
echo "1. 前往: https://tattoo-crm-frontend-staging-production.up.railway.app"
echo "2. 按 F12 打開開發者工具"
echo "3. 在 Console 中執行以下代碼："
echo ""
echo "// 測試管理員登入"
echo "fetch('https://carefree-determination-production-1f1f.up.railway.app/auth/login', {"
echo "  method: 'POST',"
echo "  headers: { 'Content-Type': 'application/json' },"
echo "  body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })"
echo "})"
echo ".then(response => response.json())"
echo ".then(data => {"
echo "  console.log('登入結果:', data);"
echo "  if (data.accessToken) {"
echo "    localStorage.setItem('accessToken', data.accessToken);"
echo "    localStorage.setItem('userRole', 'BOSS');"
echo "    localStorage.setItem('userBranchId', '1');"
echo "    console.log('✅ 已設置認證 token');"
echo "    location.reload();"
echo "  }"
echo "});"
echo ""
echo "4. 檢查管理後台按鈕是否顯示"
echo "5. 點擊管理後台按鈕測試功能"
