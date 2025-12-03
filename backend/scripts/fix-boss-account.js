// 此腳本用於修復或創建 BOSS 帳號
// 執行方式：cd backend && node scripts/fix-boss-account.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixBossAccount() {
  try {
    console.log('🔧 開始修復 BOSS 帳號...');

    const bossPhone = '0988666888';
    const bossPassword = '12345678';
    const bossEmail = 'admin@test.com';

    // 檢查是否已存在 BOSS 帳號
    let boss = await prisma.user.findFirst({
      where: { role: 'BOSS' }
    });

    if (boss) {
      console.log(`✅ 找到現有 BOSS 帳號: ${boss.name} (${boss.phone || boss.email})`);
      
      // 更新手機號碼和密碼
      const hashedPassword = await bcrypt.hash(bossPassword, 12);
      
      boss = await prisma.user.update({
        where: { id: boss.id },
        data: {
          phone: bossPhone,
          hashedPassword: hashedPassword,
          email: bossEmail, // 確保 email 也存在
        }
      });
      
      console.log(`✅ 已更新 BOSS 帳號:`);
      console.log(`   - 手機號碼: ${boss.phone}`);
      console.log(`   - Email: ${boss.email}`);
      console.log(`   - 密碼: ${bossPassword}`);
    } else {
      console.log('⚠️ 未找到 BOSS 帳號，正在創建...');
      
      // 創建新的 BOSS 帳號
      const hashedPassword = await bcrypt.hash(bossPassword, 12);
      
      boss = await prisma.user.create({
        data: {
          phone: bossPhone,
          email: bossEmail,
          hashedPassword: hashedPassword,
          name: 'Super Admin',
          role: 'BOSS',
          isActive: true,
        }
      });
      
      console.log(`✅ 已創建 BOSS 帳號:`);
      console.log(`   - 手機號碼: ${boss.phone}`);
      console.log(`   - Email: ${boss.email}`);
      console.log(`   - 密碼: ${bossPassword}`);
    }

    // 驗證帳號可以通過手機號碼查找
    const verifyByPhone = await prisma.user.findUnique({
      where: { phone: bossPhone }
    });

    if (verifyByPhone) {
      console.log('✅ 驗證成功：可以通過手機號碼查找帳號');
    } else {
      console.error('❌ 驗證失敗：無法通過手機號碼查找帳號');
    }

    console.log('\n🎉 BOSS 帳號修復完成！');
    console.log('\n📋 登入資訊：');
    console.log(`   手機號碼: ${bossPhone}`);
    console.log(`   密碼: ${bossPassword}`);

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixBossAccount()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });

