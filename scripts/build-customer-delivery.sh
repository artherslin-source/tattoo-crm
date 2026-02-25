#!/usr/bin/env bash
# 建置客戶交付包：僅包含執行與部署所需檔案，排除開發用文檔與腳本。
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
OUT_DIR="${ROOT}/.delivery-build/tattoo-crm"
STAMP=$(date +%Y%m%d)
ARCHIVE="${ROOT}/tattoo-crm-customer-delivery-${STAMP}.tar.gz"

echo "→ 清理並建立輸出目錄"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

echo "→ 複製專案（排除 .git、node_modules、建置產物、敏感檔）"
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='out' \
  --exclude='dist' \
  --exclude='.delivery-build' \
  --exclude='*.tar.gz' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  --exclude='*.log' \
  --exclude='dev.db' \
  --exclude='.env.sqlite.backup' \
  --exclude='*.tsbuildinfo' \
  --exclude='.eslintcache' \
  --exclude='.cache' \
  --exclude='.parcel-cache' \
  --exclude='logs' \
  --exclude='tmp-railway.dump' \
  --exclude='*.backup' \
  "${ROOT}/" "${OUT_DIR}/"

echo "→ 移除根目錄開發用檔案"
rm -f "${OUT_DIR}"/*.sh "${OUT_DIR}"/*.js "${OUT_DIR}"/*.sql 2>/dev/null || true
rm -rf "${OUT_DIR}/JPG" "${OUT_DIR}/scripts" "${OUT_DIR}/.vscode" "${OUT_DIR}/.github" 2>/dev/null || true
for f in "${OUT_DIR}"/*.md; do
  [ -f "$f" ] && [ "$(basename "$f")" != "README.md" ] && rm -f "$f"
done

echo "→ 移除後端開發用檔案"
for f in "${OUT_DIR}/backend"/fix-*.js "${OUT_DIR}/backend"/add-*.js "${OUT_DIR}/backend"/check-*.js \
         "${OUT_DIR}/backend"/direct-*.js "${OUT_DIR}/backend"/quick-*.js "${OUT_DIR}/backend"/test-*.js \
         "${OUT_DIR}/backend"/test-*.html "${OUT_DIR}/backend"/upload-*.js "${OUT_DIR}/backend"/verify-*.js \
         "${OUT_DIR}/backend"/remove-*.js "${OUT_DIR}/backend"/init-*.js "${OUT_DIR}/backend"/update-*.js; do
  [ -f "$f" ] && rm -f "$f"
done
# 後端 scripts：只保留生產啟動所需（start:prod 會呼叫），其餘刪除
find "${OUT_DIR}/backend/scripts" -type f ! -name 'start-prod.js' ! -name 'assert-prod-safe.js' -delete 2>/dev/null || true
rm -rf "${OUT_DIR}/backend/test" 2>/dev/null || true
rm -f "${OUT_DIR}/backend/dev.db" "${OUT_DIR}/backend/.env.sqlite.backup" 2>/dev/null || true
for f in "${OUT_DIR}/backend"/*.md; do
  [ -f "$f" ] && [ "$(basename "$f")" != "README.md" ] && rm -f "$f"
done
rm -f "${OUT_DIR}/backend/button-navigation-report.md" "${OUT_DIR}/backend/verification-report.md" 2>/dev/null || true

echo "→ 移除前端開發用文檔"
for f in "${OUT_DIR}/frontend"/*.md "${OUT_DIR}/frontend"/REFACTOR_SUMMARY.txt \
         "${OUT_DIR}/frontend"/PERFORMANCE_OPTIMIZATION.md "${OUT_DIR}/frontend"/THEME_*.md; do
  [ -f "$f" ] && rm -f "$f"
done
rm -f "${OUT_DIR}/frontend/public/images/banner/README.md" "${OUT_DIR}/frontend/public/images/services/README.md" 2>/dev/null || true

echo "→ 寫入客戶交付說明"
cat > "${OUT_DIR}/交付說明.md" << 'DELIVERY_MD'
# 刺青工作室 CRM 系統 — 交付說明

本套件為系統完整原始碼與設定檔，可供部署或二次開發使用。

## 目錄結構

- **backend/** — 後端 (NestJS + Prisma)，API 與資料庫
- **frontend/** — 前端 (Next.js)，管理後台與對外頁面
- **安裝與設定/** — 網址替換腳本與**系統安裝上線說明**（請優先閱讀）
- **README.md** — 技術說明與快速開始

## 環境需求

- Node.js 18+
- 資料庫：SQLite（開發）或 PostgreSQL（建議生產環境）

## 安裝與上線

**請先閱讀** `安裝與設定/系統安裝上線說明.md`，依步驟執行「網址替換」與環境設定後再啟動。  
上線前務必執行 `node 安裝與設定/替換網址.js` 將系統網址改為您自己的後端與前端網址。

## 快速啟動（已設定環境與網址後）

### 後端
```bash
cd backend
npm install
cp .env.example .env   # 編輯 .env 填入 DATABASE_URL、JWT_SECRET 等
npx prisma generate
npx prisma migrate deploy
npm run start
```

### 前端
```bash
cd frontend
npm install
cp .env.local.example .env.local   # 編輯 .env.local 填入 NEXT_PUBLIC_API_URL
npm run build
npm run start
```

## 部署

可部署至 Railway、Vercel、自架主機等。後端需設定 `DATABASE_URL`、`JWT_SECRET`、`PORT`；前端需設定 `NEXT_PUBLIC_API_URL` 指向後端網址。

## 聯絡與支援

若有部署或使用問題，請與開發團隊聯絡。
DELIVERY_MD

echo "→ 壓縮為 ${ARCHIVE}"
tar -czf "${ARCHIVE}" -C "${ROOT}/.delivery-build" tattoo-crm

echo "→ 完成。客戶交付包：${ARCHIVE}"
ls -la "${ARCHIVE}"
