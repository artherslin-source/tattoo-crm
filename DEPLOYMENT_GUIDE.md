# 🚀 Tattoo CRM 部署指南

## 📋 目錄
- [本地開發環境設置](#本地開發環境設置)
- [Railway 部署設置](#railway-部署設置)
- [環境變數配置](#環境變數配置)

---

## 🏠 本地開發環境設置

### 後端 (Backend)

1. **安裝依賴**
   ```bash
   cd backend
   npm install
   ```

2. **設置環境變數**
   - 複製 `.env.example` 到 `.env`
   - 或直接使用已經創建的 `.env` 檔案

3. **數據庫設置**
   ```bash
   # 生成 Prisma Client
   npx prisma generate
   
   # 推送資料庫結構
   npx prisma db push
   
   # (可選) 填充測試數據
   npx prisma db seed
   ```

4. **啟動開發伺服器**
   ```bash
   npm run start:dev
   ```
   - 後端將運行在 `http://localhost:4000`

### 前端 (Frontend)

1. **安裝依賴**
   ```bash
   cd frontend
   npm install
   ```

2. **設置環境變數**
   - `.env.local` 已自動創建（用於本地開發）
   - 內容：`NEXT_PUBLIC_API_URL=http://localhost:4000`

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
   - 前端將運行在 `http://localhost:4001`

---

## ☁️ Railway 部署設置

### 後端 (Backend) Railway 配置

#### 環境變數 (Variables)
在 Railway 後端服務中設置以下環境變數：

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

#### 部署設置
- **Root Directory**: `backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start:force-build`

#### nixpacks.toml
已配置在 `backend/nixpacks.toml`：
```toml
[phases.setup]
nixPkgs = ['nodejs_20']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm run start:force-build'
```

---

### 前端 (Frontend) Railway 配置

#### 環境變數 (Variables)
在 Railway 前端服務中設置以下環境變數：

```env
NODE_ENV=production
PORT=4000
NEXT_PUBLIC_API_URL=https://tattoo-crm-production-413f.up.railway.app
```

**重要**: `NEXT_PUBLIC_API_URL` 必須指向您的後端 Railway URL！

#### 部署設置
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

---

## 🔑 環境變數詳解

### 後端環境變數

| 變數名 | 說明 | 本地開發範例 | Railway 範例 |
|--------|------|-------------|--------------|
| `DATABASE_URL` | 資料庫連接字串 | `file:./prisma/dev.db` | `postgresql://...` |
| `JWT_ACCESS_SECRET` | JWT 存取令牌密鑰 | `local-dev-secret-key-12345` | 生產環境強密碼 |
| `JWT_REFRESH_SECRET` | JWT 刷新令牌密鑰 | `local-dev-refresh-secret-key-67890` | 生產環境強密碼 |
| `JWT_ACCESS_TTL` | 存取令牌有效期 | `15m` | `15m` |
| `JWT_REFRESH_TTL` | 刷新令牌有效期 | `7d` | `7d` |
| `PORT` | 後端端口 | `4000` | `8080` (Railway 分配) |
| `NODE_ENV` | 環境模式 | `development` | `production` |
| `CORS_ORIGIN` | CORS 允許來源 | `http://localhost:4001` | 前端 Railway URL |

### 前端環境變數

| 變數名 | 說明 | 本地開發 | Railway |
|--------|------|----------|---------|
| `NEXT_PUBLIC_API_URL` | 後端 API URL | `http://localhost:4000` | `https://tattoo-crm-production-413f.up.railway.app` |

---

## 📝 部署流程

### 自動部署 (推薦)

1. **提交代碼到 GitHub**
   ```bash
   git add .
   git commit -m "Update: 修正環境配置"
   git push origin main
   ```

2. **Railway 自動部署**
   - Railway 會自動檢測到 GitHub 更新
   - 自動觸發前端和後端的重新部署
   - 等待約 3-5 分鐘完成部署

### 驗證部署

1. **檢查後端**
   - URL: https://tattoo-crm-production-413f.up.railway.app
   - 測試: 訪問 `/health` 端點（如果有）

2. **檢查前端**
   - URL: https://tattoo-crm-production.up.railway.app
   - 測試: 打開首頁並嘗試登入

---

## 🐛 常見問題

### 問題 1: 後端崩潰 - "JwtStrategy requires a secret or key"
**原因**: Railway 環境變數未正確設置  
**解決**: 確認 Railway 後端服務中已設置 `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET`

### 問題 2: 前端 API 請求失敗 - CORS 錯誤
**原因**: 後端 CORS 配置不正確  
**解決**: 確認後端 `CORS_ORIGIN` 環境變數包含前端 URL

### 問題 3: 前端顯示 "Cannot connect to backend"
**原因**: `NEXT_PUBLIC_API_URL` 設置錯誤  
**解決**: 
- 檢查 Railway 前端環境變數中的 `NEXT_PUBLIC_API_URL`
- 確保指向正確的後端 URL
- 重新部署前端

### 問題 4: 本地開發 - 端口被佔用
**原因**: 之前的進程仍在運行  
**解決**:
```bash
# 查找並終止佔用端口的進程
lsof -ti:4000,4001 | xargs kill -9
```

---

## 🔄 更新部署

每次修改代碼後：

1. **測試本地**
   ```bash
   # 後端
   cd backend && npm run start:dev
   
   # 前端
   cd frontend && npm run dev
   ```

2. **提交到 GitHub**
   ```bash
   git add .
   git commit -m "feat: 新功能描述"
   git push origin main
   ```

3. **等待 Railway 自動部署**
   - 檢查 Railway Dashboard 的部署狀態
   - 查看部署日誌確認無錯誤

---

## 📞 支援

如有問題，請檢查：
1. Railway Dashboard 的部署日誌
2. 瀏覽器開發者工具的 Console 和 Network 標籤
3. 確認所有環境變數已正確設置

---

**最後更新**: 2025-10-09

