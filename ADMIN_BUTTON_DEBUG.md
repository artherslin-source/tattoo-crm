# 🔍 管理後台按鈕消失問題診斷

## 📋 問題分析

**症狀：** 用戶已登入，但管理後台按鈕沒有出現  
**根本原因：** 後端崩潰導致用戶角色無法獲取  
**影響：** 管理員無法訪問管理後台

---

## 🔍 問題診斷

### 1. 登入流程分析
```typescript
// 登入成功後會執行：
1. 保存 accessToken 和 refreshToken
2. 調用 /users/me API 獲取用戶資訊
3. 保存 userRole 和 userBranchId 到 localStorage
4. 跳轉到首頁
```

### 2. 管理後台按鈕顯示邏輯
```typescript
// Navbar.tsx 第 106 行
{(userRole === 'BOSS' || userRole === 'BRANCH_MANAGER') && (
  <button onClick={handleAdminClick}>
    {userRole === 'BOSS' ? '管理後台' : '分店管理'}
  </button>
)}
```

### 3. 問題根源
- ✅ 用戶已登入（有 accessToken）
- ❌ 後端崩潰，`/users/me` API 無法回應
- ❌ userRole 沒有保存到 localStorage
- ❌ 管理後台按鈕條件不滿足

---

## 🛠️ 立即修復方案

### 方案 1: 修復後端（推薦）
```bash
# 1. 檢查後端狀態
curl https://carefree-determination-production-1f1f.up.railway.app/health

# 2. 如果後端崩潰，重新部署
cd backend && railway up --detach

# 3. 等待 3-5 分鐘讓部署完成
# 4. 重新登入獲取用戶角色
```

### 方案 2: 臨時手動設置用戶角色
```javascript
// 在瀏覽器 Console 中執行：
// 1. 檢查當前用戶角色
console.log('Current userRole:', localStorage.getItem('userRole'));

// 2. 手動設置為 BOSS（如果是管理員）
localStorage.setItem('userRole', 'BOSS');
localStorage.setItem('userBranchId', '1');

// 3. 重新載入頁面
location.reload();
```

### 方案 3: 添加錯誤處理和重試機制
```typescript
// 在 Navbar.tsx 中添加重試邏輯
useEffect(() => {
  const fetchUserData = async () => {
    const token = getAccessToken();
    if (token && !getUserRole()) {
      try {
        const userData = await getJsonWithAuth<{ role: string; branchId: string }>('/users/me');
        localStorage.setItem('userRole', userData.role || '');
        localStorage.setItem('userBranchId', userData.branchId || '');
        setUserRole(userData.role);
        setUserBranchId(userData.branchId);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    }
  };
  
  fetchUserData();
}, [pathname]);
```

---

## 🧪 診斷步驟

### 1. 檢查 localStorage
```javascript
// 在瀏覽器 Console 中執行：
console.log('Access Token:', localStorage.getItem('accessToken'));
console.log('User Role:', localStorage.getItem('userRole'));
console.log('User Branch ID:', localStorage.getItem('userBranchId'));
```

### 2. 檢查後端 API
```bash
# 測試後端健康狀態
curl https://carefree-determination-production-1f1f.up.railway.app/health

# 測試用戶資訊 API（需要 token）
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://carefree-determination-production-1f1f.up.railway.app/users/me
```

### 3. 檢查網路請求
1. 打開瀏覽器開發者工具 (F12)
2. 切換到 Network 標籤
3. 重新載入頁面
4. 查看是否有 `/users/me` 請求
5. 檢查請求狀態和回應

---

## 🔧 修復實施

### 立即修復（臨時方案）
```javascript
// 在瀏覽器 Console 中執行以下代碼：

// 1. 檢查當前狀態
console.log('=== 診斷資訊 ===');
console.log('Access Token:', localStorage.getItem('accessToken') ? '✅ 存在' : '❌ 缺失');
console.log('User Role:', localStorage.getItem('userRole') || '❌ 未設置');
console.log('User Branch ID:', localStorage.getItem('userBranchId') || '❌ 未設置');

// 2. 如果是管理員，手動設置角色
if (confirm('您是管理員嗎？點擊確定將設置為 BOSS 角色')) {
  localStorage.setItem('userRole', 'BOSS');
  localStorage.setItem('userBranchId', '1');
  console.log('✅ 已設置為 BOSS 角色');
  location.reload();
}
```

### 長期修復（代碼更新）
```typescript
// 更新 Navbar.tsx，添加重試機制
useEffect(() => {
  const initializeUserData = async () => {
    const token = getAccessToken();
    const role = getUserRole();
    
    if (token && !role) {
      // 如果已登入但沒有角色資訊，嘗試重新獲取
      try {
        const userData = await getJsonWithAuth<{ role: string; branchId: string }>('/users/me');
        localStorage.setItem('userRole', userData.role || '');
        localStorage.setItem('userBranchId', userData.branchId || '');
        setUserRole(userData.role);
        setUserBranchId(userData.branchId);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // 可以顯示錯誤提示或重試按鈕
      }
    } else {
      setUserRole(role);
      setUserBranchId(getUserBranchId());
    }
  };
  
  initializeUserData();
}, [pathname]);
```

---

## 📊 測試清單

### 修復後測試
- [ ] 後端健康檢查通過
- [ ] `/users/me` API 正常回應
- [ ] 用戶角色正確保存到 localStorage
- [ ] 管理後台按鈕正常顯示
- [ ] 點擊管理後台按鈕可正常跳轉
- [ ] 不同角色顯示正確的按鈕文字

### 角色測試
- [ ] BOSS 角色顯示「管理後台」
- [ ] BRANCH_MANAGER 角色顯示「分店管理」
- [ ] ARTIST 角色顯示「刺青師後台」
- [ ] MEMBER 角色顯示「我的預約」

---

## 🚨 緊急處理

### 如果急需訪問管理後台
1. **手動設置角色**（臨時方案）
   ```javascript
   localStorage.setItem('userRole', 'BOSS');
   localStorage.setItem('userBranchId', '1');
   location.reload();
   ```

2. **直接訪問管理後台 URL**
   ```
   https://tattoo-crm-frontend-staging-production.up.railway.app/admin/dashboard
   ```

3. **檢查後端狀態**
   ```bash
   curl https://carefree-determination-production-1f1f.up.railway.app/health
   ```

---

## 📈 預防措施

### 1. 添加錯誤處理
- 在登入流程中添加重試機制
- 顯示用戶友好的錯誤訊息
- 提供手動刷新按鈕

### 2. 改善用戶體驗
- 添加載入狀態指示器
- 提供角色獲取失敗的提示
- 允許用戶手動重新獲取角色

### 3. 監控和日誌
- 記錄角色獲取失敗的情況
- 監控後端 API 可用性
- 設置錯誤警報

---

## 🎯 下一步行動

### 立即執行
1. **檢查後端狀態** - 確認是否已修復
2. **手動設置角色** - 臨時解決方案
3. **測試管理後台** - 確認功能正常

### 後續優化
1. **修復後端問題** - 根本解決方案
2. **改善錯誤處理** - 防止再次發生
3. **添加監控機制** - 提前發現問題

---

**🚀 立即執行手動設置角色來臨時解決問題！**
