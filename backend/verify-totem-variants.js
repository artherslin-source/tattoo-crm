const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const totemService = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' }
    });
    
    if (!totemService) {
      console.log('❌ 找不到圖騰小圖案服務');
      return;
    }
    
    console.log('✅ 圖騰小圖案服務 ID:', totemService.id);
    
    const variants = await prisma.serviceVariant.findMany({
      where: {
        serviceId: totemService.id,
        isActive: true
      },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }]
    });
    
    console.log('\n所有啟用的變體:');
    variants.forEach(v => {
      console.log(`  類型: ${v.type} | 名稱: ${v.name} | ID: ${v.id} | 啟用: ${v.isActive}`);
      if (v.type === 'color' && v.metadata) {
        console.log(`    metadata:`, JSON.stringify(v.metadata, null, 2));
      }
    });
    
    // 檢查是否有舊的變體名稱
    const oldColorVariants = variants.filter(v => 
      v.type === 'color' && (v.name === '彩色' || v.name === '黑白')
    );
    
    if (oldColorVariants.length > 0) {
      console.log('\n⚠️ 發現舊的顏色變體名稱！');
      oldColorVariants.forEach(v => {
        console.log(`  ${v.name} (ID: ${v.id})`);
      });
    } else {
      console.log('\n✅ 沒有舊的顏色變體名稱');
    }
    
    // 檢查是否有新的專屬變體
    const newColorVariants = variants.filter(v => 
      v.type === 'color' && (v.name === '彩色-圖騰' || v.name === '黑白-圖騰')
    );
    
    if (newColorVariants.length > 0) {
      console.log('\n✅ 發現新的專屬顏色變體:');
      newColorVariants.forEach(v => {
        console.log(`  ${v.name} (ID: ${v.id})`);
        if (v.metadata) {
          console.log(`    metadata:`, JSON.stringify(v.metadata, null, 2));
        }
      });
    } else {
      console.log('\n❌ 沒有找到新的專屬顏色變體！');
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

