/**
 * 根據價格表更新服務項目的顏色規格價格
 * 
 * 價格表結構：
 * - 割線A (Line Work) - 基礎價格
 * - 黑白B (Black & White) - 完整價格
 * - 半彩C (Half Color) - 半彩色價格
 * - 全彩D (Full Color) - 全彩色價格
 */

const SERVICE_COLOR_PRICES = {
  '半胛圖': {
    '割線': 5000,
    '黑白': 40000,
    '半彩': 50000,
    '全彩': 60000,
  },
  '排胛圖': {
    '割線': 15000,
    '黑白': 100000,
    '半彩': 120000,
    '全彩': 150000,
  },
  '大腿表面': {
    '割線': 5000,
    '黑白': 30000,
    '半彩': 40000,
    '全彩': 50000,
  },
  '大腿全包': {
    '割線': 10000,
    '黑白': 80000,
    '半彩': 100000,
    '全彩': 150000,
  },
  '小腿表面': {
    '割線': 5000,
    '黑白': 20000,
    '半彩': 30000,
    '全彩': 40000,
  },
  '小腿全包': {
    '割線': 5000,
    '黑白': 40000,
    '半彩': 50000,
    '全彩': 60000,
  },
  '前手臂': {
    '割線': 5000,
    '黑白': 30000,
    '半彩': 35000,
    '全彩': 40000,
  },
  '上手臂': {
    '割線': 5000,
    '黑白': 30000,
    '半彩': 35000,
    '全彩': 40000,
  },
  '大小腿包全肢': {
    '割線': 20000,
    '黑白': 150000,
    '半彩': 180000,
    '全彩': 200000,
  },
  '上下手臂全肢': {
    '割線': 10000,
    '黑白': 80000,
    '半彩': 120000,
    '全彩': 150000,
  },
  '單胸到包全手': {
    '割線': 15000,
    '黑白': 100000,
    '半彩': 150000,
    '全彩': 180000,
  },
  '大背後圖': {
    '割線': 15000,
    '黑白': 150000,
    '半彩': 180000,
    '全彩': 200000,
  },
  '背後左或右圖': {
    '割線': 10000,
    '黑白': 70000,
    '半彩': 80000,
    '全彩': 100000,
  },
  '大背到大腿圖': {
    '割線': 25000,
    '黑白': 180000,
    '半彩': 250000,
    '全彩': 300000,
  },
  '雙胸到腹肚圖': {
    '割線': 15000,
    '黑白': 150000,
    '半彩': 180000,
    '全彩': 200000,
  },
  '雙前胸口圖': {
    '割線': 10000,
    '黑白': 40000,
    '半彩': 50000,
    '全彩': 60000,
  },
  '單胸口': {
    '割線': 5000,
    '黑白': 20000,
    '半彩': 25000,
    '全彩': 30000,
  },
  '腹肚圖': {
    '割線': 10000,
    '黑白': 50000,
    '半彩': 70000,
    '全彩': 90000,
  },
  '單胸腹肚圖': {
    '割線': 10000,
    '黑白': 80000,
    '半彩': 100000,
    '全彩': 120000,
  },
};

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';

async function updateServiceColorPrices() {
  console.log('🚀 開始更新服務項目顏色價格...\n');

  for (const [serviceName, colorPrices] of Object.entries(SERVICE_COLOR_PRICES)) {
    console.log(`📋 處理服務項目: ${serviceName}`);

    try {
      // 1. 查找服務項目
      const servicesResponse = await fetch(`${API_BASE}/admin/services`, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
      });

      if (!servicesResponse.ok) {
        throw new Error(`獲取服務列表失敗: ${servicesResponse.status}`);
      }

      const services = await servicesResponse.json();
      const service = services.find((s) => s.name === serviceName);

      if (!service) {
        console.log(`⚠️  服務項目「${serviceName}」不存在，跳過`);
        continue;
      }

      console.log(`   ✅ 找到服務項目 ID: ${service.id}`);

      // 2. 獲取該服務的所有規格
      const variantsResponse = await fetch(`${API_BASE}/admin/service-variants/service/${service.id}`, {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
      });

      if (!variantsResponse.ok) {
        throw new Error(`獲取規格失敗: ${variantsResponse.status}`);
      }

      const variants = await variantsResponse.json();
      const colorVariants = variants.color || [];

      console.log(`   📊 找到 ${colorVariants.length} 個顏色規格`);

      // 3. 更新或創建顏色規格
      const colorNames = ['割線', '黑白', '半彩', '全彩'];
      
      for (const colorName of colorNames) {
        const targetPrice = colorPrices[colorName];
        
        if (targetPrice === undefined) {
          console.log(`   ⚠️  顏色「${colorName}」在價格表中不存在，跳過`);
          continue;
        }

        // 查找現有的顏色規格
        let existingVariant = colorVariants.find((v) => v.name === colorName);

        if (existingVariant) {
          // 更新現有規格
          console.log(`   🔄 更新顏色規格「${colorName}」: ${existingVariant.priceModifier} → ${targetPrice}`);
          
          const updateResponse = await fetch(`${API_BASE}/admin/service-variants/${existingVariant.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              priceModifier: targetPrice,
            }),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`更新規格失敗: ${updateResponse.status} - ${errorText}`);
          }

          console.log(`   ✅ 已更新顏色規格「${colorName}」`);
        } else {
          // 創建新規格
          console.log(`   ➕ 創建顏色規格「${colorName}」: ${targetPrice}`);
          
          const createResponse = await fetch(`${API_BASE}/admin/service-variants`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              serviceId: service.id,
              type: 'color',
              name: colorName,
              code: colorName === '割線' ? 'LINE' : colorName === '黑白' ? 'BW' : colorName === '半彩' ? 'HALF' : 'FULL',
              priceModifier: targetPrice,
              sortOrder: colorName === '割線' ? 1 : colorName === '黑白' ? 2 : colorName === '半彩' ? 3 : 4,
              isRequired: true,
              description: colorName === '割線' ? '割線（基礎價格）' : colorName === '黑白' ? '黑白陰影' : colorName === '半彩' ? '背景黑白/主圖彩色' : '全彩色漸層',
            }),
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`創建規格失敗: ${createResponse.status} - ${errorText}`);
          }

          console.log(`   ✅ 已創建顏色規格「${colorName}」`);
        }
      }

      console.log(`   ✅ 服務項目「${serviceName}」處理完成\n`);
    } catch (error) {
      console.error(`   ❌ 處理服務項目「${serviceName}」時發生錯誤:`, error.message);
      console.log('');
    }
  }

  console.log('✅ 所有服務項目顏色價格更新完成！');
}

// 執行更新
if (require.main === module) {
  if (!ACCESS_TOKEN) {
    console.error('❌ 請設置 ACCESS_TOKEN 環境變數');
    console.log('使用方法: ACCESS_TOKEN=your_token API_BASE=https://your-api.com node update-service-color-prices.js');
    process.exit(1);
  }

  updateServiceColorPrices().catch((error) => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  });
}

module.exports = { updateServiceColorPrices, SERVICE_COLOR_PRICES };

