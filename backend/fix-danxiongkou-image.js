/**
 * 修復單胸口圖的圖片對應問題
 * 確保圖片文件存在，metadata正確，並且資料庫中的imageUrl正確
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function fixDanXiongKouImage() {
  try {
    console.log('🔧 開始修復單胸口圖的圖片對應...\n');
    
    // 1. 查找單胸口服務
    const service = await prisma.service.findFirst({
      where: { name: '單胸口' },
    });
    
    if (!service) {
      console.log('❌ 找不到單胸口服務項目');
      return;
    }
    
    console.log(`✅ 找到服務項目: ${service.name} (ID: ${service.id})`);
    console.log(`   當前圖片URL: ${service.imageUrl || '(無圖片)'}\n`);
    
    // 2. 查找JPG資料夾中的圖片
    const jpgDir = path.join(__dirname, '..', 'JPG');
    const imageFile = '單胸口.png';
    const sourceImagePath = path.join(jpgDir, imageFile);
    
    if (!fs.existsSync(sourceImagePath)) {
      console.log(`❌ 找不到源圖片文件: ${sourceImagePath}`);
      return;
    }
    
    console.log(`✅ 找到源圖片文件: ${sourceImagePath}`);
    const sourceStats = fs.statSync(sourceImagePath);
    console.log(`   文件大小: ${sourceStats.size} bytes\n`);
    
    // 3. 確保目標目錄存在
    const category = 'other';
    const categoryDir = path.join(__dirname, 'uploads', 'services', category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
      console.log(`✅ 創建目錄: ${categoryDir}`);
    }
    
    // 4. 查找現有圖片（根據metadata中的originalName）
    let targetImagePath = null;
    let targetImageUrl = null;
    
    if (fs.existsSync(categoryDir)) {
      const files = fs.readdirSync(categoryDir).filter(f => 
        (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) && 
        !f.endsWith('.meta.json')
      );
      
      for (const file of files) {
        const metaPath = path.join(categoryDir, `${file}.meta.json`);
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            if (meta.originalName === imageFile || meta.displayName === imageFile) {
              targetImagePath = path.join(categoryDir, file);
              targetImageUrl = `/uploads/services/${category}/${file}`;
              console.log(`✅ 找到現有圖片: ${file}`);
              console.log(`   Metadata: originalName=${meta.originalName}, displayName=${meta.displayName}`);
              break;
            }
          } catch (e) {
            // 忽略無法解析的metadata
          }
        }
      }
    }
    
    // 5. 如果沒有找到現有圖片，或者現有圖片與服務不匹配，創建新的
    if (!targetImagePath || service.imageUrl !== targetImageUrl) {
      console.log('\n📤 創建新的圖片文件...');
      
      // 生成唯一檔名
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = path.extname(imageFile);
      const filename = `service-${timestamp}-${random}${ext}`;
      targetImagePath = path.join(categoryDir, filename);
      targetImageUrl = `/uploads/services/${category}/${filename}`;
      
      // 複製圖片文件
      fs.copyFileSync(sourceImagePath, targetImagePath);
      console.log(`✅ 複製圖片文件: ${filename}`);
      
      // 保存metadata
      const metaPath = path.join(categoryDir, `${filename}.meta.json`);
      const metadata = {
        originalName: imageFile,
        displayName: imageFile,
        uploadedAt: new Date().toISOString(),
      };
      fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
      console.log(`✅ 保存metadata: ${filename}.meta.json`);
    } else {
      console.log('\n✅ 現有圖片文件已存在且正確');
      
      // 驗證圖片文件是否存在
      if (!fs.existsSync(targetImagePath)) {
        console.log(`⚠️  圖片文件不存在，重新複製...`);
        fs.copyFileSync(sourceImagePath, targetImagePath);
        console.log(`✅ 重新複製圖片文件`);
      }
      
      // 驗證metadata
      const metaPath = `${targetImagePath}.meta.json`;
      if (!fs.existsSync(metaPath)) {
        console.log(`⚠️  Metadata文件不存在，重新創建...`);
        const metadata = {
          originalName: imageFile,
          displayName: imageFile,
          uploadedAt: new Date().toISOString(),
        };
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
        console.log(`✅ 重新創建metadata`);
      }
    }
    
    // 6. 更新資料庫
    if (service.imageUrl !== targetImageUrl) {
      console.log('\n💾 更新資料庫中的imageUrl...');
      await prisma.service.update({
        where: { id: service.id },
        data: { imageUrl: targetImageUrl },
      });
      console.log(`✅ 已更新資料庫: ${targetImageUrl}`);
    } else {
      console.log('\n✅ 資料庫中的imageUrl已正確');
    }
    
    // 7. 驗證最終狀態
    console.log('\n📊 最終狀態:');
    const updatedService = await prisma.service.findFirst({
      where: { id: service.id },
      select: { name: true, imageUrl: true },
    });
    console.log(`   服務名稱: ${updatedService.name}`);
    console.log(`   圖片URL: ${updatedService.imageUrl}`);
    console.log(`   圖片文件存在: ${fs.existsSync(path.join(__dirname, updatedService.imageUrl))}`);
    
    const finalMetaPath = path.join(__dirname, updatedService.imageUrl + '.meta.json');
    if (fs.existsSync(finalMetaPath)) {
      const finalMeta = JSON.parse(fs.readFileSync(finalMetaPath, 'utf8'));
      console.log(`   Metadata: originalName=${finalMeta.originalName}, displayName=${finalMeta.displayName}`);
    }
    
    console.log('\n🎉 修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixDanXiongKouImage();

