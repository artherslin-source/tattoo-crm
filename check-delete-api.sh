#!/bin/bash

echo "🔍 检查 DELETE API 是否已部署..."
echo ""

# 检查后端健康状态
echo "1️⃣ 后端健康检查："
curl -s https://tattoo-crm-production-413f.up.railway.app/api/health/simple | jq .
echo ""

# 尝试调用 DELETE API（需要认证，会返回 401 或 403，但不会 404）
echo "2️⃣ DELETE API 路由检查（预期：401/403，不是 404）："
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE https://tattoo-crm-production-413f.up.railway.app/admin/billing/split-rules/test-id)
echo "$response"
echo ""

# 检查前端是否可访问
echo "3️⃣ 前端健康检查："
curl -s -I https://tattoo-crm-production.up.railway.app | head -5
echo ""

echo "✅ 如果 DELETE API 返回 401/403（而不是 404），说明路由已正确部署"
echo "❌ 如果返回 404，请在 Railway 手动触发重新部署"

