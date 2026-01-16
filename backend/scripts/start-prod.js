#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// -----------------------------
// One-shot auto migration recovery (no Railway shell)
// -----------------------------
// Rules:
// - Disabled by default; only enabled when AUTO_RESOLVE_FAILED_MIGRATION=true
// - Handles ONLY two cases:
//   1) Known destructive migration is permanently skipped (rolled-back).
//   2) "Already exists" drift (duplicate table/column/constraint) is auto-resolved by marking that migration as applied,
//      ONLY when the migration SQL is verified non-destructive (no DROP/TRUNCATE/DELETE/UPDATE/INSERT).
// - Never uses db push / accept-data-loss.

const DESTRUCTIVE_ALWAYS_SKIP = new Set([
  '20251231010000_remove_orders_and_generalize_billing', // user chose option A: never run in production
]);

// Common Postgres error codes for "already exists" / duplicates.
// - 42P07: duplicate_table
// - 42701: duplicate_column
// - 42710: duplicate_object (e.g., constraint)
const ALREADY_EXISTS_DB_CODES = new Set(['42P07', '42701', '42710']);

function isP3009OrP3018Output(output) {
  const s = String(output || '');
  const l = s.toLowerCase();
  return (
    s.includes('P3009') ||
    s.includes('P3018') ||
    l.includes('failed migrations') ||
    l.includes('migrate found failed migrations') ||
    l.includes('a migration failed to apply')
  );
}

function extractDbErrorCode(output) {
  const s = String(output || '');
  // Example: "Database error code: 42P07"
  const m1 = s.match(/Database error code:\s*([0-9A-Z]+)\b/i);
  if (m1?.[1]) return m1[1].toUpperCase();
  // Example: "code: SqlState(E42P07)" or "SqlState(E42701)"
  const m2 = s.match(/SqlState\(E([0-9A-Z]+)\)/i);
  if (m2?.[1]) return m2[1].toUpperCase();
  return '';
}

function extractFailedMigrationName(output) {
  const s = String(output || '');
  // P3018 path often has explicit name:
  const m1 = s.match(/Migration name:\s*(\d{14}_[^\s]+)/i);
  if (m1?.[1]) return m1[1];
  // Sometimes it appears in P3009:
  const m2 = s.match(/The `(\d{14}_[^`]+)` migration started at .* failed/i);
  if (m2?.[1]) return m2[1];
  // As a fallback, use the first "Applying migration" entry
  const m3 = s.match(/Applying migration `(\d{14}_[^`]+)`/i);
  if (m3?.[1]) return m3[1];
  return '';
}

function migrationSqlPath(migrationName) {
  // start-prod.js runs from backend/scripts in production
  //   CWD in Railway is typically backend/ (package.json start:prod)
  // so prisma migrations path is prisma/migrations/<name>/migration.sql
  return path.join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql');
}

function loadMigrationSql(migrationName) {
  const p = migrationSqlPath(migrationName);
  if (!fs.existsSync(p)) return { ok: false, path: p, sql: '' };
  return { ok: true, path: p, sql: fs.readFileSync(p, 'utf-8') };
}

function isMigrationSqlSafeForAutoApply(sql) {
  const s = String(sql || '').toLowerCase();
  // We only allow DDL that is safe to skip when objects already exist.
  // Disallow any statements that modify/remove customer data or destructively change schema.
  const forbidden = [
    /\bdrop\s+table\b/,
    /\bdrop\s+type\b/,
    /\bdrop\s+index\b/,
    /\bdrop\s+constraint\b/,
    /\bdrop\s+column\b/,
    /\btruncate\b/,
    /\bdelete\s+from\b/,
    /\binsert\s+into\b/,
    // Data updates
    /\bupdate\s+\"?[a-z_]+\"?\s+set\b/,
    // Destructive ALTER TABLE variants (allow DROP NOT NULL, but block DROP COLUMN/CONSTRAINT/TYPE)
    /\balter\s+table\b[\s\S]*?\bdrop\s+column\b/,
    /\balter\s+table\b[\s\S]*?\bdrop\s+constraint\b/,
    /\balter\s+table\b[\s\S]*?\bdrop\s+type\b/,
  ];
  return !forbidden.some((rx) => rx.test(s));
}

function shouldAutoApplyForAlreadyExists(output, migrationName) {
  const code = extractDbErrorCode(output);
  if (code && ALREADY_EXISTS_DB_CODES.has(code)) return true;
  // Fallback: textual hint
  const l = String(output || '').toLowerCase();
  if (l.includes('already exists')) return true;
  // No signal
  return false;
}

