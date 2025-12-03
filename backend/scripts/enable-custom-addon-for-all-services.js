// 此腳本用於為所有服務項目啟用"增出範圍與細膩度加購"規格
// 執行方式：cd backend && node scripts/enable-custom-addon-for-all-services.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableCustomAddonForAllServices() {
  try {
    console.log('🚀 開始為所有服務項目啟用"增出範圍與細膩度加購"規格...\n');

    // 獲取所有服務
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    console.log(`📋 找到 ${services.length} 個服務項目\n`);

    let createdCount = 0;
    let enabledCount = 0;
    let alreadyEnabledCount = 0;
    let skippedCount = 0;

    for (const service of services) {
      console.log(`處理服務: ${service.name} (ID: ${service.id})`);

      // 檢查是否已存在 custom_addon 規格
      const existingVariant = await prisma.serviceVariant.findFirst({
        where: {
          serviceId: service.id,
          type: 'custom_addon',
          name: '增出範圍與細膩度加購'
        }
      });

      if (existingVariant) {
        if (existingVariant.isActive) {
          console.log(`  ✅ 規格已存在且已啟用`);
          alreadyEnabledCount++;
        } else {
          // 啟用現有規格
          await prisma.serviceVariant.update({
            where: { id: existingVariant.id },
            data: { isActive: true }
          });
          console.log(`  🔄 已啟用現有規格`);
          enabledCount++;
        }
      } else {
        // 創建新規格
        await prisma.serviceVariant.create({
          data: {
            serviceId: service.id,
            type: 'custom_addon',
            name: '增出範圍與細膩度加購',
            code: 'ADDON',
            description: '需事前與刺青師討論評估後加購（價格由用戶輸入）',
            priceModifier: 0,
            sortOrder: 1,
            isRequired: false,
            isActive: true
          }
        });
        console.log(`  ✨ 已創建並啟用新規格`);
        createdCount++;

        // 確保服務的 hasVariants 標記為 true
        if (!service.hasVariants) {
          await prisma.service.update({
            where: { id: service.id },
            data: { hasVariants: true }
          });
          console.log(`  📝 已更新服務的 hasVariants 標記`);
        }
      }
      console.log('');
    }

    console.log('\n📊 處理結果統計：');
    console.log(`  ✨ 新創建: ${createdCount} 個`);
    console.log(`  🔄 已啟用: ${enabledCount} 個`);
    console.log(`  ✅ 已存在且已啟用: ${alreadyEnabledCount} 個`);
    console.log(`  ⏭️  跳過: ${skippedCount} 個`);
    console.log(`  📦 總計處理: ${services.length} 個服務`);

    // 驗證結果
    console.log('\n🔍 驗證結果...');
    const allServices = await prisma.service.findMany({
      where: { isActive: true },
      include: {
        variants: {
          where: {
            type: 'custom_addon',
            isActive: true
          }
        }
      }
    });

    const servicesWithAddon = allServices.filter(s => s.variants.length > 0);
    const servicesWithoutAddon = allServices.filter(s => s.variants.length === 0);

    console.log(`  ✅ 已啟用 custom_addon 的服務: ${servicesWithAddon.length} 個`);
    if (servicesWithoutAddon.length > 0) {
      console.log(`  ⚠️  未啟用 custom_addon 的服務: ${servicesWithoutAddon.length} 個`);
      servicesWithoutAddon.forEach(s => {
        console.log(`     - ${s.name}`);
      });
    }

    console.log('\n🎉 完成！所有服務項目的"增出範圍與細膩度加購"規格已啟用！');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

enableCustomAddonForAllServices()
  .then(() => {
    console.log('\n🎊 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  });

