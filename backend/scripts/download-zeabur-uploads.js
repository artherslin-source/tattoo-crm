#!/usr/bin/env node
/**
 * 從 Zeabur 下載刺青師個人照片與作品集圖片，存到本機 zeabur-uploads-backup/
 * 使用方式（擇一）：
 *   1. 用「前端」網址（推薦，較好取得）：
 *      node scripts/download-zeabur-uploads.js https://tattoo-frontend.zeabur.app
 *   2. 用「後端」網址：
 *      export ZEABUR_BACKEND_URL=https://tattoo-backend-xxxx.zeabur.app
 *      node scripts/download-zeabur-uploads.js
 * 執行位置：在 backend 目錄下執行（或從專案根目錄：cd backend && node scripts/download-zeabur-uploads.js ...）
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const raw = process.env.ZEABUR_BACKEND_URL || process.env.ZEABUR_FRONTEND_URL || process.argv[2];
if (!raw || !raw.startsWith('http')) {
  console.error('請提供 Zeabur 網址（前端或後端皆可）：');
  console.error('  例：node scripts/download-zeabur-uploads.js https://tattoo-frontend.zeabur.app');
  console.error('  或：export ZEABUR_FRONTEND_URL=https://tattoo-frontend.zeabur.app');
  process.exit(1);
}

const baseUrl = raw.replace(/\/$/, '');
// 若看起來是前端網址（含 frontend 或無 backend），API 要加 /api
const isLikelyFrontend = /frontend|zeabur\.app$/i.test(baseUrl) && !/backend/i.test(baseUrl);
const apiBase = isLikelyFrontend ? baseUrl + '/api' : baseUrl;
const outDir = path.join(__dirname, '..', 'zeabur-uploads-backup');
const artistsDir = path.join(outDir, 'artists');
const portfolioDir = path.join(outDir, 'portfolio');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${url}`));
        }
      });
    }).on('error', reject);
  });
}

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    const origin = apiBase.replace(/\/api$/, '');
    const fullUrl = url.startsWith('http') ? url : origin + (url.startsWith('/') ? url : '/' + url);
    const lib = fullUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    lib.get(fullUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        return reject(new Error(`${fullUrl} => ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { file.close(); fs.unlink(filepath, () => {}); reject(err); });
  });
}

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

async function main() {
  if (!fs.existsSync(artistsDir)) fs.mkdirSync(artistsDir, { recursive: true });
  if (!fs.existsSync(portfolioDir)) fs.mkdirSync(portfolioDir, { recursive: true });

  console.log('請求來源:', apiBase);
  console.log('下載目錄:', outDir);
  console.log('');

  const artists = await fetchJson(`${apiBase}/artists`);
  if (!Array.isArray(artists)) {
    console.error('取得刺青師列表失敗或格式不符');
    process.exit(1);
  }

  const toDownload = [];
  for (const a of artists) {
    const userId = a.user?.id || a.userId;
    const artistId = a.id || userId;
    const name = a.displayName || a.user?.name || userId || 'unknown';
    const branchName = a.branch?.name ? `-${safeFilename(a.branch.name)}` : '';
    if (a.photoUrl && typeof a.photoUrl === 'string' && a.photoUrl.trim()) {
      const pathPart = a.photoUrl.split('?')[0];
      const ext = path.extname(pathPart) || '.jpg';
      toDownload.push({
        url: a.photoUrl,
        path: path.join(artistsDir, `${safeFilename(name)}${branchName}-${artistId}${ext}`),
        label: `刺青師照片 ${name}${a.branch?.name ? ` (${a.branch.name})` : ''}`,
      });
    }
    if (!userId) continue;
    try {
      const portfolio = await fetchJson(`${apiBase}/artists/${userId}/portfolio`);
      if (!Array.isArray(portfolio)) continue;
      for (const p of portfolio) {
        if (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.trim()) {
          const ext = path.extname(p.imageUrl) || '.jpg';
          toDownload.push({
            url: p.imageUrl,
            path: path.join(portfolioDir, `${(p.id || '').slice(0, 12)}-${safeFilename((p.title || 'work').slice(0, 30))}${ext}`),
            label: `作品 ${name} - ${(p.title || '').slice(0, 20)}`,
          });
        }
      }
    } catch (e) {
      console.warn(`  取得 ${name} 作品集失敗:`, e.message);
    }
  }

  // 去重（同一 URL 只下載一次）
  const seen = new Set();
  const unique = toDownload.filter((x) => {
    const k = x.url;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`共 ${unique.length} 個檔案（刺青師照片 + 作品集）`);
  let ok = 0;
  let fail = 0;
  for (const item of unique) {
    try {
      await download(item.url, item.path);
      console.log('  ✓', item.label);
      ok++;
    } catch (e) {
      console.log('  ✗', item.label, '—', e.message);
      fail++;
    }
  }
  console.log('');
  console.log(`完成：成功 ${ok}，失敗 ${fail}。檔案在 ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
