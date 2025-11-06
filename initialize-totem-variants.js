const https = require('https');

const API_BASE = 'tattoo-crm-production-413f.up.railway.app';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = '12345678';
const SERVICE_ID = 'cmhne10ip0000tm8ud9gkk2xm';

// 尺寸規格數據
const SIZE_VARIANTS = [
  { code: 'T-1', name: 'T-1 (5-6cm)', description: '5公分~6公分', blackWhite: 2000, color: 3000, sortOrder: 1 },
  { code: 'T-2', name: 'T-2 (6-7cm)', description: '6公分~7公分', blackWhite: 3000, color: 4000, sortOrder: 2 },
  { code: 'U-1', name: 'U-1 (7-8cm)', description: '7公分~8公分', blackWhite: 4000, color: 5000, sortOrder: 3 },
  { code: 'U-2', name: 'U-2 (8-9cm)', description: '8公分~9公分', blackWhite: 5000, color: 6000, sortOrder: 4 },
  { code: 'V-1', name: 'V-1 (9-10cm)', description: '9公分~10公分', blackWhite: 6000, color: 7000, sortOrder: 5 },
  { code: 'V-2', name: 'V-2 (10-11cm)', description: '10公分~11公分', blackWhite: 7000, color: 8000, sortOrder: 6 },
  { code: 'W-1', name: 'W-1 (11-12cm)', description: '11公分~12公分', blackWhite: 8000, color: 9000, sortOrder: 7 },
  { code: 'W-2', name: 'W-2 (12-13cm)', description: '12公分~13公分', blackWhite: 9000, color: 10000, sortOrder: 8 },
  { code: 'X-1', name: 'X-1 (13-14cm)', description: '13公分~14公分', blackWhite: 10000, color: 11000, sortOrder: 9 },
  { code: 'X-2', name: 'X-2 (14-15cm)', description: '14公分~15公分', blackWhite: 11000, color: 12000, sortOrder: 10 },
  { code: 'Y-1', name: 'Y-1 (15-16cm)', description: '15公分~16公分', blackWhite: 12000, color: 13000, sortOrder: 11 },
  { code: 'Y-2', name: 'Y-2 (16-17cm)', description: '16公分~17公分', blackWhite: 13000, color: 14000, sortOrder: 12 },
  { code: 'Z', name: 'Z (≤3cm)', description: '3公分以內（最低消費）', blackWhite: 1000, color: 1000, sortOrder: 0 },
];

// 顏色規格
const COLOR_VARIANTS = [
  { code: 'BW', name: '黑白', description: '經典黑白紋身', sortOrder: 1 },
  { code: 'COLOR', name: '彩色', description: '全彩色紋身', sortOrder: 2 },
];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    if (data) {
      const postData = JSON.stringify(data);
      options.headers = options.headers || {};
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function login() {
  const response = await makeRequest({
    hostname: API_BASE,
    path: '/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  return response.accessToken;
}

async function createVariant(token, variantData) {
  return makeRequest({
    hostname: API_BASE,
    path: '/admin/service-variants',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, variantData);
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('   初始化圖騰小圖案規格');
  console.log('========================================');
  console.log('');

  try {
    // 1. 登入
    console.log('步驟 1: 管理員登入...');
    const token = await login();
    console.log('✅ 登入成功');
    console.log('');

    // 2. 創建尺寸規格
    console.log('步驟 2: 創建尺寸規格...');
    for (const size of SIZE_VARIANTS) {
      try {
        await createVariant(token, {
          serviceId: SERVICE_ID,
          type: 'size',
          name: size.name,
          code: size.code,
          description: size.description,
          priceModifier: size.blackWhite,
          sortOrder: size.sortOrder,
          isActive: true,
          isRequired: false,
          metadata: {
            blackWhitePrice: size.blackWhite,
            colorPrice: size.color,
            priceDiff: size.color - size.blackWhite
          }
        });
        console.log(`  ✅ ${size.name}: 黑白 NT$${size.blackWhite}, 彩色 NT$${size.color}`);
      } catch (e) {
        console.log(`  ❌ ${size.name}: ${e.message}`);
      }
    }
    console.log('');

    // 3. 創建顏色規格
    console.log('步驟 3: 創建顏色規格...');
    for (const color of COLOR_VARIANTS) {
      try {
        await createVariant(token, {
          serviceId: SERVICE_ID,
          type: 'color',
          name: color.name,
          code: color.code,
          description: color.description,
          priceModifier: 0,
          sortOrder: color.sortOrder,
          isActive: true,
          isRequired: true,
          metadata: color.name === '彩色' ? { useSizeMetadata: true } : {}
        });
        console.log(`  ✅ ${color.name}`);
      } catch (e) {
        console.log(`  ❌ ${color.name}: ${e.message}`);
      }
    }
    console.log('');

    // 4. 摘要
    console.log('========================================');
    console.log('   初始化完成！');
    console.log('========================================');
    console.log('');
    console.log('✅ 服務項目：圖騰小圖案');
    console.log('✅ 尺寸規格：13 個');
    console.log('✅ 顏色規格：2 個（黑白、彩色）');
    console.log('');
    console.log('價格範圍：');
    console.log('  📊 最低：NT$ 1,000（Z，≤3cm）');
    console.log('  📊 最高：NT$ 14,000（Y-2 彩色，16-17cm）');
    console.log('');
    console.log('📱 前往前端首頁查看新服務！');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 錯誤:', error.message);
    console.error('');
    process.exit(1);
  }
}

main();

