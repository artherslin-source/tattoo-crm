# 刺青店管理系統 — Zeabur 部署指南（GitHub 無縫轉移）

本指南說明如何將刺青店管理系統從本機或既有平台（如 Railway）**透過 GitHub 無縫部署到 [Zeabur](https://zeabur.com)**。Zeabur 會自動辨識 Node.js / Next.js / NestJS，並提供 **CI/CD**：推送到 GitHub 即自動重新部署。

---

## 一、前置準備

### 1.1 程式碼已推送到 GitHub

- 將專案推送到您的 GitHub 倉庫（例如 `your-username/tattoo-crm`）。
- 若目前只在本地或從 Railway 部署，請先建立倉庫並推送：
  ```bash
  git remote add origin https://github.com/your-username/tattoo-crm.git
  git push -u origin main
  ```

### 1.2 Zeabur 帳號與 GitHub 連結

1. 前往 [Zeabur](https://zeabur.com) 註冊／登入。
2. 若用 Email 註冊，請至 [Console > Settings > Integrations](https://zeabur.com/account/general) 連結 GitHub。
3. 部署時選擇「GitHub」會引導您安裝 **Zeabur GitHub App**，選擇要授權的帳號或組織後，即可在 Zeabur 中搜尋並選擇該倉庫。

### 1.3 當客戶使用自己的 GitHub 帳號（與開發方不同）

若**本機／GitHub 桌面版是串接開發方自己的 GitHub**，而**客戶要用自己的 GitHub 帳號在 Zeabur 部署**，需要先把程式放到「客戶的 GitHub」底下，Zeabur 才能用客戶帳號選到該倉庫。常見做法如下，擇一即可。

| 做法 | 適用情境 | 簡要步驟 |
|------|----------|----------|
| **A. 客戶建倉庫，開發方推送** | 客戶要擁有倉庫、後續可自己或請您更新 | 客戶在 GitHub 建立**空倉庫**，並將您的 GitHub 帳號加為 **Collaborator**；您在本機把程式推送到客戶的倉庫。之後客戶登入 Zeabur、連結**自己的** GitHub 即可部署。**一步一步操作請看：[A 方案操作手冊](./A方案-客戶GitHub交接步驟.md)。** |
| **B. 轉移倉庫所有權** | 一次性交接，程式完全交給客戶 | 在您目前的 GitHub 倉庫：**Settings → General → Danger Zone → Transfer ownership**，輸入客戶的 GitHub 帳號或組織。轉移後倉庫會出現在客戶帳號下，您可視需要是否保留 fork。 |
| **C. 客戶 Fork** | 客戶想保留與您倉庫的連結、自行合併更新 | 客戶在 GitHub 上對您的倉庫點 **Fork**，倉庫會複製到客戶帳號。客戶在 Zeabur 連結自己的 GitHub，選擇 **fork 出來的倉庫** 部署。之後您有更新時，客戶可在其 fork 裡拉取您的更動，或您改推送到客戶的 fork（需被加為 Collaborator）。 |
| **D. 交付壓縮檔，客戶自建倉庫** | 不經由您的 GitHub、客戶完全自管 | 交付 `tattoo-crm-xxx.tar.gz`，客戶解壓後在專案目錄執行 `git init`、在 GitHub 建立新倉庫後 `git remote add origin ...`、`git push -u origin main`。之後 Zeabur 連結客戶的 GitHub 選該倉庫即可。後續若需更新，再交付新壓縮檔或 patch。 |

**建議**：若客戶之後可能請您代為更新程式，優先選 **A**；若一次性交接、不再用您的帳號維護，可選 **B**。

---

## 二、在 Zeabur 建立專案與資料庫

1. 前往 [Zeabur 專案頁](https://zeabur.com/projects)，點擊 **Create Project**。
2. 選擇區域（例如 Singapore）。
3. 在空專案中點擊 **Deploy New Service**，選擇 **Databases** → **PostgreSQL**，建立一個 PostgreSQL 服務。
4. 建立完成後，Zeabur 會提供該資料庫的連線資訊（之後可從服務的 **Variables** 或 **Connect** 取得 `DATABASE_URL`）。

---

## 三、部署後端（NestJS）

1. 在同一專案中再次點擊 **Deploy New Service**，選擇 **GitHub**。
2. 搜尋並選擇您的倉庫（例如 `tattoo-crm`）。
3. Zeabur 會自動偵測為 Node 專案；**務必設定根目錄**：
   - 進入該服務的 **Settings**，找到 **Root Directory**。
   - 設為：**`backend`**（不要用倉庫根目錄）。
4. **環境變數**（Variables）請設定：

   | 變數 | 說明 | 取得方式 |
   |------|------|----------|
   | `DATABASE_URL` | PostgreSQL 連線字串 | 在 Zeabur 中點選剛建立的 PostgreSQL 服務，從 Variables / Connect 複製；或使用「連結變數」功能 |
   | `JWT_ACCESS_SECRET` | JWT 存取密鑰 | 自訂，至少 32 字元 |
   | `JWT_REFRESH_SECRET` | JWT 更新密鑰 | 自訂，至少 32 字元 |
   | `CORS_ORIGIN` | 允許的前端網址 | 先填 `https://您的專案.zeabur.app`，等前端部署完成後改為實際前端網址 |

   - `PORT` 可不設，由 Zeabur 自動指派。
5. **Watch Paths**（可選）：在 Settings 中將 **Watch Paths** 設為 **`/backend`**，如此僅 `backend/` 變更時會觸發後端重新部署，不會因前端改動而重建後端。
6. 建置與啟動指令通常會自動偵測為：
   - 建置：`npm install` + `npm run build`
   - 啟動：`npm run start:prod`
   
   若偵測有誤，可於 Settings 中手動設定 **Build Command** 與 **Start Command** 為上述指令。
7. 部署完成後，記下 Zeabur 分配給**後端**的網址（例如 `https://xxx.zeabur.app`），供前端與 CORS 使用。

---

## 四、部署前端（Next.js）

1. 在同一專案中再次點擊 **Deploy New Service**，選擇 **GitHub**，選擇**同一個倉庫**。
2. **Root Directory** 設為：**`frontend`**。
3. **環境變數**（建置時會寫入前端，務必在第一次建置前設定）：

   | 變數 | 說明 | 範例 |
   |------|------|------|
   | `NEXT_PUBLIC_API_URL` | 後端 API 完整網址 | 上一步記下的後端網址，如 `https://xxx.zeabur.app` |
   | `NEXT_PUBLIC_BACKEND_URL` | 與上同（部分功能會讀此變數） | 同上 |

4. **Watch Paths**（可選）：設為 **`/frontend`**，僅 `frontend/` 變更時觸發前端重新部署。
5. **建置與啟動**：
   - 專案內已提供 **`frontend/Dockerfile`**，Zeabur 會自動偵測並使用 Docker 建置與執行，**無需**手動設定 Build / Start 指令。
   - 使用 Dockerfile 時，服務會以 Next.js **standalone** 模式啟動，並自動依 Zeabur 指派的 `PORT` 監聽，部署較穩定。
6. 部署完成後，記下 Zeabur 分配給**前端**的網址（例如 `https://yyy.zeabur.app`）。

---

## 五、前後端互相對應（CORS 與網址）

1. **後端**：回到後端服務的 Variables，將 `CORS_ORIGIN` 設為**前端實際網址**（例如 `https://yyy.zeabur.app`），多個用逗號分隔。儲存後 Zeabur 會自動重新部署。
2. **網址替換（可選）**：若希望程式碼內的預設網址也改為 Zeabur，可在**本機**執行：
   ```bash
   node 安裝與設定/替換網址.js
   ```
   依提示輸入後端與前端 Zeabur 網址，完成後 commit 並 push，Zeabur 會依 Watch Paths 自動重建對應服務。  
   **注意**：若已正確設定 `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_BACKEND_URL` 與 `CORS_ORIGIN`，不執行替換腳本也可正常運作。

---

## 六、資料庫遷移與初始資料

1. **遷移**：後端首次以 `npm run start:prod` 啟動時，會自動執行 `prisma migrate deploy`，建立資料表。
2. **初始資料**（分店、管理員、刺青師等）需手動執行一次：
   - **方式 A**：在 Zeabur 後端服務的 **Execute Command**（或類似功能）執行：
     ```bash
     npx prisma db execute --file prisma/seed-data.sql
     ```
   - **方式 B**：若平台不支援執行指令，請在本機安裝 `psql`，從 Zeabur PostgreSQL 服務取得 `DATABASE_URL`，在專案根目錄執行：
     ```bash
     psql "$DATABASE_URL" -f backend/prisma/seed-data.sql
     ```
   完成後即具備預設分店、管理員與刺青師帳號（密碼請依說明文件於上線後修改）。

---

## 七、驗證與上線

1. **後端**：開啟 `https://您的後端.zeabur.app/health/simple`，應回傳正常。
2. **前端**：開啟 Zeabur 分配的前端網址，應能進入首頁；登入後可操作後台。
3. **自訂網域**（可選）：在 Zeabur 各服務的 **Domains** 可綁定自己的網域，或使用 Zeabur 提供的 `*.zeabur.app` 網址。

---

## 八、無縫轉移檢查清單（從 Railway 或其他平台）

**若由客戶用自己的 GitHub 在 Zeabur 部署**：請先完成 **[1.3 當客戶使用自己的 GitHub 帳號](#13-當客戶使用自己的-github-帳號與開發方不同)**，把程式放到客戶的 GitHub 後再進行下表步驟。

| 步驟 | 說明 |
|------|------|
| 1 | 程式碼已在「要拿來部署的」GitHub 帳號底下（見 1.3） |
| 2 | Zeabur 建立專案 → 新增 PostgreSQL |
| 3 | 從 GitHub 部署後端，Root Directory = `backend`，設定 `DATABASE_URL`、JWT 密鑰、`CORS_ORIGIN` |
| 4 | 從 GitHub 部署前端，Root Directory = `frontend`，設定 `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_BACKEND_URL` |
| 5 | 將後端 `CORS_ORIGIN` 改為前端 Zeabur 網址 |
| 6 | 執行 `prisma/seed-data.sql` 匯入初始資料 |
| 7 | （可選）本機執行 `node 安裝與設定/替換網址.js` 後 push，或僅依賴環境變數 |

之後只要 **push 到 GitHub**，Zeabur 會依 Watch Paths 自動重建對應服務，完成無縫 CI/CD 部署。

---

## 九、參考連結

- [Zeabur 官網](https://zeabur.com)
- [Zeabur 文件：開始使用](https://zeabur.com/docs/en-US/get-started)
- [Zeabur 文件：從 GitHub 部署](https://zeabur.com/docs/en-US/deploy/github)
- [Zeabur 文件：自訂根目錄（Root Directory）](https://zeabur.com/docs/en-US/deploy/root-directory)
- [Zeabur 文件：Watch Paths](https://zeabur.com/docs/en-US/deploy/watch-paths)（monorepo 僅變更時觸發重建）

若部署過程遇到問題，可保留錯誤訊息與操作步驟，與開發團隊聯絡，或至 [Zeabur Discord](https://zeabur.com/dc) 尋求支援。

---

## 十、日後從共享叢集遷移到專用主機

若先以**共享叢集**部署、客戶驗收通過後，再改到**專用主機**，移轉**不會很麻煩**，因為程式已在 GitHub，只要「在新專案再部署一次 + 把資料庫搬過去」即可。

### 移轉時要做的事（概要）

| 項目 | 說明 |
|------|------|
| **程式碼** | 不用動，還是同一個 GitHub 倉庫（例如 diaochuan8888/Tattoo）。 |
| **新專案** | 在 Zeabur 選擇「專用主機」建立**新專案**，依本指南「二～五」再做一次：新增 PostgreSQL → 從 GitHub 部署後端（Root `backend`）→ 部署前端（Root `frontend`）→ 設環境變數 → 改 CORS。 |
| **環境變數** | JWT 密鑰可沿用同一組；`DATABASE_URL` 改為新專案裡的 PostgreSQL 連線字串；`CORS_ORIGIN`、`NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_BACKEND_URL` 改為**新專案**裡 Zeabur 分配的前後端網址。 |
| **資料庫** | 唯一需要「搬移」的部分：從**舊專案**的 PostgreSQL 匯出資料，再匯入**新專案**的 PostgreSQL（見下方）。 |
| **網域** | 若客戶已綁自訂網域，在**新專案**的前端／後端服務的 Domains 再綁一次，或把 DNS 指到新服務網址即可。 |

### 資料庫搬移（匯出 → 匯入）

1. **匯出**：從舊專案的 PostgreSQL 取得 `DATABASE_URL`，在本機執行（或 Zeabur 若有提供執行指令的介面也可用）：
   ```bash
   pg_dump "舊的DATABASE_URL" --no-owner --no-acl -F c -f backup.dump
   ```
   或匯成 SQL 檔：
   ```bash
   pg_dump "舊的DATABASE_URL" --no-owner --no-acl > backup.sql
   ```
2. **匯入**：新專案的 PostgreSQL 建好並取得新的 `DATABASE_URL` 後：
   ```bash
   pg_restore -d "新的DATABASE_URL" --no-owner --no-acl backup.dump
   ```
   若用 SQL 檔則：
   ```bash
   psql "新的DATABASE_URL" -f backup.sql
   ```
3. 新專案後端啟動時會自動跑 Prisma 遷移；若匯入的資料已含所有表，通常不需再執行 seed。

整體來說：**程式與設定照本指南重做一次，只有資料庫要手動匯出／匯入**，約半小時內可完成移轉。
