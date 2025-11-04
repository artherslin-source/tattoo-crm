const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addArtists() {
  try {
    console.log('開始添加新刺青師...');
    
    // 獲取分店 ID
    const branches = await prisma.branch.findMany();
    console.log('分店列表:', branches.map(b => ({ id: b.id, name: b.name })));
    
    const donggangBranch = branches.find(b => b.name === '東港店');
    const sanchongBranch = branches.find(b => b.name === '三重店');
    
    if (!donggangBranch || !sanchongBranch) {
      throw new Error('找不到分店');
    }
    
    // 添加陳翔男（東港店）
    const chenxiangnanUser = await prisma.user.create({
      data: {
        email: 'chenxiangnan@test.com',
        name: '陳翔男',
        hashedPassword: 'temp_password_12345678',
        role: 'ARTIST',
        branchId: donggangBranch.id,
        isActive: true
      }
    });
    
    const chenxiangnanArtist = await prisma.artist.create({
      data: {
        userId: chenxiangnanUser.id,
        displayName: '陳翔男',
        bio: '專精傳統刺青，擁有豐富經驗，擅長各種傳統圖案設計。',
        styles: ['Traditional'],
        speciality: '傳統刺青',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        branchId: donggangBranch.id,
        active: true
      }
    });
    
    console.log('✅ 陳翔男添加成功:', chenxiangnanArtist.id);
    
    // 添加朱川進（東港店）
    const zhuchuanjinUser1 = await prisma.user.create({
      data: {
        email: 'zhuchuanjin1@test.com',
        name: '朱川進',
        hashedPassword: 'temp_password_12345678',
        role: 'ARTIST',
        branchId: donggangBranch.id,
        isActive: true
      }
    });
    
    const zhuchuanjinArtist1 = await prisma.artist.create({
      data: {
        userId: zhuchuanjinUser1.id,
        displayName: '朱川進',
        bio: '專精現代刺青，擅長創意設計，在東港店服務。',
        styles: ['Modern', 'Geometric'],
        speciality: '現代刺青設計',
        photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        branchId: donggangBranch.id,
        active: true
      }
    });
    
    console.log('✅ 朱川進（東港店）添加成功:', zhuchuanjinArtist1.id);
    
    // 添加朱川進（三重店）
    const zhuchuanjinUser2 = await prisma.user.create({
      data: {
        email: 'zhuchuanjin2@test.com',
        name: '朱川進',
        hashedPassword: 'temp_password_12345678',
        role: 'ARTIST',
        branchId: sanchongBranch.id,
        isActive: true
      }
    });
    
    const zhuchuanjinArtist2 = await prisma.artist.create({
      data: {
        userId: zhuchuanjinUser2.id,
        displayName: '朱川進',
        bio: '專精現代刺青，擅長創意設計，在三重店服務。',
        styles: ['Modern', 'Geometric'],
        speciality: '現代刺青設計',
        photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        branchId: sanchongBranch.id,
        active: true
      }
    });
    
    console.log('✅ 朱川進（三重店）添加成功:', zhuchuanjinArtist2.id);
    
    // 驗證總數
    const totalArtists = await prisma.artist.count();
    console.log('🎉 總刺青師數量:', totalArtists);
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addArtists();
