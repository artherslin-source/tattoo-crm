/**
 * 強制刪除所有無數據的分店
 * 
 * 這個腳本會：
 * 1. 連接到生產數據庫
 * 2. 找出所有無數據的分店
 * 3. 使用原始 SQL 強制刪除（無視外鍵約束）
 */

import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 錯誤: 請設定 DATABASE_URL 環境變數');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl!,
    },
  },
});

async function main() {
  console.log('🔍 連接到數據庫...');
  console.log('📍 URL:', databaseUrl!.replace(/:[^:@]*@/, ':***@'));
  console.log('');

  try {
    // 步驟 1: 獲取所有分店
    console.log('📊 步驟 1: 獲取所有分店...');
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
      orderBy: { name: 'asc' },
    });

    console.log(`   找到 ${branches.length} 個分店`);
    console.log('');

    // 步驟 2: 識別無數據的分店
    console.log('📊 步驟 2: 識別無數據的分店...');
    const emptyBranches = branches.filter(
      (b) =>
        b._count.appointments === 0 &&
        b._count.orders === 0 &&
        b._count.users === 0 &&
        b._count.artists === 0
    );

    const branchesWithData = branches.filter(
      (b) =>
        b._count.appointments > 0 ||
        b._count.orders > 0 ||
        b._count.users > 0 ||
        b._count.artists > 0
    );

    console.log(`   有數據的分店: ${branchesWithData.length} 個`);
    branchesWithData.forEach((b) => {
      console.log(`      - ${b.name}: 預約 ${b._count.appointments} | 訂單 ${b._count.orders} | 用戶 ${b._count.users} | 藝術家 ${b._count.artists}`);
    });
    console.log('');

    console.log(`   無數據的分店: ${emptyBranches.length} 個`);
    emptyBranches.forEach((b) => {
      console.log(`      - ${b.name} (${b.id})`);
    });
    console.log('');

    if (emptyBranches.length === 0) {
      console.log('✅ 沒有需要刪除的分店！');
      return;
    }

    // 步驟 3: 強制刪除
    console.log('🗑️ 步驟 3: 強制刪除無數據的分店...');
    
    let deletedCount = 0;
    for (const branch of emptyBranches) {
      try {
        // 使用原始 SQL 刪除，避免 Prisma 的檢查
        await prisma.$executeRaw`DELETE FROM "Branch" WHERE id = ${branch.id}`;
        deletedCount++;
        console.log(`   ✅ 已刪除: ${branch.name} (${branch.id})`);
      } catch (error: any) {
        console.error(`   ❌ 刪除失敗: ${branch.name} (${branch.id})`);
        console.error(`      原因: ${error.message}`);
        
        // 嘗試查找是否有隱藏的外鍵引用
        try {
          const refCheck = await prisma.$queryRaw`
            SELECT 
              tc.table_name, 
              kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name LIKE '%branch%'
          `;
          console.error(`      外鍵引用:`, refCheck);
        } catch (e) {
          // 忽略檢查錯誤
        }
      }
    }

    console.log('');
    console.log(`✅ 清理完成！刪除了 ${deletedCount} 個分店`);
    console.log('');

    // 步驟 4: 驗證結果
    console.log('📊 步驟 4: 驗證結果...');
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
    
    finalBranches.forEach((b) => {
      const hasData = b._count.appointments > 0 || b._count.orders > 0 || b._count.users > 0 || b._count.artists > 0;
      const status = hasData ? '✅' : '⚠️';
      console.log(`${status} ${b.name} (${b.id})`);
      console.log(`   預約: ${b._count.appointments} | 訂單: ${b._count.orders} | 用戶: ${b._count.users} | 藝術家: ${b._count.artists}`);
    });

    if (finalBranches.some(b => b._count.appointments === 0 && b._count.orders === 0 && b._count.users === 0 && b._count.artists === 0)) {
      console.log('');
      console.log('⚠️ 警告: 仍有無數據的分店存在');
    } else {
      console.log('');
      console.log('🎉 完美！所有分店都有數據');
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
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

