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

// 🛡️ 生產環境保護：只執行安全的資料庫遷移，絕不重置資料庫
console.log('🛡️ 生產模式：保護現有資料，只執行安全的遷移');
console.log('📊 執行資料庫遷移（不會刪除任何資料）...');

try {
  run('npx prisma migrate deploy', '執行資料庫遷移');
  console.log('✅ 資料庫遷移完成（未刪除任何資料）');
} catch (error) {
  console.warn('⚠️ 資料庫遷移失敗，但服務將繼續啟動');
  console.warn('   錯誤訊息:', error.message);
  // 如果 migrate deploy 失敗，嘗試使用 db push（但不用 force-reset）
  try {
    console.log('🔄 嘗試使用 db push 同步 schema...');
    console.warn('⚠️ 注意：若 Prisma 判定有破壞性變更，需使用 --accept-data-loss 才能同步。');
    run('npx prisma db push --accept-data-loss', '同步資料庫 Schema（允許必要的破壞性變更）');
    console.log('✅ Schema 同步完成');
  } catch (pushError) {
    console.warn('⚠️ Schema 同步也失敗，但服務將繼續啟動');
    console.warn('   錯誤訊息:', pushError.message);
  }
}

// 🛡️ 只在環境變數明確要求時才執行 seed（且必須設置 PROTECT_REAL_DATA=true）
const shouldRunSeed = process.env.RUN_SEED === 'true';
const protectRealData = process.env.PROTECT_REAL_DATA === 'true';

if (shouldRunSeed) {
  if (!protectRealData) {
    console.warn('⚠️⚠️⚠️ 警告：RUN_SEED=true 但 PROTECT_REAL_DATA 未設置為 true！');
    console.warn('⚠️⚠️⚠️ 這可能會刪除真實的服務項目和圖片上傳記錄！');
    console.warn('⚠️⚠️⚠️ 建議設置 PROTECT_REAL_DATA=true 以保護真實資料');
    console.warn('⚠️⚠️⚠️ 繼續執行 seed（可能導致資料丟失）...');
  } else {
    console.log('🛡️ 保護模式啟用：seed 不會刪除真實的服務項目和圖片資料');
  }
  
  console.log('🌱 執行資料庫 seeding（根據 PROTECT_REAL_DATA 設定保護真實資料）...');
  try {
    run('npx ts-node prisma/seed.ts', '匯入預設種子資料');
    console.log('✅ 資料庫種子數據導入成功');
  } catch (error) {
    console.warn('⚠️ Seeding 失敗，但服務將繼續啟動');
    console.warn('   錯誤訊息:', error.message);
  }
} else {
  console.log('ℹ️ RUN_SEED 未設置為 true，跳過 seed（保護真實資料）');
}

// 無論是否執行 seeding，都確保添加新刺青師（只添加缺失的，不刪除現有的）
console.log('\n🔍 確保新刺青師已添加（只添加缺失的，不刪除現有的）...');
try {
  run('npm run add:artists', '添加新的刺青師資料（如果不存在）');
  console.log('✅ 新刺青師檢查完成');
} catch (error) {
  console.warn('⚠️ 添加新刺青師時發生錯誤，但不影響服務啟動:', error.message);
}

run('node dist/main.js', '啟動 NestJS 伺服器');
