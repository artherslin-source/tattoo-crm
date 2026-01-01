# 刺青師登入批次重設指南

## 🎯 功能說明

此功能用於批次重設所有刺青師帳號的登入密碼，並自動補齊缺少的手機號碼，確保所有刺青師都能正常登入系統。

## 🔐 權限要求

- **僅限 BOSS 角色**可執行此操作
- 需要有效的 JWT token

## 📡 API 端點

```
POST /admin/users/artists/reset-login
```

## 🚀 使用方式

### 方法一：使用瀏覽器開發者工具

1. **BOSS 登入**系統
2. 打開**瀏覽器開發者工具**（F12 或右鍵 → 檢查）
3. 切換到 **Console** 標籤
4. 執行以下代碼：

```javascript
fetch('/api/admin/users/artists/reset-login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ 重設完成！');
  console.table(data.results);
  console.log('\n📊 統計摘要：', data.summary);
  console.log('\n🔑 預設密碼：', data.defaultPassword);
})
.catch(err => console.error('❌ 錯誤：', err));
```

### 方法二：使用 curl（需後端直接 URL）

```bash
curl -X POST https://tattoo-crm-production-413f.up.railway.app/admin/users/artists/reset-login \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 📊 回應格式

```json
{
  "success": true,
  "defaultPassword": "12345678",
  "message": "批次重設完成",
  "results": [
    {
      "artistId": "xxx",
      "userId": "xxx",
      "displayName": "陳震宇",
      "phone": "0933333333",
      "branchName": "三重店",
      "passwordReset": true,
      "phoneAssigned": false,
      "skippedReason": null
    },
    {
      "artistId": "yyy",
      "userId": "yyy",
      "displayName": "林承葉",
      "phone": "0900000001",
      "branchName": "東港店",
      "passwordReset": true,
      "phoneAssigned": true,
      "skippedReason": null
    }
  ],
  "summary": {
    "total": 10,
    "passwordReset": 9,
    "phoneAssigned": 2,
    "skipped": 1,
    "errors": 0
  },
  "verificationSteps": [...]
}
```

## 🔍 回應欄位說明

### results 陣列
- **artistId**: 刺青師 ID
- **userId**: 用戶 ID
- **displayName**: 顯示名稱
- **phone**: 手機號碼（可能是原有或新分配的）
- **branchName**: 所屬分店
- **passwordReset**: 密碼是否已重設
- **phoneAssigned**: 手機號碼是否為新分配
- **skippedReason**: 跳過原因（若有）

### summary 統計
- **total**: 總刺青師數
- **passwordReset**: 成功重設密碼的數量
- **phoneAssigned**: 分配新手機號碼的數量
- **skipped**: 跳過的數量（如已停用帳號）
- **errors**: 錯誤數量

## ✅ 驗證流程

### 1️⃣ 刺青師登入測試

從回應的 `results` 清單中選擇 2-3 位刺青師進行測試：

- 選擇 1 位**原本有手機**的刺青師
- 選擇 1 位**新分配手機**（`phoneAssigned: true`）的刺青師
- 選擇 `0921222999`（如果在清單中）

**測試步驟：**
1. 前往 `/login`
2. 輸入手機號碼（從清單取得）
3. 輸入密碼：`12345678`
4. 點擊登入

**預期結果：**
- ✅ 登入成功
- ✅ 自動跳轉到 `/artist/calendar` 或 `/home`
- ✅ 不會被導回 `/login`

### 2️⃣ 權限檢查

刺青師登入後：

1. **檢查用戶資訊**
   - 打開開發者工具 Console
   - 執行：
   ```javascript
   fetch('/api/auth/me', {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
     }
   }).then(r => r.json()).then(console.log)
   ```
   - **預期結果**：`role` 應為 `"ARTIST"`，且有正確的 `branchId`

2. **測試越權訪問**
   - 嘗試前往 `/admin/billing` 或其他 BOSS 專屬頁面
   - **預期結果**：應被拒絕訪問（403 或重定向）

### 3️⃣ 會員登入測試（Smoke Check）

使用一個既有會員帳號（**不會被此功能影響**）：

1. 前往 `/login`
2. 使用會員手機號碼和原密碼登入
3. 確認能正常進入 `/home` 和 `/profile`

**預期結果：**
- ✅ 會員登入不受影響
- ✅ 會員頁面正常運作

## ⚠️ 注意事項

1. **此操作會重設所有刺青師的密碼**，屬於高風險操作
2. **已停用的帳號**不會被自動啟用，只會在報表中標記
3. **自動分配的手機號碼**格式為 `0900000xxx`（xxx 為 001-999）
4. **不會影響會員帳號**，只處理刺青師
5. 建議在**非營業時間**執行，並事先通知所有刺青師密碼已變更

## 🔄 後續步驟

執行完畢後：

1. **保存回應結果**（複製 Console 輸出或下載 JSON）
2. **通知所有刺青師**新密碼為 `12345678`
3. **建議刺青師登入後立即修改密碼**（前往個人資料 → 修改密碼）
4. 針對**新分配手機號碼**的刺青師，告知其新的登入手機號

## 🐛 故障排除

### 問題：執行後仍無法登入

**可能原因與解決方案：**

1. **帳號已停用**
   - 檢查回應中的 `skippedReason`
   - 若為「帳號已停用」，需手動啟用該帳號

2. **手機號碼衝突**
   - 檢查回應中的 `errors` 欄位
   - 若有錯誤，查看 `skippedReason` 中的詳細訊息

3. **JWT Token 過期**
   - 重新登入 BOSS 帳號
   - 重新執行 API 呼叫

4. **Railway 部署延遲**
   - 等待 2-3 分鐘讓部署完成
   - 硬刷新瀏覽器（Cmd+Shift+R）

### 問題：無法執行 API（403 Forbidden）

**解決方案：**
- 確認當前登入的是 **BOSS 帳號**
- 檢查 `localStorage.getItem('accessToken')` 是否有值
- 若 token 無效，重新登入

## 📞 技術支援

如遇無法解決的問題，請提供：
1. API 回應的完整 JSON
2. 瀏覽器 Console 的錯誤訊息
3. 無法登入的刺青師手機號碼

---

**最後更新：** 2026-01-01  
**版本：** 1.0.0

