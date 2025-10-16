# 🤖 智能數據重建系統

## 快速開始

### 開發環境重建
```bash
cd backend
npm run rebuild:dev
```

### 生產環境保護性重建
```bash
cd backend
npm run rebuild:protect
```

### 查看備份
```bash
npm run backup:list
```

### 恢復最新備份
```bash
npm run restore -- --latest
```

---

## 主要特點

- ✅ **自動環境檢測** - 識別生產/開發環境
- ✅ **自動備份** - 重建前自動備份關鍵數據
- ✅ **智能保護** - 生產環境強制保護業務數據
- ✅ **一鍵恢復** - 簡單的數據恢復命令
- ✅ **詳細日誌** - 清晰的操作記錄

---

## 常用命令

| 命令 | 說明 |
|------|------|
| `npm run rebuild` | 手動重建（會詢問確認） |
| `npm run rebuild:dev` | 開發環境完全重建 |
| `npm run rebuild:protect` | 保護性重建（保留分店和刺青師） |
| `npm run backup:list` | 列出所有備份 |
| `npm run restore -- --latest` | 恢復最新備份 |

---

## 詳細文檔

請參閱 [SMART_REBUILD_GUIDE.md](../SMART_REBUILD_GUIDE.md) 獲取完整的使用指南。

---

## 安全提示

⚠️ **生產環境必須使用 `--protect` 參數**

❌ 錯誤：
```bash
npm run rebuild  # 會被拒絕
```

✅ 正確：
```bash
npm run rebuild:protect  # 保護業務數據
```

---

## 備份位置

備份文件保存在：
```
backend/backups/backup_<timestamp>.json
```

這些文件已加入 `.gitignore`，不會被提交到版本控制。

