#!/bin/bash

echo "🚀 開始完整部署修復流程..."

# === 步驟 1: 確保在正確的分支 ===
echo "📋 步驟 1: 檢查 Git 分支..."
cd /Users/jerrylin/tattoo-crm
git checkout staging
git pull origin staging
echo "✅ 當前分支: $(git branch --show-current)"

# === 步驟 2: 檢查環境變數設置 ===
echo "📋 步驟 2: 檢查環境變數..."

# 後端環境變數
echo "🔧 檢查後端環境變數..."
cd backend
BACKEND_URL=$(railway variables | grep "RAILWAY_PUBLIC_DOMAIN" | cut -d'│' -f2 | tr -d ' ')
echo "後端 URL: $BACKEND_URL"

# 前端環境變數
echo "🔧 檢查前端環境變數..."
cd ../frontend
FRONTEND_URL=$(railway variables | grep "RAILWAY_PUBLIC_DOMAIN" | cut -d'│' -f2 | tr -d ' ')
echo "前端 URL: $FRONTEND_URL"

# === 步驟 3: 確保環境變數正確設置 ===
echo "📋 步驟 3: 設置環境變數..."

# 設置後端 CORS
echo "🔧 設置後端 CORS_ORIGIN..."
cd ../backend
railway variables --set "CORS_ORIGIN=$FRONTEND_URL" -e production

# 設置前端 API URL
echo "🔧 設置前端 API URL..."
cd ../frontend
railway variables --set "NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL" -e production

# === 步驟 4: 檢查資料庫連接 ===
echo "📋 步驟 4: 檢查資料庫連接..."
cd ../backend
echo "🔍 檢查 DATABASE_URL..."
DATABASE_URL=$(railway variables | grep "DATABASE_URL" | cut -d'│' -f2 | tr -d ' ')
if [[ $DATABASE_URL == postgresql://* ]]; then
    echo "✅ 資料庫 URL 設置正確"
else
    echo "❌ 資料庫 URL 設置錯誤: $DATABASE_URL"
    exit 1
fi

# === 步驟 5: 重新部署後端 ===
echo "📋 步驟 5: 重新部署後端..."
cd ../backend
echo "🚀 部署後端服務..."
railway up --detach -e production
echo "✅ 後端部署已觸發"

# === 步驟 6: 等待後端部署完成 ===
echo "📋 步驟 6: 等待後端部署完成..."
echo "⏳ 等待 60 秒讓後端部署完成..."
sleep 60

# 檢查後端健康狀態
echo "🏥 檢查後端健康狀態..."
for i in {1..5}; do
    echo "嘗試 $i/5..."
    response=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
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

# === 步驟 7: 測試管理員登入 ===
echo "📋 步驟 7: 測試管理員登入..."
login_response=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

echo "登入回應: $login_response"

if [[ $login_response == *"accessToken"* ]]; then
    echo "✅ 管理員登入成功！"
else
    echo "❌ 管理員登入失敗，可能需要重新執行 seeding"
fi

# === 步驟 8: 重新部署前端 ===
echo "📋 步驟 8: 重新部署前端..."
cd ../frontend
echo "🚀 部署前端服務..."
railway up --detach -e production
echo "✅ 前端部署已觸發"

# === 步驟 9: 等待前端部署完成 ===
echo "📋 步驟 9: 等待前端部署完成..."
echo "⏳ 等待 60 秒讓前端部署完成..."
sleep 60

# 檢查前端狀態
echo "🌐 檢查前端狀態..."
frontend_response=$(curl -I -s "$FRONTEND_URL" 2>/dev/null | head -n 1)
if [[ $frontend_response == *"200"* ]]; then
    echo "✅ 前端部署成功！"
else
    echo "❌ 前端部署失敗: $frontend_response"
fi

# === 步驟 10: 最終測試 ===
echo "📋 步驟 10: 最終測試..."
echo "🎯 測試完成！"
echo ""
echo "📋 測試步驟："
echo "1. 前往: $FRONTEND_URL"
echo "2. 按 F12 打開開發者工具"
echo "3. 在 Console 中執行："
echo ""
echo "fetch('$BACKEND_URL/auth/login', {"
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
echo ""
echo "🎉 完整部署修復流程完成！"
