const https = require('https');

const API = 'https://tattoo-crm-production-413f.up.railway.app';

// 價格數據（按照價格表）
const PRICE_DATA = {
  '上手臂': { 割線: 5000, 黑白: 30000, 半彩: 35000, 全彩: 40000 },               // H
  '前手臂': { 割線: 5000, 黑白: 30000, 半彩: 35000, 全彩: 40000 },               // G
  '上下手臂全肢': { 割線: 10000, 黑白: 80000, 半彩: 120000, 全彩: 150000 },      // J
  '單胸到包全手': { 割線: 15000, 黑白: 100000, 半彩: 150000, 全彩: 180000 },     // K
  '單胸口': { 割線: 5000, 黑白: 20000, 半彩: 25000, 全彩: 30000 },               // Q
  '單胸腹肚圖': { 割線: 10000, 黑白: 80000, 半彩: 100000, 全彩: 120000 },        // S
  '大小腿包全肢': { 割線: 20000, 黑白: 150000, 半彩: 180000, 全彩: 200000 },     // I
  '大背到大腿圖': { 割線: 25000, 黑白: 180000, 半彩: 250000, 全彩: 300000 },     // N
  '大背後圖': { 割線: 15000, 黑白: 150000, 半彩: 180000, 全彩: 200000 },         // L
  '大腿全包': { 割線: 10000, 黑白: 80000, 半彩: 100000, 全彩: 150000 },          // D
  '大腿表面': { 割線: 5000, 黑白: 30000, 半彩: 40000, 全彩: 50000 },             // C
  '小腿全包': { 割線: 5000, 黑白: 40000, 半彩: 50000, 全彩: 60000 },             // F
  '小腿表面': { 割線: 5000, 黑白: 20000, 半彩: 30000, 全彩: 40000 },             // E
  '排胛圖': { 割線: 15000, 黑白: 100000, 半彩: 120000, 全彩: 150000 },           // B
  '背後左或右圖': { 割線: 10000, 黑白: 70000, 半彩: 80000, 全彩: 100000 },       // M
  '腹肚圖': { 割線: 10000, 黑白: 50000, 半彩: 70000, 全彩: 90000 },              // R
  '雙前胸口圖': { 割線: 10000, 黑白: 40000, 半彩: 50000, 全彩: 60000 },          // P
  '雙胸到腹肚圖': { 割線: 15000, 黑白: 150000, 半彩: 180000, 全彩: 200000 },     // O
};

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
  
  console.log('=== 開始更新顏色規格價格 ===\n');
  
  // 獲取所有服務
  const services = await makeRequest(`${API}/admin/services`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  let successCount = 0;
  let skipCount = 0;
  let totalUpdates = 0;
  
  for (const service of services) {
    const serviceName = service.name;
    const serviceId = service.id;
    
    // 檢查是否有此服務的價格數據
    if (!PRICE_DATA[serviceName]) {
      console.log(`⚠️  跳過: ${serviceName} (價格表中無此服務)\n`);
      skipCount++;
      continue;
    }
    
    const prices = PRICE_DATA[serviceName];
    console.log(`📌 處理: ${serviceName}`);
    console.log(`   割線: ${prices.割線} | 黑白: ${prices.黑白} | 半彩: ${prices.半彩} | 全彩: ${prices.全彩}`);
    
    // 獲取該服務的顏色規格
    const variants = await makeRequest(`${API}/admin/service-variants/service/${serviceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const colorVariants = variants.color || [];
    
    // 更新各個顏色規格的價格
    for (const colorName of ['割線', '黑白', '半彩', '全彩']) {
      const variant = colorVariants.find(v => v.name === colorName);
      
      if (variant) {
        const newPrice = prices[colorName];
        
        await makeRequest(`${API}/admin/service-variants/${variant.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            priceModifier: newPrice
          })
        });
        
        console.log(`   ✅ ${colorName} → ${newPrice.toLocaleString()} 元`);
        totalUpdates++;
      } else {
        console.log(`   ❌ 找不到「${colorName}」規格`);
      }
    }
    
    successCount++;
    console.log('');
  }
  
  console.log('=== 更新完成 ===');
  console.log(`處理服務: ${successCount} 個`);
  console.log(`✅ 成功更新: ${totalUpdates} 個顏色規格`);
  console.log(`⚠️  跳過: ${skipCount} 個服務`);
}

main().catch(console.error);

