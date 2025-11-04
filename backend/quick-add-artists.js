const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addArtists() {
  try {
    console.log('🚀 開始添加新刺青師...');
    
    // 獲取分店 ID
    const branches = await prisma.branch.findMany();
    console.log('📋 分店列表:', branches.map(b => ({ id: b.id, name: b.name })));
    
    const donggang = branches.find(b => b.name === '東港店');
    const sanchong = branches.find(b => b.name === '三重店');
    
    if (!donggang || !sanchong) {
      throw new Error('找不到分店');
    }
    
    // 添加陳翔男（東港店）
    const chenxiangnanUser = await prisma.user.create({
      data: {
        email: 'chen-xiangnan@tattoo.local',
        name: '陳翔男',
        hashedPassword: 'temp_password_12345678',
        role: 'ARTIST',
        branchId: donggang.id,
        isActive: true
      }
    });
    
    const chenxiangnanArtist = await prisma.artist.create({
      data: {
        userId: chenxiangnanUser.id,
        displayName: '陳翔男',
        bio: '專精日式與傳統風格，擁有豐富經驗，擅長各種傳統圖案設計。',
        styles: ['Traditional', 'Japanese'],
        speciality: '日式與傳統風格',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        branchId: donggang.id,
        active: true
      }
    });
    
    console.log('✅ 陳翔男添加成功:', chenxiangnanArtist.id);
    
    // 添加朱川進（東港店）
    const zhuchuanjinUser1 = await prisma.user.create({
      data: {
        email: 'zhu-chuanjin-donggang@tattoo.local',
        name: '朱川進',
        hashedPassword: 'temp_password_12345678',
        role: 'ARTIST',
        branchId: donggang.id,
        isActive: true
      }
    });
    
    const zhuchuanjinArtist1 = await prisma.artist.create({
      data: {
        userId: zhuchuanjinUser1.id,
        displayName: '朱川進',
        bio: '專精寫實與線條，擅長創意設計，在東港店服務。',
        styles: ['Realistic', 'Linework'],
        speciality: '寫實與線條',
        photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        branchId: donggang.id,
        active: true
      }
    });
    
    console.log('✅ 朱川進（東港店）添加成功:', zhuchuanjinArtist1.id);
    
    // 添加朱川進（三重店）
    const zhuchuanjinUser2 = await prisma.user.create({
      data: {
        email: 'zhu-chuanjin-sanchong@tattoo.local',
        name: '朱川進',
        hashedPassword: 'temp_password_12345678',
        role: 'ARTIST',
        branchId: sanchong.id,
        isActive: true
      }
    });
    
    const zhuchuanjinArtist2 = await prisma.artist.create({
      data: {
        userId: zhuchuanjinUser2.id,
        displayName: '朱川進',
        bio: '專精寫實與線條，擅長創意設計，在三重店服務。',
        styles: ['Realistic', 'Linework'],
        speciality: '寫實與線條',
        photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        branchId: sanchong.id,
        active: true
      }
    });
    
    console.log('✅ 朱川進（三重店）添加成功:', zhuchuanjinArtist2.id);
    
    // 驗證總數
    const totalArtists = await prisma.artist.count();
    console.log('🎉 總刺青師數量:', totalArtists);
    
    // 顯示所有刺青師
    const allArtists = await prisma.artist.findMany({
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } }
      }
    });
    
    console.log('📋 刺青師列表:');
    allArtists.forEach(artist => {
      console.log(`  - ${artist.displayName} (${artist.branch.name}) - ${artist.user.name} (${artist.user.email})`);
    });
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addArtists();


