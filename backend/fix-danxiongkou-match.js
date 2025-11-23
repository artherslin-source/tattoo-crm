/**
 * 修復單胸口圖的圖片匹配問題
 * 參照其他服務項目的匹配邏輯，確保單胸口圖正確對應
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function fixDanXiongKouMatch() {
  try {
    console.log('🔧 開始修復單胸口圖的圖片匹配...\n');
    
    // 1. 模擬 ensureServiceImages 的邏輯，建立圖片映射
    const imageMap = new Map();
    const gitServicesPath = path.join(__dirname, 'uploads', 'services');
    const categories = ['arm', 'leg', 'back', 'other'];
    
    console.log('📸 建立圖片映射...');
    for (const category of categories) {
      const categoryPath = path.join(gitServicesPath, category);
      if (fs.existsSync(categoryPath)) {
        const files = fs.readdirSync(categoryPath).filter(f => 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );
        
        for (const file of files) {
          const metaPath = path.join(categoryPath, `${file}.meta.json`);
          let serviceName = file;
          
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              serviceName = (meta.originalName || meta.displayName || file).replace(/\.[^/.]+$/, '');
            } catch (e) {
              // 忽略 metadata 讀取錯誤
            }
          } else {
            // 如果沒有 metadata，從檔名推測
            serviceName = file.replace(/^service-\d+-[^-]+-/, '').replace(/\.[^/.]+$/, '');
          }
          
          const imageUrl = `/uploads/services/${category}/${file}`;
          // 如果已經有這個服務名稱的圖片，保留最新的（檔名時間戳較大）
          if (!imageMap.has(serviceName) || file > imageMap.get(serviceName).split('/').pop()) {
            imageMap.set(serviceName, imageUrl);
          }
        }
      }
    }
    
    console.log(`✅ 建立圖片映射: ${imageMap.size} 張圖片\n`);
    
    // 2. 檢查單胸口圖的匹配情況
    console.log('🔍 檢查單胸口圖的匹配情況...');
    const danXiongKouService = await prisma.service.findFirst({
      where: { name: '單胸口' },
      select: { id: true, name: true, imageUrl: true },
    });
    
    if (!danXiongKouService) {
      console.log('❌ 找不到單胸口服務項目');
      return;
    }
    
    const matchedImageUrl = imageMap.get('單胸口');
    console.log(`   服務名稱: ${danXiongKouService.name}`);
    console.log(`   當前圖片URL: ${danXiongKouService.imageUrl || '(無圖片)'}`);
    console.log(`   匹配的圖片URL: ${matchedImageUrl || '(無匹配)'}`);
    console.log(`   是否匹配: ${danXiongKouService.imageUrl === matchedImageUrl ? '✅ 是' : '❌ 否'}\n`);
    
    // 3. 檢查其他服務項目的匹配情況（作為參考）
    console.log('📊 檢查其他服務項目的匹配情況（作為參考）...');
    const referenceServices = await prisma.service.findMany({
      where: { 
        name: { in: ['大背後圖', '雙前胸口圖', '雙胸到腹肚圖'] },
        isActive: true 
      },
      select: { name: true, imageUrl: true },
    });
    
    for (const refService of referenceServices) {
      const refMatchedUrl = imageMap.get(refService.name);
      const isMatched = refService.imageUrl === refMatchedUrl;
      console.log(`   ${refService.name}: ${isMatched ? '✅' : '❌'} ${refService.imageUrl} === ${refMatchedUrl}`);
    }
    console.log('');
    
    // 4. 如果單胸口圖不匹配，更新它
    if (matchedImageUrl && danXiongKouService.imageUrl !== matchedImageUrl) {
      console.log('🔄 更新單胸口圖的圖片URL...');
      
      // 確保圖片文件存在
      const imagePath = path.join(__dirname, matchedImageUrl);
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  圖片文件不存在: ${imagePath}`);
        console.log('   這應該在 Railway 部署時自動修復');
      } else {
        console.log(`✅ 圖片文件存在: ${imagePath}`);
      }
      
      // 更新資料庫
      await prisma.service.update({
        where: { id: danXiongKouService.id },
        data: { imageUrl: matchedImageUrl },
      });
      
      console.log(`✅ 已更新資料庫: ${matchedImageUrl}\n`);
    } else if (!matchedImageUrl) {
      console.log('❌ 找不到匹配的圖片！');
      console.log('   可用的服務名稱映射:');
      for (const [name, url] of imageMap.entries()) {
        if (name.includes('單胸') || name.includes('胸口')) {
          console.log(`     ${name} -> ${url}`);
        }
      }
    } else {
      console.log('✅ 單胸口圖已經正確匹配！');
    }
    
    // 5. 驗證最終狀態
    console.log('\n📊 最終狀態:');
    const finalService = await prisma.service.findFirst({
      where: { id: danXiongKouService.id },
      select: { name: true, imageUrl: true },
    });
    console.log(`   服務名稱: ${finalService.name}`);
    console.log(`   圖片URL: ${finalService.imageUrl}`);
    console.log(`   匹配的圖片URL: ${imageMap.get(finalService.name)}`);
    console.log(`   是否匹配: ${finalService.imageUrl === imageMap.get(finalService.name) ? '✅ 是' : '❌ 否'}`);
    
    console.log('\n🎉 修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixDanXiongKouMatch();

