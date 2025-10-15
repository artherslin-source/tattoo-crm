# 數據庫重置指南

## 📊 當前數據庫狀態

### 分店配置（僅兩個分店）

| 分店名稱 | ID | 地址 | 電話 | 刺青師 | 經理 |
|---------|-------|------|------|--------|------|
| **三重店** | cmgrt8x710001sbjfaav8e5w9 | 新北市三重區重新路一段123號 | 02-2975-1234 | 黃晨洋、林承葉 (2位) | manager1@test.com |
| **東港店** | cmgrt8x730002sbjf3tyhkyip | 屏東縣東港鎮沿海路356號, 928 | 08 831 1615 | 陳震宇 (1位) | manager2@test.com |

### 數據統計

```
✅ 分店: 2 個
✅ 用戶: 18 位
   - BOSS: 1 位
   - 分店經理: 2 位
   - 會員: 12 位
   - 刺青師: 3 位
✅ 服務: 19 個
✅ 預約: 24 個
✅ 訂單: 15 個
```

## 🔑 預設帳號

### 管理帳號

| 角色 | Email | 密碼 | 分店 |
|------|-------|------|------|
| BOSS | admin@test.com | 12345678 | - |
| 三重店經理 | manager1@test.com | 12345678 | 三重店 |
| 東港店經理 | manager2@test.com | 12345678 | 東港店 |

### 刺青師帳號

| 姓名 | Email | 密碼 | 分店 | 專長 |
|------|-------|------|------|------|
| 陳震宇 | artist1@test.com | 12345678 | 東港店 | 日式傳統刺青 |
| 黃晨洋 | artist2@test.com | 12345678 | 三重店 | 幾何圖騰設計 |
| 林承葉 | artist3@test.com | 12345678 | 三重店 | 黑灰寫實風格 |

### 會員帳號

| Email | 密碼 | 姓名 | 分店 |
|-------|------|------|------|
| member1@test.com | 12345678 | 張小明 | 三重店 |
| member2@test.com | 12345678 | 李小華 | 三重店 |
| member3@test.com | 12345678 | 王小美 | 三重店 |
| member4@test.com | 12345678 | 陳小強 | 三重店 |
| member5@test.com | 12345678 | 林小婷 | 三重店 |
| member6@test.com | 12345678 | 黃小龍 | 三重店 |
| member7@test.com | 12345678 | 周小芳 | 東港店 |
| member8@test.com | 12345678 | 吳小剛 | 東港店 |
| member9@test.com | 12345678 | 鄭小慧 | 東港店 |
| member10@test.com | 12345678 | 謝小偉 | 東港店 |
| member11@test.com | 12345678 | 劉小雲 | 東港店 |
| member12@test.com | 12345678 | 張小傑 | 東港店 |

## 🛠️ 數據庫管理腳本

### 1. 完整重置（清理 + 重新建立）

```bash
cd backend
./scripts/reseed.sh
```

這個腳本會：
1. 清理所有現有數據
2. 重新運行種子數據
3. 顯示數據統計

### 2. 僅清理數據庫

```bash
cd backend
npx ts-node scripts/reset-database.ts
```

### 3. 僅建立種子數據

```bash
cd backend
npx prisma db seed
```

### 4. 驗證數據庫數據

```bash
cd backend
npx ts-node scripts/verify-data.ts
```

會顯示：
- 所有分店詳細信息
- 刺青師分配情況
- 分店經理分配情況
- 總體統計數據

## 📝 注意事項

### 本地開發環境

- **數據庫**: SQLite (`file:./prisma/dev.db`)
- **Schema Provider**: `sqlite`
- **數據文件位置**: `backend/prisma/dev.db`

### 生產環境 (Railway)

- **數據庫**: PostgreSQL
- **Schema Provider**: `postgresql`
- **自動切換**: `start-prod.js` 腳本會自動處理

### 重要提醒

⚠️ **本地開發環境**：
- 使用 SQLite，數據存儲在本地文件中
- 運行 `reseed.sh` 會清除所有本地數據
- 不影響生產環境

⚠️ **生產環境**：
- 使用 PostgreSQL，數據存儲在 Railway 提供的數據庫中
- 需要通過 Railway 控制台或 Railway CLI 管理
- **不要在生產環境運行 reseed 腳本**

## 🔄 常見操作

### 重置本地開發數據庫

```bash
cd backend
./scripts/reseed.sh
```

### 檢查數據庫內容

```bash
cd backend
npx ts-node scripts/verify-data.ts
```

### 查看數據庫（Prisma Studio）

```bash
cd backend
npx prisma studio
```

然後在瀏覽器中打開 http://localhost:5555

## 🎯 種子數據詳情

種子數據由 `backend/prisma/seed.ts` 定義：

- **2 個分店**：三重店、東港店（固定）
- **1 位 BOSS**：admin@test.com
- **2 位分店經理**：每個分店 1 位
- **12 位會員**：平均分配到兩個分店
- **3 位刺青師**：三重店 2 位，東港店 1 位
- **19 個服務**：各種刺青服務
- **24 個預約**：每位刺青師 8 個預約
- **15 個訂單**：部分預約完成後自動生成

## 📚 相關文件

- `backend/prisma/seed.ts` - 種子數據定義
- `backend/prisma/schema.prisma` - 數據庫架構
- `backend/scripts/reset-database.ts` - 清理數據庫腳本
- `backend/scripts/verify-data.ts` - 驗證數據腳本
- `backend/scripts/reseed.sh` - 一鍵重置腳本

## 🚀 快速開始

如果你是新手或想要重新開始：

```bash
# 1. 切換到 backend 目錄
cd backend

# 2. 確保依賴已安裝
npm install

# 3. 重置並建立數據庫
./scripts/reseed.sh

# 4. 驗證數據
npx ts-node scripts/verify-data.ts

# 5. 啟動後端服務
npm run start:dev
```

然後就可以使用任何預設帳號登入了！

