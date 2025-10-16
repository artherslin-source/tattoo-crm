# Railway 完整資料同步指南

## 🔍 問題診斷結果

經過詳細檢查，我發現了資料無法導入的根本原因：

### 檢查結果：
- ✅ `RUN_SEED=true` 環境變數已生效
- ✅ `start-prod.js` 正確執行種子數據導入
- ❌ **種子數據導入失敗**：`PrismaClientKnownRequestError`
- ⚠️ 服務繼續啟動，但資料未導入

### 失敗原因：
Railway 資料庫已有用戶資料（例如 `admin@test.com`），種子文件嘗試創建相同的用戶，違反了 unique constraint（唯一性約束），導致導入失敗。

---

## 🚀 解決方案

我已經修改了 `start-prod.js`，添加了**完全重置資料庫**的功能：

### 新增環境變數：`RESET_DATABASE`

當設置 `RESET_DATABASE=true` 時，系統會：
1. 完全清空資料庫
2. 重新運行所有 migrations
3. 執行種子數據導入
4. 啟動應用程式

---

## 📋 完整操作步驟

### 步驟 1：設置 Railway 環境變數

登入 Railway Dashboard：https://railway.app

選擇專案：**Tattoo-crm-backend**

進入 **Variables** 標籤

#### 添加/更新以下環境變數：

```
RESET_DATABASE=true
PROTECT_REAL_DATA=false
```

> **重要說明**：
> - `RESET_DATABASE=true`：完全重置資料庫（清空所有數據）
> - `PROTECT_REAL_DATA=false`：允許重建分店和刺青師數據

### 步驟 2：觸發部署

環境變數設置完成後，Railway 會自動觸發部署。

或者手動觸發：
1. 進入 **Deployments** 標籤
2. 點擊右上角的 **Deploy** 按鈕
3. 或點擊最新部署旁的 **...** → **Redeploy**

### 步驟 3：監控部署進度

1. 在 **Deployments** 標籤中點擊最新部署
2. 查看部署日誌
3. 等待看到以下訊息：

```
✅ DATABASE_URL 驗證通過
📊 使用 PostgreSQL 資料庫
▶ 生成 Prisma Client
▶ 編譯 TypeScript 專案
🔄 完全重置資料庫模式：將清空並重建所有數據
▶ 重置資料庫
🌱 執行資料庫 seeding...
▶ 匯入預設種子資料
✅ 建立管理員帳號: admin@test.com
✅ 建立測試使用者
✅ 建立分店：三重店
✅ 建立分店：東港店
✅ 建立服務項目
✅ 建立刺青師
✅ 建立預約
✅ 建立訂單
🚀 Server is running on port 4000
```

### 步驟 4：驗證資料導入

部署完成後（約 5-7 分鐘），執行以下命令驗證：

```bash
# 檢查服務項目
curl https://tattoo-crm-production-413f.up.railway.app/services | jq length
# 預期結果：> 0（例如：8）

# 檢查刺青師
curl https://tattoo-crm-production-413f.up.railway.app/artists | jq length
# 預期結果：> 0（例如：3）

# 檢查分店統計
curl https://tattoo-crm-production-413f.up.railway.app/branches/public | jq '.[0]._count'
# 預期結果：artists, orders, appointments 應該 > 0
```

### 步驟 5：清理環境變數（重要！）

**資料導入成功後，請務必移除或修改環境變數**：

```
RESET_DATABASE=false  # 或直接刪除此變數
```

> **⚠️ 警告**：
> 如果不移除 `RESET_DATABASE=true`，下次部署時會再次清空資料庫！

---

## ⏱️ 時間預估

| 步驟 | 預計時間 |
|------|----------|
| 設置環境變數 | 2 分鐘 |
| Railway 構建 | 2-3 分鐘 |
| 資料庫重置 | 1 分鐘 |
| 資料導入 | 1-2 分鐘 |
| 應用啟動 | 1 分鐘 |
| **總計** | **7-9 分鐘** |

