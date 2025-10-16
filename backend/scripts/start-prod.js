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

// 如果需要完全重置資料庫（清空所有數據並重新導入）
if (process.env.RESET_DATABASE === 'true') {
  console.log('🔄 完全重置資料庫模式：將清空並重建所有數據');
  
  // 使用 db push 代替 migrate reset 以避免 migration 錯誤
  console.log('📊 使用 db push 清空並重建資料庫...');
  run('npx prisma db push --force-reset --accept-data-loss', '強制重置並同步資料庫 Schema');
  
  // 重置後執行 seeding
  console.log('🌱 執行資料庫 seeding...');
  try {
    run('npx ts-node prisma/seed.ts', '匯入預設種子資料');
    console.log('✅ 資料庫種子數據導入成功');
  } catch (error) {
    console.warn('⚠️ Seeding 失敗，但服務將繼續啟動');
    console.warn('   錯誤訊息:', error.message);
  }
} else {
  // 正常模式：只同步 schema，不清空數據
  run('npx prisma db push --accept-data-loss', '同步資料庫 Schema');
  
  // 只在環境變數明確設定為 true 時才執行 seeding
  if (process.env.RUN_SEED === 'true') {
    console.log('🌱 執行資料庫 seeding...');
    try {
      run('npx ts-node prisma/seed.ts', '匯入預設種子資料');
    } catch (error) {
      console.warn('⚠️ Seeding 失敗，但服務將繼續啟動');
      console.warn('   這通常是因為資料庫已經有數據了');
    }
  } else {
    console.log('⏭️ 跳過資料庫 seeding（RUN_SEED 未設定為 true）');
  }
}

run('node dist/main.js', '啟動 NestJS 伺服器');
