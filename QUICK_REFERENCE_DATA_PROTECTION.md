# 數據保護快速參考

## ⚡ 一分鐘快速開始

### 本地開發

```bash
# 保護模式（保留分店和刺青師）
cd backend
PROTECT_REAL_DATA=true npm run seed

# 完整重建模式（重建所有數據）
cd backend
PROTECT_REAL_DATA=false npm run seed
```

---

### 生產環境（Railway）

#### 1. 設置環境變數
Railway → backend 服務 → Variables → 添加：
```
PROTECT_REAL_DATA = true
```

#### 2. 執行種子腳本
```bash
railway run npm run seed
```

---

## 📊 模式對比

| 數據類型 | 完整重建模式 | 保護模式 |
|---------|-------------|---------|
| 分店 | ❌ 刪除重建 | ✅ 保留 |
| 刺青師 | ❌ 刪除重建 | ✅ 保留 |
| 管理員 | 🔄 重建 | 🔄 重建 |
| 會員 | 🔄 重建 | 🔄 重建 |
| 預約 | 🔄 重建 | 🔄 重建 |
| 訂單 | 🔄 重建 | 🔄 重建 |

---

## 🎯 使用建議

| 環境 | 推薦設置 | 原因 |
|------|---------|------|
| **本地開發（第一次）** | `false` | 創建初始數據 |
| **本地開發（後續）** | `true` | 保留分店和刺青師 |
| **生產環境** | `true` | 保護真實數據 |

---

## 📝 詳細文檔

- 📖 **完整功能說明：** `SEED_DATA_PROTECTION.md`
- 🚀 **Railway 設置指南：** `RAILWAY_PROTECT_DATA_SETUP.md`
- 📊 **實現總結：** `DATA_PROTECTION_SUMMARY.md`

---

## 🧪 測試

```bash
# 自動化測試
bash test-protect-mode.sh
```

---

## ⚠️ 重要提醒

1. ❌ 保護模式**不是備份**，重要數據請定期備份
2. 🔑 管理員帳號會重置（密碼：`12345678`）
3. 🔄 會員和預約會重建
4. ✅ 生產環境請始終設置 `PROTECT_REAL_DATA=true`

---

最後更新：2025-10-15

