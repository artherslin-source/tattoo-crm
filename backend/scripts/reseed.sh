#!/bin/bash

echo "🔄 開始重置並重新建立數據庫..."
echo ""

# 切換到 backend 目錄
cd "$(dirname "$0")/.." || exit

echo "📍 當前目錄: $(pwd)"
echo ""

# 1. 清理數據庫
echo "🗑️  步驟 1: 清理現有數據..."
npx ts-node scripts/reset-database.ts
if [ $? -ne 0 ]; then
    echo "❌ 清理數據庫失敗"
    exit 1
fi
echo ""

# 2. 運行種子數據
echo "🌱 步驟 2: 重新建立種子數據..."
npx prisma db seed
if [ $? -ne 0 ]; then
    echo "❌ 建立種子數據失敗"
    exit 1
fi
echo ""

echo "✅ 數據庫重置完成！"
echo ""
echo "📊 預設帳號："
echo "   - BOSS: admin@test.com / 12345678"
echo "   - 三重店經理: manager1@test.com / 12345678"
echo "   - 東港店經理: manager2@test.com / 12345678"
echo "   - 會員: member1@test.com ~ member12@test.com / 12345678"
echo "   - 刺青師: artist1@test.com ~ artist3@test.com / 12345678"
echo ""
echo "🏪 分店配置："
echo "   - 三重店：2位刺青師（黃晨洋、林承葉）"
echo "   - 東港店：1位刺青師（陳震宇）"
echo ""

