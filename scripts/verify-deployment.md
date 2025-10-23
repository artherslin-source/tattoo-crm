# 部署後驗證清單

## 📋 Railway 環境變數確認

### 前端 (tattoo-crm-frontend-staging)

在 Railway Dashboard → 專案 → Variables 確認以下變數：

```bash
✅ NEXT_PUBLIC_API_BASE_URL = https://tattoo-crm-backend-staging-production.up.railway.app
✅ NODE_ENV = staging
```

### 後端 (tattoo-crm-backend-staging)

在 Railway Dashboard → 專案 → Variables 確認以下變數：

```bash
✅ DATABASE_URL = <Railway PostgreSQL 連接字串>
✅ NODE_ENV = staging
✅ JWT_SECRET = <強密鑰，至少 32 字元>
✅ JWT_REFRESH_SECRET = <強密鑰，至少 32 字元>
✅ CORS_ORIGIN = https://tattoo-crm-frontend-staging-production.up.railway.app
✅ PORT = 4000 (或省略，使用預設)
```

---

## 🚀 重新部署步驟

### 1. 重新部署後端

**原因**: 確保最新的 CORS 和健康檢查端點生效

在 Railway Dashboard:
1. 進入後端專案 (`tattoo-crm-backend-staging`)
2. 點擊 "Deployments" 頁面
3. 點擊最新部署右側的 "⋮" (三個點)
4. 選擇 "Redeploy"
5. 等待部署完成（約 2-3 分鐘）

### 2. 重新部署前端

**原因**: 前端需要重新 build 才能正確注入 `NEXT_PUBLIC_API_BASE_URL`

在 Railway Dashboard:
1. 進入前端專案 (`tattoo-crm-frontend-staging`)
2. 點擊 "Deployments" 頁面
3. 點擊最新部署右側的 "⋮" (三個點)
4. 選擇 "Redeploy"
5. 等待部署完成（約 3-5 分鐘）

---

## 🧪 瀏覽器 Console 驗證

### 1. 打開前端網站

訪問: https://tattoo-crm-frontend-staging-production.up.railway.app

### 2. 打開開發者工具 Console (F12)

#### 檢查項目 1: API Base URL

在 Console 輸入：
```javascript
console.log('API_BASE:', '<應該顯示後端 URL>')
```

**預期結果**:
```
API_BASE: https://tattoo-crm-backend-staging-production.up.railway.app
```

**如果顯示錯誤的 URL**:
- 檢查前端環境變數是否正確設定
- 重新部署前端（必須重新 build）

---

#### 檢查項目 2: 後端健康檢查

在 Console 輸入：
```javascript
fetch('https://tattoo-crm-backend-staging-production.up.railway.app/api/health/simple')
  .then(r => r.json())
  .then(d => console.log('Health Check:', d))
  .catch(e => console.error('Health Check Failed:', e))
```

**預期結果**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-23T..."
}
```

**如果失敗**:
- 檢查後端是否正常運行
- 檢查 CORS 設定
- 檢查後端 URL 是否正確

---

#### 檢查項目 3: 未登入狀態 /users/me (應為 401)

在 Console 輸入：
```javascript
fetch('https://tattoo-crm-backend-staging-production.up.railway.app/api/users/me', {
  headers: { 'Authorization': 'Bearer invalid-token' }
})
  .then(r => {
    console.log('Status:', r.status); // 應為 401
    return r.json();
  })
  .then(d => console.log('Response:', d))
