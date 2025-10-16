# 🤖 智能數據重建系統使用指南

## 📋 概述

智能數據重建系統是一個安全、自動化的資料庫管理工具，具有以下特點：

- ✅ **自動環境檢測**：識別生產/開發環境
- ✅ **自動備份**：重建前自動備份關鍵數據
- ✅ **智能保護**：生產環境強制保護業務數據
- ✅ **一鍵恢復**：簡單的數據恢復命令
- ✅ **詳細日誌**：清晰的操作記錄和結果

---

## 🎯 重建規則

### **規則 1：助手判斷需要重建**

**觸發條件：**
- 修改了 Prisma schema
- 添加了新的 seed 邏輯
- 測試新功能需要數據
- 修復數據一致性問題

**執行流程：**
1. 助手向用戶說明重建原因
2. 詢問用戶確認
3. 自動檢測環境
4. 自動備份數據
5. 執行重建

### **規則 2：用戶明確要求重建**

**觸發關鍵字：**
- "重建數據"
- "清理數據庫"
- "重新 seed"
- "執行 rebuild"

**執行流程：**
1. 確認用戶意圖
2. 提供選項（完全重建 vs 保護業務數據）
3. 自動檢測環境
4. 自動備份數據
5. 執行重建

### **規則 3：其他情況**

**行為：**
- ⏭️ 保持現有數據
- ❌ 不執行任何清理
- ✅ 安全優先

---

## 🚀 快速開始

### **基本命令**

```bash
# 進入後端目錄
cd backend

# 查看幫助
npm run rebuild -- --help

# 開發環境完全重建
npm run rebuild:dev

# 生產環境保護性重建
npm run rebuild:protect

# 手動重建（會詢問確認）
npm run rebuild
```

---

## 📚 詳細用法

### **1. 開發環境重建**

**使用場景：** 本地開發、測試新功能

```bash
# 完全重建所有數據
npm run rebuild -r "測試新功能"

# 或使用快捷命令
npm run rebuild:dev
```

**行為：**
- 🗑️ 清除所有數據（包括分店、刺青師）
- ✅ 創建完整的測試數據
- 💾 自動備份
- ❓ 詢問確認

**創建的數據：**
- 1 個管理員（admin@test.com / 12345678）
- 2 個分店
- 4 個刺青師
- 20 個會員
- 40 個預約
- 30 個訂單

---

### **2. 生產環境保護性重建**

**使用場景：** 清理測試數據但保留業務資料

```bash
# 保護性重建
npm run rebuild -p -r "清理測試數據"

# 或使用快捷命令
npm run rebuild:protect
```

**行為：**
- 🛡️ **保留**：分店、刺青師
- 🗑️ **清除**：用戶、會員、預約、訂單
- ✅ 創建新的測試數據
- 💾 自動備份
- ❓ 詢問確認

---

### **3. 自動化重建（CI/CD）**

**使用場景：** 自動化部署、測試流程

```bash
# 自動確認，不詢問
npm run rebuild -p -y -r "自動部署"

# 跳過備份（不建議）
npm run rebuild -p -y --no-backup
```

**參數說明：**
- `-y` 或 `--yes`：自動確認
- `--no-backup`：跳過備份（不建議）

---

## 💾 備份和恢復

### **查看備份**

```bash
# 列出所有備份
npm run backup:list

# 或
npm run restore -- --list
```

**輸出範例：**
```
📦 可用的備份文件:
   1. backup_2025-01-15T10-30-00-000Z.json
   2. backup_2025-01-14T15-20-00-000Z.json
   3. backup_2025-01-13T09-10-00-000Z.json
```

---

### **恢復備份**

```bash
# 恢復最新的備份
npm run restore -- --latest

# 恢復特定備份
npm run restore -- backup_2025-01-15T10-30-00-000Z.json

# 自動確認恢復
npm run restore -- --latest -y
```

**恢復範圍：**
- ✅ 分店資料
- ✅ 刺青師資料
- ✅ 服務項目
- ❌ 不影響：用戶、會員、預約、訂單

---

## 🔍 完整參數說明

### **rebuild 命令**

```bash
npm run rebuild [options]
```

