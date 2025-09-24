const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testRoutes() {
  console.log('🧪 測試所有管理後台路由\n');

  try {
    // 1. 登入 BOSS
    console.log('📋 步驟 1: 登入 BOSS');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, { 
      email: 'admin@test.com', 
      password: '12345678' 
    });
    console.log('✅ BOSS 登入成功');
    const token = loginResponse.data.accessToken;

    // 2. 測試所有管理後台路由
    console.log('\n📋 步驟 2: 測試管理後台路由');
    
    const routes = [
      { path: '/admin/dashboard', name: '管理後台首頁' },
      { path: '/admin/members', name: '管理會員' },
      { path: '/admin/artists', name: '管理刺青師' },
      { path: '/admin/orders', name: '管理訂單' },
      { path: '/admin/appointments', name: '管理預約' },
      { path: '/admin/services', name: '管理服務' },
    ];

    for (const route of routes) {
      try {
        const response = await axios.get(`${BASE_URL}${route.path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`✅ ${route.name} (${route.path}) - 狀態碼: ${response.status}`);
        if (route.path === '/admin/artists' || route.path === '/admin/orders') {
          console.log(`   回應數據: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`❌ ${route.name} (${route.path}) - 錯誤: ${error.response?.status} ${error.response?.data?.message || error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }

  console.log('\n🎉 路由測試完成！');
}

testRoutes();
