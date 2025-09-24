const axios = require('axios');

const BASE_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:4001';

async function testFrontendLogin() {
  try {
    console.log('🔐 測試前端登入流程...\n');

    // 1. 登入獲取 token
    console.log('1. 登入 BOSS 帳號...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: '12345678'
    });

    const { accessToken, refreshToken } = loginResponse.data;
    console.log('✅ 登入成功');
    console.log('Access Token:', accessToken.substring(0, 50) + '...');

    // 2. 獲取用戶資料
    console.log('\n2. 獲取用戶資料...');
    const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = userResponse.data;
    console.log('✅ 用戶資料:', {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      branchId: userData.branchId
    });

    // 3. 測試前端頁面
    console.log('\n3. 測試前端頁面...');
    
    // 模擬 localStorage 設定
    const localStorageData = {
      accessToken,
      refreshToken,
      userRole: userData.role,
      userBranchId: userData.branchId
    };

    console.log('📝 前端 localStorage 資料:', localStorageData);

    // 4. 測試 API 端點
    console.log('\n4. 測試管理後台 API 端點...');
    
    const endpoints = [
      '/admin/artists',
      '/admin/orders',
      '/admin/services',
      '/admin/members',
      '/admin/appointments'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log(`✅ ${endpoint}: ${response.status} - ${response.data?.length || 'OK'}`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // 5. 測試前端頁面載入
    console.log('\n5. 測試前端頁面載入...');
    try {
      const frontendResponse = await axios.get(`${FRONTEND_URL}/admin/artists`, {
        timeout: 5000
      });
      console.log('✅ 前端頁面載入成功:', frontendResponse.status);
    } catch (error) {
      console.log('❌ 前端頁面載入失敗:', error.message);
    }

    console.log('\n🎉 測試完成！');
    console.log('\n📋 手動測試步驟:');
    console.log('1. 打開瀏覽器，前往 http://localhost:4001/login');
    console.log('2. 使用以下帳號登入:');
    console.log('   Email: admin@test.com');
    console.log('   Password: 12345678');
    console.log('3. 登入後點擊「總管理後台」按鈕');
    console.log('4. 測試各個子頁面:');
    console.log('   - 管理刺青師: http://localhost:4001/admin/artists');
    console.log('   - 管理訂單: http://localhost:4001/admin/orders');
    console.log('   - 管理服務項目: http://localhost:4001/admin/services');

  } catch (error) {
    console.error('❌ 測試失敗:', error.response?.data || error.message);
  }
}

testFrontendLogin();
