const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixIssues() {
  try {
    console.log('🔧 開始修復問題...');
    
    // 1. 重置 admin 密碼
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('12345678', 10);
    
    await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: { hashedPassword },
      create: {
        email: 'admin@test.com',
        hashedPassword,
        name: 'Admin',
        role: 'BOSS',
        isActive: true
      }
    });
    
    console.log('✅ Admin 密碼已重置');
    
    // 2. 添加新刺青師
    const artists = [
      {
        name: '陳翔男',
        email: 'chenxiangnan@test.com',
        phone: '0912345678',
        specialties: ['日式與傳統風格'],
        experience: '8年',
        branchId: 'branch-donggang'
      },
      {
        name: '朱川進',
        email: 'zhuchuanjin@test.com',
        phone: '0912345679',
        specialties: ['寫實與線條'],
        experience: '10年',
        branchId: 'branch-donggang'
      }
    ];
    
    for (const artistData of artists) {
      // 創建用戶
      const user = await prisma.user.upsert({
        where: { email: artistData.email },
        update: {},
        create: {
          email: artistData.email,
          hashedPassword: await bcrypt.hash('12345678', 10),
          name: artistData.name,
          phone: artistData.phone,
          role: 'ARTIST',
          branchId: artistData.branchId,
          isActive: true
        }
      });
      
      // 創建刺青師
      await prisma.artist.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          displayName: artistData.name,
          specialties: artistData.specialties,
          experience: artistData.experience,
          branchId: artistData.branchId,
          isActive: true
        }
      });
      
      console.log(`✅ 刺青師 ${artistData.name} 已添加`);
    }
    
    console.log('🎉 所有問題已修復！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixIssues();


