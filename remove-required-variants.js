const https = require('https');

const API = 'https://tattoo-crm-production-413f.up.railway.app';

// HTTP請求函數
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function main() {
  console.log('=== 登入管理員 ===');
  
  // 登入
  const loginData = await makeRequest(`${API}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: '12345678'
    })
  });
  
  const token = loginData.accessToken;
  if (!token) {
    console.log('❌ 登入失敗');
    process.exit(1);
  }
  
  console.log('✅ 登入成功\n');
  
  console.log('=== 開始取消所有規格的必選設定 ===\n');
  
  // 獲取所有服務
  const services = await makeRequest(`${API}/admin/services`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  let totalVariants = 0;
  let updatedVariants = 0;
  
  for (const service of services) {
    const serviceName = service.name;
    const serviceId = service.id;
    
    console.log(`📌 處理: ${serviceName}`);
    
    // 獲取該服務的所有規格
    const variants = await makeRequest(`${API}/admin/service-variants/service/${serviceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // 處理所有類型的規格
    for (const type of ['size', 'color', 'position', 'style', 'complexity', 'design_fee']) {
      if (variants[type] && Array.isArray(variants[type])) {
        for (const variant of variants[type]) {
          totalVariants++;
          
          // 如果是必選的，則改為非必選
          if (variant.isRequired) {
            await makeRequest(`${API}/admin/service-variants/${variant.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                isRequired: false
              })
            });
            
            console.log(`   ✅ ${type} - ${variant.name}: 已取消必選`);
            updatedVariants++;
          }
        }
      }
    }
    
    console.log('');
  }
  
  console.log('=== 更新完成 ===');
  console.log(`總計規格: ${totalVariants} 個`);
  console.log(`✅ 取消必選: ${updatedVariants} 個`);
  console.log(`⚪ 原本就非必選: ${totalVariants - updatedVariants} 個`);
}

main().catch(console.error);

