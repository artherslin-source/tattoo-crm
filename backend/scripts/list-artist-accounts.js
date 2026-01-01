// 此腳本用於列出所有刺青師帳號資訊
// 執行方式：cd backend && node scripts/list-artist-accounts.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listArtistAccounts() {
  try {
    console.log('🔍 正在查詢所有刺青師帳號...\n');

    // 查詢 ARTIST 帳號
    const artistAccounts = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        artist: {
          select: {
            id: true,
            displayName: true,
            speciality: true,
            bio: true,
            portfolioUrl: true,
            photoUrl: true,
            active: true
          }
        }
      },
      orderBy: [
        { branchId: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 刺青師帳號列表');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (artistAccounts.length === 0) {
      console.log('⚠️  未找到刺青師帳號\n');
    } else {
      // 按分店分組
      const byBranch = {};
      artistAccounts.forEach(account => {
        const branchName = account.branch?.name || '未分配';
        if (!byBranch[branchName]) {
          byBranch[branchName] = [];
        }
        byBranch[branchName].push(account);
      });

      // 顯示每個分店的刺青師
      Object.keys(byBranch).sort().forEach(branchName => {
        const artists = byBranch[branchName];
        console.log(`🏢 ${branchName}`);
        console.log('───────────────────────────────────────────────────────────');
        
        artists.forEach((account, index) => {
          const displayName = account.artist?.displayName || account.name || '未設定';
          console.log(`\n  ${index + 1}. ${displayName}`);
          console.log(`     ID: ${account.id}`);
          console.log(`     姓名: ${account.name || '未設定'}`);
          console.log(`     手機號碼: ${account.phone || '未設定'}`);
          console.log(`     Email: ${account.email || '未設定'}`);
          console.log(`     專長: ${account.artist?.speciality || '未設定'}`);
          if (account.artist?.bio) {
            console.log(`     簡介: ${account.artist.bio}`);
          }
          if (account.artist?.portfolioUrl) {
            console.log(`     作品集: ${account.artist.portfolioUrl}`);
          }
          console.log(`     狀態: ${account.isActive && account.artist?.active ? '✅ 啟用' : '❌ 停用'}`);
          console.log(`     建立時間: ${account.createdAt.toLocaleString('zh-TW')}`);
        });
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 統計資訊');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   總刺青師數: ${artistAccounts.length} 位`);
    
    // 按分店統計
    const branchStats = {};
    artistAccounts.forEach(account => {
      const branchName = account.branch?.name || '未分配';
      branchStats[branchName] = (branchStats[branchName] || 0) + 1;
    });
    
    console.log('\n📈 按分店統計：');
    Object.keys(branchStats).sort().forEach(branchName => {
      console.log(`   ${branchName}: ${branchStats[branchName]} 位`);
    });
    
    // 啟用狀態統計
    const activeCount = artistAccounts.filter(a => a.isActive && a.artist?.active).length;
    const inactiveCount = artistAccounts.length - activeCount;
    console.log(`\n   啟用: ${activeCount} 位`);
    console.log(`   停用: ${inactiveCount} 位`);

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listArtistAccounts()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });

