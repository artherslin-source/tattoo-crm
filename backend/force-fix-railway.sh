#!/bin/bash

echo "🔧 開始強制修復 Railway 後端問題..."

# 步驟 1: 強制重新部署
echo "📦 步驟 1: 強制重新部署後端..."
railway up --detach

echo "⏳ 等待部署完成 (5 分鐘)..."
sleep 300

# 步驟 2: 檢查部署狀態
echo "📊 步驟 2: 檢查部署狀態..."
railway status

# 步驟 3: 測試健康檢查
echo "🏥 步驟 3: 測試健康檢查..."
for i in {1..5}; do
    echo "嘗試 $i/5..."
    response=$(curl -s https://carefree-determination-production-1f1f.up.railway.app/health)
    if [[ $response == *"ok"* ]]; then
        echo "✅ 後端健康檢查通過！"
        break
    else
        echo "❌ 健康檢查失敗: $response"
        if [ $i -eq 5 ]; then
            echo "🚨 所有健康檢查嘗試都失敗了！"
            exit 1
        fi
        sleep 30
    fi
done

# 步驟 4: 測試管理員登入
echo "🔐 步驟 4: 測試管理員登入..."
login_response=$(curl -s -X POST https://carefree-determination-production-1f1f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}')

echo "登入回應: $login_response"

if [[ $login_response == *"accessToken"* ]]; then
    echo "✅ 管理員登入成功！"
    echo "🎉 Railway 後端修復完成！"
else
    echo "❌ 管理員登入失敗"
    echo "💡 可能需要手動創建管理員帳號"
fi

echo "🎯 修復完成！請測試前端管理後台功能。"
