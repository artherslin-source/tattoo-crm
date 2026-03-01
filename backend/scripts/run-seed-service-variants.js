#!/usr/bin/env node
/**
 * 執行規格種子：為首頁 20 個服務建立尺寸／顏色／部位／設計費規格
 * 使用方式：cd backend && node scripts/run-seed-service-variants.js
 * 會讀取 .env 的 DATABASE_URL（會自動去掉 ?schema= 等 psql 不支援的參數）
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ 請在 backend/.env 設定 DATABASE_URL');
  process.exit(1);
}
// psql 不支援 ?schema= 等查詢參數，只保留連線用部分
const psqlUrl = url.replace(/\?.*$/, '');
const sqlPath = path.join(__dirname, '../prisma/seed-data-service-variants.sql');

console.log('📂 執行規格種子:', sqlPath);
console.log('🔗 使用 DATABASE_URL（已省略查詢參數）...\n');
try {
  execSync(`psql "${psqlUrl}" -f "${sqlPath}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('\n✅ 規格種子執行完成！20 個首頁服務現在都有尺寸／顏色／部位／設計費可選。');
} catch (e) {
  console.error('\n❌ 執行失敗。請確認：1) 已安裝 PostgreSQL 並有 psql  2) DATABASE_URL 正確  3) 已先執行 seed-data-homepage.sql');
  process.exit(1);
}
