const https = require('https');

// Railway API 配置
const API_BASE = 'tattoo-crm-production-413f.up.railway.app';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = '12345678';

// 圖騰小圖案價格數據
const TOTEM_PRICE_DATA = {
  serviceName: '圖騰小圖案',
  basePrice: 2000, // 基礎價格（T-1 黑白）
  description: '小型圖騰紋身，精緻細膩，適合初次體驗',
  
  // 尺寸規格
  sizes: [
    { code: 'T-1', name: 'T-1 (5-6cm)', description: '5公分~6公分', blackWhitePrice: 2000, colorPrice: 3000, sortOrder: 1 },
    { code: 'T-2', name: 'T-2 (6-7cm)', description: '6公分~7公分', blackWhitePrice: 3000, colorPrice: 4000, sortOrder: 2 },
    { code: 'U-1', name: 'U-1 (7-8cm)', description: '7公分~8公分', blackWhitePrice: 4000, colorPrice: 5000, sortOrder: 3 },
    { code: 'U-2', name: 'U-2 (8-9cm)', description: '8公分~9公分', blackWhitePrice: 5000, colorPrice: 6000, sortOrder: 4 },
    { code: 'V-1', name: 'V-1 (9-10cm)', description: '9公分~10公分', blackWhitePrice: 6000, colorPrice: 7000, sortOrder: 5 },
    { code: 'V-2', name: 'V-2 (10-11cm)', description: '10公分~11公分', blackWhitePrice: 7000, colorPrice: 8000, sortOrder: 6 },
    { code: 'W-1', name: 'W-1 (11-12cm)', description: '11公分~12公分', blackWhitePrice: 8000, colorPrice: 9000, sortOrder: 7 },
    { code: 'W-2', name: 'W-2 (12-13cm)', description: '12公分~13公分', blackWhitePrice: 9000, colorPrice: 10000, sortOrder: 8 },
    { code: 'X-1', name: 'X-1 (13-14cm)', description: '13公分~14公分', blackWhitePrice: 10000, colorPrice: 11000, sortOrder: 9 },
    { code: 'X-2', name: 'X-2 (14-15cm)', description: '14公分~15公分', blackWhitePrice: 11000, colorPrice: 12000, sortOrder: 10 },
    { code: 'Y-1', name: 'Y-1 (15-16cm)', description: '15公分~16公分', blackWhitePrice: 12000, colorPrice: 13000, sortOrder: 11 },
    { code: 'Y-2', name: 'Y-2 (16-17cm)', description: '16公分~17公分', blackWhitePrice: 13000, colorPrice: 14000, sortOrder: 12 },
    { code: 'Z', name: 'Z (≤3cm)', description: '3公分以內（最低消費）', blackWhitePrice: 1000, colorPrice: 1000, sortOrder: 0 },
  ],
  
  // 顏色規格（與尺寸聯動定價）
  colors: [
    { code: 'BW', name: '黑白', description: '經典黑白紋身', sortOrder: 1 },
    { code: 'COLOR', name: '彩色', description: '全彩色紋身', sortOrder: 2 },
  ]
};

// 登入並獲取 token
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
            console.log('✅ 管理員登入成功');
            resolve(response.accessToken);
          } else {
            reject(new Error('登入失敗：' + data));
          }
        } catch (e) {
          reject(new Error('解析回應失敗：' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 創建服務項目
function createService(token) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: TOTEM_PRICE_DATA.serviceName,
      description: TOTEM_PRICE_DATA.description,
      price: TOTEM_PRICE_DATA.basePrice,
      durationMin: 60,
      hasVariants: true,
      isActive: true
    });

    const options = {
      hostname: API_BASE,
      path: '/admin/services',
      method: 'POST',
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
          const response = JSON.parse(data);
          console.log('✅ 服務項目創建成功:', response.name);
          console.log('   服務 ID:', response.id);
          resolve(response);
        } catch (e) {
          reject(new Error('創建服務失敗：' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 批量創建規格
function createVariants(token, serviceId) {
  return new Promise((resolve, reject) => {
    const variants = [];
    
    // 創建尺寸規格
    TOTEM_PRICE_DATA.sizes.forEach(size => {
      variants.push({
        serviceId: serviceId,
        type: 'size',
        name: size.name,
        code: size.code,
        description: size.description,
        priceModifier: 0, // 價格會根據顏色組合調整
        sortOrder: size.sortOrder,
        isActive: true,
        isRequired: false,
        metadata: {
          blackWhitePrice: size.blackWhitePrice,
          colorPrice: size.colorPrice
        }
      });
    });
    
    // 創建顏色規格
    TOTEM_PRICE_DATA.colors.forEach(color => {
      variants.push({
        serviceId: serviceId,
        type: 'color',
        name: color.name,
        code: color.code,
        description: color.description,
        priceModifier: 0,
        sortOrder: color.sortOrder,
        isActive: true,
        isRequired: true,
        metadata: {}
      });
    });

    const postData = JSON.stringify({ variants });

    const options = {
      hostname: API_BASE,
      path: '/admin/service-variants/batch',
      method: 'POST',
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
          const response = JSON.parse(data);
          console.log('✅ 規格創建成功');
          console.log(`   尺寸規格: ${TOTEM_PRICE_DATA.sizes.length} 個`);
          console.log(`   顏色規格: ${TOTEM_PRICE_DATA.colors.length} 個`);
          resolve(response);
        } catch (e) {
          reject(new Error('創建規格失敗：' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 主執行流程
async function main() {
  console.log('');
  console.log('========================================');
  console.log('   創建圖騰小圖案服務項目');
  console.log('========================================');
  console.log('');

  try {
    // 1. 登入
    console.log('步驟 1: 管理員登入...');
    const token = await login();
    console.log('');

    // 2. 創建服務
    console.log('步驟 2: 創建服務項目...');
    const service = await createService(token);
    console.log('');

    // 3. 創建規格
    console.log('步驟 3: 創建規格...');
    await createVariants(token, service.id);
    console.log('');

    // 4. 顯示摘要
    console.log('========================================');
    console.log('   創建完成！');
    console.log('========================================');
    console.log('');
    console.log('服務項目：', TOTEM_PRICE_DATA.serviceName);
    console.log('服務 ID：', service.id);
    console.log('基礎價格：NT$', TOTEM_PRICE_DATA.basePrice);
    console.log('');
    console.log('規格配置：');
    console.log('  - 尺寸規格：13 個（T-1 到 Y-2 + Z）');
    console.log('  - 顏色規格：2 個（黑白、彩色）');
    console.log('');
    console.log('價格範圍：');
    console.log('  - 最低：NT$ 1,000（Z，3cm以內）');
    console.log('  - 最高：NT$ 14,000（Y-2 彩色，16-17cm）');
    console.log('');
    console.log('✅ 服務項目已創建，可在前端首頁查看！');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ 錯誤:', error.message);
    console.error('');
    process.exit(1);
  }
}

// 執行
main();

