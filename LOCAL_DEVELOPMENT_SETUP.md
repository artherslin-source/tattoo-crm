# 🏠 本地開發環境快速啟動指南

## ✅ 已完成的配置

我已經為您完成以下配置：

### 1. 環境變數設置

#### 後端 (Backend)
- ✅ 創建 `backend/.env` - 本地開發環境變數
- ✅ 創建 `backend/.env.example` - 環境變數範例

#### 前端 (Frontend)  
- ✅ 創建 `frontend/.env.local` - 本地開發環境變數
- ✅ 創建 `frontend/.env.production` - Railway 生產環境變數
- ✅ 創建 `frontend/.env.example` - 環境變數範例

### 2. API 配置修正
- ✅ 更新 `frontend/src/lib/api.ts` 使用正確的環境變數 `NEXT_PUBLIC_API_URL`
- ✅ 修正所有 TypeScript 類型錯誤
- ✅ 確保本地和 Railway 環境都能正確連接

### 3. Railway 部署配置
- ✅ 更新 `frontend/railway.json` 
- ✅ 更新 `frontend/nixpacks.toml`
- ✅ 修正 `frontend/package.json` 端口配置

---

## 🚀 如何啟動本地開發環境

### 步驟 1: 啟動後端

```bash
cd backend
npm install
npm run start:dev
```

**預期結果**:
```
🚀 Server is running on port 4000
📝 Environment: development
🌐 Backend accessible at: http://0.0.0.0:4000
```

### 步驟 2: 啟動前端

在**新的終端視窗**中：

```bash
cd frontend
npm install
npm run dev
```

**預期結果**:
```
✓ Ready on http://localhost:4001
```

### 步驟 3: 訪問應用

打開瀏覽器訪問: **http://localhost:4001**

---

## 🔑 測試帳號

### 管理員帳號 (BOSS 最高權限)
- **帳號**: `admin@test.com`
- **密碼**: `12345678`

### 測試會員帳號
- **帳號**: `member1@test.com` ~ `member12@test.com`
- **密碼**: `12345678`

---

## 📋 環境變數說明

### 後端環境變數 (`backend/.env`)

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_ACCESS_SECRET="local-dev-secret-key-12345"
JWT_REFRESH_SECRET="local-dev-refresh-secret-key-67890"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:4001,http://localhost:3000"
```

### 前端環境變數 (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 🌐 Railway 部署說明

### 推送到 GitHub

**重要**: 由於 Git 認證問題，您需要手動執行 push：

```bash
cd /Users/jerrylin/tattoo-crm-1
git push origin main
```

### Railway 環境變數確認

#### 後端 Railway 環境變數
確保在 Railway Dashboard 設置以下變數：

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres.railway.internal:5432/railway
JWT_ACCESS_SECRET=your-production-secret-key
JWT_REFRESH_SECRET=your-production-refresh-key
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
CORS_ORIGIN=https://tattoo-crm-production.up.railway.app
```

#### 前端 Railway 環境變數
確保在 Railway Dashboard 設置以下變數：

```env
NODE_ENV=production
PORT=4000
NEXT_PUBLIC_API_URL=https://tattoo-crm-production-413f.up.railway.app
```

**注意**: `NEXT_PUBLIC_API_URL` 必須指向您的後端 Railway URL！

---

## 🛠️ 常用命令

### 後端命令

```bash
# 開發模式
npm run start:dev

# 生產模式
npm run build
npm run start:prod

# 資料庫操作
npx prisma generate        # 生成 Prisma Client
npx prisma db push         # 推送資料庫結構
npx prisma db seed         # 填充測試數據
npx prisma studio          # 打開資料庫管理介面
```

### 前端命令

```bash
# 開發模式
npm run dev

# 生產建置
npm run build
npm run start

# 檢查程式碼
npm run lint
```

---

## 🐛 故障排除

### 問題 1: 後端啟動失敗 - "JwtStrategy requires a secret or key"

**解決方案**: 確認 `backend/.env` 檔案存在並包含 `JWT_ACCESS_SECRET`

```bash
cd backend
cat .env  # 查看環境變數
```

如果檔案不存在，重新創建：

```bash
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
JWT_ACCESS_SECRET="local-dev-secret-key-12345"
JWT_REFRESH_SECRET="local-dev-refresh-secret-key-67890"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:4001,http://localhost:3000"
EOF
```

### 問題 2: 前端 API 請求失敗

**解決方案**: 確認 `frontend/.env.local` 正確設置

```bash
cd frontend
cat .env.local  # 應該顯示: NEXT_PUBLIC_API_URL=http://localhost:4000
```

如果不正確，重新創建：

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
```

### 問題 3: 端口被佔用

**解決方案**: 終止佔用端口的進程

```bash
# 終止 4000 和 4001 端口
lsof -ti:4000,4001 | xargs kill -9
```

### 問題 4: 資料庫錯誤

**解決方案**: 重新初始化資料庫

```bash
cd backend
rm prisma/dev.db  # 刪除舊資料庫
npx prisma db push  # 創建新資料庫
npx prisma db seed  # 填充測試數據
```

---

## 📚 更多資訊

詳細的部署指南請參考: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**最後更新**: 2025-10-09

