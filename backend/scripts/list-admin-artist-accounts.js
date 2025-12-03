// 此腳本用於列出所有管理員和刺青師帳號資訊
// 執行方式：cd backend && node scripts/list-admin-artist-accounts.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAdminAndArtistAccounts() {
  try {
    console.log('🔍 正在查詢所有管理員和刺青師帳號...\n');

    // 查詢 BOSS 帳號
    const bossAccounts = await prisma.user.findMany({
      where: { role: 'BOSS' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
      },
      orderBy: { name: 'asc' }
    });

    // 查詢 BRANCH_MANAGER 帳號
    const managerAccounts = await prisma.user.findMany({
      where: { role: 'BRANCH_MANAGER' },
      include: {
        branch: {
          select: {
            name: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 查詢 ARTIST 帳號
    const artistAccounts = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      include: {
        branch: {
          select: {
            name: true
          }
        },
        artist: {
          select: {
            displayName: true,
            speciality: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        branch: {
          select: {
            name: true
          }
        },
        artist: {
          select: {
            displayName: true,
            speciality: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 管理員和刺青師帳號列表');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 顯示 BOSS 帳號
    console.log('👑 BOSS (最高管理員)');
    console.log('───────────────────────────────────────────────────────────');
    if (bossAccounts.length === 0) {
      console.log('  ⚠️  未找到 BOSS 帳號');
    } else {
      bossAccounts.forEach((account, index) => {
        console.log(`\n  ${index + 1}. ${account.name || '未設定'}`);
        console.log(`     手機號碼: ${account.phone || '未設定'}`);
        console.log(`     Email: ${account.email || '未設定'}`);
        console.log(`     密碼: 12345678`);
        console.log(`     狀態: ${account.isActive ? '✅ 啟用' : '❌ 停用'}`);
      });
    }

    // 顯示分店經理帳號
    console.log('\n\n🏢 BRANCH_MANAGER (分店經理)');
    console.log('───────────────────────────────────────────────────────────');
    if (managerAccounts.length === 0) {
      console.log('  ⚠️  未找到分店經理帳號');
    } else {
      managerAccounts.forEach((account, index) => {
        console.log(`\n  ${index + 1}. ${account.name || '未設定'}`);
        console.log(`     手機號碼: ${account.phone || '未設定'}`);
        console.log(`     Email: ${account.email || '未設定'}`);
        console.log(`     密碼: 12345678`);
        console.log(`     所屬分店: ${account.branch?.name || '未設定'}`);
        console.log(`     狀態: ${account.isActive ? '✅ 啟用' : '❌ 停用'}`);
      });
    }

    // 顯示刺青師帳號
    console.log('\n\n🎨 ARTIST (刺青師)');
    console.log('───────────────────────────────────────────────────────────');
    if (artistAccounts.length === 0) {
      console.log('  ⚠️  未找到刺青師帳號');
    } else {
      artistAccounts.forEach((account, index) => {
        console.log(`\n  ${index + 1}. ${account.artist?.displayName || account.name || '未設定'}`);
        console.log(`     手機號碼: ${account.phone || '未設定'}`);
        console.log(`     Email: ${account.email || '未設定'}`);
        console.log(`     密碼: 12345678`);
        console.log(`     專長: ${account.artist?.speciality || '未設定'}`);
        console.log(`     所屬分店: ${account.branch?.name || '未設定'}`);
        console.log(`     狀態: ${account.isActive ? '✅ 啟用' : '❌ 停用'}`);
      });
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('📊 統計資訊');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   BOSS: ${bossAccounts.length} 個`);
    console.log(`   分店經理: ${managerAccounts.length} 個`);
    console.log(`   刺青師: ${artistAccounts.length} 個`);
    console.log(`   總計: ${bossAccounts.length + managerAccounts.length + artistAccounts.length} 個帳號`);
    console.log('\n💡 注意：所有帳號的預設密碼都是 12345678');
    console.log('💡 登入時請使用手機號碼（如果手機號碼為「未設定」，請先執行修復腳本）');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listAdminAndArtistAccounts()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });

