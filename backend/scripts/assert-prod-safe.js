#!/usr/bin/env node

/**
 * Production safety guard for Railway auto-deploy.
 *
 * Goal: prevent any accidental data-changing bootstrap/seed/reset flags from being used in production.
 * Policy: if a risky flag is enabled, FAIL FAST and stop the deploy/startup.
 */

function isTruthy(v) {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function fail(lines) {
  for (const l of lines) console.error(l);
  process.exit(1);
}

const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
if (nodeEnv !== 'production') {
  // Only enforce in production. (Dev/staging can still opt-in to seed/reset flows.)
  process.exit(0);
}

// Hard blocks: must never be enabled in production.
const blockedFlags = [
  { key: 'RUN_SEED', reason: '禁止在 production 啟動時自動 seeding（會動到客戶資料）' },
  { key: 'RESET_DATABASE', reason: '禁止在 production 重置資料庫' },
  { key: 'ACCEPT_DATA_LOSS', reason: '禁止允許 data loss 的 schema 同步' },
  { key: 'PRISMA_MIGRATE_SKIP_GENERATE', reason: '不允許跳過 Prisma client generate（避免不一致）' },
];

const enabled = blockedFlags.filter((f) => isTruthy(process.env[f.key]));
if (enabled.length > 0) {
  fail([
    '❌ Production safety guard: 偵測到危險環境變數，已中止啟動/部署。',
    ...enabled.map((f) => `- ${f.key}=true: ${f.reason}`),
    '',
    '➡ 請移除上述環境變數後重新部署。',
  ]);
}

