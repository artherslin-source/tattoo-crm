/**
 * 修復剩餘問題：
 * 1. 確保單胸口圖正確對應到單胸口圖.png
 * 2. 為圖騰小圖案創建正確的規格和價格
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function fixRemainingIssues() {
  try {
    console.log('🔧 開始修復剩餘問題...\n');
    
    // 1. 確保單胸口圖正確對應
    console.log('1️⃣ 確保單胸口圖正確對應...');
    const danXiongKouService = await prisma.service.findFirst({
      where: { name: '單胸口' },
    });
    
    if (danXiongKouService) {
      // 查找對應的圖片文件
      const jpgDir = path.join(__dirname, '..', 'JPG');
      const imageFile = '單胸口.png';
      const imagePath = path.join(jpgDir, imageFile);
      
      if (fs.existsSync(imagePath)) {
        // 檢查當前圖片URL對應的文件是否存在
        const currentImagePath = danXiongKouService.imageUrl 
          ? path.join(__dirname, danXiongKouService.imageUrl)
          : null;
        
        // 檢查metadata中的原始檔名
        let needsUpdate = false;
        if (currentImagePath && fs.existsSync(currentImagePath)) {
          const metaPath = `${currentImagePath}.meta.json`;
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            if (meta.originalName !== imageFile && meta.displayName !== imageFile) {
              needsUpdate = true;
              console.log(`  ⚠️  當前圖片metadata不匹配: ${meta.originalName || meta.displayName}`);
            }
          } else {
            needsUpdate = true;
            console.log(`  ⚠️  當前圖片沒有metadata`);
          }
        } else {
          needsUpdate = true;
          console.log(`  ⚠️  當前圖片文件不存在`);
        }
        
        if (needsUpdate) {
          // 重新上傳圖片
          const category = 'other';
          const categoryDir = path.join(__dirname, 'uploads', 'services', category);
          if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
          }
          
          // 生成唯一檔名
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(2, 8);
          const ext = path.extname(imageFile);
          const filename = `service-${timestamp}-${random}${ext}`;
          const destPath = path.join(categoryDir, filename);
          
          // 複製圖片文件
          fs.copyFileSync(imagePath, destPath);
          
          // 生成圖片 URL
          const imageUrl = `/uploads/services/${category}/${filename}`;
          
          // 保存原始檔名的中繼資料
          const metaPath = path.join(categoryDir, `${filename}.meta.json`);
          const metadata = {
            originalName: imageFile,
            displayName: imageFile,
            uploadedAt: new Date().toISOString(),
          };
          fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
          
          // 更新資料庫
          await prisma.service.update({
            where: { id: danXiongKouService.id },
            data: { imageUrl },
          });
          
          console.log(`  ✅ 單胸口圖已更新: ${imageUrl}`);
        } else {
          console.log(`  ✓ 單胸口圖已正確設置`);
        }
      } else {
        console.log(`  ⚠️  找不到圖片文件: ${imagePath}`);
      }
    }
    
    console.log('');
    
    // 2. 為圖騰小圖案創建正確的規格和價格
    console.log('2️⃣ 為圖騰小圖案創建規格和價格...');
    const totemService = await prisma.service.findFirst({
      where: { name: '圖騰小圖案' },
      include: {
        variants: true,
      },
    });
    
    if (totemService) {
      // 定義尺寸規格：T-1, T-2, ..., Y-2
      const sizeVariants = [
        { name: 'T-1', code: 'T1', sortOrder: 1, priceModifier: 0 },
        { name: 'T-2', code: 'T2', sortOrder: 2, priceModifier: 0 },
        { name: 'W-1', code: 'W1', sortOrder: 3, priceModifier: 0 },
        { name: 'W-2', code: 'W2', sortOrder: 4, priceModifier: 0 },
        { name: 'X-1', code: 'X1', sortOrder: 5, priceModifier: 0 },
        { name: 'X-2', code: 'X2', sortOrder: 6, priceModifier: 0 },
        { name: 'Y-1', code: 'Y1', sortOrder: 7, priceModifier: 0 },
        { name: 'Y-2', code: 'Y2', sortOrder: 8, priceModifier: 0 },
        { name: 'Z', code: 'Z', sortOrder: 9, priceModifier: 0 },
      ];
      
      // 定義顏色規格和對應的價格
      const colorVariants = [
        { name: '黑白', code: 'BW', sortOrder: 1, priceModifier: 0 }, // 黑白價格由尺寸決定
        { name: '彩色', code: 'COLOR', sortOrder: 2, priceModifier: 0 }, // 彩色價格需要根據尺寸計算
      ];
      
      // 創建或更新尺寸規格
      for (const sizeDef of sizeVariants) {
        const existing = totemService.variants.find(v => v.type === 'size' && v.name === sizeDef.name);
        
        if (existing) {
          await prisma.serviceVariant.update({
            where: { id: existing.id },
            data: {
              code: sizeDef.code,
              sortOrder: sizeDef.sortOrder,
              priceModifier: sizeDef.priceModifier,
            },
          });
          console.log(`  ✅ 更新尺寸規格「${sizeDef.name}」`);
        } else {
          await prisma.serviceVariant.create({
            data: {
              serviceId: totemService.id,
              type: 'size',
              name: sizeDef.name,
              code: sizeDef.code,
              sortOrder: sizeDef.sortOrder,
              priceModifier: sizeDef.priceModifier,
              isRequired: true,
              isActive: true,
            },
          });
          console.log(`  ✅ 創建尺寸規格「${sizeDef.name}」`);
        }
      }
      
      // 創建或更新顏色規格
      // 注意：彩色的價格需要根據尺寸動態計算，這裡先設置基礎價格
      // 實際價格計算邏輯在後端處理
      for (const colorDef of colorVariants) {
        const existing = totemService.variants.find(v => v.type === 'color' && v.name === colorDef.name);
        
        if (existing) {
          await prisma.serviceVariant.update({
            where: { id: existing.id },
            data: {
              code: colorDef.code,
              sortOrder: colorDef.sortOrder,
            },
          });
          console.log(`  ✅ 更新顏色規格「${colorDef.name}」`);
        } else {
          await prisma.serviceVariant.create({
            data: {
              serviceId: totemService.id,
              type: 'color',
              name: colorDef.name,
              code: colorDef.code,
              sortOrder: colorDef.sortOrder,
              priceModifier: colorDef.priceModifier,
              isRequired: true,
              isActive: true,
            },
          });
          console.log(`  ✅ 創建顏色規格「${colorDef.name}」`);
        }
      }
      
      // 現在需要為每個尺寸+彩色的組合設置正確的價格
      // 彩色價格：T-1=3000, T-2=4000, ..., Y-2=14000, Z=1000
      const colorPrices = {
        'T-1': 3000,
        'T-2': 4000,
        'W-1': 5000,
        'W-2': 6000,
        'X-1': 7000,
        'X-2': 8000,
        'Y-1': 9000,
        'Y-2': 14000,
        'Z': 1000,
      };
      
      // 創建尺寸+顏色的組合規格（使用metadata存儲價格信息）
      // 或者更新現有的顏色規格，使用metadata存儲每個尺寸的價格
      const colorVariant = await prisma.serviceVariant.findFirst({
        where: {
          serviceId: totemService.id,
          type: 'color',
          name: '彩色',
        },
      });
      
      if (colorVariant) {
        // 使用metadata存儲尺寸對應的價格
        const metadata = {
          sizePrices: colorPrices,
          note: '彩色價格根據尺寸動態計算',
        };
        
        await prisma.serviceVariant.update({
          where: { id: colorVariant.id },
          data: {
            metadata: metadata,
          },
        });
        
        console.log(`  ✅ 設置彩色規格的價格映射`);
      }
      
      console.log(`  📊 彩色價格對應表:`);
      Object.entries(colorPrices).forEach(([size, price]) => {
        console.log(`    ${size}: NT$ ${price.toLocaleString()}`);
      });
    } else {
      console.log(`  ⚠️  找不到圖騰小圖案服務項目`);
    }
    
    console.log('\n🎉 所有問題已修復！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingIssues();

