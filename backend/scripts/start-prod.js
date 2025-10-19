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

// 強制重置並執行種子數據 - 修正統計報表數據問題
console.log('🔄 強制重置並執行種子數據模式：修正統計報表數據問題');
console.log('📊 使用 db push 強制重置資料庫...');
run('npx prisma db push --force-reset --accept-data-loss', '強制重置並同步資料庫 Schema');

// 額外確保數據庫完全清空
console.log('🗑️ 額外確保數據庫完全清空...');
run('npx prisma db push --force-reset --accept-data-loss', '二次確認數據庫重置');

// 強制執行 seeding 來修正數據問題
console.log('🌱 強制執行資料庫 seeding...');
try {
  run('npx ts-node prisma/seed.ts', '匯入預設種子資料');
  console.log('✅ 資料庫種子數據導入成功');
  
  // 驗證種子數據是否正確導入
  console.log('🔍 驗證種子數據導入結果...');
  run('npx ts-node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.order.count().then(count => { console.log(\`📊 訂單總數: \${count}\`); prisma.order.aggregate({ _sum: { finalAmount: true }, where: { status: { in: [\'PAID\', \'PAID_COMPLETE\'] } } }).then(result => { console.log(\`💰 總營收: NT$ \${result._sum.finalAmount || 0}\`); prisma.installment.aggregate({ _sum: { amount: true }, where: { status: \'PAID\' } }).then(installResult => { console.log(\`💳 分期營收: NT$ \${installResult._sum.amount || 0}\`); console.log(\`🎯 總計營收: NT$ \${(result._sum.finalAmount || 0) + (installResult._sum.amount || 0)}\`); prisma.\$disconnect(); }); }); });"', '驗證種子數據');
} catch (error) {
  console.warn('⚠️ Seeding 失敗，但服務將繼續啟動');
  console.warn('   錯誤訊息:', error.message);
}

run('node dist/main.js', '啟動 NestJS 伺服器');
