# 🛡️ 生產環境資料保護指南

## ⚠️ 重要提醒

**此專案已經進入客戶測試階段，包含真實的服務項目和圖片上傳資料。每次部署都必須保護這些真實資料！**

## 🔒 生產環境政策（最重要）

你已選擇的政策：

1. **啟動時絕不自動寫入/補資料**（禁止 seed / 初始化 / 自動補資料腳本）
2. **資料庫遷移失敗就停止部署/啟動**（寧可不上線，也不能冒風險碰客戶資料）

因此，在 Railway production（後端服務）中：

### ✅ 必須遵守
- ✅ `npx prisma migrate deploy` 成功才允許啟動服務
- ✅ 任何資料修復/補值都必須 **人工、一次性** 執行（且先備份）

### ❌ 絕對禁止（已由程式硬性 guard 阻擋）

```bash
RUN_SEED=true             # ❌ 禁止：production 不允許自動 seeding
RESET_DATABASE=true       # ❌ 禁止：任何重置資料庫行為
ACCEPT_DATA_LOSS=true     # ❌ 禁止：允許 schema 同步時刪資料的模式
```

## 📋 Railway 環境變數設置步驟

1. 訪問 Railway Dashboard：https://railway.app/dashboard
2. 選擇後端服務（例如：`tattoo-crm-backend`）
3. 點擊 **"Variables"** 標籤
4. 設置以下環境變數：
   - `PROTECT_REAL_DATA` = `true` ✅
   - `RUN_SEED` = `false` ✅（或不設置，默認為 false）
   - `RESET_DATABASE` = `false` ✅（或不設置，默認為 false）
5. 保存設置
6. 如果需要，重新部署服務

## 🛡️ 保護機制說明

### 1. **資料庫遷移保護**
- ✅ 使用 `prisma migrate deploy`（安全的遷移，不會刪除資料）
- ✅ 若 `migrate deploy` 失敗：**直接停止啟動/部署**
- ❌ 不允許任何 `db push` fallback，更不允許 `--accept-data-loss`

### 2. **Seed / 初始化保護**
- ❌ production 啟動時 **不會** 執行任何 seed / 初始化 / 自動補資料腳本
- ✅ 若需要建立測試資料或初始化資料：只能在 **dev/staging** 或以 **人工一次性 job** 在 production 執行（且必須先備份）

### 3. **圖片文件保護**
- ✅ 上傳的圖片文件存儲在 `/uploads/` 目錄
- ✅ Railway 的持久化存儲確保圖片不會丟失
- ✅ 即使服務重新部署，圖片文件仍然保留

### 4. **自動寫入已停用**
- ❌ 已停用「每次部署自動補資料」（例如自動添加刺青師）\n+  - 這類行為即使是「只補缺」也屬於 production 啟動時的自動寫入，會增加風險\n+  - 若真的需要補資料，請走人工一次性 job（並先備份）

## 📁 圖片上傳路徑

圖片上傳到以下路徑：
- 服務項目圖片：`/uploads/services/{category}/{filename}`
- 刺青師作品集：`/uploads/portfolio/{filename}`

這些路徑在 Railway 上是持久化的，不會因為部署而丟失。

## 🔍 如何確認保護機制已啟用

查看部署日誌，應該看到以下訊息（或同等語意）：

```
🛡️ 生產模式：保護現有資料，只執行安全的遷移
📊 執行資料庫遷移（不會刪除任何資料）...
✅ 資料庫遷移完成（未刪除任何資料）
🛡️ Production policy: 不在啟動時自動寫入/補資料（seed/初始化/回填一律禁止）。
```

**❌ 如果看到以下訊息，表示保護未啟用：**
```
⚠️⚠️⚠️ 警告：RUN_SEED=true 但 PROTECT_REAL_DATA 未設置為 true！
🔄 強制重置並執行種子數據模式
🗑️ 額外確保數據庫完全清空...
```

## 🚨 緊急情況處理

如果意外執行了重置：

1. **停止部署**：立即停止 Railway 部署（如果有正在進行的部署）
2. **檢查環境變數**：確認 `PROTECT_REAL_DATA=true` 和 `RUN_SEED=false`
3. **恢復資料**：
   - 如果有備份，使用備份恢復
   - 檢查 Railway PostgreSQL 是否提供備份功能
4. **重新上傳圖片**：如果圖片丟失，需要重新上傳

## 📝 部署檢查清單

在每次部署前，確認：

- [ ] `PROTECT_REAL_DATA=true` 已設置
- [ ] `RUN_SEED=false` 或未設置
- [ ] `RESET_DATABASE=false` 或未設置
- [ ] 部署日誌顯示保護模式已啟用
- [ ] 部署後服務項目資料仍然存在
- [ ] 部署後圖片仍然可以正常顯示

## 🎯 總結

**生產環境的黃金規則：**
1. ✅ 啟動時不做任何自動寫入（seed/初始化/補資料都禁止）
2. ✅ `prisma migrate deploy` 失敗就停止部署/啟動
3. ✅ 永遠不要使用任何 data-loss 模式（例如 `--accept-data-loss`）
4. ✅ 定期備份資料庫和圖片

**記住：真實資料比任何開發便利性都重要！**

---
*最後更新：2026-01-16*
*適用於：生產環境（Railway）*


