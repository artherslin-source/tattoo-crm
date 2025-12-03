/**
 * 瀏覽器主控台執行腳本
 * 
 * 使用方法：
 * 1. 打開瀏覽器，進入前端網站（例如：https://tattoo-crm-production.up.railway.app）
 * 2. 按 F12 打開開發者工具
 * 3. 切換到 Console（主控台）標籤
 * 4. 複製以下代碼並貼上，按 Enter 執行
 * 
 * 腳本會自動檢測後端 URL，如果檢測失敗，請手動設置 BACKEND_URL
 */

// ========== 後端 URL 配置 ==========
// 後端服務網址：https://tattoo-crm-production-413f.up.railway.app
// 前端服務網址：https://tattoo-crm-production.up.railway.app
const BACKEND_URL = 'https://tattoo-crm-production-413f.up.railway.app';
const SECRET = 'temporary-init-secret-2024';

console.log('🔍 後端 URL:', BACKEND_URL);
console.log('📱 前端 URL:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
console.log('');

async function fixAdminArtistPhones() {
  try {
    console.log('🔧 開始更新管理員和刺青師的手機號碼...\n');
    console.log('📡 請求 URL:', `${BACKEND_URL}/auth/fix-admin-artist-phones`);
    
    // 構建完整的 API URL
    const apiUrl = `${BACKEND_URL}/auth/fix-admin-artist-phones`;
    
    console.log('📡 請求 URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ 執行成功！\n');
    console.log('📋 更新結果：');
    console.log('BOSS:', data.results.boss);
    console.log('分店經理:', data.results.managers);
    console.log('刺青師:', data.results.artists);
    
    if (data.results.errors && data.results.errors.length > 0) {
      console.warn('\n⚠️  警告：');
      data.results.errors.forEach((error, index) => {
        console.warn(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n📋 帳號列表：');
    console.table(data.accountList);
    console.log('\n🔑 預設密碼：', data.defaultPassword);
    
    return data;
  } catch (error) {
    console.error('❌ 執行失敗:', error);
    console.error('錯誤詳情:', error.message);
    throw error;
  }
}

// 執行函數
fixAdminArtistPhones();

