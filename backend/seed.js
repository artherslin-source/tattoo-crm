const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // 創建測試服務
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: '小圖案刺青',
        description: '簡單的小圖案刺青服務',
        price: 2000,
        durationMin: 60,
      },
    }),
    prisma.service.create({
      data: {
        name: '大圖案刺青',
        description: '複雜的大圖案刺青服務',
        price: 8000,
        durationMin: 240,
      },
    }),
    prisma.service.create({
      data: {
        name: '刺青修復',
        description: '現有刺青的修復和美化',
        price: 5000,
        durationMin: 180,
      },
    }),
  ]);

  console.log('✅ 創建了服務:', services.length);

  // 創建或更新測試用戶
  const hashedPassword = await bcrypt.hash('test123456', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { hashedPassword },
    create: {
      email: 'test@example.com',
      hashedPassword,
      name: '測試用戶',
      role: 'MEMBER',
    },
  });

  console.log('✅ 創建/更新了用戶:', user.email);

  // 創建或更新管理員用戶
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { hashedPassword },
    create: {
      email: 'admin@example.com',
      hashedPassword,
      name: '管理員',
      role: 'ADMIN',
    },
  });

  console.log('✅ 創建/更新了管理員:', adminUser.email);
}

main()
  .catch((e) => {
    console.error('❌ Seed 失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