```

**預期結果**:
```
Status: 401
```

**如果不是 401**:
- 後端 JWT 驗證可能有問題
- 檢查後端 logs

---

#### 檢查項目 4: 測試登入並獲取 Token

在 Console 輸入：
```javascript
fetch('https://tattoo-crm-backend-staging-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'admin@test.com', 
    password: 'admin123' 
  })
})
.then(response => response.json())
.then(data => {
  console.log('登入結果:', data);
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken || '');
    localStorage.setItem('userRole', 'BOSS');
    localStorage.setItem('userBranchId', '1');
    console.log('✅ 已設置認證 token');
    location.reload();
  } else {
    console.error('❌ 登入失敗:', data.message);
  }
})
.catch(error => console.error('❌ 登入請求失敗:', error));
```

**預期結果**:
```javascript
{
  accessToken: "eyJhbGc...",
  refreshToken: "eyJhbGc...",
  // ... 其他資訊
}
✅ 已設置認證 token
// 頁面自動重新載入
```

**如果失敗**:
- 檢查後端是否有 admin@test.com 帳號
- 檢查密碼是否為 admin123
- 檢查資料庫連接

---

#### 檢查項目 5: 驗證登入後 /users/me (應為 200)

登入成功並頁面重新載入後，在 Console 輸入：
```javascript
const token = localStorage.getItem('accessToken');
fetch('https://tattoo-crm-backend-staging-production.up.railway.app/api/users/me', {
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
  .then(r => {
    console.log('Status:', r.status); // 應為 200
    return r.json();
  })
  .then(d => console.log('User Data:', d))
```

**預期結果**:
```javascript
Status: 200
User Data: {
  id: "...",
  email: "admin@test.com",
  name: "Super Admin",
  role: "BOSS",
  branchId: "...",
  // ...
}
```

**如果失敗**:
- Token 可能無效
- 重新登入
- 檢查 JWT_SECRET 是否一致

---

#### 檢查項目 6: 管理員按鈕顯示

登入後，檢查頁面上是否顯示：
- ✅ 「管理後台」或「管理者後台」按鈕

**如果沒有顯示**:
1. 檢查 localStorage:
   ```javascript
   console.log({
     accessToken: localStorage.getItem('accessToken'),
     userRole: localStorage.getItem('userRole'),
     userBranchId: localStorage.getItem('userBranchId')
   })
   ```
2. 確認 `userRole` 為 `'BOSS'`
3. 檢查 Navbar 組件邏輯

---

#### 檢查項目 7: 圖片載入

確認以下圖片正常顯示（200狀態）:
```javascript
// 檢查 LOGO
fetch('/images/logo/diaochan-tattoo-logo.png')
  .then(r => console.log('LOGO Status:', r.status)) // 應為 200

// 檢查服務圖片
fetch('/images/services/full-arm-sleeve.jpg')
  .then(r => console.log('Service Image Status:', r.status)) // 應為 200
```

**如果 404**:
- 圖片文件不存在
- 檢查 `frontend/public/images/` 目錄
- 重新部署前端

---

## ✅ 完整驗證清單

部署完成後，請確認以下所有項目：

### Railway 環境變數
- [ ] 前端 `NEXT_PUBLIC_API_BASE_URL` 正確
- [ ] 後端 `CORS_ORIGIN` 包含前端 URL
- [ ] 後端 `JWT_SECRET` 已設定
- [ ] 後端 `DATABASE_URL` 已連接

### 前端驗證
- [ ] 網站可以正常訪問
- [ ] Console 無 localhost:4000 錯誤
- [ ] API_BASE 顯示正確的後端 URL
- [ ] LOGO 圖片正常顯示
- [ ] 服務圖片正常顯示

### 後端驗證
- [ ] `/api/health/simple` 返回 200
- [ ] `/api/users/me` (未登入) 返回 401
- [ ] `/api/auth/login` 可以登入
- [ ] `/api/users/me` (已登入) 返回 200

### 功能驗證
- [ ] 可以成功登入 admin@test.com
- [ ] localStorage 正確儲存 token 和 role
- [ ] 管理員按鈕正常顯示
- [ ] 點擊管理後台可以進入
- [ ] 管理後台數據正常載入

---

## 🐛 問題排查

### 問題 1: 前端仍連接到 localhost:4000

**解決方案**:
1. 確認 Railway 前端環境變數已設定
2. **必須**重新部署前端（重新 build）
3. 清除瀏覽器快取
4. 硬重新整理 (Ctrl+Shift+R 或 Cmd+Shift+R)

### 問題 2: CORS 錯誤

**解決方案**:
1. 檢查後端 `CORS_ORIGIN` 是否包含前端完整 URL
2. 確認 URL 沒有尾隨斜線差異
3. 重新部署後端

### 問題 3: 管理員按鈕不顯示

**解決方案**:
1. 清除 localStorage: `localStorage.clear()`
2. 重新登入
3. 檢查 Console 的 `/users/me` 請求
4. 確認回傳的 `role` 為 `'BOSS'`

### 問題 4: 401 Unauthorized 持續發生

**解決方案**:
1. 檢查後端 `JWT_SECRET` 是否設定
2. 確認前後端使用相同的 secret
3. Token 可能過期，重新登入
4. 檢查後端 logs 的具體錯誤

---

**驗證完成時間**: ___________  
**驗證人員**: ___________  
**所有檢查項目**: ☐ 全部通過  ☐ 部分失敗（見下方備註）

**備註**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

