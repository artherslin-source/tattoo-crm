# 🧹 清理生產環境數據庫指南

## 📋 問題說明

生產環境的 PostgreSQL 數據庫中存在大量重複的分店記錄（相同名稱但不同 ID），導致前端下拉選單顯示冗餘選項。

## 🛠️ 解決方案

我已經準備好了一個清理腳本：`backend/scripts/clean-production-branches.ts`

### 腳本功能

✅ 自動識別重複分店（相同名稱）  
✅ 智能保留有數據的分店（有預約、訂單、用戶或藝術家）  
✅ 刪除無數據的冗餘分店  
✅ 提供詳細的分析報告  
✅ 支持模擬模式（安全測試）  

---

## 🚀 執行步驟

### 方法 A：在 Railway 後端服務中執行（推薦）

這是最安全的方法，因為 Railway 後端服務已經配置好了所有環境變數。

#### 步驟 1：部署清理腳本

```bash
# 在本地提交並推送
cd /Users/jerrylin/tattoo-crm
git add backend/scripts/clean-production-branches.ts
git add backend/scripts/check-production-branches.ts
git add CLEAN_PRODUCTION_DATABASE.md
git commit -m "feat: Add production database cleaning scripts"
git push origin main
```

#### 步驟 2：在 Railway 後端服務中執行

1. 登入 Railway Dashboard
2. 進入 `Tattoo-crm-backend` 服務
3. 點擊右上角的 "..." → "Shell"
4. 在 Shell 中執行：

```bash
# 先測試（模擬模式，不會實際刪除）
npx ts-node scripts/clean-production-branches.ts
```

#### 步驟 3：確認並執行清理

如果模擬結果看起來正確，執行實際清理：

```bash
# 實際執行刪除
export CONFIRM_DELETE=true
npx ts-node scripts/clean-production-branches.ts
```

---

### 方法 B：從本地執行（需要網絡訪問）

如果你的本地環境可以訪問 Railway 數據庫：

```bash
cd /Users/jerrylin/tattoo-crm/backend

# 設定生產數據庫 URL
export DATABASE_URL="postgresql://postgres:TSAzRfDGdVTUjnEzOMPoiegosoARCXWM@tuntable.proxy.rlwy.net:25281/railway"

# 先測試（模擬模式）
npx ts-node scripts/clean-production-branches.ts

# 確認後執行
export CONFIRM_DELETE=true
npx ts-node scripts/clean-production-branches.ts
```

---

## 📊 預期輸出

### 模擬模式輸出示例

```
🔍 連接到數據庫...
📍 URL: postgresql://postgres:***@tuntable.proxy.rlwy.net:25281/railway

📊 步驟 1: 獲取所有分店數據...
   ✅ 找到 23 個分店記錄

📊 步驟 2: 分析重複分店...
   ✅ 唯一名稱: 2 個

📊 步驟 3: 詳細分析
================================================================================

📍 三重店
--------------------------------------------------------------------------------
   ⚠️ 找到 12 筆重複記錄
      - 有數據: 1 筆
      - 無數據: 11 筆

      ✅ 保留 (有數據):
         ID: cmgru71k80001sbbj7k14ovg6
         數據: 預約 16 | 訂單 10 | 用戶 9 | 藝術家 7

      ❌ 刪除 (無數據):
         ID: cmg7dp8t10001sbdjirjya7tp
      ❌ 刪除 (無數據):
         ID: cmgXXXXXXXXXXXXXXXXXXXXX
      ... (省略其他)

📍 東港店
--------------------------------------------------------------------------------
   ⚠️ 找到 11 筆重複記錄
      - 有數據: 1 筆
      - 無數據: 10 筆

      ✅ 保留 (有數據):
         ID: cmgru71ka0002sbbj6hk19es2
         數據: 預約 8 | 訂單 5 | 用戶 8 | 藝術家 7

      ❌ 刪除 (無數據):
         ID: cmg7dp8t20002sbdj7go17bx0
      ... (省略其他)

================================================================================

📊 步驟 4: 操作摘要
--------------------------------------------------------------------------------
   保留: 2 個分店
   刪除: 21 個分店

⚠️ 即將刪除以下分店:
   - 三重店 (cmg7dp8t10001sbdjirjya7tp)
   - 三重店 (cmgXXXXXXXXXXXXXXXXXXXXX)
   ... (省略其他)

🛑 模擬模式 (不會實際刪除)

如要實際執行刪除，請運行:
  export CONFIRM_DELETE=true
  npx ts-node scripts/clean-production-branches.ts
```

