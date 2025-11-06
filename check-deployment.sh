#!/bin/bash

echo "🔍 檢查部署狀態"
echo "================================"
echo ""

echo "📋 最新 Git 提交："
cd /Users/jerrylin/tattoo-crm && git log -1 --pretty=format:"%h - %s (%cr)" && echo ""
echo ""

echo "📋 最近 3 個提交："
git log -3 --oneline
echo ""

echo "🌐 測試前端是否可訪問："
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://tattoo-crm-production.up.railway.app/)
echo "前端狀態碼: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✅ 前端正常運行"
else
  echo "⚠️  前端返回非 200 狀態碼"
fi
echo ""

echo "🌐 測試後端是否可訪問："
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://tattoo-crm-production-413f.up.railway.app/services)
echo "後端狀態碼: $BACKEND_STATUS"

if [ "$BACKEND_STATUS" = "200" ]; then
  echo "✅ 後端正常運行"
else
  echo "⚠️  後端返回非 200 狀態碼"
fi
echo ""

echo "📝 最新錯誤日誌："
LATEST_LOG=$(ls -t /Users/jerrylin/tattoo-crm/logs/frontend/logs.*.json 2>/dev/null | head -1)
if [ -n "$LATEST_LOG" ]; then
  echo "檔案: $(basename $LATEST_LOG)"
  LOG_TIME=$(basename $LATEST_LOG | sed 's/logs\.//;s/\.json//')
  LOG_DATE=$(date -r $((LOG_TIME / 1000)) '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "無法解析時間")
  echo "時間: $LOG_DATE"
else
  echo "沒有找到錯誤日誌"
fi
echo ""

echo "================================"
echo "🎯 下一步建議："
echo ""
echo "1. 前往 Railway 控制台檢查部署狀態"
echo "   https://railway.app/"
echo ""
echo "2. 確認前端服務是否正在部署"
echo "   - 狀態應顯示：🔵 Building 或 ✅ Deployed"
echo "   - Commit 應為：2b83f14 或更新"
echo ""
echo "3. 如果部署完成，清除瀏覽器緩存"
echo "   - Command/Ctrl + Shift + Delete"
echo "   - 清除 Cookie 和快取"
echo "   - 完全重啟瀏覽器"
echo ""
echo "4. 使用無痕模式測試"
echo "   - Command/Ctrl + Shift + N"
echo "   - 前往首頁測試購物車功能"
echo ""
echo "================================"

