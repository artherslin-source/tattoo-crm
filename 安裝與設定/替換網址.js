#!/usr/bin/env node
/**
 * 新舊網址一鍵替換腳本
 * 請在「專案根目錄」（與 backend、frontend 同層）執行：node 安裝與設定/替換網址.js
 *
 * 會將系統中所有開發/示範用網址替換為客戶輸入的後端與前端網址，
 * 避免上線後請求誤導向開發站。
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');

const OLD_BACKEND_FULL = 'https://tattoo-crm-production-413f.up.railway.app';
const OLD_BACKEND_HOST = 'tattoo-crm-production-413f.up.railway.app';
const OLD_FRONTEND_FULL = 'https://tattoo-crm-production.up.railway.app';
const OLD_FRONTEND_HOST = 'tattoo-crm-production.up.railway.app';
const OLD_BACKEND_SHORT = 'tattoo-crm-production-413f';
const OLD_FRONTEND_SHORT = 'tattoo-crm-production';
const OLD_RAILWAY_BACKEND_REPLACE = 'tattoo-crm-backend';

function parseUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const u = new URL(url);
    return { full: u.origin, host: u.hostname };
  } catch {
    return null;
  }
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function replaceInFile(filePath, replacements) {
  const absPath = path.join(ROOT, filePath);
  if (!fs.existsSync(absPath)) {
    console.warn('  跳過（檔案不存在）:', filePath);
    return 0;
  }
  let content = fs.readFileSync(absPath, 'utf8');
  let count = 0;
  for (const [from, to] of replacements) {
    const re = new RegExp(escapeRe(from), 'g');
    const before = content;
    content = content.replace(re, to);
    const n = (before.match(re) || []).length;
    if (n > 0) count += n;
  }
  if (count > 0) fs.writeFileSync(absPath, content, 'utf8');
  return count;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  console.log('\n=== 刺青工作室 CRM：新舊網址一鍵替換 ===\n');
  console.log('請輸入客戶端實際使用的網址（不含結尾斜線）。\n');

  const backendInput = await prompt('後端 API 網址（例如 https://api.yourdomain.com）: ');
  const frontendInput = await prompt('前端網站網址（例如 https://www.yourdomain.com）: ');

  const backend = parseUrl(backendInput);
  const frontend = parseUrl(frontendInput);

  if (!backend || !frontend) {
    console.error('\n錯誤：請輸入有效的後端與前端網址。');
    process.exit(1);
  }

  console.log('\n將替換為：');
  console.log('  後端:', backend.full, '（host:', backend.host, '）');
  console.log('  前端:', frontend.full, '（host:', frontend.host, '）');
  const confirm = await prompt('\n確認執行替換？(y/N): ');
  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('已取消。');
    process.exit(0);
  }

  let total = 0;

  // frontend/next.config.ts
  total += replaceInFile('frontend/next.config.ts', [
    [OLD_BACKEND_HOST, backend.host],
    [OLD_FRONTEND_HOST, frontend.host],
    [OLD_BACKEND_FULL, backend.full],
  ]);

  // frontend/src/lib/api.ts
  total += replaceInFile('frontend/src/lib/api.ts', [
    [OLD_FRONTEND_SHORT, frontend.host],
    [OLD_BACKEND_SHORT, backend.host],
  ]);

  // frontend/src/app/appointments/public/page.tsx
  total += replaceInFile('frontend/src/app/appointments/public/page.tsx', [
    [OLD_FRONTEND_SHORT, frontend.host],
    [OLD_RAILWAY_BACKEND_REPLACE, backend.host],
  ]);

  // frontend/src/lib/api-debug.ts（若存在）
  total += replaceInFile('frontend/src/lib/api-debug.ts', [
    [OLD_FRONTEND_SHORT, frontend.host],
    ['tattoo-crm-backend', backend.host],
    ['tattoo-crm', backend.host],
    ['backend', backend.host],
    ['api', backend.host],
  ]);

  // frontend .env 範例：寫入後端網址
  const frontendEnvPath = path.join(ROOT, 'frontend/.env.local.example');
  if (fs.existsSync(frontendEnvPath)) {
    let env = fs.readFileSync(frontendEnvPath, 'utf8');
    env = env.replace(/NEXT_PUBLIC_API_URL=.*/g, `NEXT_PUBLIC_API_URL=${backend.full}`);
    env = env.replace(/NEXT_PUBLIC_BACKEND_URL=.*/g, `NEXT_PUBLIC_BACKEND_URL=${backend.full}`);
    if (!env.includes('NEXT_PUBLIC_API_URL=')) env = `NEXT_PUBLIC_API_URL=${backend.full}\nNEXT_PUBLIC_BACKEND_URL=${backend.full}\n` + env;
    else if (!env.includes('NEXT_PUBLIC_BACKEND_URL=')) env = env.replace(/(NEXT_PUBLIC_API_URL=.*)/, `$1\nNEXT_PUBLIC_BACKEND_URL=${backend.full}`);
    fs.writeFileSync(frontendEnvPath, env);
    total += 1;
  }

  // backend .env.example：CORS 加入前端網址
  const backendEnvPath = path.join(ROOT, 'backend/.env.example');
  if (fs.existsSync(backendEnvPath)) {
    let env = fs.readFileSync(backendEnvPath, 'utf8');
    const corsLine = `CORS_ORIGIN="${frontend.full},http://localhost:3000"`;
    if (env.includes('CORS_ORIGIN=')) env = env.replace(/CORS_ORIGIN=.*/m, corsLine);
    else env = env.trimEnd() + '\n\n# CORS（請加入實際前端網址）\n' + corsLine + '\n';
    fs.writeFileSync(backendEnvPath, env);
    total += 1;
  }

  console.log('\n替換完成，共更新', total, '處。');
  console.log('\n請務必：');
  console.log('  1. 在 frontend 目錄建立 .env.local，設定 NEXT_PUBLIC_API_URL 與 NEXT_PUBLIC_BACKEND_URL 為您的後端網址（可參考 .env.local.example）');
  console.log('  2. 在 backend 目錄建立 .env，設定 CORS_ORIGIN 包含您的前端網址（可參考 .env.example）');
  console.log('  3. 重新建置前端：cd frontend && npm run build');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
