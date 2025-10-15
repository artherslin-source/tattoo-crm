#!/bin/bash

# 測試分店篩選功能

echo "🔑 步驟 1: 登入獲取 Token..."
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "12345678"
  }' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登入失敗"
  exit 1
fi

echo "✅ 登入成功"
echo ""

echo "🏪 步驟 2: 獲取分店列表..."
BRANCHES=$(curl -s http://localhost:4000/branches \
  -H "Authorization: Bearer $TOKEN")

echo "$BRANCHES" | jq '.'
echo ""

echo "📊 分店數量:"
echo "$BRANCHES" | jq 'length'
echo ""

echo "📝 分店名稱:"
echo "$BRANCHES" | jq -r '.[] | "- \(.name) (\(.id))"'

