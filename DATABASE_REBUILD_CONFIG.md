# 資料庫重建設定說明

## 📋 目前設定概覽

### **1. 生產環境部署控制（Railway）**

#### **RUN_SEED 環境變數**
控制是否在部署時執行資料庫 seeding

| 設定值 | 行為 | 使用時機 |
|--------|------|----------|
| **未設定或 `false`** | ⏭️ **跳過 seeding**<br>保留所有現有數據 | ✅ **正常部署**（默認）<br>保留生產數據 |
| **`true`** | 🌱 **執行 seeding**<br>根據 PROTECT_REAL_DATA 決定清理範圍 | ⚠️ 首次部署或需要重建數據 |

**檔案位置：** `backend/scripts/start-prod.js`

**程式碼：**
```javascript
// 只在環境變數明確設定為 true 時才執行 seeding
if (process.env.RUN_SEED === 'true') {
  console.log('🌱 執行資料庫 seeding...');
  try {
    run('npx ts-node prisma/seed.ts', '匯入預設種子資料');
  } catch (error) {
    console.warn('⚠️ Seeding 失敗，但服務將繼續啟動');
    console.warn('   這通常是因為資料庫已經有數據了');
  }
} else {
  console.log('⏭️ 跳過資料庫 seeding（RUN_SEED 未設定為 true）');
}
```

---

### **2. Seeding 數據保護模式**

#### **PROTECT_REAL_DATA 環境變數**
控制 seeding 時是否保護真實的分店和刺青師數據

| 設定值 | 清理範圍 | 保留數據 | 使用時機 |
|--------|----------|----------|----------|
| **未設定或 `false`** | 🗑️ **清除所有數據**<br>包括分店、刺青師、用戶、訂單、預約 | ❌ 無 | 開發/測試環境<br>需要完整重建 |
| **`true`** | 🗑️ **部分清除**<br>清除用戶、訂單、預約等 | ✅ **保留分店和刺青師** | 生產環境<br>保護真實業務數據 |

**檔案位置：** `backend/prisma/seed.ts`

**程式碼：**
```typescript
const PROTECT_REAL_DATA = process.env.PROTECT_REAL_DATA === 'true';

if (PROTECT_REAL_DATA) {
  console.log('🛡️ 保護模式：將保留現有的分店和刺青師數據');
} else {
  console.log('⚠️ 完整重建模式：將重建所有數據（包括分店和刺青師）');
}

// 分店數據 - 根據保護模式決定是否清理
if (!PROTECT_REAL_DATA) {
  await prisma.branch.deleteMany();  // 清除分店
} else {
  console.log('🛡️ 保護模式：保留分店數據');
}

// 刺青師數據 - 根據保護模式決定是否清理
if (!PROTECT_REAL_DATA) {
  await prisma.artist.deleteMany();  // 清除刺青師
} else {
  console.log('🛡️ 保護模式：保留刺青師數據');
}
```

---

## 🎯 使用場景

### **場景 1：正常生產部署（默認，推薦）**

**Railway 環境變數設定：**
- `RUN_SEED`: 未設定或 `false`
- `PROTECT_REAL_DATA`: 任意（不會執行 seeding，此變數無效）

**行為：**
```
✅ 跳過資料庫 seeding
✅ 保留所有現有數據
✅ 應用正常啟動
✅ 不會有 email 衝突錯誤
```

**日誌輸出：**
```
📊 使用 PostgreSQL 資料庫
▶ 生成 Prisma Client
▶ 編譯 TypeScript 專案
▶ 同步資料庫 Schema
⏭️ 跳過資料庫 seeding（RUN_SEED 未設定為 true）
▶ 啟動 NestJS 伺服器
```

---

### **場景 2：首次部署（需要初始數據）**

**Railway 環境變數設定：**
- `RUN_SEED`: `true`
- `PROTECT_REAL_DATA`: `false`

**行為：**
```
🌱 執行資料庫 seeding
🗑️ 清除所有數據（包括分店、刺青師）
✅ 創建測試數據
✅ 應用正常啟動
```

**創建的數據：**
- 管理員帳號：`admin@test.com` / `12345678`
- 2 個分店（三重店、東港店）
- 4 個刺青師
- 20 個一般會員
- 40 個預約記錄
- 30 個訂單記錄

---

### **場景 3：生產環境重建數據（保護真實業務數據）**

**Railway 環境變數設定：**
- `RUN_SEED`: `true`
- `PROTECT_REAL_DATA`: `true`

