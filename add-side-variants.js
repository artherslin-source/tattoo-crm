const https = require('https');

// Railway API 配置
const API_BASE = 'tattoo-crm-production-413f.up.railway.app';
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = '12345678';

// 需要添加左右半邊規格的服務項目名稱
const SERVICES_WITH_SIDE_VARIANTS = [
  '半胛圖',
  '排胛圖',
  '大腿表面',
  '大腿全包',
  '小腿表面',
  '小腿全包',
  '前手臂',
  '上手臂',
  '大小腿包全肢',
  '上下手臂全肢',
  '單胸到包全手',
  '大背後圖',
  '背後左或右圖',
];

// 左右半邊規格
const SIDE_VARIANTS = [
  { name: '左半邊', code: 'LEFT', sortOrder: 1, priceModifier: 0 },
  { name: '右半邊', code: 'RIGHT', sortOrder: 2, priceModifier: 0 },
];

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

// 獲取所有服務項目
function getAllServices(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: '/admin/services',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
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
          reject(new Error('獲取服務列表失敗：' + data));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 檢查服務是否已有 side 規格
function checkExistingSideVariants(token, serviceId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      path: `/services/${serviceId}/variants`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const hasSideVariants = response.side && response.side.length > 0;
          resolve(hasSideVariants);
        } catch (e) {
          // 如果服務沒有規格，返回 false
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.end();
  });
}

// 批量創建左右半邊規格
function createSideVariants(token, serviceId) {
  return new Promise((resolve, reject) => {
    const variants = SIDE_VARIANTS.map(side => ({
      serviceId: serviceId,
      type: 'side',
      name: side.name,
      code: side.code,
      description: null,
      priceModifier: side.priceModifier,
      sortOrder: side.sortOrder,
      isActive: true,
      isRequired: false,
      metadata: {}
    }));

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
          console.log(`   ✅ 已為服務 "${serviceId}" 創建 ${variants.length} 個左右半邊規格`);
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
  console.log('   為指定服務項目添加左右半邊規格');
  console.log('========================================');
  console.log('');

  try {
    // 1. 登入
    console.log('步驟 1: 管理員登入...');
    const token = await login();
    console.log('');

    // 2. 獲取所有服務
    console.log('步驟 2: 獲取服務列表...');
    const services = await getAllServices(token);
    console.log(`   找到 ${services.length} 個服務項目`);
    console.log('');

    // 3. 過濾出需要添加規格的服務
    const targetServices = services.filter(service => 
      SERVICES_WITH_SIDE_VARIANTS.includes(service.name)
    );

    console.log('步驟 3: 篩選目標服務...');
    console.log(`   需要添加左右半邊規格的服務：${targetServices.length} 個`);
    targetServices.forEach(service => {
      console.log(`   - ${service.name} (ID: ${service.id})`);
    });
    console.log('');

    if (targetServices.length === 0) {
      console.log('⚠️  沒有找到需要添加規格的服務項目');
      console.log('');
      return;
    }

    // 4. 為每個服務添加左右半邊規格
    console.log('步驟 4: 為服務添加左右半邊規格...');
    let successCount = 0;
    let skipCount = 0;

    for (const service of targetServices) {
      try {
        // 檢查是否已有 side 規格
        const hasSideVariants = await checkExistingSideVariants(token, service.id);
        
        if (hasSideVariants) {
          console.log(`   ⏭️  服務 "${service.name}" 已有左右半邊規格，跳過`);
          skipCount++;
        } else {
          await createSideVariants(token, service.id);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ 服務 "${service.name}" 添加規格失敗:`, error.message);
      }
    }

    console.log('');
    console.log('========================================');
    console.log('   完成！');
    console.log('========================================');
    console.log('');
    console.log(`成功添加：${successCount} 個服務`);
    console.log(`已跳過：${skipCount} 個服務（已有規格）`);
    console.log('');
    console.log('左右半邊規格：');
    SIDE_VARIANTS.forEach(variant => {
      console.log(`   - ${variant.name} (${variant.code})`);
    });
    console.log('');
    console.log('✅ 規格添加完成！');
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

