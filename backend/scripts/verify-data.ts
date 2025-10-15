import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 數據庫數據驗證\n');
  
  // 查詢分店
  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: {
          users: true,
          artists: true,
          appointments: true,
          orders: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log('🏪 分店數據：');
  console.log(`   總數: ${branches.length} 個\n`);
  branches.forEach((branch, index) => {
    console.log(`   ${index + 1}. ${branch.name}`);
    console.log(`      ID: ${branch.id}`);
    console.log(`      地址: ${branch.address}`);
    console.log(`      電話: ${branch.phone}`);
    console.log(`      用戶數: ${branch._count.users}`);
    console.log(`      刺青師: ${branch._count.artists}`);
    console.log(`      預約數: ${branch._count.appointments}`);
    console.log(`      訂單數: ${branch._count.orders}`);
    console.log('');
  });
  
  // 查詢刺青師分配
  const artists = await prisma.artist.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      },
      branch: {
        select: {
          name: true,
        }
      }
    },
    orderBy: { branchId: 'asc' }
  });
  
  console.log('👨‍🎨 刺青師分配：');
  console.log(`   總數: ${artists.length} 位\n`);
  artists.forEach((artist, index) => {
    console.log(`   ${index + 1}. ${artist.user.name} (${artist.user.email})`);
    console.log(`      分店: ${artist.branch?.name || '未分配'}`);
    console.log(`      專長: ${artist.speciality || '未設定'}`);
    console.log('');
  });
  
  // 查詢管理員
  const managers = await prisma.user.findMany({
    where: {
      role: 'BRANCH_MANAGER'
    },
    include: {
      branch: {
        select: {
          name: true,
        }
      }
    },
    orderBy: { branchId: 'asc' }
  });
  
  console.log('👔 分店經理：');
  console.log(`   總數: ${managers.length} 位\n`);
  managers.forEach((manager, index) => {
    console.log(`   ${index + 1}. ${manager.name} (${manager.email})`);
    console.log(`      分店: ${manager.branch?.name || '未分配'}`);
    console.log('');
  });
  
  // 統計
  const stats = {
    branches: await prisma.branch.count(),
    users: await prisma.user.count(),
    members: await prisma.member.count(),
    artists: await prisma.artist.count(),
    services: await prisma.service.count(),
    appointments: await prisma.appointment.count(),
    orders: await prisma.order.count(),
  };
  
  console.log('📈 總體統計：');
  console.log(`   分店: ${stats.branches}`);
  console.log(`   用戶: ${stats.users}`);
  console.log(`   會員: ${stats.members}`);
  console.log(`   刺青師: ${stats.artists}`);
  console.log(`   服務: ${stats.services}`);
  console.log(`   預約: ${stats.appointments}`);
  console.log(`   訂單: ${stats.orders}`);
}

main()
  .catch((e) => {
    console.error('❌ 查詢失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

