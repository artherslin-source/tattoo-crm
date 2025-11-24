// 添加缺少的刺青師：陳翔男、朱川進（東港店、三重店）
// 執行方式：cd backend && node scripts/add-missing-artists.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function addMissingArtists() {
  try {
    console.log('🚀 開始添加缺少的刺青師...');
    
    // 獲取分店
    const branches = await prisma.branch.findMany();
    console.log('📋 分店列表:', branches.map(b => ({ id: b.id, name: b.name })));
    
    const donggang = branches.find(b => b.name === '東港店');
    const sanchong = branches.find(b => b.name === '三重店');
    
    if (!donggang || !sanchong) {
      throw new Error('找不到分店：' + JSON.stringify({ donggang: !!donggang, sanchong: !!sanchong }));
    }
    
    console.log('✅ 找到分店：東港店=' + donggang.id + ', 三重店=' + sanchong.id);
    
    const hashedPassword = await bcrypt.hash('12345678', 12);
    
    // 1. 添加陳翔男（東港店）
    let chenxiangnanUser = await prisma.user.findFirst({
      where: { 
        name: '陳翔男',
        role: 'ARTIST',
        branchId: donggang.id
      }
    });
    
    if (!chenxiangnanUser) {
      // 生成唯一的手機號碼
      const phone = `0912-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      chenxiangnanUser = await prisma.user.create({
        data: {
          phone,
          name: '陳翔男',
          email: 'chen-xiangnan@tattoo.local',
          hashedPassword,
          role: 'ARTIST',
          branchId: donggang.id,
          isActive: true
        }
      });
      console.log('✅ 創建用戶：陳翔男 (phone: ' + phone + ')');
    } else {
      console.log('ℹ️ 用戶已存在：陳翔男');
    }
    
    let chenxiangnanArtist = await prisma.artist.findFirst({
      where: { userId: chenxiangnanUser.id }
    });
    
    if (!chenxiangnanArtist) {
      chenxiangnanArtist = await prisma.artist.create({
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
      console.log('✅ 添加刺青師：陳翔男（東港店）');
    } else {
      console.log('ℹ️ 刺青師已存在：陳翔男');
    }
    
    // 2. 添加朱川進（東港店）
    let zhuchuanjinUser1 = await prisma.user.findFirst({
      where: { 
        name: '朱川進',
        role: 'ARTIST',
        branchId: donggang.id
      }
    });
    
    if (!zhuchuanjinUser1) {
      const phone = `0913-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      zhuchuanjinUser1 = await prisma.user.create({
        data: {
          phone,
          name: '朱川進',
          email: 'zhu-chuanjin-donggang@tattoo.local',
          hashedPassword,
          role: 'ARTIST',
          branchId: donggang.id,
          isActive: true
        }
      });
      console.log('✅ 創建用戶：朱川進（東港店）(phone: ' + phone + ')');
    } else {
      console.log('ℹ️ 用戶已存在：朱川進（東港店）');
    }
    
    let zhuchuanjinArtist1 = await prisma.artist.findFirst({
      where: { userId: zhuchuanjinUser1.id }
    });
    
    if (!zhuchuanjinArtist1) {
      zhuchuanjinArtist1 = await prisma.artist.create({
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
      console.log('✅ 添加刺青師：朱川進（東港店）');
    } else {
      console.log('ℹ️ 刺青師已存在：朱川進（東港店）');
    }
    
    // 3. 添加朱川進（三重店）
    let zhuchuanjinUser2 = await prisma.user.findFirst({
      where: { 
        name: '朱川進',
        role: 'ARTIST',
        branchId: sanchong.id
      }
    });
    
    if (!zhuchuanjinUser2) {
      const phone = `0914-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      zhuchuanjinUser2 = await prisma.user.create({
        data: {
          phone,
          name: '朱川進',
          email: 'zhu-chuanjin-sanchong@tattoo.local',
          hashedPassword,
          role: 'ARTIST',
          branchId: sanchong.id,
          isActive: true
        }
      });
      console.log('✅ 創建用戶：朱川進（三重店）(phone: ' + phone + ')');
    } else {
      console.log('ℹ️ 用戶已存在：朱川進（三重店）');
    }
    
    let zhuchuanjinArtist2 = await prisma.artist.findFirst({
      where: { userId: zhuchuanjinUser2.id }
    });
    
    if (!zhuchuanjinArtist2) {
      zhuchuanjinArtist2 = await prisma.artist.create({
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
      console.log('✅ 添加刺青師：朱川進（三重店）');
    } else {
      console.log('ℹ️ 刺青師已存在：朱川進（三重店）');
    }
    
    // 驗證結果
    const totalArtists = await prisma.artist.count();
    console.log('\n🎉 總刺青師數量:', totalArtists);
    
    const allArtists = await prisma.artist.findMany({
      include: {
        user: { select: { name: true, phone: true, email: true } },
        branch: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📋 所有刺青師列表:');
    allArtists.forEach((artist, idx) => {
      console.log(`  ${idx + 1}. ${artist.displayName} (${artist.branch.name}) - ${artist.user?.name || 'N/A'} (phone: ${artist.user?.phone || 'N/A'})`);
    });
    
    console.log('\n✅ 完成！缺少的刺青師已添加！');
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMissingArtists()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });

