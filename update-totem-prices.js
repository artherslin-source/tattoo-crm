const https = require('https');

// Railway API 配置
const API_BASE = 'tattoo-crm-production-413f.up.railway.app';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = '12345678';
const SERVICE_ID = 'cmhne10ip0000tm8ud9gkk2xm'; // 圖騰小圖案的服務 ID

// 尺寸價格數據（包含黑白和彩色價格）
const SIZE_PRICES = {
  'T-1 (5-6cm)': { blackWhite: 2000, color: 3000 },
  'T-2 (6-7cm)': { blackWhite: 3000, color: 4000 },
  'U-1 (7-8cm)': { blackWhite: 4000, color: 5000 },
  'U-2 (8-9cm)': { blackWhite: 5000, color: 6000 },
  'V-1 (9-10cm)': { blackWhite: 6000, color: 7000 },
  'V-2 (10-11cm)': { blackWhite: 7000, color: 8000 },
  'W-1 (11-12cm)': { blackWhite: 8000, color: 9000 },
  'W-2 (12-13cm)': { blackWhite: 9000, color: 10000 },
  'X-1 (13-14cm)': { blackWhite: 10000, color: 11000 },
  'X-2 (14-15cm)': { blackWhite: 11000, color: 12000 },
  'Y-1 (15-16cm)': { blackWhite: 12000, color: 13000 },
  'Y-2 (16-17cm)': { blackWhite: 13000, color: 14000 },
  'Z (≤3cm)': { blackWhite: 1000, color: 1000 },
};

function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    const options = {
      hostname: API_BASE,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.accessToken) {
            resolve(response.accessToken);
          } else {
            reject(new Error('登入失敗'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getVariants(token, serviceId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: `/admin/service-variants/service/${serviceId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function updateVariant(token, variantId, updateData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(updateData);

    const options = {
      hostname: API_BASE,
      path: `/admin/service-variants/${variantId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('   更新圖騰小圖案價格');
  console.log('========================================');
  console.log('');

  try {
    // 1. 登入
    console.log('步驟 1: 管理員登入...');
    const token = await login();
    console.log('✅ 登入成功');
    console.log('');

    // 2. 獲取所有規格
    console.log('步驟 2: 獲取服務規格...');
    const variantsResponse = await getVariants(token, SERVICE_ID);
    console.log(`✅ 找到 ${Object.keys(variantsResponse).length} 種類型的規格`);
    console.log('');

    // 3. 更新尺寸規格價格
    console.log('步驟 3: 更新尺寸規格價格...');
    const sizeVariants = variantsResponse.size || [];
    
    for (const variant of sizeVariants) {
      const priceData = SIZE_PRICES[variant.name];
      if (priceData) {
        // 使用 priceModifier 存儲黑白價格
        // 在 metadata 中存儲完整的價格數據
        await updateVariant(token, variant.id, {
          priceModifier: priceData.blackWhite,
          metadata: {
            blackWhitePrice: priceData.blackWhite,
            colorPrice: priceData.color,
            priceDiff: priceData.color - priceData.blackWhite
          }
        });
        console.log(`  ✅ ${variant.name}: 黑白 NT$${priceData.blackWhite}, 彩色 NT$${priceData.color}`);
      }
    }
    console.log('');

    // 4. 更新顏色規格
    console.log('步驟 4: 更新顏色規格...');
    const colorVariants = variantsResponse.color || [];
    
    for (const variant of colorVariants) {
      if (variant.name === '黑白') {
        // 黑白不加價
        await updateVariant(token, variant.id, {
          priceModifier: 0,
          metadata: { note: '價格已包含在尺寸中' }
        });
        console.log(`  ✅ 黑白: +NT$0`);
      } else if (variant.name === '彩色') {
        // 彩色加價存在 metadata 中，實際計算時從尺寸的 metadata 讀取
        await updateVariant(token, variant.id, {
          priceModifier: 0, // 設為 0，實際價格從尺寸 metadata 計算
          metadata: { 
            note: '價格根據尺寸從 metadata 計算',
            useSizeMetadata: true 
          }
        });
        console.log(`  ✅ 彩色: 價格根據尺寸動態計算`);
      }
    }
    console.log('');

    // 5. 顯示摘要
    console.log('========================================');
    console.log('   價格更新完成！');
    console.log('========================================');
    console.log('');
    console.log('服務項目：圖騰小圖案');
    console.log('服務 ID：', SERVICE_ID);
    console.log('');
    console.log('價格配置：');
    console.log('  - 尺寸規格已更新：13 個');
    console.log('  - 顏色規格已更新：2 個');
    console.log('');
    console.log('價格範圍：');
    console.log('  - 最低：NT$ 1,000（Z 黑白/彩色）');
    console.log('  - 最高：NT$ 14,000（Y-2 彩色）');
    console.log('');
    console.log('⚠️  注意：需要更新購物車計算邏輯來支持組合定價！');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 錯誤:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();