---

## 🎯 預期結果

完成所有步驟後，Railway 後端將擁有與本地相同的完整測試數據：

### 資料統計：
- ✅ 2 個分店（三重店、東港店）
- ✅ 8+ 個服務項目
- ✅ 3 個刺青師
- ✅ 24 個預約
- ✅ 15 個訂單
- ✅ 17 個用戶

### 前端效果：
- ✅ 所有管理頁面顯示數據
- ✅ 分店篩選功能正常
- ✅ CRUD 操作正常
- ✅ 儲值和消費功能正常
- ✅ 登入功能正常

---

## ⚠️ 重要注意事項

### 1. 資料清空警告
`RESET_DATABASE=true` 會**完全清空資料庫**！
- ✅ 適用於：測試環境、初始部署
- ❌ 不適用於：正式環境、有真實用戶資料的環境

### 2. 環境變數管理
完成資料導入後，請**立即**調整環境變數：
```
RESET_DATABASE=false  # 或刪除
RUN_SEED=false        # 避免重複導入
PROTECT_REAL_DATA=false  # 測試環境可保持 false
```

### 3. 正式環境保護
如果將來這是正式環境，請：
- **永遠不要**設置 `RESET_DATABASE=true`
- 設置 `PROTECT_REAL_DATA=true` 保護真實數據
- 設置 `RUN_SEED=false` 禁用種子數據

---

## 🔧 故障排除

### 問題 1：Migration 失敗

**症狀**：
```
Error: P3009: migrate found failed migrations
```

**解決方案**：
這是正常的，`migrate reset` 命令會重置所有 migrations。如果看到此錯誤後繼續執行成功，則沒問題。

### 問題 2：Seeding 仍然失敗

**症狀**：
```
❌ Seeding 失敗: PrismaClientKnownRequestError
```

**可能原因**：
1. `RESET_DATABASE` 未設為 `'true'`（字串）
2. Migration reset 執行失敗
3. 資料庫連線問題

**解決方案**：
1. 確認環境變數格式正確（`RESET_DATABASE=true`，不是 `RESET_DATABASE="true"`）
2. 檢查 Railway Postgres 服務狀態
3. 查看完整部署日誌以確定具體錯誤

### 問題 3：部署時間過長

**症狀**：部署超過 10 分鐘

**可能原因**：
- Railway 平台繁忙
- 資料庫重置需要額外時間

**解決方案**：
- 耐心等待
- 如果超過 15 分鐘，檢查部署日誌是否有錯誤
- 必要時取消部署並重試

---

## 📞 需要協助？

完成操作後，請告訴我：
1. ✅ 部署是否成功完成？
2. ✅ 部署日誌中是否看到 "✅ 建立" 相關訊息？
3. ✅ API 驗證是否返回資料？

我會立即幫您驗證結果並進行下一步配置！

---

## 📝 後續步驟

資料同步成功後，我們還需要：

### 1. 設置前端環境變數
在前端 Railway 專案（`tattoo-crm-production`）中設置：
```
NEXT_PUBLIC_API_URL=https://tattoo-crm-production-413f.up.railway.app
```

### 2. 等待前端重新部署
- 前端會自動重新部署
- 預計時間：2-3 分鐘

### 3. 測試完整功能
- 訪問前端網站
- 登入管理後台（admin@test.com / 12345678）
- 測試所有管理頁面
- 驗證資料顯示正常

---

## ✅ 成功檢查清單

- [ ] Railway 後端環境變數已設置（RESET_DATABASE=true, PROTECT_REAL_DATA=false）
- [ ] Railway 後端部署成功
- [ ] 部署日誌顯示資料導入成功
- [ ] API 驗證返回完整資料
- [ ] 環境變數已清理（RESET_DATABASE=false）
- [ ] 前端環境變數已設置（NEXT_PUBLIC_API_URL）
- [ ] 前端部署成功
- [ ] 前端管理頁面顯示資料
- [ ] 所有功能正常運作

祝順利！🎉

