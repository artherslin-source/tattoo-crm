const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPermissions() {
  console.log('🔍 開始測試分店架構與權限隔離...\n');

  try {
    // 1. 檢查所有用戶及其分店分配
    console.log('📋 1. 用戶分店分配情況：');
    const users = await prisma.user.findMany({
      include: { branch: true },
      orderBy: { role: 'asc' }
    });
    
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - 角色: ${user.role}, 分店: ${user.branch?.name || '無'}`);
    });

    // 2. 檢查分店統計
    console.log('\n🏢 2. 分店統計：');
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: {
            users: true,
            artists: true,
            orders: true,
            appointments: true,
          }
        }
      }
    });

    branches.forEach(branch => {
      console.log(`   - ${branch.name}:`);
      console.log(`     * 用戶: ${branch._count.users} 個`);
      console.log(`     * 刺青師: ${branch._count.artists} 個`);
      console.log(`     * 訂單: ${branch._count.orders} 個`);
      console.log(`     * 預約: ${branch._count.appointments} 個`);
    });

    // 3. 檢查預約的分店分配
    console.log('\n📅 3. 預約分店分配：');
    const appointments = await prisma.appointment.findMany({
      include: {
        user: { select: { name: true, role: true } },
        artist: { select: { name: true } },
        branch: { select: { name: true } },
        service: { select: { name: true } }
      }
    });

    appointments.forEach(apt => {
      console.log(`   - 預約 ${apt.id}: ${apt.user.name} -> ${apt.artist?.name || '無刺青師'} (${apt.branch.name})`);
    });

    // 4. 檢查訂單的分店分配
    console.log('\n💰 4. 訂單分店分配：');
    const orders = await prisma.order.findMany({
      include: {
        member: { select: { name: true, role: true } },
        branch: { select: { name: true } }
      },
      take: 10 // 只顯示前10個
    });

    orders.forEach(order => {
      console.log(`   - 訂單 ${order.id}: ${order.member.name} (${order.branch.name}) - $${order.totalAmount}`);
    });

    // 5. 模擬權限測試
    console.log('\n🔐 5. 權限隔離測試：');
    
    // BOSS 應該能看到所有分店的資料
    console.log('   BOSS 權限測試:');
    const bossUsers = await prisma.user.findMany({
      where: { role: 'BOSS' }
    });
    console.log(`   - BOSS 用戶數量: ${bossUsers.length}`);

    // 分店經理只能看到自己分店的資料
    console.log('   分店經理權限測試:');
    const managers = await prisma.user.findMany({
      where: { role: 'BRANCH_MANAGER' },
      include: { branch: true }
    });

    for (const manager of managers) {
      const branchUsers = await prisma.user.findMany({
        where: { branchId: manager.branchId }
      });
      const branchOrders = await prisma.order.findMany({
        where: { branchId: manager.branchId }
      });
      const branchAppointments = await prisma.appointment.findMany({
        where: { branchId: manager.branchId }
      });

      console.log(`   - ${manager.name} (${manager.branch.name}):`);
      console.log(`     * 可看到用戶: ${branchUsers.length} 個`);
      console.log(`     * 可看到訂單: ${branchOrders.length} 個`);
      console.log(`     * 可看到預約: ${branchAppointments.length} 個`);
    }

    // 會員只能看到自己的資料
    console.log('   會員權限測試:');
    const members = await prisma.user.findMany({
      where: { role: 'MEMBER' },
      include: { branch: true }
    });

    for (const member of members) {
      const memberOrders = await prisma.order.findMany({
        where: { memberId: member.id }
      });
      const memberAppointments = await prisma.appointment.findMany({
        where: { userId: member.id }
      });

      console.log(`   - ${member.name} (${member.branch.name}):`);
      console.log(`     * 自己的訂單: ${memberOrders.length} 個`);
      console.log(`     * 自己的預約: ${memberAppointments.length} 個`);
    }

    console.log('\n✅ 權限隔離測試完成！');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissions();