### 實際執行輸出

```
... (同上，直到操作摘要)

🗑️ 步驟 5: 執行刪除...
   刪除: 三重店 (cmg7dp8t10001sbdjirjya7tp)...
   ✅ 已刪除
   刪除: 三重店 (cmgXXXXXXXXXXXXXXXXXXXXX)...
   ✅ 已刪除
   ... (省略其他)

✅ 清理完成！

📊 驗證結果
--------------------------------------------------------------------------------
最終分店數: 2

✅ 三重店 (cmgru71k80001sbbj7k14ovg6)
   預約: 16 | 訂單: 10 | 用戶: 9 | 藝術家: 7
✅ 東港店 (cmgru71ka0002sbbj6hk19es2)
   預約: 8 | 訂單: 5 | 用戶: 8 | 藝術家: 7
```

---

## ✅ 驗證清理結果

清理完成後，驗證：

### 1. 後端 API 測試

```bash
# 登入並獲取 token
curl -X POST https://tattoo-crm-backend-production-413f.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "12345678"}'

# 使用 token 獲取分店列表
curl -X GET https://tattoo-crm-backend-production-413f.up.railway.app/branches \
  -H "Authorization: Bearer YOUR_TOKEN"

# 應該只返回 2 個分店
```

### 2. 前端測試

1. 訪問：https://tattoo-crm-production.up.railway.app
2. 登入管理後台
3. 前往「管理訂單」頁面
4. 點擊「分店」下拉選單
5. **應該只看到 3 個選項：**
   - 全部分店
   - 三重店
   - 東港店

---

## 🔄 清理後的後續工作

### 1. 移除前端臨時去重邏輯

清理完生產數據庫後，可以移除我之前添加的前端去重邏輯：

```typescript
// 在以下文件中移除去重邏輯：
// - frontend/src/app/admin/orders/page.tsx
// - frontend/src/app/admin/members/page.tsx
// - frontend/src/app/admin/appointments/page.tsx

// 改回原來的簡單邏輯：
const fetchBranches = useCallback(async () => {
  try {
    const branchesData = await getJsonWithAuth('/branches') as Array<Record<string, unknown>>;
    const uniqueBranches = sortBranchesByName(getUniqueBranches(branchesData)) as Branch[];
    setBranches(uniqueBranches);
  } catch (err) {
    console.error('載入分店資料失敗:', err);
  }
}, []);
```

### 2. 重新部署前端

```bash
cd /Users/jerrylin/tattoo-crm
git add -A
git commit -m "refactor: Remove branch deduplication logic after database cleanup"
git push origin main
```

---

## ⚠️ 注意事項

### 安全措施

1. **先在模擬模式運行** - 默認不會刪除數據，只會顯示計劃
2. **仔細檢查輸出** - 確認要刪除的分店確實是冗餘的
3. **備份數據庫**（可選）- 如果擔心，可以先備份：
   ```bash
   # 在 Railway Dashboard 中
   # Postgres → Backups → Create Backup
   ```

### 智能保留邏輯

腳本會：
- ✅ 保留有預約數據的分店
- ✅ 保留有訂單數據的分店
- ✅ 保留有用戶數據的分店
- ✅ 保留有藝術家數據的分店
- ✅ 如果都沒數據，保留最新創建的

### 刪除邏輯

腳本會刪除：
- ❌ 無任何關聯數據的分店
- ❌ 重複名稱中較舊的記錄

---

## 🆘 如果出現問題

### 問題 1：腳本無法連接到數據庫

**解決方案：** 在 Railway 後端服務的 Shell 中執行，因為它已經有正確的網絡訪問權限。

### 問題 2：刪除了錯誤的分店

**解決方案：** 
1. 如果有備份，從備份恢復
2. 重新運行種子腳本創建新分店：
   ```bash
   npx prisma db seed
   ```

### 問題 3：前端仍然顯示冗餘分店

**解決方案：**
1. 確認數據庫清理成功
2. 清除瀏覽器緩存（Cmd + Shift + R）
3. 檢查前端是否連接到正確的後端 API

---

## 📞 需要協助

如果執行過程中遇到任何問題，請提供：

1. 完整的腳本輸出（截圖或複製）
2. 錯誤訊息（如果有）
3. 執行環境（Railway Shell 或本地）

我會立即協助解決！

---

**創建時間：** 2025-10-15 19:15  
**腳本位置：** `backend/scripts/clean-production-branches.ts`  
**狀態：** ✅ 已準備好執行

