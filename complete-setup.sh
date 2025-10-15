#!/bin/bash

echo "🎯 完整安裝驗證和設置腳本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 步驟 1：檢查 Docker 是否已安裝
echo "🔍 步驟 1/3: 檢查 Docker 安裝狀態..."
echo ""

if ! command -v docker &> /dev/null; then
    echo "❌ Docker 尚未安裝或未添加到 PATH"
    echo ""
    echo "📋 請按照以下步驟安裝 Docker Desktop："
    echo ""
    echo "   1. 打開 Finder，前往「下載」文件夾"
    echo "   2. 雙擊 Docker.dmg 文件"
    echo "   3. 將 Docker 圖標拖到 Applications 文件夾"
    echo "   4. 打開 Applications，雙擊 Docker"
    echo "   5. 按照提示完成安裝（需要輸入密碼）"
    echo "   6. 等待 Docker Desktop 完全啟動"
    echo "   7. 重新運行此腳本"
    echo ""
    echo "💡 提示：Docker Desktop 啟動後，右上角菜單欄會出現鯨魚圖標"
    echo ""
    exit 1
fi

echo "✅ Docker 已安裝"
echo "   Docker version: $(docker --version)"
echo "   Docker Compose version: $(docker-compose --version)"
echo ""

# 步驟 2：檢查 Docker 是否運行
echo "🔍 步驟 2/3: 檢查 Docker 運行狀態..."
echo ""

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker Desktop 未運行"
    echo ""
    echo "📋 請啟動 Docker Desktop："
    echo "   方法 1: 打開 Applications，雙擊 Docker"
    echo "   方法 2: 在終端運行: open /Applications/Docker.app"
    echo ""
    echo "💡 等待 Docker Desktop 完全啟動（右上角圖標變穩定）後，重新運行此腳本"
    echo ""
    exit 1
fi

echo "✅ Docker Desktop 正在運行"
echo ""

# 步驟 3：運行 PostgreSQL 設置腳本
echo "🚀 步驟 3/3: 設置本地 PostgreSQL 開發環境..."
echo ""

cd "$(dirname "$0")/backend" || exit

if [ ! -f "scripts/setup-local-postgres.sh" ]; then
    echo "❌ 找不到設置腳本"
    exit 1
fi

echo "📍 當前目錄: $(pwd)"
echo ""
echo "▶️  運行 PostgreSQL 設置腳本..."
echo ""

./scripts/setup-local-postgres.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 完整設置成功！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Docker Desktop 已安裝並運行"
    echo "✅ PostgreSQL 容器已啟動"
    echo "✅ 數據庫已初始化"
    echo "✅ 種子數據已載入"
    echo ""
    echo "🚀 下一步：啟動後端服務"
    echo ""
    echo "   cd $(pwd)"
    echo "   npm run start:dev"
    echo ""
    echo "📚 更多信息："
    echo "   - 快速開始: QUICK_START_POSTGRESQL.md"
    echo "   - 完整指南: LOCAL_POSTGRESQL_SETUP.md"
    echo "   - 常用命令: docker-compose ps, docker-compose logs"
    echo ""
else
    echo ""
    echo "❌ 設置過程中出現錯誤"
    echo ""
    echo "🔍 請檢查："
    echo "   1. Docker Desktop 是否正在運行"
    echo "   2. 端口 5432 是否被佔用: lsof -i :5432"
    echo "   3. 查看詳細錯誤訊息"
    echo ""
    echo "📚 查看完整文檔: LOCAL_POSTGRESQL_SETUP.md"
    echo ""
    exit 1
fi

