#!/bin/bash

API="https://tattoo-crm-production-413f.up.railway.app"

echo "=== 测试 Session Cookie 配置 ==="
echo ""

echo "步骤 1：加入购物车（POST /cart/items）"
echo "----------------------------------------"

RESPONSE=$(curl -s -i -X POST "$API/cart/items" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "cmhec2wpy00250gb6pbia0rbb",
    "selectedVariants": {
      "size": "",
      "color": "割線"
    },
    "notes": "测试"
  }')

echo "$RESPONSE" | head -20

echo ""
echo "检查 Set-Cookie 标头："
SET_COOKIE=$(echo "$RESPONSE" | grep -i "set-cookie")
if [ -n "$SET_COOKIE" ]; then
  echo "✅ 找到 Set-Cookie 标头："
  echo "$SET_COOKIE"
  
  if echo "$SET_COOKIE" | grep -q "SameSite=None"; then
    echo "✅ SameSite=None ← 正确！"
  elif echo "$SET_COOKIE" | grep -q "SameSite=Lax"; then
    echo "❌ SameSite=Lax ← 错误！后端还没有更新"
  else
    echo "⚠️  没有找到 SameSite 属性"
  fi
  
  if echo "$SET_COOKIE" | grep -q "Secure"; then
    echo "✅ Secure ← 正确！"
  else
    echo "❌ 没有 Secure 属性"
  fi
else
  echo "❌ 没有找到 Set-Cookie 标头"
fi

echo ""
echo "=== 结论 ==="
if echo "$SET_COOKIE" | grep -q "SameSite=None"; then
  echo "✅ 后端已更新！Cookie 配置正确"
  echo ""
  echo "请执行以下步骤："
  echo "1. 完全关闭浏览器"
  echo "2. 重新打开浏览器"
  echo "3. 按 Ctrl/Cmd + Shift + Delete"
  echo "4. 清除「Cookie」和「快取」（选择「不限时间」）"
  echo "5. 重新测试购物车功能"
else
  echo "❌ 后端配置还没有生效"
  echo ""
  echo "请执行以下步骤："
  echo "1. 前往 Railway 控制台"
  echo "2. 检查后端服务部署状态"
  echo "3. 等待部署完成（显示 ✅ Deployed）"
  echo "4. 等待 1-2 分钟让服务重启"
  echo "5. 重新运行此测试脚本"
fi

