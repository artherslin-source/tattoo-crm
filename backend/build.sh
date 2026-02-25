#!/bin/bash
set -e

echo "🚀 開始強制構建後端..."

# 確保 dist 文件夾被清理
echo "🧹 清理 dist 文件夾..."
rm -rf dist

# 生成 Prisma Client
echo "📦 生成 Prisma Client..."
npx prisma generate

# 構建：有 nest 就用 nest build，否則直接用 tsc（Zeabur/CI 常未安裝 nest）
echo "🔨 構建後端..."
if [ -f "node_modules/.bin/nest" ] && npx nest build 2>/dev/null; then
    echo "✅ NestJS CLI 構建成功"
else
    echo "📦 使用 TypeScript 編譯器構建（tsconfig.build.json）..."
    npx tsc -p tsconfig.build.json
    echo "✅ TypeScript 編譯器構建成功"
fi

# 驗證構建結果
echo "✅ 驗證構建結果..."
if [ -f "dist/main.js" ]; then
    echo "🎉 構建成功！dist/main.js 已創建"
    ls -la dist/
else
    echo "❌ 構建失敗！dist/main.js 不存在"
    echo "📁 當前目錄內容："
    ls -la
    echo "📁 dist 文件夾內容："
    ls -la dist/
    echo "📁 node_modules/.bin 內容："
    ls -la node_modules/.bin/ | grep nest
    echo "🔍 檢查 NestJS 構建詳細信息..."
    npx nest build --verbose
    exit 1
fi

echo "🚀 構建完成！"
