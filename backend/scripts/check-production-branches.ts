import { PrismaClient } from '@prisma/client';

const PRODUCTION_DATABASE_URL = 'postgresql://postgres:TSAzRfDGdVTUjnEzOMPoiegosoARCXWM@tuntable.proxy.rlwy.net:25281/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PRODUCTION_DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔍 連接到生產環境數據庫...');
  console.log('📍 URL:', PRODUCTION_DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
  console.log('');

  try {
    // 獲取所有分店及其關聯數據
    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: {
            appointments: true,
            orders: true,
            users: true,
            artists: true,
          },
        },
      },
      orderBy: [
        { name: 'asc' },
        { id: 'asc' },
      ],
    });

    console.log('📊 生產環境分店統計');
    console.log('='.repeat(80));
    console.log('');

    // 按名稱分組
    const branchesByName = branches.reduce((acc, branch) => {
      if (!acc[branch.name]) {
        acc[branch.name] = [];
      }
      acc[branch.name].push(branch);
      return acc;
    }, {} as Record<string, typeof branches>);

    // 顯示統計
    console.log(`總分店數: ${branches.length}`);
    console.log(`唯一名稱數: ${Object.keys(branchesByName).length}`);
    console.log('');

    // 顯示每個名稱的分店
    for (const [name, branchList] of Object.entries(branchesByName)) {
      console.log(`📍 ${name} - 共 ${branchList.length} 筆記錄`);
      console.log('-'.repeat(80));

      branchList.forEach((branch, index) => {
        const hasData = 
          branch._count.appointments > 0 || 
          branch._count.orders > 0 || 
          branch._count.users > 0 || 
          branch._count.artists > 0;

        const status = hasData ? '✅ 有數據' : '❌ 無數據';
        
        console.log(`  ${index + 1}. ID: ${branch.id}`);
        console.log(`     狀態: ${status}`);
        console.log(`     預約: ${branch._count.appointments} | 訂單: ${branch._count.orders} | 用戶: ${branch._count.users} | 藝術家: ${branch._count.artists}`);
        console.log(`     地址: ${branch.address || 'N/A'}`);
        console.log(`     電話: ${branch.phone || 'N/A'}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('');

    // 分析冗餘數據
    console.log('🔍 冗餘數據分析');
    console.log('-'.repeat(80));

    for (const [name, branchList] of Object.entries(branchesByName)) {
      if (branchList.length > 1) {
        const withData = branchList.filter(b => 
          b._count.appointments > 0 || 
          b._count.orders > 0 || 
          b._count.users > 0 || 
          b._count.artists > 0
        );
        const withoutData = branchList.filter(b => 
          b._count.appointments === 0 && 
          b._count.orders === 0 && 
          b._count.users === 0 && 
          b._count.artists === 0
        );

        console.log(`⚠️ "${name}" 有重複記錄:`);
        console.log(`   - 有數據: ${withData.length} 筆`);
        console.log(`   - 無數據: ${withoutData.length} 筆`);
        console.log(`   - 建議: 保留有數據的，刪除 ${withoutData.length} 筆無數據記錄`);
        console.log('');
      }
    }

    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    if (error.code) {
      console.error('   錯誤代碼:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ 執行失敗:', e);
    process.exit(1);
  });

