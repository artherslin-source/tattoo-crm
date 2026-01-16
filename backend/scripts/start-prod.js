#!/usr/bin/env node

const { execSync } = require('child_process');

require('dotenv').config();

function run(command, description) {
  if (description) {
    console.log(`\n▶ ${description}`);
  }
  console.log(`$ ${command}`);
  execSync(command, { stdio: 'inherit', env: process.env });
}

function exitWithMessage(messageLines) {
  for (const line of messageLines) {
    console.error(line);
  }
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  exitWithMessage([
    '❌ 無法啟動生產模式：未設定 DATABASE_URL 環境變數。',
    '➡ 請在 Railway 或系統環境中設定 PostgreSQL 的連線字串。',
    '   格式範例: postgresql://user:password@host:port/database',
  ]);
}

// 🛡️ Production safety guard: fail fast if any dangerous seed/reset flags are enabled.
try {
  require('./assert-prod-safe');
} catch (e) {
  // If guard file is missing for any reason, fail closed in production.
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  if (nodeEnv === 'production') {
    exitWithMessage([
      '❌ Production safety guard missing: backend/scripts/assert-prod-safe.js',
      '➡ 為了保護客戶資料，已中止啟動。',
    ]);
  }
}

const normalizedUrl = databaseUrl.trim().toLowerCase();
const postgresPrefixes = ['postgresql://', 'postgres://'];
const isPostgres = postgresPrefixes.some((prefix) => normalizedUrl.startsWith(prefix));

if (!isPostgres) {
  exitWithMessage([
    '❌ 無法啟動生產模式：DATABASE_URL 必須為 PostgreSQL 連線字串。',
    `➡ 目前的值為: ${databaseUrl.substring(0, 50)}...`,
    '➡ 請在 Railway 設定中執行以下步驟：',
    '   1. 點選您的後端服務',
    '   2. 前往 "Variables" 標籤',
    '   3. 新增 PostgreSQL 資料庫服務（如果還沒有的話）',
    '   4. 將 DATABASE_URL 設定為 PostgreSQL 服務提供的連線字串',
    '   5. 確認格式為: postgresql://user:password@host:port/database',
    '',
    'ℹ️ 若要在本地端使用 SQLite，請改用 `npm run start:dev`。',
  ]);
}

console.log('✅ DATABASE_URL 驗證通過');
console.log(`📊 使用 PostgreSQL 資料庫`);

run('npx prisma generate', '生成 Prisma Client');
run('npx tsc -p tsconfig.build.json', '編譯 TypeScript 專案');

// 🛡️ 生產環境保護：只執行安全的資料庫遷移，絕不重置資料庫
console.log('🛡️ 生產模式：保護現有資料，只執行安全的遷移');
console.log('📊 執行資料庫遷移（不會刪除任何資料）...');

try {
  run('npx prisma migrate deploy', '執行資料庫遷移');
  console.log('✅ 資料庫遷移完成（未刪除任何資料）');
} catch (error) {
  // Policy A: if migration cannot be safely applied, FAIL FAST. Never attempt db push or accept-data-loss in production.
  const msg = String(error?.message || '');
  const isP3009 =
    msg.includes('P3009') ||
    msg.toLowerCase().includes('failed migrations') ||
    msg.toLowerCase().includes('migrate found failed migrations');

  const extraHelp = isP3009
    ? [
        '',
        '🧩 Prisma 偵測到「目標資料庫有失敗的 migrations」，所以後續 migrations 會被拒絕套用（P3009）。',
        '➡ 需要先在 Railway 的後端 Shell/Console 執行 migrate resolve 才能繼續 deploy。',
        '',
        '✅ 你已選擇「永久跳過」該破壞性 migration 的情況下，請執行：',
        '   npx prisma migrate resolve --rolled-back 20251231010000_remove_orders_and_generalize_billing',
        '   npx prisma migrate deploy',
        '',
        '（這不會刪資料；只是把失敗 migration 標記為已處理，讓新 migration 可以繼續套用。）',
      ]
    : [];

  exitWithMessage([
    '❌ 資料庫遷移失敗，已中止啟動（保護客戶資料）。',
    `➡ 錯誤訊息: ${msg}`,
    '',
    '➡ 請修正 migration 後重新部署（不要使用 prisma db push --accept-data-loss）。',
    ...extraHelp,
  ]);
}

// 🛡️ Production policy: no automatic data writes on startup (no seed, no backfill, no bootstrap).
console.log('🛡️ Production policy: 不在啟動時自動寫入/補資料（seed/初始化/回填一律禁止）。');

run('node dist/main.js', '啟動 NestJS 伺服器');
