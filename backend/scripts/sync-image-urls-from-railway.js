#!/usr/bin/env node
/**
 * 把 Railway 上的「圖片網址」同步到 Zeabur 資料庫，讓 Zeabur 前台顯示的圖和 Railway 一樣
 * （圖片實際還是從 Railway 後端載入，不搬檔案）
 *
 * 使用前請設定環境變數：
 *   RAILWAY_DATABASE_URL  = Railway 的 PostgreSQL 連線字串
 *   ZEABUR_DATABASE_URL   = Zeabur 的 PostgreSQL 連線字串
 *   RAILWAY_BACKEND_URL   = Railway 後端網址，例如 https://tattoo-crm-production-413f.up.railway.app
 *
 * 執行（在專案根目錄）：
 *   cd backend && node scripts/sync-image-urls-from-railway.js
 * 或先把三個環境變數設好再執行。
 */

const { PrismaClient } = require('@prisma/client');

function toFullUrl(baseUrl, pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const s = pathOrUrl.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${path}`;
}

async function main() {
  const railwayUrl = process.env.RAILWAY_DATABASE_URL;
  const zeaburUrl = process.env.ZEABUR_DATABASE_URL;
  const railwayBackend = process.env.RAILWAY_BACKEND_URL;

  if (!railwayUrl || !zeaburUrl || !railwayBackend) {
    console.error('請設定環境變數：RAILWAY_DATABASE_URL, ZEABUR_DATABASE_URL, RAILWAY_BACKEND_URL');
    process.exit(1);
  }

  const rail = new PrismaClient({ datasources: { db: { url: railwayUrl } } });
  const zeab = new PrismaClient({ datasources: { db: { url: zeaburUrl } } });

  try {
    // 1) 從 Railway 讀出刺青師（有 photoUrl 的）含分店名
    const railwayArtists = await rail.artist.findMany({
      where: { photoUrl: { not: null } },
      select: { displayName: true, photoUrl: true, branch: { select: { name: true } } },
    });

    const zeaburBranchNameToId = { '三重店': 'seed-branch-1', '東港店': 'seed-branch-2' };
    const zeaburArtists = await zeab.artist.findMany({
      select: { id: true, displayName: true, branchId: true },
    });

    for (const row of railwayArtists) {
      const fullUrl = toFullUrl(railwayBackend, row.photoUrl);
      if (!fullUrl) continue;
      const branchName = row.branch?.name || '';
      const branchId = zeaburBranchNameToId[branchName];
      const match = zeaburArtists.find(
        (z) => z.displayName === row.displayName && z.branchId === branchId
      );
      if (match) {
        await zeab.artist.update({
          where: { id: match.id },
          data: { photoUrl: fullUrl },
        });
        console.log('✅ 刺青師:', row.displayName, branchName, '->', match.id);
      }
    }

    // 2) 從 Railway 讀出服務（有 imageUrl 的）
    const railwayServices = await rail.service.findMany({
      where: { imageUrl: { not: null } },
      select: { name: true, imageUrl: true },
    });

    const zeaburServices = await zeab.service.findMany({
      select: { id: true, name: true },
    });

    for (const row of railwayServices) {
      const fullUrl = toFullUrl(railwayBackend, row.imageUrl);
      if (!fullUrl) continue;
      const match = zeaburServices.find((z) => z.name === row.name);
      if (match) {
        await zeab.service.update({
          where: { id: match.id },
          data: { imageUrl: fullUrl },
        });
        console.log('✅ 服務:', row.name, '->', match.id);
      }
    }

    // 3) 作品集：依「刺青師姓名+分店+標題」對齊，把 Zeabur 的 imageUrl 改成 Railway 的完整網址
    const railwayPortfolios = await rail.portfolioItem.findMany({
      where: { imageUrl: { not: null } },
      include: {
        artist: { include: { branch: { select: { name: true } } } },
      },
    });
    const zeaburPortfolios = await zeab.portfolioItem.findMany({
      include: {
        artist: { include: { branch: { select: { name: true } } } },
      },
    });
    for (const row of railwayPortfolios) {
      const fullUrl = toFullUrl(railwayBackend, row.imageUrl);
      if (!fullUrl) continue;
      const artistName = row.artist?.name || '';
      const branchName = row.artist?.branch?.name || '';
      const match = zeaburPortfolios.find(
        (z) =>
          z.title === row.title &&
          (z.artist?.name || '') === artistName &&
          (z.artist?.branch?.name || '') === branchName
      );
      if (match) {
        await zeab.portfolioItem.update({
          where: { id: match.id },
          data: { imageUrl: fullUrl },
        });
        console.log('✅ 作品:', artistName, row.title, '->', match.id);
      }
    }

    console.log('\n完成。請重新整理 Zeabur 前台，圖片會從 Railway 載入（與 Railway 一模一樣）。');
  } finally {
    await rail.$disconnect();
    await zeab.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
