# 🚨 緊急修復指南

## 問題診斷
- ✅ 後端服務正常運行
- ✅ 管理員帳號已創建 (admin@test.com)
- ❌ 資料庫 schema 不完整 (缺少 photoUrl 欄位)
- ❌ Seeding 失敗，導致密碼未正確設置
- ❌ 前端無法獲取真實的 JWT token

## 立即修復步驟

### 步驟 1: 修復資料庫 schema
1. 前往 Railway Dashboard: https://railway.app/project/474d507c-ae28-4d23-857f-317cc8a9bca6
2. 點擊後端服務 "carefree-determination"
3. 切換到 "Data" 標籤
4. 點擊 "Query" 按鈕
5. 執行以下 SQL:

```sql
ALTER TABLE "TattooArtist" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
```

### 步驟 2: 重新部署後端
執行以下命令重新部署後端服務：

```bash
cd /Users/jerrylin/tattoo-crm/backend
railway up --detach
```

### 步驟 3: 等待部署完成 (5-8 分鐘)

### 步驟 4: 測試管理員登入
在瀏覽器 Console 中執行：

```javascript
fetch('https://carefree-determination-production-1f1f.up.railway.app/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })
})
.then(response => response.json())
.then(data => {
  console.log('登入結果:', data);
  if (data.accessToken) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('userRole', 'BOSS');
    localStorage.setItem('userBranchId', '1');
    console.log('✅ 已設置真實的認證 token');
    location.reload();
  }
});
```

## 預期結果
- ✅ 資料庫 schema 修復完成
- ✅ Seeding 成功執行
- ✅ 管理員可以正常登入
- ✅ 前端可以獲取真實的 JWT token
- ✅ 管理後台數據正常載入