| 參數 | 簡寫 | 說明 | 範例 |
|------|------|------|------|
| `--reason <原因>` | `-r` | 重建原因 | `-r "測試新功能"` |
| `--protect` | `-p` | 保護分店和刺青師 | `-p` |
| `--yes` | `-y` | 自動確認 | `-y` |
| `--no-backup` | - | 跳過備份（不建議） | `--no-backup` |
| `--help` | `-h` | 顯示幫助 | `-h` |

---

### **restore 命令**

```bash
npm run restore [options] [backup-file]
```

| 參數 | 簡寫 | 說明 | 範例 |
|------|------|------|------|
| `--list` | `-l` | 列出所有備份 | `-l` |
| `--latest` | - | 恢復最新備份 | `--latest` |
| `--yes` | `-y` | 自動確認 | `-y` |
| `--help` | `-h` | 顯示幫助 | `-h` |

---

## 🌍 環境檢測

系統會自動檢測當前環境：

| 環境 | 檢測條件 | 行為 |
|------|----------|------|
| **生產環境** | `NODE_ENV=production`<br>或 `DATABASE_URL` 包含 `railway` | 強制啟用 `--protect`<br>禁止完全重建 |
| **測試環境** | `NODE_ENV=staging` | 允許完全重建<br>建議啟用 `--protect` |
| **開發環境** | 其他情況 | 允許完全重建<br>無限制 |

---

## ⚠️ 安全提示

### **生產環境限制**

```bash
# ❌ 錯誤：生產環境不能完全重建
npm run rebuild -r "測試"

# 輸出：
# ❌ 錯誤: 生產環境必須啟用數據保護！
#    無法在生產環境執行完全重建
#    這會刪除所有真實業務數據
# 
# ✅ 建議: 使用 --protect 參數來保護分店和刺青師數據

# ✅ 正確：生產環境保護性重建
npm run rebuild -p -r "清理測試數據"
```

---

### **備份重要性**

| 操作 | 是否備份 | 風險等級 |
|------|----------|----------|
| 有備份的重建 | ✅ 是 | 🟢 低 |
| 無備份的重建 | ❌ 否 | 🔴 高 |

**建議：**
- ✅ 始終保持自動備份（默認）
- ✅ 定期檢查備份文件
- ✅ 重要操作前手動備份
- ❌ 不要使用 `--no-backup` 參數

---

## 📊 操作流程圖

### **重建流程**

```
開始
  ↓
檢測環境（生產/開發/測試）
  ↓
生產環境？
  ├─ 是 → 檢查 --protect 參數
  │        ├─ 有 → 繼續
  │        └─ 無 → ❌ 錯誤退出
  └─ 否 → 繼續
  ↓
顯示操作資訊
  ↓
自動備份（除非 --no-backup）
  ↓
詢問確認（除非 -y）
  ↓
執行重建
  ↓
顯示結果和備份位置
  ↓
完成
```

---

### **恢復流程**

```
開始
  ↓
選擇備份文件
  ├─ --latest：使用最新備份
  ├─ --list：列出所有備份
  └─ 指定文件：使用特定備份
  ↓
顯示備份資訊
  ↓
顯示警告（會覆蓋現有數據）
  ↓
詢問確認（除非 -y）
  ↓
執行恢復
  ├─ 恢復分店
  ├─ 恢復刺青師
  └─ 恢復服務項目
  ↓
顯示恢復統計
  ↓
完成
```

---

## 🎯 使用場景範例

### **場景 1：新功能開發**

```bash
# 1. 本地開發環境
cd backend

# 2. 修改 Prisma schema 後
npm run rebuild:dev

# 3. 測試新功能
npm run start:dev
```

---

### **場景 2：清理生產測試數據**

```bash
# 1. 確認在生產環境
echo $NODE_ENV  # production

# 2. 使用保護性重建
npm run rebuild:protect

# 3. 確認操作
# 系統會顯示：
# ⚠️  警告: 這是生產環境！
# ❓ 確認執行數據重建？(y/n): y

# 4. 完成後檢查備份
npm run backup:list
```

---

### **場景 3：數據恢復**

```bash
# 1. 意外刪除了重要數據
# 不要慌！

# 2. 查看可用的備份
npm run backup:list

# 3. 恢復最新備份
npm run restore -- --latest

# 4. 確認恢復
# 系統會顯示備份資訊並詢問確認
```

---

### **場景 4：CI/CD 自動部署**

