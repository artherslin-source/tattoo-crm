const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. 找到圖騰小圖案服務
    const totemService = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' }
    });
    
    if (!totemService) {
      console.log('❌ 找不到圖騰小圖案服務');
      return;
    }
    
    console.log('✅ 找到圖騰小圖案服務:', totemService.id);
    
    // 2. 找到現有的顏色變體
    const existingColorVariants = await prisma.serviceVariant.findMany({
      where: {
        serviceId: totemService.id,
        type: 'color'
      }
    });
    
    console.log('\n現有的顏色變體:');
    existingColorVariants.forEach(v => {
      console.log(`  ${v.name} (ID: ${v.id})`);
    });
    
    // 3. 刪除現有的顏色變體（黑白和彩色）
    console.log('\n刪除現有的顏色變體...');
    for (const variant of existingColorVariants) {
      await prisma.serviceVariant.delete({
        where: { id: variant.id }
      });
      console.log(`  ✅ 已刪除: ${variant.name} (ID: ${variant.id})`);
    }
    
    // 4. 創建專屬的顏色變體（使用獨特的名稱）
    console.log('\n創建專屬的顏色變體...');
    
    // 黑白變體
    const blackWhiteVariant = await prisma.serviceVariant.create({
      data: {
        serviceId: totemService.id,
        type: 'color',
        name: '黑白-圖騰',
        code: 'BW_TOTEM',
        description: '圖騰小圖案專屬-黑白',
        priceModifier: 0,
        sortOrder: 1,
        isActive: true,
        metadata: null
      }
    });
    console.log(`  ✅ 已創建: 黑白-圖騰 (ID: ${blackWhiteVariant.id})`);
    
    // 彩色變體（帶有正確的 metadata）
    const colorVariant = await prisma.serviceVariant.create({
      data: {
        serviceId: totemService.id,
        type: 'color',
        name: '彩色-圖騰',
        code: 'COLOR_TOTEM',
        description: '圖騰小圖案專屬-彩色',
        priceModifier: 0,
        sortOrder: 2,
        isActive: true,
        metadata: {
          note: '彩色價格 = 黑白價格 + 1000（Z尺寸除外，Z彩色=1000）',
          zColorPrice: 1000,
          excludeSizes: ['Z'],
          colorPriceDiff: 1000
        }
      }
    });
    console.log(`  ✅ 已創建: 彩色-圖騰 (ID: ${colorVariant.id})`);
    console.log(`  ✅ metadata:`, JSON.stringify(colorVariant.metadata, null, 2));
    
    console.log('\n✅ 完成！圖騰小圖案現在有專屬的顏色變體了！');
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

