/**
 * 腳本：為管理員和刺青師設置固定的手機號碼
 * 
 * 此腳本會：
 * 1. 為 BOSS 帳號設置固定手機號碼：0988666888
 * 2. 為分店經理設置固定手機號碼：
 *    - 三重店經理：0911111111
 *    - 東港店經理：0922222222
 * 3. 為刺青師設置固定手機號碼：
 *    - 陳震宇：0933333333
 *    - 黃晨洋：0944444444
 *    - 林承葉：0955555555
 * 
 * 執行方式：
 * cd backend && node scripts/fix-admin-artist-phones.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 開始更新管理員和刺青師的手機號碼...\n');

  try {
    // 1. 更新 BOSS 帳號
    console.log('📱 更新 BOSS 帳號...');
    const boss = await prisma.user.findFirst({
      where: { role: 'BOSS' },
    });

    if (boss) {
      // 檢查目標手機號碼是否已被其他用戶使用
      const existingUser = await prisma.user.findUnique({
        where: { phone: '0988666888' },
      });

      if (existingUser && existingUser.id !== boss.id) {
        console.log(`⚠️  手機號碼 0988666888 已被用戶 ${existingUser.name} (${existingUser.id}) 使用，跳過更新`);
      } else {
        await prisma.user.update({
          where: { id: boss.id },
          data: { phone: '0988666888' },
        });
        console.log(`✅ BOSS 帳號 (${boss.name}) 手機號碼已更新為：0988666888`);
      }
    } else {
      console.log('⚠️  未找到 BOSS 帳號');
    }

    // 2. 更新分店經理
    console.log('\n📱 更新分店經理...');
    const managers = await prisma.user.findMany({
      where: { role: 'BRANCH_MANAGER' },
      include: { branch: true },
    });

    const managerPhones = {
      '三重店經理': '0911111111',
      '東港店經理': '0922222222',
    };

    for (const manager of managers) {
      const targetPhone = managerPhones[manager.name || ''];
      if (targetPhone) {
        // 檢查目標手機號碼是否已被其他用戶使用
        const existingUser = await prisma.user.findUnique({
          where: { phone: targetPhone },
        });

        if (existingUser && existingUser.id !== manager.id) {
          console.log(`⚠️  手機號碼 ${targetPhone} 已被用戶 ${existingUser.name} (${existingUser.id}) 使用，跳過更新`);
        } else {
          await prisma.user.update({
            where: { id: manager.id },
            data: { phone: targetPhone },
          });
          console.log(`✅ ${manager.name} (${manager.branch?.name || '未知分店'}) 手機號碼已更新為：${targetPhone}`);
        }
      } else {
        console.log(`⚠️  未找到 ${manager.name} 的對應手機號碼配置`);
      }
    }

    // 3. 更新刺青師
    console.log('\n📱 更新刺青師...');
    const artists = await prisma.artist.findMany({
      include: {
        user: true,
        branch: true,
      },
    });

    const artistPhones = {
      '陳震宇': '0933333333',
      '黃晨洋': '0944444444',
      '林承葉': '0955555555',
    };

    for (const artist of artists) {
      const targetPhone = artistPhones[artist.displayName || ''];
      if (targetPhone) {
        // 檢查目標手機號碼是否已被其他用戶使用
        const existingUser = await prisma.user.findUnique({
          where: { phone: targetPhone },
        });

        if (existingUser && existingUser.id !== artist.user.id) {
          console.log(`⚠️  手機號碼 ${targetPhone} 已被用戶 ${existingUser.name} (${existingUser.id}) 使用，跳過更新`);
        } else {
          await prisma.user.update({
            where: { id: artist.user.id },
            data: { phone: targetPhone },
          });
          console.log(`✅ ${artist.displayName} (${artist.branch?.name || '未知分店'}) 手機號碼已更新為：${targetPhone}`);
        }
      } else {
        console.log(`⚠️  未找到 ${artist.displayName} 的對應手機號碼配置`);
      }
    }

    console.log('\n✅ 手機號碼更新完成！');
    console.log('\n📋 帳號列表：');
    console.log('BOSS: 0988666888');
    console.log('三重店經理: 0911111111');
    console.log('東港店經理: 0922222222');
    console.log('陳震宇: 0933333333');
    console.log('黃晨洋: 0944444444');
    console.log('林承葉: 0955555555');
    console.log('\n所有帳號的預設密碼：12345678');

  } catch (error) {
    console.error('❌ 更新失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ 腳本執行失敗:', error);
    process.exit(1);
  });