function resolveModeForFailure(output, migrationName) {
  if (!migrationName) return { ok: false, mode: '', reason: 'missing migration name' };
  if (DESTRUCTIVE_ALWAYS_SKIP.has(migrationName)) {
    return { ok: true, mode: 'rolled-back', reason: 'destructive migration is permanently skipped in production' };
  }

  const outStr = String(output || '');
  const isP3009 = outStr.includes('P3009') || outStr.toLowerCase().includes('failed migrations');

  // For schema-drift "already exists", we may mark as applied, but only if SQL is safe.
  if (shouldAutoApplyForAlreadyExists(output, migrationName)) {
    const loaded = loadMigrationSql(migrationName);
    if (!loaded.ok) {
      return { ok: false, mode: '', reason: `cannot read migration SQL at ${loaded.path}` };
    }
    if (!isMigrationSqlSafeForAutoApply(loaded.sql)) {
      return { ok: false, mode: '', reason: `migration SQL contains potentially destructive/data-writing statements (${loaded.path})` };
    }
    return { ok: true, mode: 'applied', reason: 'already-exists drift + verified safe migration SQL' };
  }

  // Special case: P3009 does not always include the underlying DB error code in output.
  // If the migration SQL is verified safe, we can "probe" by rolling it back (state only),
  // then retry migrate deploy to surface the real P3018 error (e.g. 42P07/42701).
  if (isP3009) {
    const loaded = loadMigrationSql(migrationName);
    if (!loaded.ok) {
      return { ok: false, mode: '', reason: `cannot read migration SQL at ${loaded.path}` };
    }
    if (!isMigrationSqlSafeForAutoApply(loaded.sql)) {
      return { ok: false, mode: '', reason: `migration SQL contains potentially destructive/data-writing statements (${loaded.path})` };
    }
    return { ok: true, mode: 'rolled-back', reason: 'P3009 probe: safe migration, rerun once to surface real DB error code' };
  }

  return { ok: false, mode: '', reason: 'not an already-exists drift or not safe to auto-apply' };
}

const maxAttempts = autoResolveEnabledAtBoot ? 25 : 1;
let migrated = false;
let lastErrorMsg = '';
let lastCombined = '';
const handled = new Set();

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

    if (!isP3009OrP3018Output(lastCombined)) {
      break;
    }

    const failedMigrationName = extractFailedMigrationName(lastCombined);
    const decision = resolveModeForFailure(lastCombined, failedMigrationName);
    if (!decision.ok) {
      console.log('');
      console.log('⚠ AUTO_RESOLVE_FAILED_MIGRATION=true 已啟用，但本次失敗無法安全自動處理。');
      console.log(`➡ failed migration: ${failedMigrationName || '(unknown)'}`);
      console.log(`➡ reason: ${decision.reason}`);
      break;
    }

    const key = `${failedMigrationName}:${decision.mode}`;
    if (handled.has(key)) {
      console.log('');
      console.log('⚠ 已對相同 migration 執行過自動處理，但仍然失敗；為避免無限循環，停止自動修復。');
      console.log(`➡ ${key}`);
      break;
    }
    handled.add(key);

    console.log('');
    console.log('🛠️ AUTO_RESOLVE_FAILED_MIGRATION=true：啟用一次性自動修復（安全判斷模式）。');
    console.log(`➡ 將失敗 migration 標記為 ${decision.mode}: ${failedMigrationName}`);
    console.log(`➡ reason: ${decision.reason}`);
    try {
      run(
        `npx prisma migrate resolve --${decision.mode} ${failedMigrationName}`,
        `自動標記失敗 migration 為 ${decision.mode}（不會刪除資料）`,
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
  const isMigrateFailure = isP3009OrP3018Output(lastCombined);
  const extraHelp = isMigrateFailure
    ? [
        '',
        '🧩 Prisma migration 失敗（P3009/P3018）：目標資料庫存在 failed migrations 或某個 migration DDL 無法套用。',
        '➡ 目前 Railway 沒有 Shell/Console 的情況下：',
        '   - 請確認已設定 AUTO_RESOLVE_FAILED_MIGRATION=true',
        '   - 自動修復只會處理「已存在類型」且 migration.sql 經安全掃描的情況',
        '   - 破壞性 migration 仍會被永久跳過（rolled-back）',
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
