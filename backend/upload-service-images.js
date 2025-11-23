/**
 * 上傳服務項目圖片並更新資料庫
 * 從 JPG 資料夾讀取圖片，根據檔名匹配服務項目，上傳並更新 imageUrl
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// 服務名稱到分類的映射
const SERVICE_CATEGORY_MAP = {
  '上下手臂全肢': 'arm',
  '上手臂': 'arm',
  '前手臂': 'arm',
  '半臂圖': 'arm',
  '半胛圖': 'arm', // 這個應該是 back，但檔名是半胛圖
  '排胛圖': 'back',
  '大小腿包全肢': 'leg',
  '大背到大腿圖': 'back',
  '大背後圖': 'back',
  '大腿全包': 'leg',
  '大腿表面': 'leg',
  '小腿全包': 'leg',
  '小腿表面': 'leg',
  '背後左或右圖': 'back',
  '單胸到包全手': 'other',
  '單胸口': 'other',
  '單胸腹肚圖': 'other',
  '排肚圖': 'other',
  '腹肚圖': 'other',
  '雙前胸口圖': 'other',
  '雙胸到腹肚圖': 'other',
};

// 生成唯一檔名
function generateFilename(originalName) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `service-${timestamp}-${random}${ext}`;
}

async function uploadServiceImages() {
  try {
    console.log('🚀 開始上傳服務項目圖片...\n');
    
    // 1. 讀取所有服務項目
    const services = await prisma.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        imageUrl: true,
      },
    });
    
    console.log(`📊 找到 ${services.length} 個服務項目\n`);
    
    // 2. 讀取 JPG 資料夾中的圖片
    const jpgDir = path.join(__dirname, '..', 'JPG');
    if (!fs.existsSync(jpgDir)) {
      throw new Error(`找不到 JPG 資料夾: ${jpgDir}`);
    }
    
    const imageFiles = fs.readdirSync(jpgDir).filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    console.log(`📸 找到 ${imageFiles.length} 張圖片\n`);
    
    // 3. 建立服務名稱到服務的映射
    const serviceMap = new Map();
    services.forEach(service => {
      serviceMap.set(service.name, service);
    });
    
    // 名稱映射（圖片檔名 -> 資料庫服務名稱）
    const nameMapping = {
      '半胛圖': '半臂圖',
      '排胛圖': '排肚圖',
    };
    
    // 4. 處理每張圖片
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const imageFile of imageFiles) {
      try {
        // 從檔名提取服務名稱（去除副檔名）
        let serviceName = path.basename(imageFile, path.extname(imageFile));
        
        // 如果有映射，使用映射後的名稱
        if (nameMapping[serviceName]) {
          serviceName = nameMapping[serviceName];
        }
        
        // 查找對應的服務
        const service = serviceMap.get(serviceName);
        
        if (!service) {
          console.log(`⚠️  找不到服務項目: ${serviceName}`);
          errorCount++;
          continue;
        }
        
        // 確定分類
        let category = SERVICE_CATEGORY_MAP[serviceName];
        if (!category) {
          // 如果映射表中沒有，使用服務的 category 欄位
          if (service.category === 'Arm') category = 'arm';
          else if (service.category === 'Leg') category = 'leg';
          else if (service.category === 'Back') category = 'back';
          else if (service.category === 'Torso') category = 'other';
          else category = 'other';
        }
        
        // 建立分類資料夾
        const categoryDir = path.join(__dirname, 'uploads', 'services', category);
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }
        
        // 生成唯一檔名
        const filename = generateFilename(imageFile);
        const destPath = path.join(categoryDir, filename);
        
        // 複製圖片文件
        const sourcePath = path.join(jpgDir, imageFile);
        fs.copyFileSync(sourcePath, destPath);
        
        // 生成圖片 URL
        const imageUrl = `/uploads/services/${category}/${filename}`;
        
        // 保存原始檔名的中繼資料
        const metaPath = path.join(categoryDir, `${filename}.meta.json`);
        const metadata = {
          originalName: serviceName + path.extname(imageFile),
          displayName: serviceName + path.extname(imageFile),
          uploadedAt: new Date().toISOString(),
        };
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
        
        // 更新資料庫
        await prisma.service.update({
          where: { id: service.id },
          data: { imageUrl },
        });
        
        console.log(`✅ ${serviceName}: ${imageUrl}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 處理 ${imageFile} 失敗:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 處理結果:');
    console.log(`  ✅ 成功: ${successCount} 個`);
    console.log(`  ⚠️  跳過: ${skipCount} 個`);
    console.log(`  ❌ 失敗: ${errorCount} 個`);
    console.log('\n🎉 完成！');
    
  } catch (error) {
    console.error('❌ 上傳失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

uploadServiceImages();

