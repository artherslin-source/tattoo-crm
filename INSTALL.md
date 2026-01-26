## tattoo-crm 客戶安裝與配置說明

本文件是交付用的「最小安裝指南」，用於在客戶環境安裝並啟動 tattoo-crm（前端 Next.js + 後端 NestJS）。

---

### 需求

- **Node.js**: 建議 20.x LTS（至少 18+）
- **npm**: 隨 Node 內建
- **Docker Desktop**（或等價 Docker + docker compose）：用來快速啟動 PostgreSQL

---

### 目錄結構（打包內）

- `backend/`: 後端（NestJS）
- `frontend/`: 前端（Next.js）
- `docker-compose.yml`: PostgreSQL（本機/自架）啟動用

---

### 1) 啟動資料庫（PostgreSQL）

在「打包根目錄」執行：

```bash
docker compose up -d
```

> 預設會開在 `localhost:5432`。若客戶已有既有 PostgreSQL，也可以不使用 docker compose，改為自行提供 `DATABASE_URL`。

---

### 2) 設定後端環境變數

進入後端資料夾，建立 `.env`：

```bash
cd backend
cp .env.example .env
```

請至少確認/調整：

- `DATABASE_URL`：若使用本打包的 docker compose，建議改成：
  - `DATABASE_URL="postgresql://tattoo_user:tattoo_password@localhost:5432/tattoo_crm_dev?schema=public"`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`：**請改成客戶自己的安全字串**
- `CORS_ORIGIN`：若前端改用不同網域/port，請同步調整

---

### 3) 安裝並啟動後端

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

後端預設會在 `http://localhost:4000` 啟動。

---

### 4) 設定前端環境變數

進入前端資料夾，建立 `.env.local`：

```bash
cd frontend
cp .env.local.example .env.local
```

若後端不是跑在 `http://localhost:4000`，請改 `NEXT_PUBLIC_API_BASE_URL`。

---

### 5) 安裝並啟動前端

```bash
cd frontend
npm install
npm run build
npm run start
```

前端預設會在 `http://localhost:3000` 啟動。

---

### 常見部署建議（客戶自架）

- **反向代理**：用 Nginx/Caddy 將
  - 前端（3000）對外成 `https://crm.your-domain.com`
  - 後端（4000）對外成 `https://api.your-domain.com`
- **資料庫**：建議使用客戶正式 PostgreSQL（含備份/監控），再把 `DATABASE_URL` 指向正式 DB
- **程序管理**：可用 systemd / pm2 / Docker 來管理 node 服務常駐

