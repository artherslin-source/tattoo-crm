/**
 * 更新圖騰小圖案的價格邏輯：
 * - 彩色價格 = 黑白價格 + 1000（但Z尺寸除外，Z彩色=1000）
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTotemPricing() {
  try {
    console.log('🔧 開始更新圖騰小圖案的價格邏輯...\n');
    
    // 1. 查找圖騰小圖案服務
    const service = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' },
      include: {
        variants: {
          where: { type: { in: ['size', 'color'] } },
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    });
    
    if (!service) {
      console.log('❌ 找不到圖騰小圖案服務項目');
      return;
    }
    
    console.log(`✅ 找到服務項目: ${service.name} (ID: ${service.id})\n`);
    
    // 2. 定義尺寸價格（黑白價格）
    // 根據現有的彩色價格反推：彩色 = 黑白 + 1000
    // T-1=3000 -> 黑白=2000, T-2=4000 -> 黑白=3000, ..., Y-2=14000 -> 黑白=13000
    const sizePrices = {
      'T-1': 2000,
      'T-2': 3000,
      'W-1': 4000,
      'W-2': 5000,
      'X-1': 6000,
      'X-2': 7000,
      'Y-1': 8000,
      'Y-2': 13000,
      'Z': 0, // Z尺寸黑白價格為0（因為Z彩色=1000，且不適用+1000規則）
    };
    
    // 3. 更新尺寸規格的priceModifier
    console.log('📊 更新尺寸規格的價格...');
    for (const [sizeName, price] of Object.entries(sizePrices)) {
      const sizeVariant = service.variants.find(
        v => v.type === 'size' && v.name === sizeName
      );
      
      if (sizeVariant) {
        await prisma.serviceVariant.update({
          where: { id: sizeVariant.id },
          data: { priceModifier: price },
        });
        console.log(`  ✅ 更新尺寸「${sizeName}」: NT$ ${price.toLocaleString()}`);
      } else {
        console.log(`  ⚠️  找不到尺寸「${sizeName}」`);
      }
    }
    
    // 4. 更新彩色規格的metadata
    console.log('\n📊 更新彩色規格的metadata...');
    const colorVariant = service.variants.find(
      v => v.type === 'color' && v.name === '彩色'
    );
    
    if (colorVariant) {
      const metadata = {
        note: '彩色價格 = 黑白價格 + 1000（Z尺寸除外，Z彩色=1000）',
        colorPriceDiff: 1000, // 彩色比黑白多1000
        excludeSizes: ['Z'], // 排除的尺寸
        zColorPrice: 1000, // Z尺寸的彩色價格
      };
      
      await prisma.serviceVariant.update({
        where: { id: colorVariant.id },
        data: { metadata: metadata },
      });
      
      console.log(`  ✅ 更新彩色規格的metadata`);
      console.log(`     - 彩色比黑白多: NT$ ${metadata.colorPriceDiff.toLocaleString()}`);
      console.log(`     - 排除尺寸: ${metadata.excludeSizes.join(', ')}`);
      console.log(`     - Z彩色價格: NT$ ${metadata.zColorPrice.toLocaleString()}`);
    } else {
      console.log('  ⚠️  找不到彩色規格');
    }
    
    // 5. 驗證最終狀態
    console.log('\n📊 最終價格對應表:');
    console.log('尺寸 | 黑白價格 | 彩色價格');
    console.log('-----|---------|---------');
    for (const [sizeName, blackWhitePrice] of Object.entries(sizePrices)) {
      let colorPrice;
      if (sizeName === 'Z') {
        colorPrice = 1000;
      } else {
        colorPrice = blackWhitePrice + 1000;
      }
      console.log(`${sizeName.padEnd(4)} | NT$ ${String(blackWhitePrice).padStart(5)} | NT$ ${String(colorPrice).padStart(5)}`);
    }
    
    console.log('\n🎉 價格邏輯更新完成！');
    
  } catch (error) {
    console.error('❌ 更新失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateTotemPricing();

