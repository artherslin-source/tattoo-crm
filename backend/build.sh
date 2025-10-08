#!/bin/bash
set -e

echo "🚀 開始強制構建後端..."

# 確保 dist 文件夾被清理
echo "🧹 清理 dist 文件夾..."
rm -rf dist

# 生成 Prisma Client
echo "📦 生成 Prisma Client..."
npx prisma generate

# 檢查 NestJS CLI 是否可用
echo "🔍 檢查 NestJS CLI..."
if [ ! -f "node_modules/.bin/nest" ]; then
    echo "❌ NestJS CLI 未找到，嘗試重新安裝..."
    npm install @nestjs/cli
fi

# 構建 NestJS 應用
echo "🔨 構建 NestJS 應用..."
echo "嘗試使用 NestJS CLI 構建..."
if npx nest build; then
    echo "✅ NestJS CLI 構建成功"
else
    echo "❌ NestJS CLI 構建失敗，嘗試使用 TypeScript 編譯器..."
    if npx tsc -p tsconfig.build.json; then
        echo "✅ TypeScript 編譯器構建成功"
    else
        echo "❌ TypeScript 編譯器構建也失敗"
        exit 1
    fi
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
