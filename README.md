# 刺青工作室 CRM 系統

一個專為刺青工作室設計的全功能 CRM 管理系統，包含會員管理、預約排程、訂單處理、分期付款等功能。

## 🏗️ 技術架構

### 後端 (Backend)
- **框架**: NestJS (Node.js)
- **資料庫**: Prisma ORM + SQLite (開發) / PostgreSQL (生產建議)
- **認證**: JWT + Passport
- **API**: RESTful API

### 前端 (Frontend)
- **框架**: Next.js 15 (App Router)
- **UI 框架**: React 19 + TypeScript
- **樣式**: Tailwind CSS + shadcn/ui
- **狀態管理**: React Hooks

## 🚀 快速開始

### 本地開發

#### 後端
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

後端會在 `http://localhost:4000` 啟動

#### 前端
```bash
cd frontend
npm install
npm run dev
```

前端會在 `http://localhost:3000` 啟動

## 🌐 Railway 部署

### ⚠️ 重要：部署前必讀

本專案已經配置好 Railway 部署所需的所有檔案。如果遇到部署問題，請參考：

- **📖 快速參考**：[QUICK_DEPLOYMENT_REFERENCE.md](./QUICK_DEPLOYMENT_REFERENCE.md)
- **🔧 完整修復說明**：[DEPLOYMENT_FIX_SUMMARY.md](./DEPLOYMENT_FIX_SUMMARY.md)
- **🎨 後端部署指南**：[backend/RAILWAY_DEPLOYMENT.md](./backend/RAILWAY_DEPLOYMENT.md)
- **🖥️ 前端部署指南**：[frontend/RAILWAY_DEPLOYMENT.md](./frontend/RAILWAY_DEPLOYMENT.md)

### 快速部署步驟

1. **部署後端**
   ```bash
   # 在 Railway 設定環境變數
   DATABASE_URL=file:./prisma/dev.db
   JWT_SECRET=your-secret-key
   PORT=4000
   NODE_ENV=production
   
   # Root Directory: backend
   ```

2. **部署前端**
   ```bash
   # 在 Railway 設定環境變數
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NODE_ENV=production
   
   # Root Directory: frontend
   ```

3. **推送程式碼**
   ```bash
   git push origin main
   ```

## 📁 專案結構

```
tattoo-crm-1/
├── backend/                  # NestJS 後端
│   ├── prisma/              # 資料庫 Schema 和 Migrations
│   ├── src/                 # 原始碼
│   │   ├── admin/          # 管理員功能
│   │   ├── appointments/   # 預約管理
│   │   ├── artists/        # 刺青師管理
│   │   ├── auth/           # 認證模組
│   │   ├── orders/         # 訂單管理
│   │   ├── installments/   # 分期付款
│   │   └── ...
│   ├── railway.json         # Railway 配置
│   └── nixpacks.toml        # Nixpacks 建構配置
│
├── frontend/                # Next.js 前端
│   ├── src/
│   │   ├── app/            # App Router 頁面
│   │   ├── components/     # React 元件
│   │   └── lib/            # 工具函數和 API 客戶端
│   └── public/             # 靜態資源
│
└── docs/                    # 部署和開發文件
```

## ✨ 主要功能

### 👥 會員管理
- 會員註冊和登入
- 會員資料管理
- 儲值和消費記錄
- 會員等級制度

### 📅 預約系統
- 預約建立和管理
- 刺青師排程管理
- 預約狀態追蹤
- 服務選擇

### 💰 訂單處理
- 訂單建立和結帳
- 一次付清 / 分期付款
- 付款狀態管理
- 訂單歷史記錄

### 💳 分期付款
- 自訂分期期數
- 彈性金額調整
- 分期狀態追蹤
- 逾期提醒

### 🎨 刺青師管理
- 刺青師檔案
- 作品集管理
- 排程設定
- 服務項目

### 🏢 分店管理
- 多分店支援
- 分店資料管理
- 分店營業時間
- 權限管理

### 👨‍💼 管理功能
- 完整的後台管理介面
- 權限控制（BOSS, ADMIN, ARTIST, MEMBER）
- 數據統計和報表
- 客戶標註和提醒

## 🔐 權限系統

系統支援多角色權限管理：

- **BOSS** - 最高權限，可管理所有分店
- **BRANCH_MANAGER** - 分店管理員，管理單一分店
- **SUPER_ADMIN** - 系統管理員
- **ARTIST** - 刺青師，管理自己的預約和作品
- **MEMBER** - 會員，查看自己的資料和預約

## 🛠️ 開發相關

### 環境變數

#### 後端 (.env)
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key"
PORT=4000
NODE_ENV=development
```

#### 前端 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 資料庫 Migrations

```bash
# 創建新的 migration
npx prisma migrate dev --name description

# 部署 migrations
npx prisma migrate deploy

# 重置資料庫
npx prisma migrate reset
```

### Prisma Studio

```bash
npx prisma studio
```

在 `http://localhost:5555` 查看資料庫

## 📝 API 文件

主要的 API endpoints：

- `POST /auth/login` - 登入
- `POST /auth/register` - 註冊
- `GET /appointments` - 取得預約列表
- `POST /appointments` - 建立預約
- `GET /orders` - 取得訂單列表
- `POST /orders` - 建立訂單
- `GET /admin/members` - 取得會員列表（需要管理員權限）

更多 API 詳情請參考後端原始碼。

## 🐛 常見問題

### 部署問題

**Q: Railway 部署後顯示 "Cannot find module '/app/dist/main.js'"**

A: 這個問題已經修復！確保：
1. `railway.json` 和 `nixpacks.toml` 存在於 `backend` 資料夾
2. 在 Railway 設定 Root Directory 為 `backend`
3. 已設定必要的環境變數

詳細說明請參考 [DEPLOYMENT_FIX_SUMMARY.md](./DEPLOYMENT_FIX_SUMMARY.md)

### 開發問題

**Q: Prisma Client 錯誤**

A: 執行 `npx prisma generate` 重新生成 Prisma Client

**Q: CORS 錯誤**

A: 確認後端的 CORS 設定允許前端的 origin

## 📄 授權

私有專案 - 保留所有權利

## 🤝 貢獻

本專案目前為私有專案。

## 📞 聯絡資訊

如有問題請聯絡專案維護者。
 
