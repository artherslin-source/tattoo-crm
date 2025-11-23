const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 查找圖騰小圖案服務
    const service = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' }
    });
    
    if (!service) {
      console.log('❌ 找不到圖騰小圖案服務');
      return;
    }
    
    console.log('✅ 找到服務:', service.name, '(ID:', service.id + ')');
    
    // 獲取所有彩色變體
    const colorVariants = await prisma.serviceVariant.findMany({
      where: {
        serviceId: service.id,
        type: 'color',
        name: '彩色'
      }
    });
    
    console.log('\n彩色變體數量:', colorVariants.length);
    
    colorVariants.forEach((variant, index) => {
      console.log(`\n彩色變體 #${index + 1}:`);
      console.log('  ID:', variant.id);
      console.log('  Metadata:', JSON.stringify(variant.metadata, null, 2));
      
      if (variant.metadata) {
        const meta = variant.metadata;
        console.log('  has colorPriceDiff:', meta.colorPriceDiff !== undefined);
        console.log('  colorPriceDiff:', meta.colorPriceDiff);
        console.log('  has useSizeMetadata:', meta.useSizeMetadata !== undefined);
      }
    });
    
    // 檢查是否有錯誤的 metadata
    const wrongMetadata = colorVariants.find(v => {
      if (!v.metadata) return false;
      const meta = v.metadata;
      return meta.useSizeMetadata === true && !meta.colorPriceDiff;
    });
    
    if (wrongMetadata) {
      console.log('\n⚠️ 發現錯誤的 metadata！');
      console.log('變體 ID:', wrongMetadata.id);
      console.log('需要修復！');
    } else {
      console.log('\n✅ 所有彩色變體的 metadata 都是正確的');
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

