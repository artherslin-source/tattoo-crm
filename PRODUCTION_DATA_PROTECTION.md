# 🛡️ 生產環境資料保護指南

## ⚠️ 重要提醒

**此專案已經進入客戶測試階段，包含真實的服務項目和圖片上傳資料。每次部署都必須保護這些真實資料！**

## 🔒 生產環境必須設置的環境變數

在 Railway Dashboard 的後端服務中，請確保以下環境變數設置：

### ✅ **必須設置（保護真實資料）**

```bash
PROTECT_REAL_DATA=true    # 啟用保護模式，不會刪除真實的服務項目和圖片資料
RUN_SEED=false            # 不執行 seed，保護真實資料（默認值）
RESET_DATABASE=false      # 不重置資料庫（默認值）
```

### ❌ **絕對不要設置（會刪除真實資料）**

```bash
RUN_SEED=true             # ❌ 會執行 seed，可能刪除真實資料
RESET_DATABASE=true       # ❌ 會重置資料庫，刪除所有資料
PROTECT_REAL_DATA=false   # ❌ 會刪除真實的服務項目和圖片
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
- ❌ 已移除 `prisma db push --force-reset`（會刪除所有資料）
- 只會執行新的 migration，不會重置資料庫

### 2. **Seed 保護**
- ✅ 只有在 `RUN_SEED=true` 時才會執行 seed
- ✅ 如果 `PROTECT_REAL_DATA=true`，seed 不會刪除：
  - 服務項目（Service）
  - 刺青師（Artist）
  - 分店（Branch）
  - 上傳的圖片記錄
- ✅ 即使執行 seed，也只會添加缺失的基礎資料（如預設管理員帳號）

### 3. **圖片文件保護**
- ✅ 上傳的圖片文件存儲在 `/uploads/` 目錄
- ✅ Railway 的持久化存儲確保圖片不會丟失
- ✅ 即使服務重新部署，圖片文件仍然保留

### 4. **自動添加機制**
- ✅ 每次部署會自動檢查並添加新刺青師（如果不存在）
- ✅ 只添加缺失的，不刪除現有的

## 📁 圖片上傳路徑

圖片上傳到以下路徑：
- 服務項目圖片：`/uploads/services/{category}/{filename}`
- 刺青師作品集：`/uploads/portfolio/{filename}`

這些路徑在 Railway 上是持久化的，不會因為部署而丟失。

## 🔍 如何確認保護機制已啟用

查看部署日誌，應該看到以下訊息：

```
🛡️ 生產模式：保護現有資料，只執行安全的遷移
📊 執行資料庫遷移（不會刪除任何資料）...
✅ 資料庫遷移完成（未刪除任何資料）
ℹ️ RUN_SEED 未設置為 true，跳過 seed（保護真實資料）
🔍 確保新刺青師已添加（只添加缺失的，不刪除現有的）...
✅ 新刺青師檢查完成
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
1. ✅ 永遠設置 `PROTECT_REAL_DATA=true`
2. ✅ 永遠不要設置 `RUN_SEED=true`（除非明確需要）
3. ✅ 永遠不要設置 `RESET_DATABASE=true`
4. ✅ 只使用 `prisma migrate deploy`（安全的遷移）
5. ✅ 定期備份資料庫和圖片

**記住：真實資料比任何開發便利性都重要！**

---
*最後更新：2025-01-30*
*適用於：生產環境（Railway）*

