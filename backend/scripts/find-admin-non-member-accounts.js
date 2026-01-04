// 此腳本用於找出資料庫內非會員的管理者帳號
// 執行方式：cd backend && node scripts/find-admin-non-member-accounts.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findAdminNonMemberAccounts() {
  try {
    console.log('🔍 正在查詢非會員的管理者帳號...\n');

    // 定義管理者角色
    const adminRoles = ['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'];

    // 查詢所有管理者帳號
    const allAdminAccounts = await prisma.user.findMany({
      where: {
        role: {
          in: adminRoles
        }
      },
      include: {
        member: true,
        branch: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log(`📊 找到 ${allAdminAccounts.length} 個管理者帳號（包含會員和非會員）\n`);

    // 篩選出沒有 Member 記錄的管理者帳號
    const nonMemberAdminAccounts = allAdminAccounts.filter(account => !account.member);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 非會員的管理者帳號列表');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (nonMemberAdminAccounts.length === 0) {
      console.log('✅ 未找到非會員的管理者帳號（所有管理者都是會員）\n');
    } else {
      // 按角色分組顯示
      const byRole = {
        BOSS: [],
        BRANCH_MANAGER: [],
        SUPER_ADMIN: []
      };

      nonMemberAdminAccounts.forEach(account => {
        if (byRole[account.role]) {
          byRole[account.role].push(account);
        }
      });

      // 顯示 BOSS 帳號
      if (byRole.BOSS.length > 0) {
        console.log('👑 BOSS (最高管理員)');
        console.log('───────────────────────────────────────────────────────────');
        byRole.BOSS.forEach((account, index) => {
          console.log(`\n  ${index + 1}. ${account.name || '未設定'}`);
          console.log(`     ID: ${account.id}`);
          console.log(`     手機號碼: ${account.phone || '未設定'}`);
          console.log(`     Email: ${account.email || '未設定'}`);
          console.log(`     狀態: ${account.isActive ? '✅ 啟用' : '❌ 停用'}`);
          console.log(`     建立時間: ${account.createdAt.toLocaleString('zh-TW')}`);
        });
        console.log('');
      }

      // 顯示 BRANCH_MANAGER 帳號
      if (byRole.BRANCH_MANAGER.length > 0) {
        console.log('🏢 BRANCH_MANAGER (分店經理)');
        console.log('───────────────────────────────────────────────────────────');
        byRole.BRANCH_MANAGER.forEach((account, index) => {
          console.log(`\n  ${index + 1}. ${account.name || '未設定'}`);
          console.log(`     ID: ${account.id}`);
          console.log(`     手機號碼: ${account.phone || '未設定'}`);
          console.log(`     Email: ${account.email || '未設定'}`);
          console.log(`     所屬分店: ${account.branch?.name || '未設定'}`);
          console.log(`     狀態: ${account.isActive ? '✅ 啟用' : '❌ 停用'}`);
          console.log(`     建立時間: ${account.createdAt.toLocaleString('zh-TW')}`);
        });
        console.log('');
      }

      // 顯示 SUPER_ADMIN 帳號
      if (byRole.SUPER_ADMIN.length > 0) {
        console.log('⚡ SUPER_ADMIN (超級管理員)');
        console.log('───────────────────────────────────────────────────────────');
        byRole.SUPER_ADMIN.forEach((account, index) => {
          console.log(`\n  ${index + 1}. ${account.name || '未設定'}`);
          console.log(`     ID: ${account.id}`);
          console.log(`     手機號碼: ${account.phone || '未設定'}`);
          console.log(`     Email: ${account.email || '未設定'}`);
          console.log(`     所屬分店: ${account.branch?.name || '未設定'}`);
          console.log(`     狀態: ${account.isActive ? '✅ 啟用' : '❌ 停用'}`);
          console.log(`     建立時間: ${account.createdAt.toLocaleString('zh-TW')}`);
        });
        console.log('');
      }
    }

    // 統計資訊
    const withMemberCount = allAdminAccounts.length - nonMemberAdminAccounts.length;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 統計資訊');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   總管理者帳號數: ${allAdminAccounts.length}`);
    console.log(`   非會員管理者: ${nonMemberAdminAccounts.length} 個`);
    console.log(`   會員管理者: ${withMemberCount} 個`);
    console.log('');
    
    // 按角色統計
    const roleStats = {};
    adminRoles.forEach(role => {
      const total = allAdminAccounts.filter(a => a.role === role).length;
      const nonMember = nonMemberAdminAccounts.filter(a => a.role === role).length;
      roleStats[role] = { total, nonMember, withMember: total - nonMember };
    });

    console.log('📈 按角色統計：');
    Object.entries(roleStats).forEach(([role, stats]) => {
      if (stats.total > 0) {
        console.log(`   ${role}:`);
        console.log(`      總數: ${stats.total}`);
        console.log(`      非會員: ${stats.nonMember}`);
        console.log(`      會員: ${stats.withMember}`);
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findAdminNonMemberAccounts()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });



