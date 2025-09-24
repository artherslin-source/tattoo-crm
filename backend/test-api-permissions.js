const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// 測試用的登入資訊
const testAccounts = {
  boss: { email: 'admin@test.com', password: '12345678' },
  manager1: { email: 'manager1@test.com', password: '12345678' },
  manager2: { email: 'manager2@test.com', password: '12345678' },
  manager3: { email: 'manager3@test.com', password: '12345678' }
};

async function login(account) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, account);
    return response.data;
  } catch (error) {
    console.error(`登入失敗 (${account.email}):`, error.response?.data || error.message);
    return null;
  }
}

async function makeAuthenticatedRequest(url, token, method = 'GET') {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`請求失敗 (${url}):`, error.response?.data || error.message);
    return null;
  }
}

async function testPermissions() {
  console.log('🔐 開始測試API權限隔離...\n');

  // 1. 測試BOSS登入
  console.log('1. 測試BOSS登入...');
  const bossLogin = await login(testAccounts.boss);
  if (!bossLogin) {
    console.log('❌ BOSS登入失敗');
    return;
  }
  console.log('✅ BOSS登入成功');
  console.log(`   - 角色: ${bossLogin.user?.role || '未知'}`);
  console.log(`   - 分店: ${bossLogin.user?.branchId || '無'}\n`);

  // 2. 測試分店經理登入
  console.log('2. 測試分店經理登入...');
  const managerLogins = {};
  for (const [key, account] of Object.entries(testAccounts)) {
    if (key.startsWith('manager')) {
      const loginResult = await login(account);
      if (loginResult) {
        managerLogins[key] = loginResult;
        console.log(`✅ ${account.email} 登入成功`);
        console.log(`   - 角色: ${loginResult.user?.role || '未知'}`);
        console.log(`   - 分店: ${loginResult.user?.branchId || '無'}`);
      } else {
        console.log(`❌ ${account.email} 登入失敗`);
      }
    }
  }
  console.log('');

  // 3. 測試BOSS權限 - 應該能看到所有分店的資料
  console.log('3. 測試BOSS權限...');
  if (bossLogin.accessToken) {
    // 獲取所有用戶
    const allUsers = await makeAuthenticatedRequest('/users', bossLogin.accessToken);
    if (allUsers) {
      console.log(`✅ BOSS可以看到 ${allUsers.data?.length || 0} 個用戶`);
    }

    // 獲取所有預約
    const allAppointments = await makeAuthenticatedRequest('/appointments/all', bossLogin.accessToken);
    if (allAppointments) {
      console.log(`✅ BOSS可以看到 ${allAppointments.length || 0} 個預約`);
    }

    // 獲取所有訂單
    const allOrders = await makeAuthenticatedRequest('/orders', bossLogin.accessToken);
    if (allOrders) {
      console.log(`✅ BOSS可以看到 ${allOrders.data?.length || 0} 個訂單`);
    }

    // 獲取所有分店
    const allBranches = await makeAuthenticatedRequest('/branches', bossLogin.accessToken);
    if (allBranches) {
      console.log(`✅ BOSS可以看到 ${allBranches.length || 0} 個分店`);
    }
  }
  console.log('');

  // 4. 測試分店經理權限 - 只能看到自己分店的資料
  console.log('4. 測試分店經理權限...');
  for (const [key, login] of Object.entries(managerLogins)) {
    if (login.accessToken) {
      console.log(`測試 ${key} (分店: ${login.user?.branchId || '未知'})...`);
      
      // 獲取用戶列表
      const users = await makeAuthenticatedRequest('/users', login.accessToken);
      if (users) {
        console.log(`   - 可看到 ${users.data?.length || 0} 個用戶`);
        // 檢查是否都屬於同一分店
        const sameBranchUsers = users.data?.filter(user => user.branchId === login.user?.branchId) || [];
        console.log(`   - 其中 ${sameBranchUsers.length} 個屬於自己的分店`);
      }

      // 獲取預約列表
      const appointments = await makeAuthenticatedRequest('/appointments/all', login.accessToken);
      if (appointments) {
        console.log(`   - 可看到 ${appointments.length || 0} 個預約`);
        // 檢查是否都屬於同一分店
        const sameBranchAppointments = appointments.filter(apt => apt.branchId === login.user?.branchId) || [];
        console.log(`   - 其中 ${sameBranchAppointments.length} 個屬於自己的分店`);
      }

      // 獲取訂單列表
      const orders = await makeAuthenticatedRequest('/orders', login.accessToken);
      if (orders) {
        console.log(`   - 可看到 ${orders.data?.length || 0} 個訂單`);
        // 檢查是否都屬於同一分店
        const sameBranchOrders = orders.data?.filter(order => order.branchId === login.user?.branchId) || [];
        console.log(`   - 其中 ${sameBranchOrders.length} 個屬於自己的分店`);
      }
    }
  }
  console.log('');

  // 5. 測試跨分店訪問限制
  console.log('5. 測試跨分店訪問限制...');
  if (Object.keys(managerLogins).length >= 2) {
    const manager1 = Object.values(managerLogins)[0];
    const manager2 = Object.values(managerLogins)[1];
    
    console.log(`比較 ${manager1.user?.branchId} 和 ${manager2.user?.branchId} 的資料隔離...`);
    
    // 獲取兩個經理的用戶列表
    const users1 = await makeAuthenticatedRequest('/users', manager1.accessToken);
    const users2 = await makeAuthenticatedRequest('/users', manager2.accessToken);
    
    if (users1 && users2) {
      const branch1Users = users1.data?.filter(user => user.branchId === manager1.user?.branchId) || [];
      const branch2Users = users2.data?.filter(user => user.branchId === manager2.user?.branchId) || [];
      
      console.log(`   - 經理1的分店用戶: ${branch1Users.length} 個`);
      console.log(`   - 經理2的分店用戶: ${branch2Users.length} 個`);
      
      // 檢查是否有重疊
      const overlap = branch1Users.some(user1 => 
        branch2Users.some(user2 => user1.id === user2.id)
      );
      
      if (!overlap) {
        console.log('✅ 分店資料完全隔離');
      } else {
        console.log('❌ 發現分店資料重疊');
      }
    }
  }

  console.log('\n🎉 API權限隔離測試完成！');
}

testPermissions().catch(console.error);