```yaml
# .github/workflows/deploy.yml
- name: Rebuild database
  run: |
    cd backend
    npm run rebuild -p -y -r "自動部署 - ${{ github.sha }}"
  env:
    NODE_ENV: production
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 🔧 故障排除

### **問題 1：命令找不到**

```bash
# 錯誤
bash: npm: command not found

# 解決
# 確保已安裝 Node.js 和 npm
node --version
npm --version
```

---

### **問題 2：權限錯誤**

```bash
# 錯誤
EACCES: permission denied

# 解決
# 確保有執行權限
chmod +x scripts/smart-rebuild.ts
chmod +x scripts/restore-backup.ts
```

---

### **問題 3：備份文件損壞**

```bash
# 錯誤
❌ 讀取備份文件失敗: SyntaxError: Unexpected token

# 解決
# 使用其他備份文件
npm run backup:list
npm run restore -- backup_<其他日期>.json
```

---

### **問題 4：資料庫連接失敗**

```bash
# 錯誤
Can't reach database server

# 解決
# 檢查 DATABASE_URL
echo $DATABASE_URL

# 確保資料庫服務正在運行
# Railway: 檢查服務狀態
# 本地: 啟動 PostgreSQL/SQLite
```

---

## 📝 最佳實踐

### **開發環境**

✅ **推薦：**
- 定期重建數據保持乾淨
- 使用 `npm run rebuild:dev`
- 測試新功能前重建

❌ **避免：**
- 長期不重建導致數據混亂
- 手動刪除表格

---

### **生產環境**

✅ **推薦：**
- 始終使用 `--protect` 參數
- 操作前檢查備份
- 在低峰時段操作
- 保留多個備份

❌ **避免：**
- 不使用 `--protect` 參數
- 跳過備份（`--no-backup`）
- 使用 `-y` 自動確認（除非 CI/CD）
- 在高峰時段操作

---

### **備份管理**

✅ **推薦：**
- 定期檢查備份文件
- 保留至少最近 5 次備份
- 重要操作前手動備份
- 備份文件另存他處

❌ **避免：**
- 從不檢查備份
- 刪除所有備份
- 依賴單一備份

---

## 🆘 緊急情況處理

### **情況 1：誤刪所有數據**

```bash
# 1. 立即停止所有操作
# 不要執行任何寫入操作

# 2. 查看最新備份
npm run backup:list

# 3. 恢復最新備份
npm run restore -- --latest

# 4. 驗證數據
# 登入系統檢查分店、刺青師是否恢復
```

---

### **情況 2：備份文件遺失**

```bash
# 1. 檢查備份目錄
ls -la backend/backups/

# 2. 如果 Railway 有自動備份
# 登入 Railway → Database → Backups

# 3. 聯絡技術支援
# 提供操作時間和日誌
```

---

### **情況 3：重建卡住不動**

```bash
# 1. 等待 2-5 分鐘
# 大型數據庫可能需要時間

# 2. 檢查資料庫連接
# 確保 DATABASE_URL 正確

# 3. 強制終止（最後手段）
# Ctrl+C
# 檢查資料庫狀態

# 4. 如有備份，考慮恢復
npm run restore -- --latest
```

---

## 📞 支援和協助

### **獲取幫助**

```bash
# 查看重建幫助
npm run rebuild -- --help

# 查看恢復幫助
npm run restore -- --help

# 查看備份列表
npm run backup:list
```

### **報告問題**

如遇到問題，請提供：
1. 執行的完整命令
2. 錯誤訊息（完整的輸出）
3. 環境資訊（`NODE_ENV`, 資料庫類型）
4. 操作時間
5. 備份文件列表（如有）

---

## 📚 相關文檔

- [DATABASE_REBUILD_CONFIG.md](./DATABASE_REBUILD_CONFIG.md) - 完整的配置說明
- [README.md](./README.md) - 專案總覽
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南

---

## ✨ 總結

智能數據重建系統提供了：

- ✅ **安全性**：自動環境檢測和保護機制
- ✅ **便利性**：一鍵重建和恢復
- ✅ **可靠性**：自動備份和詳細日誌
- ✅ **靈活性**：多種使用場景和參數

記住：
- 🛡️ 生產環境永遠使用 `--protect`
- 💾 永遠保持自動備份
- ❓ 不確定時，選擇詢問確認
- 📋 操作前閱讀輸出資訊

**祝使用愉快！** 🎉

