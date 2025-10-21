# 🚨 後端崩潰修復指南

## 📋 問題摘要

**時間：** 2025-10-21  
**錯誤檔案：** logs.1761043510273.json  
**狀態：** 🔄 已觸發重新部署  
**修復狀態：** ⏳ 進行中

---

## 🔍 問題分析

### 可能的原因
1. **Prisma 資料庫同步問題** - 最常見
2. **環境變數缺失** - JWT_SECRET 或其他配置
3. **依賴套件問題** - npm install 失敗
4. **記憶體不足** - Railway 資源限制
5. **網路連線問題** - 資料庫連線失敗

### 已執行的修復動作
- ✅ 觸發重新部署 (`railway up --detach`)
- ✅ 使用最新的 `railway-start.sh` 腳本
- ✅ 確保環境變數正確設置

---

## 🛠️ 立即修復步驟

### 1. 檢查部署狀態
```bash
cd backend && railway status
```

### 2. 監控部署日誌
```bash
# 等待 2-3 分鐘讓部署完成
# 然後檢查健康狀態
curl https://carefree-determination-production-1f1f.up.railway.app/health
```

### 3. 如果仍然失敗，檢查環境變數
```bash
cd backend && railway variables
```

**確保以下變數存在：**
- ✅ `DATABASE_URL` - PostgreSQL 連線字串
- ✅ `JWT_SECRET` - 強密鑰 (44 字符)
- ✅ `NODE_ENV` - staging
- ✅ `CORS_ORIGIN` - 前端 URL

---

## 🔧 常見問題修復

### 問題 1: Prisma 資料庫同步失敗
**症狀：** `PrismaClientKnownRequestError: column does not exist`

**修復：**
```bash
# 1. 檢查 schema.prisma 是否正確
cat backend/prisma/schema.prisma

# 2. 重新部署 (已執行)
cd backend && railway up --detach

# 3. 如果仍然失敗，手動重置資料庫
cd backend && railway run npx prisma db push --force-reset
```

### 問題 2: JWT_SECRET 缺失
**症狀：** `JwtStrategy requires a secret or key`

**修復：**
```bash
# 設置強密鑰
cd backend && railway variables set JWT_SECRET="$(openssl rand -base64 32)"
```

### 問題 3: 記憶體不足
**症狀：** 部署過程中崩潰

**修復：**
```bash
# 1. 檢查 Railway 專案設定
# 2. 升級到更高級別的方案
# 3. 優化 Dockerfile 或 package.json
```

### 問題 4: 依賴套件問題
**症狀：** npm install 失敗

**修復：**
```bash
# 1. 檢查 package.json
cat backend/package.json

# 2. 清理並重新安裝
cd backend && rm -rf node_modules package-lock.json
cd backend && npm install
cd backend && railway up --detach
```

---

## 📊 監控和驗證

### 健康檢查
```bash
# 測試後端 API
curl https://carefree-determination-production-1f1f.up.railway.app/health

# 預期回應
{"status":"ok","timestamp":"2025-10-21T..."}
```

### 日誌檢查
```bash
# 查看最新日誌
cd backend && railway logs

# 查找關鍵字
# - "Server is running"
# - "DATABASE_URL 驗證通過"
# - "CORS Origin"
```

### 資料庫連線測試
```bash
# 測試 Prisma 連線
cd backend && railway run npx prisma db pull
```

---

## 🚨 緊急修復程序

### 如果所有方法都失敗

1. **完全重置部署**
```bash
cd backend && railway down
cd backend && railway up --detach
```

2. **檢查 Railway 專案狀態**
- 前往 Railway Dashboard
- 檢查服務狀態
- 查看資源使用情況

3. **聯繫支援**
- Railway 支援：https://railway.app/support
- 提供錯誤日誌和專案 ID

---

## 📈 預防措施

### 1. 環境變數備份
```bash
# 導出所有環境變數
cd backend && railway variables > .env.backup
```

### 2. 資料庫備份
```bash
# 定期備份資料庫
cd backend && railway run npx prisma db pull
```

### 3. 監控設置
- 設置 Railway 健康檢查
- 配置錯誤通知
- 定期檢查日誌

---

## 🔍 診斷工具

### 檢查腳本
```bash
#!/bin/bash
echo "🔍 後端診斷工具"
echo "=================="

echo "1. 檢查 Railway 狀態"
cd backend && railway status

echo "2. 檢查環境變數"
cd backend && railway variables

echo "3. 測試健康檢查"
curl -s https://carefree-determination-production-1f1f.up.railway.app/health || echo "❌ 健康檢查失敗"

echo "4. 檢查最新日誌"
cd backend && railway logs | tail -20

echo "診斷完成！"
```

### 快速修復腳本
```bash
#!/bin/bash
echo "🚀 快速修復後端"
echo "=================="

echo "1. 重新部署"
cd backend && railway up --detach

echo "2. 等待 3 分鐘..."
sleep 180

echo "3. 測試健康檢查"
curl -s https://carefree-determination-production-1f1f.up.railway.app/health

echo "修復完成！"
```

---

## 📞 支援資訊

### Railway 專案資訊
- **專案 ID：** 474d507c-ae28-4d23-857f-317cc8a9bca6
- **服務 ID：** 0272959d-e1ad-4567-8f73-36761b50a36c
- **環境：** production
- **服務名稱：** carefree-determination

### 重要 URLs
- **後端 API：** https://carefree-determination-production-1f1f.up.railway.app
- **健康檢查：** https://carefree-determination-production-1f1f.up.railway.app/health
- **Railway Dashboard：** https://railway.app/project/474d507c-ae28-4d23-857f-317cc8a9bca6

---

## ⏰ 修復時間表

### 立即 (0-5 分鐘)
- ✅ 觸發重新部署
- ⏳ 等待部署完成
- ⏳ 監控日誌

### 短期 (5-15 分鐘)
- ⏳ 驗證健康檢查
- ⏳ 測試 API 端點
- ⏳ 檢查環境變數

### 中期 (15-30 分鐘)
- ⏳ 完整功能測試
- ⏳ 前端連線測試
- ⏳ 用戶體驗驗證

---

## 🎯 成功指標

### 部署成功指標
- ✅ Railway 狀態顯示 "Running"
- ✅ 健康檢查返回 200 OK
- ✅ 日誌顯示 "Server is running on port 4000"
- ✅ 無錯誤訊息

### 功能正常指標
- ✅ 前端可以連接到後端
- ✅ 登入功能正常
- ✅ API 端點回應正常
- ✅ 資料庫操作正常

---

## 📝 更新日誌

**2025-10-21 10:31**
- 🚨 檢測到後端崩潰
- 🔄 觸發重新部署
- 📋 創建修復指南

**下一步：**
- ⏳ 等待部署完成 (預計 3-5 分鐘)
- 🔍 驗證修復結果
- 📊 更新狀態報告

---

**🚀 修復進行中！請等待 3-5 分鐘讓部署完成，然後測試健康檢查！**