**行為：**
```
🌱 執行資料庫 seeding
🛡️ 保護模式：保留分店和刺青師數據
🗑️ 清除用戶、會員、預約、訂單
✅ 創建新的測試用戶和訂單
✅ 保留真實的分店和刺青師
✅ 應用正常啟動
```

**保留的數據：**
- ✅ 現有的分店資料
- ✅ 現有的刺青師資料

**清除的數據：**
- ❌ 所有用戶（包括管理員）
- ❌ 所有會員
- ❌ 所有預約
- ❌ 所有訂單

---

### **場景 4：本地開發（完整重建）**

**本地 `.env` 設定：**
```env
RUN_SEED=true
PROTECT_REAL_DATA=false
```

**執行方式：**
```bash
npm run start:dev
# 或手動執行
npx ts-node prisma/seed.ts
```

**行為：**
```
🌱 執行資料庫 seeding
⚠️ 完整重建模式：將重建所有數據
🗑️ 清除所有數據
✅ 創建完整的測試數據
✅ 包括分店、刺青師、用戶、訂單、預約
```

---

## ⚙️ Railway 環境變數設定步驟

### **設定 RUN_SEED**

1. 登入 [Railway Dashboard](https://railway.app)
2. 選擇後端服務（`tattoo-crm-backend`）
3. 點擊 **Variables** 標籤
4. 點擊 **New Variable**
5. 填寫：
   - **Variable Name**: `RUN_SEED`
   - **Value**: `true` 或 `false`
6. 點擊 **Add**
7. 重新部署（Railway 會自動觸發）

### **設定 PROTECT_REAL_DATA**

1. 在同樣的 **Variables** 頁面
2. 點擊 **New Variable**
3. 填寫：
   - **Variable Name**: `PROTECT_REAL_DATA`
   - **Value**: `true` 或 `false`
4. 點擊 **Add**
5. 重新部署

---

## 📊 數據清理順序（seed.ts）

為了遵守外鍵約束，數據清理按以下順序執行：

```typescript
1. installment      // 分期付款
2. order           // 訂單
3. appointment     // 預約
4. artist          // 刺青師（可保護）
5. member          // 會員
6. serviceHistory  // 服務歷史
7. service         // 服務項目
8. branch          // 分店（可保護）
9. user            // 用戶
```

---

## 🔍 如何查看目前的設定

### **查看 Railway 環境變數：**
1. Railway Dashboard → 選擇後端服務
2. 點擊 **Variables** 標籤
3. 查看 `RUN_SEED` 和 `PROTECT_REAL_DATA` 的值

### **查看部署日誌：**
1. Railway Dashboard → 選擇後端服務
2. 點擊 **Deployments**
3. 選擇最新部署
4. 點擊 **View Logs**
5. 搜尋以下關鍵字：
   - `跳過資料庫 seeding` - 表示未執行 seeding
   - `執行資料庫 seeding` - 表示正在執行 seeding
   - `保護模式` - 表示正在保護分店和刺青師
   - `完整重建模式` - 表示將清除所有數據

---

## ⚠️ 注意事項

### **1. 生產環境建議**
- ✅ 默認設定：`RUN_SEED` 不設定或設為 `false`
- ✅ 保留所有現有數據
- ✅ 避免誤刪真實業務數據

### **2. 重建數據時的風險**
- ⚠️ `RUN_SEED=true` + `PROTECT_REAL_DATA=false` 會刪除所有數據
- ⚠️ 包括真實的分店、刺青師、客戶、訂單
- ⚠️ 只有在確定需要完全重建時才使用

### **3. 推薦的操作流程**
```
步驟 1: 正常部署（保留數據）
  RUN_SEED=未設定

步驟 2: 如需重建（保護業務數據）
  RUN_SEED=true
  PROTECT_REAL_DATA=true
  部署完成後立即移除 RUN_SEED

步驟 3: 完全重建（僅開發環境）
  RUN_SEED=true
  PROTECT_REAL_DATA=false
  部署完成後立即移除 RUN_SEED
```

---

## 📝 總結

### **目前的安全設定**

| 環境變數 | 默認值 | 行為 |
|----------|--------|------|
| `RUN_SEED` | 未設定 | ✅ **跳過 seeding，保留所有數據** |
| `PROTECT_REAL_DATA` | 未設定 | （僅在 RUN_SEED=true 時有效） |

**這個設定確保：**
- ✅ 生產環境部署時不會誤刪數據
- ✅ 避免 email 唯一約束衝突
- ✅ 應用能正常啟動
- ✅ 保護真實的業務數據

**如需重建數據：**
- 在 Railway 手動設定 `RUN_SEED=true`
- 根據需要設定 `PROTECT_REAL_DATA`
- 完成後立即移除或設為 `false`

