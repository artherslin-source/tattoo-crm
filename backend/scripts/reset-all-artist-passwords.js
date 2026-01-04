// 此腳本用於批量重置所有刺青師帳號的密碼為 12345678
// 執行方式：cd backend && node scripts/reset-all-artist-passwords.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAllArtistPasswords() {
  try {
    console.log('🔐 開始批量重置刺青師密碼...\n');

    // 查詢所有刺青師帳號
    const artistUsers = await prisma.user.findMany({
      where: {
        role: 'ARTIST'
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        branchId: true,
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { branchId: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log(`📊 找到 ${artistUsers.length} 位刺青師帳號\n`);

    if (artistUsers.length === 0) {
      console.log('⚠️  沒有找到任何刺青師帳號');
      return;
    }

    // 生成新密碼的 hash
    const newPassword = '12345678';
    console.log(`🔑 新密碼：${newPassword}`);
    console.log('🔄 正在生成密碼 hash...\n');
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 顯示即將更新的帳號列表
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 即將重置密碼的刺青師帳號');
    console.log('═══════════════════════════════════════════════════════════\n');

    artistUsers.forEach((artist, index) => {
      console.log(`  ${index + 1}. ${artist.name || '未設定'}`);
      console.log(`     手機號碼: ${artist.phone || '未設定'}`);
      console.log(`     所屬分店: ${artist.branch?.name || '未設定'}`);
      console.log('');
    });

    // 批量更新所有刺青師的密碼
    console.log('🔄 開始更新密碼...\n');

    const updateResults = [];
    for (const artist of artistUsers) {
      try {
        await prisma.user.update({
          where: { id: artist.id },
          data: { hashedPassword }
        });
        
        updateResults.push({
          success: true,
          name: artist.name || '未設定',
          phone: artist.phone || '未設定',
          branch: artist.branch?.name || '未設定'
        });
        
        console.log(`  ✅ ${artist.name || '未設定'} (${artist.phone || '未設定'}) - 密碼已更新`);
      } catch (error) {
        updateResults.push({
          success: false,
          name: artist.name || '未設定',
          phone: artist.phone || '未設定',
          branch: artist.branch?.name || '未設定',
          error: error.message
        });
        
        console.log(`  ❌ ${artist.name || '未設定'} (${artist.phone || '未設定'}) - 更新失敗: ${error.message}`);
      }
    }

    // 統計結果
    const successCount = updateResults.filter(r => r.success).length;
    const failCount = updateResults.filter(r => !r.success).length;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 更新結果統計');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   總刺青師數: ${artistUsers.length} 位`);
    console.log(`   成功更新: ${successCount} 位`);
    console.log(`   更新失敗: ${failCount} 位`);
    console.log('');
    console.log(`🔑 新密碼: ${newPassword}`);
    console.log('📱 登入方式: 使用手機號碼登入');
    console.log('⚠️  安全提醒: 請提醒刺青師登入後立即修改密碼');
    console.log('');

    if (failCount > 0) {
      console.log('❌ 以下帳號更新失敗：');
      updateResults.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.name} (${r.phone}): ${r.error}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetAllArtistPasswords()
  .then(() => {
    console.log('🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });


