#!/bin/bash

# 測試數據保護模式
# 此腳本會測試兩種模式並顯示結果

set -e

echo "🧪 測試數據保護模式"
echo "===================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 進入 backend 目錄
cd backend

echo -e "${BLUE}📊 測試前準備...${NC}"
echo "1. 確保 PostgreSQL 容器運行中..."
docker-compose ps | grep postgres || {
  echo -e "${YELLOW}⚠️ PostgreSQL 未運行，正在啟動...${NC}"
  docker-compose up -d
  sleep 5
}
echo -e "${GREEN}✅ PostgreSQL 已就緒${NC}"
echo ""

# ========================================
# 測試 1：完整重建模式（PROTECT_REAL_DATA=false）
# ========================================

echo -e "${BLUE}🧪 測試 1：完整重建模式（PROTECT_REAL_DATA=false）${NC}"
echo "預期行為：重建所有數據（包括分店和刺青師）"
echo "--------------------------------------"

# 執行種子腳本
echo "執行: PROTECT_REAL_DATA=false npm run seed"
PROTECT_REAL_DATA=false npm run seed 2>&1 | tee /tmp/seed-full.log

# 檢查日誌
echo ""
echo "檢查日誌："
if grep -q "完整重建模式" /tmp/seed-full.log; then
  echo -e "${GREEN}✅ 正確進入完整重建模式${NC}"
else
  echo -e "${RED}❌ 未能進入完整重建模式${NC}"
  exit 1
fi

if grep -q "建立 2 個分店" /tmp/seed-full.log; then
  echo -e "${GREEN}✅ 成功創建分店${NC}"
else
  echo -e "${RED}❌ 未能創建分店${NC}"
  exit 1
fi

if grep -q "建立 3 個刺青師" /tmp/seed-full.log; then
  echo -e "${GREEN}✅ 成功創建刺青師${NC}"
else
  echo -e "${RED}❌ 未能創建刺青師${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ 測試 1 通過：完整重建模式正常工作${NC}"
echo ""
sleep 2

# ========================================
# 測試 2：保護模式（PROTECT_REAL_DATA=true）
# ========================================

echo -e "${BLUE}🧪 測試 2：保護模式（PROTECT_REAL_DATA=true）${NC}"
echo "預期行為：保留現有分店和刺青師，只重建測試數據"
echo "--------------------------------------"

# 記錄當前分店和刺青師數量
echo "查詢當前數據..."
BRANCH_COUNT_BEFORE=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Branch\";" | grep -o '[0-9]\+' | tail -1)
ARTIST_COUNT_BEFORE=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Artist\";" | grep -o '[0-9]\+' | tail -1)

echo "重建前："
echo "  - 分店數量: $BRANCH_COUNT_BEFORE"
echo "  - 刺青師數量: $ARTIST_COUNT_BEFORE"
echo ""

# 執行種子腳本
echo "執行: PROTECT_REAL_DATA=true npm run seed"
PROTECT_REAL_DATA=true npm run seed 2>&1 | tee /tmp/seed-protect.log

# 檢查日誌
echo ""
echo "檢查日誌："
if grep -q "保護模式：將保留現有的分店和刺青師數據" /tmp/seed-protect.log; then
  echo -e "${GREEN}✅ 正確進入保護模式${NC}"
else
  echo -e "${RED}❌ 未能進入保護模式${NC}"
  exit 1
fi

if grep -q "保護模式：讀取現有" /tmp/seed-protect.log; then
  echo -e "${GREEN}✅ 成功讀取現有數據${NC}"
else
  echo -e "${RED}❌ 未能讀取現有數據${NC}"
  exit 1
fi

# 驗證數據數量未變
BRANCH_COUNT_AFTER=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Branch\";" | grep -o '[0-9]\+' | tail -1)
ARTIST_COUNT_AFTER=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM \"Artist\";" | grep -o '[0-9]\+' | tail -1)

echo ""
echo "重建後："
echo "  - 分店數量: $BRANCH_COUNT_AFTER"
echo "  - 刺青師數量: $ARTIST_COUNT_AFTER"
echo ""

if [ "$BRANCH_COUNT_BEFORE" -eq "$BRANCH_COUNT_AFTER" ]; then
  echo -e "${GREEN}✅ 分店數量保持不變（$BRANCH_COUNT_BEFORE -> $BRANCH_COUNT_AFTER）${NC}"
else
  echo -e "${RED}❌ 分店數量改變（$BRANCH_COUNT_BEFORE -> $BRANCH_COUNT_AFTER）${NC}"
  exit 1
fi

if [ "$ARTIST_COUNT_BEFORE" -eq "$ARTIST_COUNT_AFTER" ]; then
  echo -e "${GREEN}✅ 刺青師數量保持不變（$ARTIST_COUNT_BEFORE -> $ARTIST_COUNT_AFTER）${NC}"
else
  echo -e "${RED}❌ 刺青師數量改變（$ARTIST_COUNT_BEFORE -> $ARTIST_COUNT_AFTER）${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ 測試 2 通過：保護模式正常工作${NC}"
echo ""

# ========================================
# 總結
# ========================================

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 所有測試通過！${NC}"
echo "=========================================="
echo ""
echo "測試結果摘要："
echo "  ✅ 完整重建模式：正常創建分店和刺青師"
echo "  ✅ 保護模式：成功保留現有分店和刺青師"
echo "  ✅ 數據保護機制：工作正常"
echo ""
echo -e "${BLUE}📝 詳細日誌：${NC}"
echo "  - 完整重建模式: /tmp/seed-full.log"
echo "  - 保護模式: /tmp/seed-protect.log"
echo ""
echo -e "${GREEN}✅ 數據保護功能已準備好用於生產環境！${NC}"
echo ""

