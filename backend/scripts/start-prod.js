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

try {
  runWithCapture('npx prisma migrate deploy', '執行資料庫遷移');
  console.log('✅ 資料庫遷移完成（未刪除任何資料）');
} catch (error) {
  // Policy A: if migration cannot be safely applied, FAIL FAST. Never attempt db push or accept-data-loss in production.
  const msg = String(error?.message || '');
  const combined = String(error?.combinedOutput || '');
  const combinedLower = combined.toLowerCase();

  const isP3009 =
    combined.includes('P3009') ||
    combinedLower.includes('failed migrations') ||
    combinedLower.includes('migrate found failed migrations');

  const failedMigrationMatch = combined.match(
    /The `(\d{14}_[^`]+)` migration started at .* failed/i,
  );
  const failedMigrationName = failedMigrationMatch?.[1] || '';

  const autoResolveEnabled = ['1', 'true', 'yes', 'y', 'on'].includes(
    String(process.env.AUTO_RESOLVE_FAILED_MIGRATION || '').trim().toLowerCase(),
  );
  const autoResolveTarget = '20251231010000_remove_orders_and_generalize_billing';

  // One-time auto-remediation (requested): only when explicitly enabled AND we are sure it's the known failed migration.
  if (isP3009 && autoResolveEnabled && failedMigrationName === autoResolveTarget) {
    console.log('');
    console.log('🛠️ AUTO_RESOLVE_FAILED_MIGRATION=true：啟用一次性自動修復（只處理已知失敗 migration）。');
    console.log(`➡ 將失敗 migration 標記為 rolled-back: ${autoResolveTarget}`);
    try {
      run(
        `npx prisma migrate resolve --rolled-back ${autoResolveTarget}`,
        '自動標記失敗 migration 為 rolled-back（不會刪除資料）',
      );
      runWithCapture('npx prisma migrate deploy', '重新嘗試執行資料庫遷移');
      console.log('✅ 自動修復完成：已可繼續套用新的 migrations。');
      console.log('⚠ 請立刻在 Railway Variables 移除/關閉 AUTO_RESOLVE_FAILED_MIGRATION，避免未來誤用。');
      // Continue boot.
    } catch (e2) {
      const msg2 = String(e2?.message || '');
      exitWithMessage([
        '❌ 自動修復失敗，已中止啟動（保護客戶資料）。',
        `➡ 原始錯誤: ${msg}`,
        `➡ 自動修復錯誤: ${msg2}`,
        '',
        '➡ 建議：請仍以 Railway Shell/Console 執行 migrate resolve（若有權限），或請管理員協助。',
        `   npx prisma migrate resolve --rolled-back ${autoResolveTarget}`,
        '   npx prisma migrate deploy',
      ]);
    }
    // If we got here, migrate deploy succeeded after auto-resolve.
    // Allow startup to proceed.
  } else if (isP3009 && autoResolveEnabled) {
    console.log('');
    console.log('⚠ AUTO_RESOLVE_FAILED_MIGRATION=true 已啟用，但偵測到的失敗 migration 不是預期的那一個。');
    console.log('➡ 為了保護資料，本次不會自動執行 migrate resolve。');
  }

  // If migrate deploy still failed (or auto-resolve was not applicable), exit with help.
  const extraHelp = isP3009
    ? [
        '',
        '🧩 Prisma 偵測到「目標資料庫有失敗的 migrations」，所以後續 migrations 會被拒絕套用（P3009）。',
        '➡ 需要先在 Railway 的後端 Shell/Console 執行 migrate resolve 才能繼續 deploy。',
        '',
        '✅ 你已選擇「永久跳過」該破壞性 migration 的情況下，請執行：',
        `   npx prisma migrate resolve --rolled-back ${autoResolveTarget}`,
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
