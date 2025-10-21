# 🚨 前端 API 連線修復方案

## 📋 問題分析

**症狀：** 前端首頁沒有顯示「管理者後台」按鈕  
**根本原因：** 前端無法獲取用戶角色資訊  
**錯誤訊息：** `ERR_CONNECTION_REFUSED localhost:4000` 和 `沒有找到可用的 API URL`

---

## 🔍 問題診斷

### 1. 環境變數檢查
- ✅ 前端 `NEXT_PUBLIC_API_BASE_URL` 已正確設置
- ✅ 後端健康檢查通過
- ❌ 登入功能失敗（可能是 seeding 問題）

### 2. API 連線問題
- 前端嘗試連接到 `localhost:4000`（錯誤）
- 應該連接到 `https://carefree-determination-production-1f1f.up.railway.app`

---

## 🛠️ 修復方案

### 方案 1: 手動創建管理員帳號

#### 1.1 直接訪問後端 API
```bash
# 創建管理員帳號
curl -X POST https://carefree-determination-production-1f1f.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "name": "管理員",
    "role": "BOSS"
  }'
```

#### 1.2 如果註冊失敗，手動設置用戶角色
在瀏覽器 Console 中執行：
```javascript
// 手動設置用戶角色
localStorage.setItem('userRole', 'BOSS');
localStorage.setItem('userBranchId', '1');
console.log('✅ 已設置為 BOSS 角色');
location.reload();
```

### 方案 2: 修復前端 API 配置

#### 2.1 檢查前端環境變數
確保前端已重新部署並載入正確的環境變數：
```bash
cd frontend && railway up --detach
```

#### 2.2 強制刷新前端
- 清除瀏覽器快取
- 硬重新載入頁面 (Ctrl+Shift+R)
- 檢查開發者工具中的網路請求

### 方案 3: 直接訪問管理後台

#### 3.1 使用直接 URL
```
https://tattoo-crm-frontend-staging-production.up.railway.app/admin/dashboard
```

#### 3.2 手動設置認證
在瀏覽器 Console 中執行：
```javascript
// 設置認證資訊
localStorage.setItem('accessToken', 'manual-admin-token');
localStorage.setItem('userRole', 'BOSS');
localStorage.setItem('userBranchId', '1');
console.log('✅ 已設置管理員認證');
location.href = '/admin/dashboard';
```

---

## 🚀 立即執行步驟

### 步驟 1: 手動設置用戶角色（最快）
1. 按 F12 打開開發者工具
2. 切換到 Console 標籤
3. 執行以下代碼：
```javascript
localStorage.setItem('userRole', 'BOSS');
localStorage.setItem('userBranchId', '1');
console.log('✅ 已設置為 BOSS 角色');
location.reload();
```

### 步驟 2: 檢查管理後台按鈕
1. 頁面重新載入後，檢查導航列
2. 應該會看到「管理者後台」按鈕
3. 點擊按鈕測試功能

### 步驟 3: 如果按鈕仍然不顯示
1. 直接訪問管理後台 URL：
   ```
   https://tattoo-crm-frontend-staging-production.up.railway.app/admin/dashboard
   ```
2. 或者執行完整的手動認證設置

---

## 🔧 技術修復

### 修復前端 API 檢測邏輯
```typescript
// 在 frontend/src/lib/api.ts 中添加調試
function detectApiBase(): string {
  console.log('🔍 檢測 API Base URL...');
  console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('window.location.hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined');
  
  // 現有的檢測邏輯...
}
```

### 添加 API 連線測試
```typescript
// 在應用程式啟動時測試 API 連線
async function testApiConnection() {
  try {
    const response = await fetch('/api/health');
    console.log('✅ API 連線正常');
  } catch (error) {
    console.error('❌ API 連線失敗:', error);
  }
}
```

---

## 📊 測試清單

### 前端測試
- [ ] 環境變數正確載入
- [ ] API 連線正常
- [ ] 用戶角色獲取成功
- [ ] 管理後台按鈕顯示
- [ ] 點擊按鈕可正常跳轉

### 後端測試
- [ ] 健康檢查通過
- [ ] 登入功能正常
- [ ] 用戶資訊 API 正常
- [ ] 角色權限正確

---

## 🚨 緊急處理

### 如果所有方法都失敗

1. **使用本地開發環境**
   ```bash
   cd frontend && npm run dev
   cd backend && npm run start:dev
   ```

2. **檢查 Railway 服務狀態**
   - 前往 Railway Dashboard
   - 檢查前端和後端服務狀態
   - 查看部署日誌

3. **聯繫支援**
   - 提供錯誤日誌
   - 說明具體問題
   - 請求技術支援

---

## 🎯 下一步行動

### 立即執行
1. **手動設置用戶角色** - 臨時解決方案
2. **測試管理後台功能** - 確認功能正常
3. **檢查 API 連線** - 診斷根本問題

### 後續優化
1. **修復登入功能** - 解決 seeding 問題
2. **改善錯誤處理** - 提供更好的用戶體驗
3. **添加監控機制** - 提前發現問題

---

**🚀 立即執行手動設置用戶角色來顯示管理後台按鈕！**