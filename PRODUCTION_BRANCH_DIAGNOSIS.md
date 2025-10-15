# 🔍 生產環境分店冗餘問題診斷報告

## 📊 問題現狀

用戶反饋：即使清除瀏覽器緩存並修復了前端代碼，分店下拉選單中仍然顯示大量重複的「三重店」和「東港店」選項。

## 🎯 關鍵發現

### 1. 本地環境 ✅ 正常
```bash
# 本地 PostgreSQL 數據庫
SELECT COUNT(*) FROM "Branch";
# 結果: 2 個分店

# 本地 API
curl http://localhost:4000/branches
# 結果: 返回 2 個分店
```

### 2. 生產環境 ❓ 未驗證
```bash
# 問題：無法確定生產環境後端 URL
# 嘗試的 URL 都返回 404：
- https://tattoo-crm-backend-production.up.railway.app ❌
- https://backend-production-4dc6.up.railway.app ❌
```

### 3. 前端代碼 ✅ 已修復
- ✅ 移除了所有硬編碼的分店 ID
- ✅ 統一使用動態加載 `branches.map()`
- ✅ 代碼已部署到 Railway

## 🔍 根本原因分析

### 可能性 1：生產環境數據庫未清理 ⚠️ **最可能**

**證據：**
1. 本地數據庫只有 2 個分店
2. 前端代碼已修復
3. 用戶仍然看到冗餘分店

**結論：**
生產環境的 PostgreSQL 數據庫中仍然存在大量舊的分店記錄！

### 可能性 2：前端環境變數配置錯誤

**問題：**
前端的 `NEXT_PUBLIC_API_URL` 可能指向錯誤的後端，或者後端 URL 已變更。

### 可能性 3：Railway 緩存問題

**問題：**
Railway 的 CDN 或構建緩存可能還在使用舊版本的前端代碼。

## 🛠️ 解決方案

### 方案 A：清理生產環境數據庫（推薦）

#### 步驟 1：連接到生產環境數據庫

需要從 Railway 後端服務獲取 `DATABASE_URL`：

```bash
# 在 Railway 後端服務的環境變數中找到 DATABASE_URL
# 格式類似：postgresql://user:password@host:port/database
```

#### 步驟 2：執行清理腳本

```bash
# 使用我們已經準備好的腳本
cd /Users/jerrylin/tattoo-crm/backend

# 設定生產環境數據庫 URL
export DATABASE_URL="postgresql://..."  # 從 Railway 複製

# 執行清理
npx ts-node scripts/reset-database.ts

# 重新建立種子數據
npx prisma db seed
```

#### 步驟 3：驗證

```bash
# 連接到生產數據庫並驗證
psql $DATABASE_URL -c "SELECT id, name FROM \"Branch\";"
# 應該只看到 2 個分店
```

### 方案 B：確認前端 API URL 配置

#### 檢查 Railway 前端環境變數

1. 登入 Railway Dashboard
2. 進入前端服務（tattoo-crm-production）
3. 檢查環境變數：
   ```
   NEXT_PUBLIC_API_URL=?
   ```
4. 確認後端服務的實際 URL

#### 更新前端環境變數

如果後端 URL 不正確，需要：

1. 在 Railway 前端服務中設定：
   ```
   NEXT_PUBLIC_API_URL=https://正確的後端URL.railway.app
   ```

2. 重新部署前端：
   ```bash
   cd /Users/jerrylin/tattoo-crm
   git commit --allow-empty -m "chore: Trigger frontend redeploy"
   git push origin main
   ```

### 方案 C：強制清除 Railway 緩存

```bash
# 在 Railway Dashboard 中：
1. 進入前端服務
2. 點擊 "Settings"
3. 點擊 "Redeploy" 或 "Clear Build Cache"
4. 重新部署
```

## 📋 診斷檢查清單

請用戶協助提供以下資訊：

### 1. Railway 後端服務資訊
- [ ] 後端服務名稱：__________
- [ ] 後端服務 URL：__________
- [ ] 後端服務狀態：Running / Crashed / Building

### 2. Railway 前端服務資訊
- [ ] 前端服務名稱：tattoo-crm-production
- [ ] 前端環境變數 `NEXT_PUBLIC_API_URL`：__________
- [ ] 最後部署時間：__________

