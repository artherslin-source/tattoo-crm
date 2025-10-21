#!/bin/bash

echo "🚀 開始完整修復 Tattoo CRM 部署問題..."

# 步驟 1: 等待部署完成
echo "⏳ 等待後端部署完成 (5 分鐘)..."
sleep 300

# 步驟 2: 測試後端健康檢查
echo "🏥 測試後端健康檢查..."
for i in {1..10}; do
    echo "嘗試 $i/10..."
    response=$(curl -s https://carefree-determination-production-1f1f.up.railway.app/health)
    if [[ $response == *"ok"* ]]; then
        echo "✅ 後端健康檢查通過！"
        break
    else
        echo "❌ 健康檢查失敗: $response"
        if [ $i -eq 10 ]; then
            echo "🚨 後端部署失敗！"
            exit 1
        fi
        sleep 30
    fi
done

# 步驟 3: 等待前端部署完成
echo "⏳ 等待前端部署完成 (3 分鐘)..."
sleep 180

# 步驟 4: 測試前端連線
echo "🌐 測試前端連線..."
frontend_response=$(curl -s -I https://tattoo-crm-frontend-staging-production.up.railway.app)
if [[ $frontend_response == *"200 OK"* ]]; then
    echo "✅ 前端部署成功！"
else
    echo "❌ 前端部署失敗: $frontend_response"
fi

# 步驟 5: 測試管理員登入
echo "🔐 測試管理員登入..."
login_response=$(curl -s -X POST https://carefree-determination-production-1f1f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

echo "登入回應: $login_response"

if [[ $login_response == *"accessToken"* ]]; then
    echo "✅ 管理員登入成功！"
    echo "🎉 所有修復完成！"
    echo ""
    echo "📋 測試步驟："
    echo "1. 前往: https://tattoo-crm-frontend-staging-production.up.railway.app"
    echo "2. 按 F12 打開開發者工具"
    echo "3. 在 Console 中執行："
    echo ""
    echo "fetch('https://carefree-determination-production-1f1f.up.railway.app/auth/login', {"
    echo "  method: 'POST',"
    echo "  headers: { 'Content-Type': 'application/json' },"
    echo "  body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })"
    echo "})"
    echo ".then(response => response.json())"
    echo ".then(data => {"
    echo "  if (data.accessToken) {"
    echo "    localStorage.setItem('accessToken', data.accessToken);"
    echo "    localStorage.setItem('userRole', 'BOSS');"
    echo "    localStorage.setItem('userBranchId', '1');"
    echo "    location.reload();"
    echo "  }"
    echo "});"
    echo ""
    echo "4. 檢查管理後台按鈕是否顯示"
    echo "5. 點擊管理後台按鈕測試功能"
    
else
    echo "❌ 管理員登入失敗"
    echo "💡 可能需要手動創建管理員帳號"
    echo ""
    echo "🔧 手動修復步驟："
    echo "1. 前往 Railway Dashboard"
    echo "2. 進入後端服務的 Data 標籤"
    echo "3. 執行 SQL: ALTER TABLE \"TattooArtist\" ADD COLUMN IF NOT EXISTS \"photoUrl\" TEXT;"
    echo "4. 重新部署後端服務"
fi

echo "🎯 修復腳本執行完成！"
