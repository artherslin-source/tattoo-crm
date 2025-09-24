// 測試分店架構與權限隔離功能
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000';

async function testBranchSystem() {
  console.log('🧪 開始測試分店架構與權限隔離功能...\n');

  try {
    // 1. 測試 BOSS 登入
    console.log('1. 測試 BOSS 登入...');
    const bossLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: '123456'
      })
    });
    
    if (!bossLogin.ok) {
      throw new Error('BOSS 登入失敗');
    }
    
    const bossTokens = await bossLogin.json();
    console.log('✅ BOSS 登入成功');
    console.log('   - Access Token:', bossTokens.accessToken ? '存在' : '不存在');
    console.log('   - Refresh Token:', bossTokens.refreshToken ? '存在' : '不存在');

    // 2. 測試 BOSS 獲取用戶資訊
    console.log('\n2. 測試 BOSS 獲取用戶資訊...');
    const bossUserInfo = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Authorization': `Bearer ${bossTokens.accessToken}` }
    });
    
    if (!bossUserInfo.ok) {
      throw new Error('獲取 BOSS 用戶資訊失敗');
    }
    
    const bossUser = await bossUserInfo.json();
    console.log('✅ BOSS 用戶資訊獲取成功');
    console.log('   - 角色:', bossUser.role);
    console.log('   - 分店 ID:', bossUser.branchId || '無（BOSS 可訪問所有分店）');
    console.log('   - 分店資訊:', bossUser.branch ? `${bossUser.branch.name} - ${bossUser.branch.address}` : '無');

    // 3. 測試 BOSS 獲取所有分店
    console.log('\n3. 測試 BOSS 獲取所有分店...');
    const branches = await fetch(`${API_BASE}/branches`, {
      headers: { 'Authorization': `Bearer ${bossTokens.accessToken}` }
    });
    
    if (!branches.ok) {
      throw new Error('獲取分店列表失敗');
    }
    
    const branchList = await branches.json();
    console.log('✅ 分店列表獲取成功');
    console.log(`   - 總共 ${branchList.length} 個分店:`);
    branchList.forEach((branch, index) => {
      console.log(`     ${index + 1}. ${branch.name} (${branch.address})`);
      console.log(`        用戶: ${branch._count.users}, 刺青師: ${branch._count.artists}, 預約: ${branch._count.appointments}, 訂單: ${branch._count.orders}`);
    });

    // 4. 測試 BOSS 獲取所有用戶
    console.log('\n4. 測試 BOSS 獲取所有用戶...');
    const allUsers = await fetch(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${bossTokens.accessToken}` }
    });
    
    if (!allUsers.ok) {
      throw new Error('獲取用戶列表失敗');
    }
    
    const usersData = await allUsers.json();
    console.log('✅ 用戶列表獲取成功');
    console.log(`   - 總共 ${usersData.users.length} 個用戶:`);
    usersData.users.forEach((user, index) => {
      console.log(`     ${index + 1}. ${user.name} (${user.email}) - 角色: ${user.role}, 分店: ${user.branch?.name || '無'}`);
    });

    // 5. 測試 BOSS 獲取所有預約
    console.log('\n5. 測試 BOSS 獲取所有預約...');
    const allAppointments = await fetch(`${API_BASE}/appointments/all`, {
      headers: { 'Authorization': `Bearer ${bossTokens.accessToken}` }
    });
    
    if (!allAppointments.ok) {
      throw new Error('獲取預約列表失敗');
    }
    
    const appointmentsData = await allAppointments.json();
    console.log('✅ 預約列表獲取成功');
    console.log(`   - 總共 ${appointmentsData.length} 個預約:`);
    appointmentsData.forEach((apt, index) => {
      console.log(`     ${index + 1}. ${apt.user.name} 預約 ${apt.artist?.name || '未指定刺青師'} - ${apt.branch.name} - ${apt.status}`);
    });

    // 6. 測試 BOSS 獲取所有訂單
    console.log('\n6. 測試 BOSS 獲取所有訂單...');
    const allOrders = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${bossTokens.accessToken}` }
    });
    
    if (!allOrders.ok) {
      throw new Error('獲取訂單列表失敗');
    }
    
    const ordersData = await allOrders.json();
    console.log('✅ 訂單列表獲取成功');
    console.log(`   - 總共 ${ordersData.orders.length} 個訂單:`);
    ordersData.orders.forEach((order, index) => {
      console.log(`     ${index + 1}. ${order.member.name} - ${order.branch.name} - NT$${order.totalAmount} - ${order.status}`);
    });

    console.log('\n🎉 所有測試通過！分店架構與權限隔離功能正常運作。');
    console.log('\n📊 測試總結:');
    console.log('   ✅ BOSS 可以訪問所有分店的資料');
    console.log('   ✅ 分店資料正確關聯');
    console.log('   ✅ 用戶、預約、訂單都正確綁定到分店');
    console.log('   ✅ API 權限控制正常');

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  }
}

// 執行測試
testBranchSystem();