### 3. 瀏覽器開發者工具檢查

請用戶執行以下操作：

1. 打開瀏覽器開發者工具（F12）
2. 切換到 "Network" 標籤
3. 刷新頁面
4. 找到 `/branches` 請求
5. 檢查：
   - [ ] 請求 URL：__________
   - [ ] 響應狀態碼：__________
   - [ ] 響應內容（分店數量）：__________

### 4. 截圖 Network 請求

請用戶提供以下截圖：
- [ ] Network 標籤中的 `/branches` 請求
- [ ] 該請求的 Response 內容
- [ ] 該請求的 Headers（特別是 Request URL）

## 🔧 臨時解決方案

如果無法立即清理生產數據庫，可以在前端添加去重邏輯：

```typescript
// frontend/src/app/admin/orders/page.tsx
const fetchBranches = useCallback(async () => {
  try {
    const branchesData = await getJsonWithAuth('/branches') as Array<Record<string, unknown>>;
    
    // 去重：只保留每個名稱的第一個分店
    const uniqueByName = branchesData.reduce((acc, branch) => {
      const name = branch.name as string;
      if (!acc.some(b => b.name === name)) {
        acc.push(branch);
      }
      return acc;
    }, [] as Array<Record<string, unknown>>);
    
    const uniqueBranches = sortBranchesByName(getUniqueBranches(uniqueByName)) as Branch[];
    setBranches(uniqueBranches);
  } catch (err) {
    console.error('載入分店資料失敗:', err);
  }
}, []);
```

## 📊 數據對比

### 本地環境（正常）
```
Branch 表：
- cmgru71k80001sbbj7k14ovg6 | 三重店 | 16 appointments | 10 orders
- cmgru71ka0002sbbj6hk19es2 | 東港店 | 8 appointments | 5 orders

總計：2 個分店
```

### 生產環境（推測）
```
Branch 表：
- cmg7dp8t10001sbdjirjya7tp | 三重店 | 0 appointments | 0 orders  ← 舊數據
- cmg7dp8t20002sbdj7go17bx0 | 東港店 | 0 appointments | 0 orders  ← 舊數據
- cmgXXXXXXXXXXXXXXXXXXXXX | 三重店 | ? appointments | ? orders
- cmgXXXXXXXXXXXXXXXXXXXXX | 東港店 | ? appointments | ? orders
- ... 更多重複的分店

總計：可能有 20+ 個分店（大部分是重複的）
```

## 🎯 下一步行動

### 立即行動（需要用戶協助）

1. **提供 Railway 資訊**
   - 後端服務的實際 URL
   - 前端的 `NEXT_PUBLIC_API_URL` 環境變數

2. **提供 Network 截圖**
   - 打開開發者工具
   - 訪問 https://tattoo-crm-production.up.railway.app/admin/orders
   - 截圖 Network 標籤中的 `/branches` 請求和響應

3. **提供數據庫訪問**（可選，如果用戶願意）
   - Railway 後端服務的 `DATABASE_URL`
   - 我們可以直接清理生產數據庫

### 技術團隊行動

1. **分析 Network 請求**
   - 確認前端實際連接的後端 URL
   - 確認後端返回的分店數量

2. **清理生產數據庫**
   - 刪除所有冗餘的分店記錄
   - 只保留 2 個有實際數據的分店

3. **驗證修復**
   - 確認 API 只返回 2 個分店
   - 確認前端只顯示 2 個分店選項

## 📝 總結

**當前狀態：**
- ✅ 本地環境：完全正常
- ✅ 前端代碼：已修復並部署
- ❓ 生產數據庫：可能存在冗餘數據
- ❓ 前端配置：需要驗證 API URL

**最可能的原因：**
生產環境的 PostgreSQL 數據庫中存在大量舊的分店記錄，需要清理。

**建議的解決方案：**
1. 確認生產環境後端 URL
2. 連接到生產數據庫
3. 執行清理腳本
4. 重新建立種子數據
5. 驗證修復

---

**報告時間：** 2025-10-15 18:45  
**診斷狀態：** 需要用戶提供更多資訊  
**優先級：** 🔴 高

