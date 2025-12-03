// 簡單的 BOSS 帳號創建腳本
// 可以直接在 Railway Shell 中執行
// 執行方式：cd backend && node scripts/create-boss-account-simple.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createBossAccount() {
  try {
    console.log('🚀 開始創建/更新 BOSS 帳號...\n');

    const bossPhone = '0988666888';
    const bossPassword = '12345678';
    const bossEmail = 'admin@test.com';

    // 先檢查是否已存在該手機號碼的用戶
    const existingByPhone = await prisma.user.findUnique({
      where: { phone: bossPhone }
    });

    if (existingByPhone) {
      console.log(`✅ 找到現有用戶（手機: ${bossPhone}）`);
      console.log(`   用戶 ID: ${existingByPhone.id}`);
      console.log(`   角色: ${existingByPhone.role}`);
      console.log(`   姓名: ${existingByPhone.name}`);
      
      // 更新為 BOSS 角色並重置密碼
      const hashedPassword = await bcrypt.hash(bossPassword, 12);
      const updated = await prisma.user.update({
        where: { id: existingByPhone.id },
        data: {
          role: 'BOSS',
          hashedPassword: hashedPassword,
          email: bossEmail,
          name: 'Super Admin',
          isActive: true,
        }
      });
      
      console.log('\n✅ 已更新用戶為 BOSS 帳號');
      console.log(`   手機號碼: ${updated.phone}`);
      console.log(`   Email: ${updated.email}`);
      console.log(`   角色: ${updated.role}`);
      console.log(`   密碼: ${bossPassword}`);
    } else {
      // 檢查是否已有 BOSS 帳號
      const existingBoss = await prisma.user.findFirst({
        where: { role: 'BOSS' }
      });

      if (existingBoss) {
        console.log(`✅ 找到現有 BOSS 帳號（ID: ${existingBoss.id}）`);
        console.log(`   當前手機: ${existingBoss.phone || '無'}`);
        console.log(`   當前 Email: ${existingBoss.email || '無'}`);
        
        // 更新現有 BOSS 帳號
        const hashedPassword = await bcrypt.hash(bossPassword, 12);
        const updated = await prisma.user.update({
          where: { id: existingBoss.id },
          data: {
            phone: bossPhone,
            email: bossEmail,
            hashedPassword: hashedPassword,
            name: 'Super Admin',
            isActive: true,
          }
        });
        
        console.log('\n✅ 已更新 BOSS 帳號');
        console.log(`   手機號碼: ${updated.phone}`);
        console.log(`   Email: ${updated.email}`);
        console.log(`   密碼: ${bossPassword}`);
      } else {
        // 創建新的 BOSS 帳號
        console.log('⚠️ 未找到 BOSS 帳號，正在創建...');
        
        const hashedPassword = await bcrypt.hash(bossPassword, 12);
        const newBoss = await prisma.user.create({
          data: {
            phone: bossPhone,
            email: bossEmail,
            hashedPassword: hashedPassword,
            name: 'Super Admin',
            role: 'BOSS',
            isActive: true,
          }
        });
        
        console.log('\n✅ 已創建 BOSS 帳號');
        console.log(`   用戶 ID: ${newBoss.id}`);
        console.log(`   手機號碼: ${newBoss.phone}`);
        console.log(`   Email: ${newBoss.email}`);
        console.log(`   角色: ${newBoss.role}`);
        console.log(`   密碼: ${bossPassword}`);
      }
    }

    // 最終驗證
    console.log('\n🔍 驗證帳號...');
    const verify = await prisma.user.findUnique({
      where: { phone: bossPhone }
    });

    if (verify && verify.role === 'BOSS') {
      console.log('✅ 驗證成功！');
      console.log(`   可以通過手機號碼 ${bossPhone} 查找 BOSS 帳號`);
      console.log(`   角色: ${verify.role}`);
      console.log(`   狀態: ${verify.isActive ? '啟用' : '停用'}`);
    } else {
      console.error('❌ 驗證失敗！');
    }

    console.log('\n🎉 完成！');
    console.log('\n📋 登入資訊：');
    console.log(`   手機號碼: ${bossPhone}`);
    console.log(`   密碼: ${bossPassword}`);
    console.log('\n現在可以使用上述資訊登入管理後台！');

  } catch (error) {
    console.error('\n❌ 錯誤:', error);
    if (error.code === 'P2002') {
      console.error('⚠️ 手機號碼或 Email 已存在，但可能屬於其他用戶');
      console.error('   請檢查資料庫中的用戶資料');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBossAccount()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });

