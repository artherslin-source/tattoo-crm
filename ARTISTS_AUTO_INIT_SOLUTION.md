# 刺青師自動初始化解決方案

## 📋 問題需求

需要確保系統始終維持 **6 位刺青師**的資料：
1. 陳震宇（東港店）
2. 黃晨洋（三重店）
3. 林承葉（三重店）
4. **陳翔男（東港店）** ← 新增
5. **朱川進（東港店）** ← 新增
6. **朱川進（三重店）** ← 新增

## ✅ 解決方案

### 核心思路

**完全自動化，無需手動操作**：
- 不需要 Railway CLI Token
- 不需要在 Dashboard 手動執行 SQL
- 不需要手動執行腳本
- 代碼推送 → Railway 自動部署 → 自動添加刺青師

### 實現方式

#### 1. **`backend/prisma/seed.ts`** - 在 Seeding 時自動添加

在 seed.ts 的最後添加了自動檢查並添加新刺青師的邏輯：

```typescript
// 自動添加新刺青師（無論保護模式）
console.log('\n🔍 檢查並添加新刺青師...');
// ... 檢查並添加陳翔男、朱川進（東港店、三重店）
```

**優點**：
- 無論是否在保護模式（PROTECT_REAL_DATA），都會檢查並添加新刺青師
- 使用 `findUnique` 檢查是否已存在，避免重複添加
- 不會刪除現有資料

#### 2. **`backend/scripts/start-prod.js`** - 啟動時確保添加

在啟動腳本中添加了獨立步驟：

```javascript
// 無論是否執行 seeding，都確保添加新刺青師
console.log('\n🔍 確保新刺青師已添加（不重置資料庫）...');
try {
  run('npm run add:artists', '添加新的刺青師資料');
  console.log('✅ 新刺青師檢查完成');
} catch (error) {
  console.warn('⚠️ 添加新刺青師時發生錯誤，但不影響服務啟動:', error.message);
}
```

**優點**：
- 即使不執行 seeding，也會確保新刺青師被添加
- 錯誤不會阻止服務啟動
- 每次部署都會自動執行

#### 3. **`backend/scripts/add-artists.ts`** - 獨立的添加腳本

已更新腳本，包含：
- 使用正確的圖片 URL（Unsplash）
- 正確的 email 格式
- 驗證邏輯（避免重複添加）
- 詳細的執行日誌

## 🔄 工作流程

```
1. 開發者推送代碼到 GitHub
   ↓
2. Railway 檢測到變更，開始自動部署
   ↓
3. 後端啟動流程執行：
   a. 編譯 TypeScript
   b. 執行 Prisma migrations
   c. 執行 seed.ts（如果配置）
   d. 執行 add-artists.ts（確保新刺青師存在）
   ↓
4. 後端服務啟動
   ↓
5. 前端自動從 API 獲取最新的刺青師列表（6 位）
```

## 📁 關鍵文件

### 修改的文件

1. **`backend/prisma/seed.ts`**
   - 添加自動檢查並添加新刺青師的邏輯
   - 位置：在 seeding 完成統計之前

2. **`backend/scripts/start-prod.js`**
   - 添加確保新刺青師的獨立步驟
   - 位置：在啟動 NestJS 服務之前

3. **`backend/scripts/add-artists.ts`**
   - 更新圖片 URL
   - 添加驗證和日誌輸出

### 新增的文件

- `backend/scripts/add-new-artists-railway.js` - Railway Shell 執行腳本（備用方案）
- `ADD_NEW_ARTISTS.sql` - SQL 腳本（備用方案，已不再需要）

## 🛡️ 資料保護機制

### 如何確保資料不被重置

1. **檢查邏輯**：使用 `findUnique` 檢查 email 是否存在
2. **保護模式**：如果 `PROTECT_REAL_DATA=true`，seed.ts 不會刪除現有刺青師
3. **獨立執行**：`add-artists.ts` 獨立執行，不會觸發資料重置
4. **錯誤處理**：如果添加失敗，不會影響服務啟動

### 如何維持 6 位刺青師

- **每次部署**：`start-prod.js` 都會執行 `npm run add:artists`
- **每次 Seeding**：`seed.ts` 會檢查並添加缺失的刺青師
- **自動檢查**：腳本會檢查是否已存在，避免重複添加

## 🔍 驗證方式

### 檢查刺青師數量

```bash
curl -s https://tattoo-crm-production-413f.up.railway.app/artists | jq 'length'
# 應該返回：6
```

### 檢查特定刺青師

```bash
curl -s https://tattoo-crm-production-413f.up.railway.app/artists | jq '[.[] | {name: .displayName, branch: .branch.name, email: .user.email}]'
```

### 預期結果

應該看到 6 位刺青師：
1. 陳震宇（東港店）- artist1@test.com
2. 黃晨洋（三重店）- artist2@test.com
3. 林承葉（三重店）- artist3@test.com
4. 陳翔男（東港店）- chen-xiangnan@tattoo.local
5. 朱川進（東港店）- zhu-chuanjin-donggang@tattoo.local
6. 朱川進（三重店）- zhu-chuanjin-sanchong@tattoo.local

## 🚀 部署檢查清單

- [x] 修改 defer.ts 添加自動檢查邏輯
- [x] 修改 start-prod.js 添加獨立步驟
- [x] 更新 add-artists.ts 腳本
- [x] 測試本地執行
- [x] 提交並推送代碼
- [x] Railway 自動部署
- [x] 驗證後端 API 返回 6 位刺青師
- [x] 驗證前端顯示正確

## 📝 未來維護

### 如果要添加新的刺青師

1. 修改 `backend/scripts/add-artists.ts` 添加新的刺青師資料
2. 同時修改 `backend/prisma/seed.ts` 中的 undo 陣列
3. 提交並推送，Railway 會自動部署並添加

### 如果要移除刺青師

⚠️ **注意**：移除刺青師需要手動操作，因為腳本只會添加，不會刪除。

### 如果要修改刺青師資料

1. 直接在資料庫中修改（通過 API 或 Dashboard）
2. 或者修改腳本中的資料，重新部署

## 🎯 關鍵要點

1. **完全自動化**：不需要任何手動操作
2. **資料保護**：不會意外刪除現有資料
3. **雙重保險**：seed.ts 和 start-prod.js 都會確保刺青師存在
4. **錯誤容忍**：即使添加失敗，服務仍會正常啟動
5. **可追蹤**：詳細的日誌輸出，方便排查問題

## 📅 實施日期

2025-01-30

## 👤 實施者

Auto (Cursor AI Assistant) + Jerry Lin

---

**重要提醒**：這個機制確保系統始終維持 6 位刺青師的資料。未來任何部署都會自動檢查並添加缺失的刺青師。

