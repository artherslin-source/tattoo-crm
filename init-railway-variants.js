/**
 * 為 Railway 生產環境初始化所有服務的規格
 * 使用方式：node init-railway-variants.js
 */

// Railway 生產環境 API URL
const API_URL = 'https://tattoo-crm-production-413f.up.railway.app';

// 管理員帳號
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = '12345678';

// 規格模板定義
const sizeVariants = [
  { name: '5-6cm', code: 'S1', priceModifier: 2000, durationModifier: 30, sortOrder: 1, isRequired: true, description: '5-6cm（黑白2000/彩色3000）' },
  { name: '6-7cm', code: 'S2', priceModifier: 3000, durationModifier: 40, sortOrder: 2, isRequired: true, description: '6-7cm（黑白3000/彩色4000）' },
  { name: '7-8cm', code: 'S3', priceModifier: 4000, durationModifier: 50, sortOrder: 3, isRequired: true, description: '7-8cm（黑白4000/彩色5000）' },
  { name: '8-9cm', code: 'S4', priceModifier: 5000, durationModifier: 60, sortOrder: 4, isRequired: true, description: '8-9cm（黑白5000/彩色6000）' },
  { name: '9-10cm', code: 'S5', priceModifier: 6000, durationModifier: 70, sortOrder: 5, isRequired: true, description: '9-10cm（黑白6000/彩色7000）' },
  { name: '10-11cm', code: 'S6', priceModifier: 7000, durationModifier: 80, sortOrder: 6, isRequired: true, description: '10-11cm（黑白7000/彩色8000）' },
  { name: '11-12cm', code: 'S7', priceModifier: 8000, durationModifier: 90, sortOrder: 7, isRequired: true, description: '11-12cm（黑白8000/彩色9000）' },
  { name: '12-13cm', code: 'S8', priceModifier: 9000, durationModifier: 100, sortOrder: 8, isRequired: true, description: '12-13cm（黑白9000/彩色10000）' },
  { name: '13-14cm', code: 'S9', priceModifier: 10000, durationModifier: 110, sortOrder: 9, isRequired: true, description: '13-14cm（黑白10000/彩色11000）' },
  { name: '14-15cm', code: 'S10', priceModifier: 11000, durationModifier: 120, sortOrder: 10, isRequired: true, description: '14-15cm（黑白11000/彩色12000）' },
  { name: '15-16cm', code: 'S11', priceModifier: 12000, durationModifier: 130, sortOrder: 11, isRequired: true, description: '15-16cm（黑白12000/彩色13000）' },
  { name: '16-17cm', code: 'S12', priceModifier: 14000, durationModifier: 140, sortOrder: 12, isRequired: true, description: '16-17cm（黑白14000/彩色14000）' },
];

const colorVariants = [
  { name: '黑白', code: 'BW', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: true, description: '黑白陰影' },
  { name: '彩色', code: 'COLOR', priceModifier: 1000, durationModifier: 30, sortOrder: 2, isRequired: true, description: '彩色上色（大部分尺寸+1000）' },
];

const positionVariants = [
  { name: '手臂外側', code: 'P1', priceModifier: 0, durationModifier: 0, sortOrder: 1, isRequired: false, description: '手臂外側面' },
  { name: '手臂內側', code: 'P2', priceModifier: 200, durationModifier: 10, sortOrder: 2, isRequired: false, description: '手臂內側面' },
  { name: '小腿', code: 'P3', priceModifier: 0, durationModifier: 0, sortOrder: 3, isRequired: false, description: '小腿部位' },
  { name: '大腿', code: 'P4', priceModifier: 500, durationModifier: 15, sortOrder: 4, isRequired: false, description: '大腿部位' },
  { name: '背部', code: 'P5', priceModifier: 1000, durationModifier: 30, sortOrder: 5, isRequired: false, description: '背部區域' },
  { name: '胸部', code: 'P6', priceModifier: 800, durationModifier: 20, sortOrder: 6, isRequired: false, description: '胸部區域' },
];

const designFeeVariants = [
  { 
    name: '設計費', 
    code: 'DESIGN', 
    priceModifier: 0, 
    durationModifier: 60, 
    sortOrder: 1, 
    isRequired: false, 
    description: '另外估價（需管理後台輸入）',
    metadata: { isCustomPrice: true, displayText: '另外估價' }
  },
];

async function initializeRailwayVariants() {
  try {
    console.log('🚀 開始為 Railway 生產環境初始化規格...\n');

    // 1. 登入
    console.log('📝 步驟 1：登入管理員帳號...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`登入失敗: ${loginResponse.status} ${await loginResponse.text()}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    console.log('✅ 登入成功！\n');

    // 2. 獲取所有服務
    console.log('📦 步驟 2：獲取所有服務...');
    const servicesResponse = await fetch(`${API_URL}/services`);
    const services = await servicesResponse.json();
    console.log(`✅ 找到 ${services.length} 個服務\n`);

    // 3. 為每個服務初始化規格
    console.log('🔧 步驟 3：初始化規格...\n');
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const service of services) {
      console.log(`處理: ${service.name} (${service.id})`);
      
      if (service.hasVariants) {
        console.log(`  ⚠️  已有規格，跳過\n`);
        skipCount++;
        continue;
      }

      try {
        const response = await fetch(
          `${API_URL}/admin/service-variants/initialize/${service.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ template: 'standard' }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log(`  ✅ 成功！創建了 ${result.count} 個規格\n`);
          successCount++;
        } else {
          const error = await response.text();
          console.log(`  ❌ 失敗: ${error}\n`);
          failCount++;
        }

        // 避免請求過快
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`  ❌ 失敗: ${error.message}\n`);
        failCount++;
      }
    }

    console.log('\n========================================');
    console.log('🎉 初始化完成！');
    console.log('========================================');
    console.log(`✅ 成功: ${successCount} 個服務`);
    console.log(`⚠️  跳過: ${skipCount} 個服務（已有規格）`);
    console.log(`❌ 失敗: ${failCount} 個服務`);
    console.log('\n現在可以重新訪問前端測試購物車功能了！\n');

  } catch (error) {
    console.error('❌ 初始化失敗:', error.message);
    process.exit(1);
  }
}

// 執行
initializeRailwayVariants();

