#!/usr/bin/env node
/**
 * 用 Prisma 執行首頁服務 + 規格種子（不需 psql，Zeabur 可用）
 * 使用方式（Zeabur 或本機）：
 *   node scripts/run-seed-homepage-and-variants.js
 * 若在 repo 根目錄執行：cd backend && node scripts/run-seed-homepage-and-variants.js
 */
const path = require('path');
const fs = require('fs');

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

    console.log('2️⃣ 執行規格種子 (seed-data-service-variants.sql) ...');
    const sqlVariants = loadSql('seed-data-service-variants.sql');
    const cleaned = stripComments(sqlVariants).trim();
    const insertEnd = cleaned.indexOf(') sub');
    if (insertEnd !== -1) {
      const insertEndSemicolon = cleaned.indexOf(';', insertEnd);
      const st1 = cleaned.slice(0, insertEndSemicolon + 1);
      let st2 = cleaned.slice(insertEndSemicolon + 1).replace(/^\s*--[^\n]*\n?/gm, '').trim();
      await prisma.$executeRawUnsafe(st1);
      if (st2.toLowerCase().startsWith('update')) await prisma.$executeRawUnsafe(st2);
    } else {
      await prisma.$executeRawUnsafe(cleaned);
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
