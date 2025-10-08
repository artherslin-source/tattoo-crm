# 🚀 Railway 快速部署參考

## 📊 修復狀態

✅ 已修復 - Backend 建構配置已完成  
⏳ 待執行 - 需要在 Railway 設定環境變數並重新部署

---

## 🔧 後端 (Backend) - Railway 設定

### 必須的環境變數

```bash
DATABASE_URL=file:./prisma/dev.db
JWT_SECRET=請改成你的超長密鑰字串
PORT=4000
NODE_ENV=production
```

### 可選的環境變數

```bash
CORS_ORIGIN=https://your-frontend-domain.com
```

### Root Directory 設定
```
backend
```

---

## 🎨 前端 (Frontend) - Railway 設定

### 必須的環境變數

```bash
NEXT_PUBLIC_API_URL=https://your-backend-name.up.railway.app
NODE_ENV=production
```

### Root Directory 設定
```
frontend
```

---

## 📝 部署步驟（3 步驟）

### Step 1: 設定後端環境變數
1. 進入 Railway Dashboard
2. 選擇後端服務
3. 點擊 "Variables"
4. 添加上述後端環境變數

### Step 2: 推送程式碼
```bash
cd /Users/jerrylin/tattoo-crm-1
git add .
git commit -m "fix: Railway 部署配置"
git push origin main
```

### Step 3: 設定前端環境變數
1. 等待後端部署完成
2. 複製後端 URL（例如：`https://tattoo-backend.up.railway.app`）
3. 在前端服務的 Variables 添加 `NEXT_PUBLIC_API_URL`

---

## ✅ 驗證清單

### 後端驗證
- [ ] Railway 建構日誌顯示 `npm run build` 執行成功
- [ ] 日誌顯示：`🚀 Backend running on port 4000`
- [ ] 訪問 `https://your-backend.railway.app` 沒有 "Cannot find module" 錯誤

### 前端驗證
- [ ] 前端頁面可以正常訪問
- [ ] 開發者工具沒有 CORS 錯誤
- [ ] API 請求指向正確的後端 URL
- [ ] 登入功能正常運作

---

## 🔍 故障排除

### 後端問題

**❌ "Cannot find module '/app/dist/main.js'"**
```bash
# 解決方案：
1. 確認 railway.json 和 nixpacks.toml 存在於 backend 資料夾
2. 檢查 Root Directory = "backend"
3. 在 Railway 手動觸發重新部署
```

**❌ Prisma 錯誤**
```bash
# 解決方案：
1. 檢查 DATABASE_URL 是否已設定
2. 考慮切換到 PostgreSQL（生產環境建議）
```

### 前端問題

**❌ CORS 錯誤**
```bash
# 解決方案：
1. 確認後端 NODE_ENV=production
2. 或設定後端 CORS_ORIGIN 為前端 URL
```

**❌ API 連線失敗**
```bash
# 解決方案：
1. 檢查 NEXT_PUBLIC_API_URL 是否正確
2. 確認變數包含 https:// 且結尾沒有 /
3. 重新觸發前端部署
```

---

## 📁 已創建的檔案

本次修復創建了以下檔案：

```
tattoo-crm-1/
├── backend/
│   ├── railway.json              ← Railway 配置
│   ├── nixpacks.toml             ← Nixpacks 建構配置
│   ├── RAILWAY_DEPLOYMENT.md     ← 詳細部署指南
│   └── package.json              ← 已更新 scripts
├── frontend/
│   └── RAILWAY_DEPLOYMENT.md     ← 前端部署指南
├── DEPLOYMENT_FIX_SUMMARY.md     ← 完整修復說明
└── QUICK_DEPLOYMENT_REFERENCE.md ← 本檔案
```

---

## 🎯 生產環境建議

### 資料庫
- ❌ SQLite（目前）- 不適合生產環境
- ✅ PostgreSQL（建議）- 在 Railway 添加 PostgreSQL 服務

### 域名
- 設定自訂域名提升專業度
- 後端：`api.yourdomain.com`
- 前端：`app.yourdomain.com`

### 安全性
- 定期更新 JWT_SECRET
- 使用強密碼和加密連線
- 啟用 HTTPS（Railway 自動提供）

---

## 📚 詳細文件

- **完整修復說明**：`DEPLOYMENT_FIX_SUMMARY.md`
- **後端部署指南**：`backend/RAILWAY_DEPLOYMENT.md`
- **前端部署指南**：`frontend/RAILWAY_DEPLOYMENT.md`

---

## 💡 需要幫助？

1. 查看 Railway 建構日誌
2. 查看 Railway 運行日誌
3. 檢查環境變數設定
4. 參考詳細文件

**問題已修復！** 現在只需要在 Railway 設定環境變數並重新部署即可。

