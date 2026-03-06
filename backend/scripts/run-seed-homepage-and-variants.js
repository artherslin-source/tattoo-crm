#!/usr/bin/env node
/**
 * 用 Prisma 執行首頁服務 + 規格種子（不需 psql，Zeabur 可用）
 * 使用方式（Zeabur 或本機）：
 *   node scripts/run-seed-homepage-and-variants.js
 * 若在 repo 根目錄執行：cd backend && node scripts/run-seed-homepage-and-variants.js
 * ⚠️ 請勿在 Railway 上執行：會覆寫既有規格且可能造成格式不相容。
 *
 * 保護客戶資料：僅異動 Service（seed-hp-*）與 ServiceVariant、以及刪除 seed-svc-*，
 * 不碰 User、Artist、PortfolioItem，也不讀寫 uploads/（刺青師照片與作品集）。
 * 重新部署時若要不遺失客戶上傳檔案，請在 Zeabur 後端為 uploads 目錄掛載 Volume。
 */
const path = require('path');
const fs = require('fs');

// 偵測 Railway：不在此環境執行種子，避免覆寫既有規格或造成崩潰
if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME) {
  console.log('偵測到 Railway 環境，略過種子（此腳本僅供 Zeabur 使用，請勿在 Railway 執行）');
  process.exit(0);
}

// 支援從 repo 根目錄或 backend 目錄執行
const backendDir = fs.existsSync(path.join(__dirname, '../prisma')) ? path.join(__dirname, '..') : path.join(process.cwd(), 'backend');
const prismaDir = path.join(backendDir, 'prisma');

try {
  require('dotenv').config({ path: path.join(backendDir, '.env') });
} catch (_) {}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function loadSql(name) {
  const filePath = path.join(prismaDir, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到檔案: ${filePath}（目前 backend 目錄: ${backendDir}）`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function stripComments(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function runStatements(sql) {
  const trimmed = stripComments(sql).trim();
  const statements = trimmed
    .split(/;\s*\n\s*\n(?=--|\s*UPDATE\s)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.length === 0) {
    statements.push(trimmed.replace(/;\s*$/, ''));
  }
  for (const st of statements) {
    const s = st.endsWith(';') ? st : st + ';';
    if (s.replace(/\s/g, '').length < 5) continue;
    prisma.$executeRawUnsafe(s);
  }
}

async function main() {
  console.log('📂 backend 目錄:', backendDir);
  console.log('');

  try {
    console.log('1️⃣ 執行首頁服務種子 (seed-data-homepage.sql) ...');
    const sqlHomepage = loadSql('seed-data-homepage.sql');
    await prisma.$executeRawUnsafe(stripComments(sqlHomepage).trim());
    console.log('   ✅ 完成\n');

    console.log('2️⃣ 執行規格種子（做法 A：對齊 Railway）...');
    const { spawnSync } = require('child_process');
    const scriptPath = path.join(backendDir, 'scripts', 'seed-zeabur-variants-railway-style.js');
    const result = spawnSync(process.execPath, [scriptPath], { cwd: backendDir, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`規格種子腳本結束代碼: ${result.status}`);
    }
    console.log('   ✅ 完成\n');
  } catch (e) {
    console.error('❌ 執行失敗:', e.message);
    throw e;
  } finally {
    await prisma.$disconnect();
  }

  console.log('🎉 首頁 20 個服務與規格種子已執行完成！');
}

main().catch(() => process.exit(1));
