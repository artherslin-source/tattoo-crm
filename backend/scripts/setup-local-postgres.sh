#!/bin/bash

# 本地 PostgreSQL 開發環境自動設置腳本

set -e  # 遇到錯誤立即退出

echo "🚀 開始設置本地 PostgreSQL 開發環境..."
echo ""

# 切換到 backend 目錄
cd "$(dirname "$0")/.." || exit
echo "📍 當前目錄: $(pwd)"
echo ""

# 1. 檢查 Docker 是否安裝
echo "🔍 步驟 1/7: 檢查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝！"
    echo ""
    echo "請先安裝 Docker Desktop："
    echo "  macOS: brew install --cask docker"
    echo "  或訪問: https://www.docker.com/products/docker-desktop/"
    echo ""
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安裝！"
    exit 1
fi

echo "✅ Docker 已安裝"
echo "   Docker version: $(docker --version)"
echo "   Docker Compose version: $(docker-compose --version)"
echo ""

# 2. 檢查 Docker 是否運行
echo "🔍 步驟 2/7: 檢查 Docker 是否運行..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行！"
    echo ""
    echo "請啟動 Docker Desktop："
    echo "  macOS: open /Applications/Docker.app"
    echo ""
    exit 1
fi
echo "✅ Docker 正在運行"
echo ""

# 3. 啟動 PostgreSQL 容器
echo "🐘 步驟 3/7: 啟動 PostgreSQL 容器..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ 啟動 PostgreSQL 容器失敗"
    exit 1
fi
echo "✅ PostgreSQL 容器已啟動"
echo ""

# 4. 等待 PostgreSQL 就緒
echo "⏳ 步驟 4/7: 等待 PostgreSQL 就緒..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U tattoo_user -d tattoo_crm_dev > /dev/null 2>&1; then
        echo "✅ PostgreSQL 已就緒"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   等待中... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ PostgreSQL 啟動超時"
    echo "請查看日誌: docker-compose logs postgres"
    exit 1
fi
echo ""

# 5. 檢查並更新 .env 文件
echo "⚙️  步驟 5/7: 檢查環境變量..."
if [ -f .env ]; then
    # 備份現有 .env
    if ! grep -q "postgresql://" .env; then
        echo "   備份現有 .env 到 .env.sqlite.backup"
        cp .env .env.sqlite.backup
        
        # 更新 DATABASE_URL
        echo "   更新 DATABASE_URL..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev"|' .env
        else
            # Linux
            sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev"|' .env
        fi
        echo "✅ 環境變量已更新"
    else
        echo "✅ 環境變量已配置為 PostgreSQL"
    fi
else
    echo "❌ .env 文件不存在"
    echo "請從 .env.example 創建 .env 文件"
    exit 1
fi
echo ""

# 6. 生成 Prisma Client
echo "📦 步驟 6/7: 生成 Prisma Client..."
npx prisma generate > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 生成 Prisma Client 失敗"
    exit 1
fi
echo "✅ Prisma Client 已生成"
echo ""

# 7. 運行數據庫遷移
echo "🗄️  步驟 7/7: 初始化數據庫..."
echo "   運行數據庫遷移..."
npx prisma migrate deploy > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 數據庫遷移失敗"
    exit 1
fi
echo "✅ 數據庫遷移完成"
echo ""

# 8. 執行種子數據
echo "🌱 執行種子數據..."
npx prisma db seed
if [ $? -ne 0 ]; then
    echo "❌ 種子數據執行失敗"
    exit 1
fi
echo ""

# 9. 驗證數據
echo "🔍 驗證數據..."
npx ts-node scripts/verify-data.ts
echo ""

# 完成
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 本地 PostgreSQL 開發環境設置完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 數據庫信息："
echo "   主機: localhost"
echo "   端口: 5432"
echo "   數據庫: tattoo_crm_dev"
echo "   用戶: tattoo_user"
echo "   密碼: tattoo_password"
echo ""
echo "🔗 連接字符串："
echo "   postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev"
echo ""
echo "📝 常用命令："
echo "   查看容器狀態: docker-compose ps"
echo "   查看日誌:     docker-compose logs -f postgres"
echo "   停止容器:     docker-compose stop"
echo "   啟動容器:     docker-compose start"
echo "   重啟容器:     docker-compose restart"
echo "   連接數據庫:   docker-compose exec postgres psql -U tattoo_user -d tattoo_crm_dev"
echo "   Prisma Studio: npx prisma studio"
echo ""
echo "🚀 下一步："
echo "   啟動後端服務: npm run start:dev"
echo ""
echo "📚 詳細文檔："
echo "   查看 LOCAL_POSTGRESQL_SETUP.md"
echo ""

