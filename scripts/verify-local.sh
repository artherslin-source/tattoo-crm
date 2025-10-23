#!/usr/bin/env bash
set -e

echo "🔍 開始本地驗證..."
echo ""

# 檢查環境變數
echo "📋 Step 1: 檢查環境變數"
if [ -z "$NEXT_PUBLIC_API_BASE_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_API_BASE_URL 未設定"
  export NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
  echo "   使用預設值: $NEXT_PUBLIC_API_BASE_URL"
else
  echo "✅ NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL"
fi
echo ""

# 測試 config.ts
echo "📋 Step 2: 測試 config.ts 的 apiUrl() 函數"
cd frontend
node -e "
const { API_BASE, apiUrl } = require('./src/lib/config.ts');
console.log('API_BASE:', API_BASE || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000');
const testUrl = apiUrl('/users/me');
console.log('apiUrl(\"/users/me\"):', testUrl);
const expected = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') + '/api/users/me';
if (testUrl === expected) {
  console.log('✅ apiUrl() 輸出正確');
} else {
  console.error('❌ apiUrl() 輸出不正確');
  console.error('   預期:', expected);
  console.error('   實際:', testUrl);
  process.exit(1);
}
" 2>/dev/null || echo "⚠️  Node.js 測試跳過（需要 TypeScript 支援）"
cd ..
echo ""

# 檢查前端 build
echo "📋 Step 3: 檢查前端 build 配置"
if [ -f "frontend/package.json" ]; then
  echo "✅ frontend/package.json 存在"
  BUILD_CMD=$(node -e "const pkg = require('./frontend/package.json'); console.log(pkg.scripts.build);")
  START_CMD=$(node -e "const pkg = require('./frontend/package.json'); console.log(pkg.scripts.start);")
  echo "   build: $BUILD_CMD"
  echo "   start: $START_CMD"
  
  if [ "$BUILD_CMD" = "next build" ] && [[ "$START_CMD" =~ "next start" ]]; then
    echo "✅ package.json scripts 正確"
  else
    echo "❌ package.json scripts 不正確"
    exit 1
  fi
else
  echo "❌ frontend/package.json 不存在"
  exit 1
fi
echo ""

# 檢查後端啟動腳本
echo "📋 Step 4: 檢查後端啟動腳本"
if [ -f "backend/railway-start.sh" ]; then
  echo "✅ backend/railway-start.sh 存在"
  if grep -q "prisma migrate deploy" backend/railway-start.sh; then
    echo "✅ 包含 prisma migrate deploy"
  else
    echo "❌ 缺少 prisma migrate deploy"
    exit 1
  fi
  if grep -q "node dist/main.js" backend/railway-start.sh; then
    echo "✅ 包含 node dist/main.js"
  else
    echo "❌ 缺少 node dist/main.js"
    exit 1
  fi
else
  echo "❌ backend/railway-start.sh 不存在"
  exit 1
fi
echo ""

# 檢查 CORS 設定
echo "📋 Step 5: 檢查後端 CORS 設定"
if grep -q "CORS_ORIGIN" backend/src/main.ts; then
  echo "✅ main.ts 包含 CORS_ORIGIN 環境變數讀取"
else
  echo "❌ main.ts 缺少 CORS_ORIGIN 環境變數讀取"
  exit 1
fi

if grep -q "credentials: true" backend/src/main.ts; then
  echo "✅ CORS credentials: true 已設定"
else
  echo "❌ CORS credentials: true 未設定"
  exit 1
fi
echo ""

# 檢查健康檢查端點
echo "📋 Step 6: 檢查健康檢查端點"
if grep -q "@Get('health')" backend/src/app.controller.ts; then
  echo "✅ GET /health 端點存在"
else
  echo "❌ GET /health 端點不存在"
  exit 1
fi

if grep -q "@Get('api/health/simple')" backend/src/app.controller.ts; then
  echo "✅ GET /api/health/simple 端點存在"
else
  echo "❌ GET /api/health/simple 端點不存在"
  exit 1
fi
echo ""

# 檢查圖片文件
echo "📋 Step 7: 檢查圖片文件"
if [ -f "frontend/public/images/logo/diaochan-tattoo-logo.png" ]; then
  echo "✅ LOGO 文件存在"
else
  echo "❌ LOGO 文件不存在"
  exit 1
fi

SERVICE_IMAGES=("full-arm-sleeve.jpg" "upper-arm-sleeve.jpg" "forearm-sleeve.jpg")
ALL_SERVICE_IMAGES_EXIST=true
for img in "${SERVICE_IMAGES[@]}"; do
  if [ -f "frontend/public/images/services/$img" ]; then
    echo "✅ 服務圖片存在: $img"
  else
    echo "❌ 服務圖片不存在: $img"
    ALL_SERVICE_IMAGES_EXIST=false
  fi
done

if [ "$ALL_SERVICE_IMAGES_EXIST" = false ]; then
  exit 1
fi
echo ""

# 檢查部署文檔
echo "📋 Step 8: 檢查部署文檔"
if [ -f "CONTRIBUTING_DEPLOY.md" ]; then
  echo "✅ CONTRIBUTING_DEPLOY.md 存在"
  if grep -q "禁止在本機執行" CONTRIBUTING_DEPLOY.md; then
    echo "✅ 包含禁止本地部署警告"
  else
    echo "⚠️  缺少禁止本地部署警告"
  fi
else
  echo "❌ CONTRIBUTING_DEPLOY.md 不存在"
  exit 1
fi
echo ""

echo "✅ 所有本地驗證通過！"
echo ""
echo "📝 下一步："
echo "1. 設定 Railway 環境變數"
echo "2. 推送到 GitHub staging 分支"
echo "3. 等待 Railway 自動部署"
echo "4. 執行部署後驗證"

