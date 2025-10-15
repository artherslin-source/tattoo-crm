# 🧹 數據庫清理 API 使用指南

## 📋 簡介

我已經創建了兩個 API 端點，讓你可以**通過瀏覽器或 API 工具**（而不需要 Shell）來清理生產環境的冗餘分店數據。

---

## 🚀 使用步驟

### 步驟 1：等待部署完成（2-3 分鐘）

後端代碼已經推送到 GitHub，Railway 正在自動部署。

### 步驟 2：獲取登入 Token

使用以下命令（或任何 API 工具）登入：

```bash
curl -X POST https://tattoo-crm-production-413f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "12345678"
  }'
```

**或者在終端執行：**

```bash
TOKEN=$(curl -s -X POST https://tattoo-crm-production-413f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "12345678"}' | jq -r '.accessToken')

echo "Token: $TOKEN"
```

**保存返回的 `accessToken`，後續步驟需要使用。**

---

### 步驟 3：分析冗餘分店（不會刪除）

使用以下命令查看分析報告：

```bash
curl -X GET https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**或者在終端執行：**

```bash
curl -X GET https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/analyze \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**預期輸出類似：**

```json
{
  "total": 23,
  "uniqueNames": 2,
  "toKeep": 2,
  "toDelete": 21,
  "analysis": [
    {
      "name": "三重店",
      "status": "duplicate",
      "count": 12,
      "withData": 1,
      "withoutData": 11,
      "toKeep": 1,
      "toDelete": 11,
      "branches": [
        {
          "id": "cmgru71k80001sbbj7k14ovg6",
          "action": "keep",
          "appointments": 16,
          "orders": 10,
          "users": 9,
          "artists": 7
        },
        {
          "id": "cmg7dp8t10001sbdjirjya7tp",
          "action": "delete",
          "appointments": 0,
          "orders": 0,
          "users": 0,
          "artists": 0
        },
        ...
      ]
    },
    {
      "name": "東港店",
      "status": "duplicate",
      "count": 11,
      ...
    }
  ],
  "deleteList": [
    "cmg7dp8t10001sbdjirjya7tp",
    "cmg7dp8t20002sbdj7go17bx0",
    ...
  ]
}
```

**仔細檢查：**
- `toKeep`: 會保留的分店數量（應該是 2）
- `toDelete`: 會刪除的分店數量
- `analysis`: 每個分店的詳細信息
- `deleteList`: 將被刪除的分店 ID 列表

---

### 步驟 4：執行清理（實際刪除）

**⚠️ 重要：仔細檢查步驟 3 的輸出後再執行！**

```bash
curl -X POST 'https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/clean?confirm=true' \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**或者在終端執行：**

```bash
curl -X POST 'https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/clean?confirm=true' \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**預期輸出：**

```json
{
  "success": true,
  "deleted": 21,
  "deletedIds": [
    "cmg7dp8t10001sbdjirjya7tp",
    "cmg7dp8t20002sbdj7go17bx0",
    ...
  ],
  "remaining": 2,
  "branches": [
    {
      "id": "cmgru71k80001sbbj7k14ovg6",
      "name": "三重店",
      "appointments": 16,
      "orders": 10,
      "users": 9,
      "artists": 7
    },
    {
      "id": "cmgru71ka0002sbbj6hk19es2",
      "name": "東港店",
      "appointments": 8,
      "orders": 5,
      "users": 8,
      "artists": 7
    }
  ]
}
```

✅ **如果看到 `"success": true` 和 `"remaining": 2`，清理成功！**

---

### 步驟 5：驗證修復

清理完成後：

1. 訪問：https://tattoo-crm-production.up.railway.app
2. 按 **`Cmd + Shift + R`** 清除緩存
3. 登入管理後台
4. 測試「管理訂單」的分店篩選
5. **應該只看到 3 個選項：全部分店、三重店、東港店**

---

## 🔧 使用 Postman 或瀏覽器

### 方法 1：使用 Postman

