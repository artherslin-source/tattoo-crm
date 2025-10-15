/**
 * 生產環境分店清理腳本
 * 
 * 功能：
 * 1. 連接到生產數據庫
 * 2. 識別重複的分店（相同名稱）
 * 3. 保留有數據的分店（有預約、訂單、用戶或藝術家）
 * 4. 刪除無數據的冗餘分店
 * 
 * 使用方式：
 * export DATABASE_URL="postgresql://user:password@host:port/database"
 * npx ts-node scripts/clean-production-branches.ts
 */

import { PrismaClient } from '@prisma/client';

// 從環境變數獲取數據庫 URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 錯誤: 請設定 DATABASE_URL 環境變數');
  console.error('');
  console.error('使用方式:');
  console.error('  export DATABASE_URL="postgresql://user:password@host:port/database"');
  console.error('  npx ts-node scripts/clean-production-branches.ts');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function main() {
  console.log('🔍 連接到數據庫...');
  console.log('📍 URL:', databaseUrl.replace(/:[^:@]*@/, ':***@'));
  console.log('');

  try {
    // 步驟 1: 獲取所有分店
    console.log('📊 步驟 1: 獲取所有分店數據...');
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
        { createdAt: 'desc' }, // 最新的在前
      ],
    });

    console.log(`   ✅ 找到 ${branches.length} 個分店記錄`);
    console.log('');

    // 步驟 2: 按名稱分組
    console.log('📊 步驟 2: 分析重複分店...');
    const branchesByName = branches.reduce((acc, branch) => {
      if (!acc[branch.name]) {
        acc[branch.name] = [];
      }
      acc[branch.name].push(branch);
      return acc;
    }, {} as Record<string, typeof branches>);

    console.log(`   ✅ 唯一名稱: ${Object.keys(branchesByName).length} 個`);
    console.log('');

    // 步驟 3: 顯示詳細分析
    console.log('📊 步驟 3: 詳細分析');
    console.log('='.repeat(80));

    const toDelete: string[] = [];
    const toKeep: string[] = [];

    for (const [name, branchList] of Object.entries(branchesByName)) {
      console.log(`\n📍 ${name}`);
      console.log('-'.repeat(80));

      if (branchList.length === 1) {
        console.log(`   ✅ 只有 1 筆記錄，保留`);
        toKeep.push(branchList[0].id);
        const b = branchList[0];
        console.log(`      ID: ${b.id}`);
        console.log(`      數據: 預約 ${b._count.appointments} | 訂單 ${b._count.orders} | 用戶 ${b._count.users} | 藝術家 ${b._count.artists}`);
      } else {
        console.log(`   ⚠️ 找到 ${branchList.length} 筆重複記錄`);
        
        // 找出有數據的分店
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

        console.log(`      - 有數據: ${withData.length} 筆`);
        console.log(`      - 無數據: ${withoutData.length} 筆`);
        console.log('');

        // 決定保留哪些
        if (withData.length > 0) {
          // 保留第一個有數據的（最新的）
          const keep = withData[0];
          toKeep.push(keep.id);
          console.log(`      ✅ 保留 (有數據):`);
          console.log(`         ID: ${keep.id}`);
          console.log(`         數據: 預約 ${keep._count.appointments} | 訂單 ${keep._count.orders} | 用戶 ${keep._count.users} | 藝術家 ${keep._count.artists}`);
          console.log('');

          // 其他有數據的也刪除（如果有多個）
          if (withData.length > 1) {
            console.log(`      ⚠️ 警告: 有 ${withData.length} 筆都有數據，只保留最新的`);
            for (let i = 1; i < withData.length; i++) {
              const del = withData[i];
              toDelete.push(del.id);
              console.log(`         ❌ 刪除 (較舊的有數據記錄):`);
              console.log(`            ID: ${del.id}`);
              console.log(`            數據: 預約 ${del._count.appointments} | 訂單 ${del._count.orders} | 用戶 ${del._count.users} | 藝術家 ${del._count.artists}`);
            }
          }
        } else {
          // 都沒數據，保留最新的
          const keep = branchList[0];
          toKeep.push(keep.id);
          console.log(`      ✅ 保留 (最新的，無數據):`);
          console.log(`         ID: ${keep.id}`);
          console.log('');
        }

        // 刪除所有無數據的（除了被保留的那個）
        for (const del of withoutData) {
          if (!toKeep.includes(del.id)) {
            toDelete.push(del.id);
            console.log(`      ❌ 刪除 (無數據):`);
            console.log(`         ID: ${del.id}`);
          }
        }
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('');

    // 步驟 4: 顯示操作摘要
    console.log('📊 步驟 4: 操作摘要');
    console.log('-'.repeat(80));
    console.log(`   保留: ${toKeep.length} 個分店`);
    console.log(`   刪除: ${toDelete.length} 個分店`);
    console.log('');

    if (toDelete.length === 0) {
      console.log('✅ 沒有需要刪除的冗餘分店！數據庫狀態良好。');
      return;
    }

    // 步驟 5: 執行刪除（需要確認）
    console.log('⚠️ 即將刪除以下分店:');
    for (const id of toDelete) {
      const branch = branches.find(b => b.id === id);
      if (branch) {
        console.log(`   - ${branch.name} (${id})`);
      }
    }
    console.log('');

    // 檢查環境變數確認
    const confirmDelete = process.env.CONFIRM_DELETE === 'true';
    
    if (!confirmDelete) {
      console.log('🛑 模擬模式 (不會實際刪除)');
      console.log('');
      console.log('如要實際執行刪除，請運行:');
      console.log('  export CONFIRM_DELETE=true');
      console.log('  npx ts-node scripts/clean-production-branches.ts');
      console.log('');
      return;
    }

    // 實際執行刪除
    console.log('🗑️ 步驟 5: 執行刪除...');
    
    for (const id of toDelete) {
      const branch = branches.find(b => b.id === id);
      if (branch) {
        console.log(`   刪除: ${branch.name} (${id})...`);
        await prisma.branch.delete({
          where: { id },
        });
        console.log(`   ✅ 已刪除`);
      }
    }

    console.log('');
    console.log('✅ 清理完成！');
    console.log('');

    // 驗證結果
    console.log('📊 驗證結果');
    console.log('-'.repeat(80));
    const finalBranches = await prisma.branch.findMany({
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
      orderBy: { name: 'asc' },
    });

    console.log(`最終分店數: ${finalBranches.length}`);
    console.log('');
    finalBranches.forEach((branch) => {
      console.log(`✅ ${branch.name} (${branch.id})`);
      console.log(`   預約: ${branch._count.appointments} | 訂單: ${branch._count.orders} | 用戶: ${branch._count.users} | 藝術家: ${branch._count.artists}`);
    });

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    if (error.code) {
      console.error('   錯誤代碼:', error.code);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ 執行失敗:', e);
    process.exit(1);
  });

