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
  ]);
}

const normalizedUrl = databaseUrl.trim().toLowerCase();
const postgresPrefixes = ['postgresql://', 'postgres://'];
const isPostgres = postgresPrefixes.some((prefix) => normalizedUrl.startsWith(prefix));

if (!isPostgres) {
  exitWithMessage([
    '❌ 無法啟動生產模式：DATABASE_URL 必須為 PostgreSQL 連線字串。',
    `➡ 目前的值為: ${databaseUrl}`,
    '➡ 請在 Railway 設定中使用 "PostgreSQL" 服務提供的連線字串，並確認 DATABASE_URL 以 `postgresql://` 或 `postgres://` 開頭。',
    'ℹ️ 若要在本地端使用 SQLite，請改用 `npm run start:dev`。',
  ]);
}

run('npx prisma generate', '生成 Prisma Client');
run('npx tsc -p tsconfig.build.json', '編譯 TypeScript 專案');
run('npx prisma db push --accept-data-loss', '同步資料庫結構');
run('npx ts-node prisma/seed.ts', '匯入預設種子資料');
run('node dist/main.js', '啟動 NestJS 伺服器');
