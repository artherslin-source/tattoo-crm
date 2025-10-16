# Railway 資料同步指南

## 📊 問題診斷結果

經過對比本地和 Railway 後端資料庫，發現：

### ✅ Railway 有的資料：
- 分店基本資訊（三重店、東港店）
- 用戶資料（17 個用戶）

### ❌ Railway 缺少的資料：
- **服務項目**：0 個（本地有多個）
- **刺青師**：0 個（本地有 3 個）
- **預約**：0 個（本地有 24 個）
- **訂單**：0 個（本地有 15 個）

**這就是前端無法顯示數據的根本原因！**

---

## 🚀 解決方案：使用 Smart-Rebuild 系統同步資料

### 📋 同步計劃

我們將使用 Railway 的自動種子系統（`start-prod.js`）來同步本地完整測試數據到 Railway：

1. 設置環境變數啟用種子數據導入
2. Railway 自動重新部署
3. 部署過程中自動執行資料導入
4. 完成後驗證資料

---

## 🔧 詳細操作步驟

### 步驟 1：登入 Railway Dashboard

1. 訪問：https://railway.app
2. 使用您的帳號登入

### 步驟 2：選擇後端專案

1. 在專案列表中找到：**Tattoo-crm-backend**
2. 點擊進入專案

### 步驟 3：設置環境變數

1. 點擊頂部的 **Variables** 標籤
2. 點擊 **+ New Variable** 按鈕
3. 添加第一個環境變數：
   ```
   Key: RUN_SEED
   Value: true
   ```
4. 再次點擊 **+ New Variable**
5. 添加第二個環境變數：
   ```
   Key: PROTECT_REAL_DATA
   Value: false
   ```
6. 點擊 **Add** 或 **Save**

### 步驟 4：觸發部署

**方法 A：自動觸發（推薦）**
- 設置環境變數後，Railway 會自動檢測到變更
- 系統會自動開始重新部署
- 等待部署完成（3-5 分鐘）

**方法 B：手動觸發**
- 在 **Deployments** 標籤中
- 點擊最新部署旁的 **...** 按鈕
- 選擇 **Redeploy**

### 步驟 5：監控部署進度

1. 進入 **Deployments** 標籤
2. 點擊最新的部署
3. 查看部署日誌
4. 等待看到以下訊息：
   ```
   ✅ Migration completed successfully
   ✅ Seed data imported successfully
   🚀 Server is running on port XXXX
   ```

---

## 🔍 驗證資料導入

部署完成後，使用以下命令驗證資料是否成功導入：

### 1. 檢查服務項目

```bash
curl https://tattoo-crm-production-413f.up.railway.app/services | jq length
```

**預期結果**：返回一個數字 > 0（例如：8）

### 2. 檢查刺青師

```bash
curl https://tattoo-crm-production-413f.up.railway.app/artists | jq length
```

**預期結果**：返回一個數字 > 0（例如：3）

### 3. 檢查分店統計

```bash
curl https://tattoo-crm-production-413f.up.railway.app/branches/public | jq '.[0]._count'
```

**預期結果**：
```json
{
  "users": 9,
  "artists": 2,
  "orders": 10,
  "appointments": 16
}
```

---

## ⏱️ 時間預估

| 步驟 | 預計時間 |
|------|----------|
| 設置環境變數 | 2 分鐘 |
| Railway 部署 | 3-5 分鐘 |
| 資料導入 | 1-2 分鐘 |
| **總計** | **6-9 分鐘** |

---

## ⚠️ 重要提醒

### 1. 資料覆蓋警告
- 這個操作將**完全覆蓋** Railway 資料庫中的現有資料
- 確保這是**測試環境**，不是正式環境
- 如果有重要資料，請先備份

### 2. 環境變數管理
- 導入完成後，建議將 `RUN_SEED` 改為 `false`
- 這樣可以避免下次部署時重複導入資料
- `PROTECT_REAL_DATA` 可以保持 `false`（測試環境）

### 3. 資料類型
- 導入的是**測試數據**，包含：
  - 測試用戶（例如：test@test.com）
  - 範例服務項目
  - 範例刺青師
  - 範例預約和訂單

---

## 📞 故障排除

### 問題 1：部署失敗 - Prisma Migration 錯誤

**症狀**：看到類似錯誤訊息：
```
Error: P1001: Can't reach database server
```

**解決方案**：
1. 檢查 `DATABASE_URL` 環境變數是否正確設置
2. 確認 Postgres 服務是否正常運行
3. 在 Railway Dashboard 中檢查 Postgres 服務狀態

### 問題 2：Seed 執行失敗

**症狀**：看到類似錯誤訊息：
```
Seed not executed
```

**解決方案**：
1. 確認 `RUN_SEED` 設為 `'true'`（字串，不是布爾值）
2. 確認 `PROTECT_REAL_DATA` 設為 `'false'`
3. 檢查部署日誌中的具體錯誤訊息

### 問題 3：資料導入後，前端仍然無法顯示

**症狀**：API 返回資料，但前端頁面空白

**解決方案**：
1. 確認前端的 `NEXT_PUBLIC_API_URL` 環境變數已設置
2. 前端也需要重新部署以使用新的環境變數
3. 清除瀏覽器緩存並硬性重新整理（Cmd+Shift+R）

---

## ✅ 成功標誌

當以下條件都滿足時，表示資料同步成功：

- [ ] Railway 後端部署狀態為 **Active**
- [ ] API 端點返回完整資料（服務項目、刺青師、預約、訂單）
- [ ] 分店統計顯示正確的計數
- [ ] 前端管理頁面能夠顯示數據
- [ ] 登入功能正常運作
- [ ] CRUD 操作正常執行

---

## 📝 後續步驟

資料同步完成後：

1. **測試前端功能**
   - 登入管理後台
   - 檢查各個管理頁面
   - 測試 CRUD 操作

2. **調整環境變數**
   ```
   RUN_SEED=false  # 避免重複導入
   PROTECT_REAL_DATA=false  # 測試環境可保持 false
   ```

3. **設置前端環境變數**
   - 在前端 Railway 專案中設置：
   ```
   NEXT_PUBLIC_API_URL=https://tattoo-crm-production-413f.up.railway.app
   ```

4. **驗證完整功能**
   - 測試所有管理頁面
   - 測試儲值和消費功能
   - 測試預約和訂單管理

---

## 🎯 預期結果

完成所有步驟後，您應該看到：

### Railway 後端資料庫
- ✅ 8+ 個服務項目
- ✅ 3 個刺青師
- ✅ 24 個預約
- ✅ 15 個訂單
- ✅ 17 個用戶

### 前端管理頁面
- ✅ 服務項目列表顯示數據
- ✅ 刺青師列表顯示數據
- ✅ 預約列表顯示數據
- ✅ 訂單列表顯示數據
- ✅ 會員列表顯示數據
- ✅ 分店篩選功能正常

---

## 📞 需要協助？

完成操作後，請告訴我結果，我會：
1. 幫您驗證資料是否成功導入
2. 確認前端是否能正常顯示
3. 解決任何遇到的問題

祝順利！🎉

