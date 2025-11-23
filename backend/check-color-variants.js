const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    console.log('檢查所有服務的彩色變體:');
    
    for (const svc of services) {
      const colorVariants = await prisma.serviceVariant.findMany({
        where: {
          serviceId: svc.id,
          type: 'color',
          name: '彩色'
        },
        select: { id: true, metadata: true }
      });
      
      if (colorVariants.length > 0) {
        colorVariants.forEach(v => {
          if (v.metadata) {
            const meta = v.metadata;
            if (meta.useSizeMetadata || (meta.note && meta.note.includes('價格根據尺寸'))) {
              console.log('\n服務:', svc.name, '(ID:', svc.id + ')');
              console.log('  變體 ID:', v.id);
              console.log('  metadata:', JSON.stringify(meta, null, 2));
            }
          }
        });
      }
    }
    
    // 檢查圖騰小圖案的彩色變體
    const totemService = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' }
    });
    
    if (totemService) {
      const totemColorVariant = await prisma.serviceVariant.findFirst({
        where: {
          serviceId: totemService.id,
          type: 'color',
          name: '彩色'
        }
      });
      
      if (totemColorVariant) {
        console.log('\n\n圖騰小圖案的彩色變體:');
        console.log('  變體 ID:', totemColorVariant.id);
        console.log('  metadata:', JSON.stringify(totemColorVariant.metadata, null, 2));
      }
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

