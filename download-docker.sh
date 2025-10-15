#!/bin/bash

echo "🐳 Docker Desktop 下載助手"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 檢測芯片類型
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    CHIP="Apple Silicon (M1/M2/M3)"
    URL="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
elif [ "$ARCH" = "x86_64" ]; then
    CHIP="Intel"
    URL="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
else
    echo "❌ 無法識別的芯片類型: $ARCH"
    exit 1
fi

echo "📊 系統信息："
echo "   芯片類型: $CHIP"
echo "   macOS 版本: $(sw_vers -productVersion)"
echo ""

echo "📥 下載 Docker Desktop..."
echo "   下載地址: $URL"
echo ""

# 下載到 Downloads 文件夾
DOWNLOAD_PATH="$HOME/Downloads/Docker.dmg"

echo "⏳ 正在下載到: $DOWNLOAD_PATH"
echo "   這可能需要 2-3 分鐘，請耐心等待..."
echo ""

curl -L -o "$DOWNLOAD_PATH" "$URL" --progress-bar

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 下載完成！"
    echo ""
    echo "📝 接下來的步驟："
    echo "   1. 打開 Finder"
    echo "   2. 前往「下載」文件夾"
    echo "   3. 雙擊 Docker.dmg"
    echo "   4. 將 Docker 圖標拖到 Applications 文件夾"
    echo "   5. 打開 Applications，雙擊 Docker"
    echo "   6. 按照提示完成安裝（需要輸入密碼）"
    echo "   7. 等待 Docker Desktop 啟動（右上角圖標變綠）"
    echo ""
    echo "🚀 安裝完成後，運行："
    echo "   cd /Users/jerrylin/tattoo-crm/backend"
    echo "   ./scripts/setup-local-postgres.sh"
    echo ""
    
    # 自動打開下載文件夾
    echo "📂 正在打開下載文件夾..."
    open "$HOME/Downloads"
else
    echo ""
    echo "❌ 下載失敗！"
    echo ""
    echo "請手動下載："
    echo "   $URL"
    echo ""
    echo "或訪問："
    echo "   https://www.docker.com/products/docker-desktop/"
    exit 1
fi

