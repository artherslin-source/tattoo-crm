#!/usr/bin/env node
/**
 * 執行首頁服務種子：建立 20 個刺青分類服務（seed-hp-1 ~ seed-hp-20）
 * 使用方式：cd backend && node scripts/run-seed-homepage.js
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ 請在 backend/.env 設定 DATABASE_URL');
  process.exit(1);
}
const psqlUrl = url.replace(/\?.*$/, '');
const sqlPath = path.join(__dirname, '../prisma/seed-data-homepage.sql');

console.log('📂 執行首頁服務種子:', sqlPath);
try {
  execSync(`psql "${psqlUrl}" -f "${sqlPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('\n✅ 首頁 20 個服務已建立。');
} catch (e) {
  console.error('\n❌ 執行失敗。');
  process.exit(1);
}
