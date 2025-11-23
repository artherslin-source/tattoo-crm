const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. 檢查圖騰小圖案的所有顏色變體
    const totemService = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' }
    });
    
    if (totemService) {
      console.log('圖騰小圖案服務 ID:', totemService.id);
      const allColorVariants = await prisma.serviceVariant.findMany({
        where: {
          serviceId: totemService.id,
          type: 'color'
        },
        select: {
          id: true,
          name: true,
          metadata: true,
          isActive: true
        }
      });
      
      console.log('\n所有顏色變體:');
      allColorVariants.forEach(v => {
        console.log('  變體 ID:', v.id);
        console.log('  名稱:', v.name);
        console.log('  啟用:', v.isActive);
        console.log('  metadata:', JSON.stringify(v.metadata, null, 2));
        console.log('');
      });
    }
    
    // 2. 檢查前端收到的變體 ID
    const variantId = 'cmhne9bsa000utm8uip7hc94t';
    const variant = await prisma.serviceVariant.findUnique({
      where: { id: variantId },
      include: {
        service: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (variant) {
      console.log('\n\n前端收到的變體 ID:', variantId);
      console.log('  服務 ID:', variant.serviceId);
      console.log('  服務名稱:', variant.service?.name);
      console.log('  變體類型:', variant.type);
      console.log('  變體名稱:', variant.name);
      console.log('  metadata:', JSON.stringify(variant.metadata, null, 2));
    } else {
      console.log('\n\n找不到變體 ID:', variantId);
    }
    
    // 3. 檢查所有服務的彩色變體 ID
    console.log('\n\n檢查所有服務的彩色變體 ID:');
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    for (const svc of services) {
      const colorVariants = await prisma.serviceVariant.findMany({
        where: {
          serviceId: svc.id,
          type: 'color',
          name: '彩色'
        },
        select: { id: true }
      });
      
      if (colorVariants.length > 0) {
        console.log('\n服務:', svc.name, '(ID:', svc.id + ')');
        colorVariants.forEach(v => {
          console.log('  彩色變體 ID:', v.id);
        });
      }
    }
    
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