1. **登入**
   - Method: POST
   - URL: `https://tattoo-crm-production-413f.up.railway.app/auth/login`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "email": "admin@test.com",
       "password": "12345678"
     }
     ```
   - 複製返回的 `accessToken`

2. **分析分店**
   - Method: GET
   - URL: `https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/analyze`
   - Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

3. **執行清理**
   - Method: POST
   - URL: `https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/clean?confirm=true`
   - Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

### 方法 2：使用瀏覽器開發者工具

1. 訪問前端網站並登入管理後台
2. 按 F12 打開開發者工具
3. 切換到 "Console" 標籤
4. 執行以下 JavaScript：

```javascript
// 獲取 Token（假設你已經登入）
const token = localStorage.getItem('accessToken');

// 分析分店
fetch('https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/analyze', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('分析結果:', data);
  console.log(`總分店: ${data.total}`);
  console.log(`保留: ${data.toKeep}`);
  console.log(`刪除: ${data.toDelete}`);
});

// 如果分析結果正確，執行清理：
fetch('https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/clean?confirm=true', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('清理結果:', data);
  if (data.success) {
    console.log(`✅ 成功刪除 ${data.deleted} 個冗餘分店`);
    console.log(`✅ 剩餘 ${data.remaining} 個分店`);
  }
});
```

---

## 📊 錯誤處理

### 錯誤 1：`401 Unauthorized`

**原因：** Token 無效或過期

**解決：** 重新執行步驟 2 獲取新 Token

### 錯誤 2：`403 Forbidden`

**原因：** 用戶角色不是 BOSS

**解決：** 使用 BOSS 角色的帳號登入（`admin@test.com`）

### 錯誤 3：`請先使用 GET /admin/cleanup/branches/analyze 分析`

**原因：** 忘記添加 `?confirm=true` 參數

**解決：** 在清理 API URL 後面添加 `?confirm=true`

---

## ✅ 成功指標

清理成功後，你應該看到：

1. **API 響應：**
   - `"success": true`
   - `"remaining": 2`
   - `branches` 數組只有 2 個元素（三重店、東港店）

2. **前端界面：**
   - 分店下拉選單只有 3 個選項
   - 所有頁面的分店篩選正常工作

3. **數據庫（在 Railway Postgres 界面）：**
   - Branch 表只有 2 筆記錄

---

## 🎯 快速執行腳本（完整版）

複製以下完整腳本到終端一次執行：

```bash
echo "🔍 步驟 1: 登入並獲取 Token..."
TOKEN=$(curl -s -X POST https://tattoo-crm-production-413f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "12345678"}' | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登入失敗"
  exit 1
fi

echo "✅ 登入成功"
echo ""

echo "🔍 步驟 2: 分析冗餘分店..."
ANALYSIS=$(curl -s -X GET https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/analyze \
  -H "Authorization: Bearer $TOKEN")

echo "$ANALYSIS" | jq .
echo ""

TOTAL=$(echo "$ANALYSIS" | jq -r '.total')
TO_KEEP=$(echo "$ANALYSIS" | jq -r '.toKeep')
TO_DELETE=$(echo "$ANALYSIS" | jq -r '.toDelete')

echo "📊 摘要:"
echo "   總分店: $TOTAL"
echo "   保留: $TO_KEEP"
echo "   刪除: $TO_DELETE"
echo ""

read -p "⚠️ 確認執行清理？(輸入 yes 繼續): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ 已取消"
  exit 0
fi

echo ""
echo "🗑️ 步驟 3: 執行清理..."
RESULT=$(curl -s -X POST 'https://tattoo-crm-production-413f.up.railway.app/admin/cleanup/branches/clean?confirm=true' \
  -H "Authorization: Bearer $TOKEN")

echo "$RESULT" | jq .
echo ""

SUCCESS=$(echo "$RESULT" | jq -r '.success')
DELETED=$(echo "$RESULT" | jq -r '.deleted')
REMAINING=$(echo "$RESULT" | jq -r '.remaining')

if [ "$SUCCESS" = "true" ]; then
  echo "✅ 清理成功！"
  echo "   已刪除: $DELETED 個分店"
  echo "   剩餘: $REMAINING 個分店"
else
  echo "❌ 清理失敗"
fi
```

---

**創建時間：** 2025-10-15 19:30  
**API 端點：** `/admin/cleanup/branches/*`  
**權限要求：** BOSS 角色  
**狀態：** ✅ 已部署，等待 Railway 完成部署

