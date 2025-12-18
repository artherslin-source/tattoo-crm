// ============================================
// 快速執行腳本 - 更新管理員和刺青師手機號碼
// ============================================
// 使用方法：
// 1. 打開瀏覽器，進入前端網站
// 2. 按 F12 打開開發者工具
// 3. 切換到 Console（主控台）標籤
// 4. 複製以下全部代碼並貼上，按 Enter 執行
// ============================================

(function() {
  // ========== 後端 URL 配置 ==========
  // 後端服務網址：https://tattoo-crm-production-413f.up.railway.app
  // 前端服務網址：https://tattoo-crm-production.up.railway.app
  const BACKEND_URL = 'https://tattoo-crm-production-413f.up.railway.app';
  const SECRET = 'temporary-init-secret-2024';

  console.log('🔍 後端 URL:', BACKEND_URL);
  console.log('📱 前端 URL:', window.location.origin);
  console.log('');

  async function fixAdminArtistPhones() {
    try {
      console.log('🔧 開始更新管理員和刺青師的手機號碼...\n');
      
      // 確保 URL 格式正確（必須包含協議）
      let apiUrl = `${BACKEND_URL}/auth/fix-admin-artist-phones`;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `https://${apiUrl}`;
      }
      
      console.log('📡 實際請求 URL:', apiUrl);
      console.log('🔐 使用 Secret:', SECRET);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: SECRET
        })
      });

      console.log('📥 回應狀態:', response.status, response.statusText);

      if (!response.ok) {
        // 嘗試解析錯誤訊息
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // 如果不是 JSON，嘗試讀取文字
          const text = await response.text();
          console.error('❌ 錯誤回應內容:', text.substring(0, 200));
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      console.log('\n✅ 執行成功！\n');
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
      console.error('\n❌ 執行失敗:', error);
      console.error('錯誤詳情:', error.message);
      
      // 提供除錯建議
      console.log('\n💡 除錯建議：');
      console.log('1. 確認後端 URL 是否正確:', BACKEND_URL);
      console.log('2. 確認後端服務是否正常運行');
      console.log('3. 檢查網路連線');
      console.log('4. 如果 URL 錯誤，請手動設置:');
      console.log('   const BACKEND_URL = "https://your-backend-url.railway.app";');
      console.log('   然後重新執行: fixAdminArtistPhones()');
      
      throw error;
    }
  }

  // 執行函數
  return fixAdminArtistPhones();
})();

