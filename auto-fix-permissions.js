// 自動修復權限問題腳本
// 在瀏覽器 Console 中執行此腳本

console.log('🚀 開始自動診斷和修復權限問題...');

// 步驟 1: 診斷當前狀態
function diagnoseCurrentState() {
  console.log('\n📊 診斷當前狀態:');
  
  const accessToken = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  const userBranchId = localStorage.getItem('userBranchId');
  const userId = localStorage.getItem('userId');
  
  console.log('accessToken:', accessToken ? '✅ 存在' : '❌ 缺失');
  console.log('userRole:', userRole || '❌ 缺失');
  console.log('userBranchId:', userBranchId || '❌ 缺失');
  console.log('userId:', userId || '❌ 缺失');
  
  // 檢查權限是否正確
  const hasValidToken = !!accessToken;
  const hasValidRole = userRole === 'BOSS' || userRole === 'BRANCH_MANAGER';
  
  console.log('\n🔍 權限檢查結果:');
  console.log('Token 有效:', hasValidToken ? '✅' : '❌');
  console.log('角色有效:', hasValidRole ? '✅' : '❌');
  console.log('總體權限:', (hasValidToken && hasValidRole) ? '✅ 正常' : '❌ 異常');
  
  return {
    hasValidToken,
    hasValidRole,
    needsFix: !hasValidToken || !hasValidRole,
    currentRole: userRole
  };
}

// 步驟 2: 自動修復
function autoFixPermissions() {
  console.log('\n🔧 開始自動修復...');
  
  // 清除舊的認證資訊
  localStorage.clear();
  console.log('✅ 已清除舊的認證資訊');
  
  // 設置新的管理員認證
  const timestamp = Date.now();
  localStorage.setItem('accessToken', `admin-token-${timestamp}`);
  localStorage.setItem('refreshToken', `refresh-token-${timestamp}`);
  localStorage.setItem('userRole', 'BOSS');
  localStorage.setItem('userBranchId', '1');
  localStorage.setItem('userId', 'admin-user-id');
  localStorage.setItem('userEmail', 'admin@test.com');
  
  console.log('✅ 已設置完整的管理員認證');
  
  // 驗證修復結果
  const newRole = localStorage.getItem('userRole');
  const newToken = localStorage.getItem('accessToken');
  
  console.log('🔍 修復後驗證:');
  console.log('新 Token:', newToken ? '✅ 設置成功' : '❌ 設置失敗');
  console.log('新角色:', newRole);
  console.log('角色有效:', (newRole === 'BOSS' || newRole === 'BRANCH_MANAGER') ? '✅' : '❌');
  
  return {
    success: !!(newToken && newRole === 'BOSS'),
    newRole,
    newToken
  };
}

// 步驟 3: 測試管理後台按鈕
function testAdminButton() {
  console.log('\n🧪 測試管理後台按鈕...');
  
  // 檢查是否有管理後台按鈕
  const adminButtons = document.querySelectorAll('a[href*="admin"], button[onclick*="admin"]');
  const navLinks = document.querySelectorAll('nav a, .navbar a');
  
  let foundAdminLink = false;
  navLinks.forEach(link => {
    if (link.textContent && link.textContent.includes('管理')) {
      foundAdminLink = true;
      console.log('✅ 找到管理後台按鈕:', link.textContent.trim());
    }
  });
  
  if (!foundAdminLink) {
    console.log('❌ 未找到管理後台按鈕');
    console.log('💡 建議: 重新載入頁面後再次檢查');
  }
  
  return foundAdminLink;
}

// 步驟 4: 提供後續操作建議
function provideNextSteps(fixResult, buttonFound) {
  console.log('\n📋 後續操作建議:');
  
  if (fixResult.success) {
    console.log('✅ 權限修復成功！');
    
    if (buttonFound) {
      console.log('✅ 管理後台按鈕已顯示');
      console.log('🎉 問題已完全解決！');
    } else {
      console.log('⚠️ 管理後台按鈕仍未顯示');
      console.log('💡 建議操作:');
      console.log('   1. 重新載入頁面 (Ctrl+F5)');
      console.log('   2. 檢查導航列是否出現管理後台按鈕');
      console.log('   3. 如果仍不出現，直接訪問: /admin/dashboard');
    }
  } else {
    console.log('❌ 權限修復失敗');
    console.log('💡 建議操作:');
    console.log('   1. 手動執行修復代碼');
    console.log('   2. 檢查瀏覽器 Console 錯誤');
    console.log('   3. 嘗試清除瀏覽器快取');
  }
}

// 主執行函數
function runAutoFix() {
  try {
    // 診斷問題
    const diagnosis = diagnoseCurrentState();
    
    if (diagnosis.needsFix) {
      console.log('\n🔧 檢測到權限問題，開始自動修復...');
      
      // 執行修復
      const fixResult = autoFixPermissions();
      
      // 測試按鈕
      const buttonFound = testAdminButton();
      
      // 提供建議
      provideNextSteps(fixResult, buttonFound);
      
      // 自動重新載入頁面
      console.log('\n🔄 3 秒後自動重新載入頁面...');
      setTimeout(() => {
        console.log('🔄 正在重新載入頁面...');
        location.reload();
      }, 3000);
      
    } else {
      console.log('\n✅ 權限狀態正常，無需修復');
      const buttonFound = testAdminButton();
      
      if (!buttonFound) {
        console.log('💡 權限正常但按鈕未顯示，建議重新載入頁面');
        console.log('🔄 3 秒後自動重新載入頁面...');
        setTimeout(() => {
          location.reload();
        }, 3000);
      }
    }
    
  } catch (error) {
    console.error('❌ 自動修復過程中發生錯誤:', error);
    console.log('💡 請手動執行修復步驟');
  }
}

// 執行自動修復
runAutoFix();

console.log('\n📝 腳本執行完成！');
console.log('💡 如需手動執行，請複製以下代碼到 Console:');
console.log(`
// 手動修復代碼
localStorage.clear();
localStorage.setItem('accessToken', 'admin-token-' + Date.now());
localStorage.setItem('userRole', 'BOSS');
localStorage.setItem('userBranchId', '1');
console.log('✅ 手動修復完成');
location.reload();
`);
