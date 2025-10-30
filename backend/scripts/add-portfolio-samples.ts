import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ARTIST_EMAILS = [
  'zhu-chuanjin-donggang@tattoo.local',
  'zhu-chuanjin-sanchong@tattoo.local',
  'chen-xiangnan@tattoo.local',
];

const SAMPLE_ITEMS = [
  {
    title: '龍形袖套',
    description: '黑灰寫實龍形袖套，層次與鱗片細節強烈',
    imageUrl: 'https://images.unsplash.com/photo-1548095115-45697e22c911?q=80&w=1600&auto=format&fit=crop',
  },
  {
    title: '水墨山景',
    description: '東方水墨風山景，線條律動與留白表現',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=1600&auto=format&fit=crop',
  },
  {
    title: '幾何圖騰',
    description: '幾何分割與圓形陣列，適合前臂或小臂',
    imageUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=1600&auto=format&fit=crop',
  },
  {
    title: '花朵寫實',
    description: '玫瑰花寫實陰影與高光，女性款',
    imageUrl: 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=1600&auto=format&fit=crop',
  },
  {
    title: '日本浮世繪',
    description: '浮世繪元素與現代配色結合',
    imageUrl: 'https://images.unsplash.com/photo-1526312426976-593c2b999ef2?q=80&w=1600&auto=format&fit=crop',
  },
];

async function main() {
  // 找到對應的 userId 列表（作品集是掛在 User.id 上）
  const users = await prisma.user.findMany({ where: { email: { in: ARTIST_EMAILS } } });
  if (!users.length) {
    console.log('⚠️ 找不到任何目標使用者，請先建立刺青師帳號');
    return;
  }

  for (const user of users) {
    const count = await prisma.portfolioItem.count({ where: { artistId: user.id } });
    if (count > 0) {
      console.log(`ℹ️ ${user.email} 已有 ${count} 張作品，跳過新增`);
      continue;
    }

    await prisma.portfolioItem.createMany({
      data: SAMPLE_ITEMS.map((it) => ({ ...it, artistId: user.id, tags: JSON.stringify(['sample']) })),
    });
    const newCount = await prisma.portfolioItem.count({ where: { artistId: user.id } });
    console.log(`✅ 已為 ${user.email} 建立 ${newCount} 張示意作品`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


