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

function runWithCapture(command, description) {
  if (description) {
    console.log(`\n▶ ${description}`);
  }
  console.log(`$ ${command}`);
  try {
    const stdout = execSync(command, {
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    if (stdout && stdout.length) {
      process.stdout.write(stdout);
    }
    return { combinedOutput: stdout ? stdout.toString('utf-8') : '' };
  } catch (e) {
    const out = e && e.stdout ? e.stdout.toString('utf-8') : '';
    const err = e && e.stderr ? e.stderr.toString('utf-8') : '';
    if (out) process.stdout.write(out);
    if (err) process.stderr.write(err);
    const combinedOutput = `${out}\n${err}`.trim();
    throw Object.assign(e || new Error('Command failed'), { combinedOutput });
  }
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

const autoResolveEnabledAtBoot = ['1', 'true', 'yes', 'y', 'on'].includes(
  String(process.env.AUTO_RESOLVE_FAILED_MIGRATION || '').trim().toLowerCase(),
);
console.log(
  `ℹ️ AUTO_RESOLVE_FAILED_MIGRATION: ${autoResolveEnabledAtBoot ? 'enabled' : 'disabled'}`,
);

const AUTO_RESOLVE_ALLOWLIST = {
  // Legacy destructive migration: permanently skip in production (user chose option A).
  '20251231010000_remove_orders_and_generalize_billing': { mode: 'rolled-back' },
  // Non-destructive column-add migration: production DB already has the column; mark as applied.
  '20260104000000_add_user_booking_latest_start_time': { mode: 'applied' },
};

if (autoResolveEnabledAtBoot) {
  console.log('ℹ️ Auto-resolve allowlist:');
  for (const [name, cfg] of Object.entries(AUTO_RESOLVE_ALLOWLIST)) {
    console.log(`   - ${name} => ${cfg.mode}`);
  }
}

function extractFailedMigrationName(output) {
  const m = String(output || '').match(/The `(\d{14}_[^`]+)` migration started at .* failed/i);
  return m?.[1] || '';
}

function isP3009FromOutput(output) {
  const s = String(output || '');
  const l = s.toLowerCase();
  return s.includes('P3009') || l.includes('failed migrations') || l.includes('migrate found failed migrations');
}

const maxAttempts = autoResolveEnabledAtBoot ? 4 : 1;
let migrated = false;
let lastErrorMsg = '';
let lastCombined = '';

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    runWithCapture('npx prisma migrate deploy', attempt === 1 ? '執行資料庫遷移' : `重新嘗試執行資料庫遷移（第 ${attempt} 次）`);
    console.log('✅ 資料庫遷移完成（未刪除任何資料）');
    migrated = true;
    break;
  } catch (error) {
    lastErrorMsg = String(error?.message || '');
    lastCombined = String(error?.combinedOutput || '');

    if (!autoResolveEnabledAtBoot) {
      break;
    }

    if (!isP3009FromOutput(lastCombined)) {
      break;
    }

    const failedMigrationName = extractFailedMigrationName(lastCombined);
    const cfg = AUTO_RESOLVE_ALLOWLIST[failedMigrationName];
    if (!cfg) {
      console.log('');
      console.log('⚠ AUTO_RESOLVE_FAILED_MIGRATION=true 已啟用，但偵測到的失敗 migration 不在 allowlist。');
      console.log(`➡ failed migration: ${failedMigrationName || '(unknown)'}`);
      console.log('➡ 為了保護資料，本次不會自動執行 migrate resolve。');
      break;
    }

    console.log('');
    console.log('🛠️ AUTO_RESOLVE_FAILED_MIGRATION=true：啟用一次性自動修復（僅 allowlist）。');
    console.log(`➡ 將失敗 migration 標記為 ${cfg.mode}: ${failedMigrationName}`);
    try {
      run(
        `npx prisma migrate resolve --${cfg.mode} ${failedMigrationName}`,
        `自動標記失敗 migration 為 ${cfg.mode}（不會刪除資料）`,
      );
      // continue loop to retry migrate deploy
    } catch (e2) {
      const msg2 = String(e2?.message || '');
      exitWithMessage([
        '❌ 自動修復失敗，已中止啟動（保護客戶資料）。',
        `➡ 原始錯誤: ${lastErrorMsg}`,
        `➡ 自動修復錯誤: ${msg2}`,
        '',
        '➡ 請確認 Railway Variables 已正確設定，並檢查資料庫狀態。',
      ]);
    }
  }
}

if (!migrated) {
  const isP3009 = isP3009FromOutput(lastCombined);
  const extraHelp = isP3009
    ? [
        '',
        '🧩 Prisma 偵測到「目標資料庫有失敗的 migrations」，所以後續 migrations 會被拒絕套用（P3009）。',
        '➡ 目前 Railway 沒有 Shell/Console 的情況下：',
        '   - 請確認已設定 AUTO_RESOLVE_FAILED_MIGRATION=true',
        '   - 且失敗 migration 必須在 allowlist 才會自動處理',
      ]
    : [];

  exitWithMessage([
    '❌ 資料庫遷移失敗，已中止啟動（保護客戶資料）。',
    `➡ 錯誤訊息: ${lastErrorMsg}`,
    '',
    '➡ 請修正 migration 後重新部署（不要使用 prisma db push --accept-data-loss）。',
    ...extraHelp,
  ]);
}

// 🛡️ Production policy: no automatic data writes on startup (no seed, no backfill, no bootstrap).
console.log('🛡️ Production policy: 不在啟動時自動寫入/補資料（seed/初始化/回填一律禁止）。');

run('node dist/main.js', '啟動 NestJS 伺服器');
