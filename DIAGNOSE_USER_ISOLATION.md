# 用戶數據隔離問題診斷指南

**日期：** 2025-01-06  
**狀態：** 🔍 診斷中

---

## 🧪 診斷步驟

### 步驟 1：清除瀏覽器緩存和重新登入

**重要！** 請執行以下操作：

1. **清除瀏覽器緩存**
   - Chrome: `Ctrl+Shift+Delete` (Windows) 或 `Cmd+Shift+Delete` (Mac)
   - 選擇「緩存圖片和文件」
   - 時間範圍：「全部」
   - 點擊「清除數據」

2. **清除 LocalStorage**
   - 打開開發者工具 (F12)
   - 前往 Application 標籤
   - 左側選擇 Local Storage
   - 右鍵點擊您的網站 → Clear
   - **重新整理頁面**

3. **重新登入**
   - 登出當前帳號
   - 重新登入
   - 這會生成新的 JWT Token

---

## 步驟 2：檢查 JWT Token

**打開瀏覽器開發者工具 Console，執行：**

```javascript
// 檢查 localStorage 中的 token
const token = localStorage.getItem('token');
console.log('Token:', token);

// 解析 JWT token
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log('JWT Payload:', payload);
    console.log('User ID (sub):', payload.sub);
    console.log('Email:', payload.email);
    console.log('Role:', payload.role);
  }
}
```

**預期結果：**
```javascript
{
  sub: "cm123abc...",  // ← 您的用戶 ID
  email: "your@email.com",
  role: "MEMBER",
  iat: 1234567890,
  exp: 1234567890
}
```

**如果沒有 `sub` 字段或為空，這就是問題所在！**

---

## 步驟 3：測試 API 調用

**在 Console 執行：**

```javascript
// 測試預約查詢 API
fetch('https://your-backend-url.railway.app/appointments/my', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('API 返回預約數量:', data.length);
  console.log('預約詳情:', data);
  
  // 檢查所有預約的 userId
  const userIds = [...new Set(data.map(apt => apt.userId))];
  console.log('返回的用戶 ID 列表:', userIds);
  console.log('唯一用戶數量:', userIds.length);
  
  if (userIds.length > 1) {
    console.error('🚨 警告：返回了多個用戶的預約！');
  } else {
    console.log('✅ 正確：只返回一個用戶的預約');
  }
})
.catch(err => console.error('API 錯誤:', err));
```

---

## 步驟 4：檢查後端日誌

**前往 Railway Dashboard：**

1. 打開 Railway 項目
2. 選擇 Backend 服務
3. 點擊 **Logs** 標籤
4. 查找以下日誌：

**正常日誌應該顯示：**
```
🔐 /appointments/my called by user: { id: 'cm123abc...', email: '...', role: '...' }
📋 查詢用戶預約，userId: cm123abc...
✅ 返回預約數量: 3
```

**如果看到：**
```
🔐 /appointments/my called by user: { userId: undefined, ... }
```
或
```
📋 查詢用戶預約，userId: undefined
```

**這說明 JWT 有問題！**

---

## 步驟 5：創建測試帳號

**為了徹底測試，請創建兩個新帳號：**

### 測試帳號 A
- Email: `test-user-a@example.com`
- 密碼: `Test123456`

### 測試帳號 B
- Email: `test-user-b@example.com`
- 密碼: `Test123456`

### 測試步驟：

1. **用帳號 A 登入**
   - 創建 2 個預約（記下預約內容）
   - 登出

2. **用帳號 B 登入**
   - 創建 2 個預約（記下預約內容）
   - 前往「預約紀錄」
   - **檢查：是否只顯示帳號 B 的 2 個預約？**
   - **如果顯示 4 個預約（包括 A 的），問題還在！**

3. **切換回帳號 A**
   - 登出帳號 B
   - 重新登入帳號 A
   - 前往「預約紀錄」
   - **檢查：是否只顯示帳號 A 的 2 個預約？**

---

## 🔍 問題診斷樹

### 情況 1：所有用戶都看到所有預約

**可能原因：**
- ❌ 後端代碼沒有部署
- ❌ Railway 使用舊代碼

**解決方案：**
```bash
# 檢查 Railway 部署狀態
# 前往 Railway Dashboard → Deployments
# 確認最新提交是: ec72684 (修復安全漏洞)

# 如果不是，觸發重新部署：
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

---

### 情況 2：部分用戶看到所有預約

**可能原因：**
- ❌ JWT token 是舊的
- ❌ 瀏覽器緩存

**解決方案：**
1. 清除所有緩存
2. 重新登入
3. 生成新的 JWT token

---

### 情況 3：token 沒有 `sub` 字段

**可能原因：**
- ❌ JWT 生成邏輯錯誤
- ❌ 舊版 token 還在使用

**解決方案：**
檢查後端 JWT 生成代碼：

```typescript
// backend/src/auth/auth.service.ts
// 應該有：
const payload = { 
  sub: user.id,  // ← 必須有這個
  email: user.email,
  role: user.role,
  branchId: user.branchId 
};
```

---

## 📋 診斷檢查表

請逐一檢查並記錄結果：

### 前端檢查
- [ ] 清除瀏覽器緩存
- [ ] 清除 LocalStorage
- [ ] 重新登入
- [ ] JWT token 包含 `sub` 字段
- [ ] JWT token `sub` 等於當前用戶 ID

### API 檢查
- [ ] `/appointments/my` API 調用成功
- [ ] 返回的預約數量合理
- [ ] 所有預約的 `userId` 都相同
- [ ] `userId` 等於 JWT token 的 `sub`

### 後端檢查
- [ ] Railway 部署了最新代碼 (ec72684)
- [ ] 後端日誌顯示正確的 `userId`
- [ ] 後端日誌沒有 `undefined` userId
- [ ] 後端日誌顯示正確的預約數量

### 測試檢查
- [ ] 創建了兩個測試帳號
- [ ] 每個帳號創建了預約
- [ ] 帳號 A 只看到自己的預約
- [ ] 帳號 B 只看到自己的預約

---

## 🚨 如果問題依然存在

請提供以下信息：

### 1. JWT Token Payload
```
在 Console 執行上面的 JWT 解析代碼，貼上結果
```

### 2. API 返回數據
```
執行 API 測試代碼，貼上返回的數據
```

### 3. 後端日誌
```
從 Railway Logs 複製最近 10 行關於 /appointments/my 的日誌
```

### 4. 測試結果
```
- 帳號 A 看到的預約數量：___
- 帳號 B 看到的預約數量：___
- 預約是否混淆：是 / 否
```

---

## 💡 臨時解決方案

如果問題緊急，可以臨時添加前端過濾：

```typescript
// frontend/src/app/profile/appointments/page.tsx
const fetchAppointments = async () => {
  try {
    const data = await getJsonWithAuth("/appointments/my");
    
    // 臨時添加：獲取當前用戶 ID
    const userData = await getJsonWithAuth("/users/me");
    const currentUserId = userData.id;
    
    // 臨時過濾：只保留當前用戶的預約
    const filteredData = (data as Appointment[]).filter(
      apt => apt.userId === currentUserId
    );
    
    console.log('所有預約:', data.length);
    console.log('過濾後預約:', filteredData.length);
    
    setAppointments(filteredData);
  } catch (error) {
    console.error("獲取預約失敗:", error);
  }
};
```

**⚠️ 這只是臨時解決方案，根本問題還是要從後端修復！**

---

**請執行以上診斷步驟，並告訴我結果！** 🔍

