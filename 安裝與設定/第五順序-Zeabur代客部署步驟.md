# 第五順序：幫客戶在 Zeabur 完成部署（代客操作清單）

您已用客戶的 Zeabur 帳號登入，且客戶的 Zeabur 是用**客戶的 GitHub** 註冊的，所以選倉庫時會看到 **diaochuan8888/Tattoo**。請依下面順序一步一步做。

---

## 事前準備（可先做好）

- **JWT 密鑰**：需要兩組「至少 32 字元的亂碼」，只會用在後端環境變數，不會給前端。  
  - 若本機有 Node，可在終端機執行兩次：  
    `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`  
    得到兩串英文+數字，分別當作 `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET`。  
  - 或自己打一長串英文+數字也可以（至少 32 個字元）。

---

## 步驟 1：建立專案並新增 PostgreSQL

1. 前往 **https://zeabur.com/projects**，點 **Create Project**（建立專案）。
2. 選擇區域（例如 **Singapore**），專案會建立好。
3. 在專案裡點 **Deploy New Service**（部署新服務）。
4. 選 **Databases** → **PostgreSQL**，建立一個 PostgreSQL。
5. 等它跑完，記住這個專案裡現在有一個 **PostgreSQL** 的服務（之後要讓後端連到它）。

---

## 步驟 2：部署後端（選客戶的 GitHub 倉庫，根目錄設為 backend）

1. 在同一個專案再點 **Deploy New Service**。
2. 選 **GitHub**，搜尋並選擇 **diaochuan8888/Tattoo**（或客戶的 Tattoo 倉庫）。
3. 部署開始後，點進**這個剛新增的服務**（會是網站/API 那種圖示，不是資料庫）。
4. 到 **Settings**（設定），找到 **Root Directory**：
   - 填 **`backend`**（一定要填，不能留空或用倉庫根目錄）。
5. 到 **Variables**（環境變數），新增下面這些（若畫面有「從其他服務連結變數」可善用）：

   | 變數名稱 | 值 | 說明 |
   |----------|-----|------|
   | `DATABASE_URL` | 見下方 | 若 Zeabur 有「Link Variable」或「從 PostgreSQL 連結」，選 PostgreSQL 的 `DATABASE_URL`；否則到 PostgreSQL 服務的 Variables / Connect 複製連線字串貼上。 |
   | `JWT_ACCESS_SECRET` | 至少 32 字元的自訂字串 | 上面事前準備的那一串，或自己打一長串。 |
   | `JWT_REFRESH_SECRET` | 另一串至少 32 字元 | 同上，要跟 JWT_ACCESS_SECRET 不同。 |
   | `CORS_ORIGIN` | 先填 `https://placeholder.zeabur.app` | 暫時佔位，等前端部署好會改成前端網址。 |
   | `NODE_ENV` | `production` | 讓後端啟動時從 repo 複製服務圖片並對應 DB，首頁 20 個服務圖才會顯示。 |
   | `AUTO_RESOLVE_FAILED_MIGRATION` | `true` | 若曾出現 P3009（migrate found failed migrations），設為 true 可讓啟動時自動將已知安全失敗 migration 標記為已套用並繼續；啟動成功後可改回留空或刪除。 |

   - **PORT** 不用設，Zeabur 會自己給。
6. （可選）在 Settings 找到 **Watch Paths**，設成 **`/backend`**，之後只有 backend 改動才會觸發後端重建。
7. 儲存後等後端**建置並啟動成功**（綠勾或 Running）。
8. 到這個後端服務的 **Domains** 或 **網址**，記下 Zeabur 給的網址，例如：  
   **`https://xxxxx.zeabur.app`**  
   （這串等一下要填進前端的環境變數。）

---

## 步驟 3：部署前端（同一個倉庫，根目錄設為 frontend）

1. 在同一個專案再點 **Deploy New Service**。
2. 選 **GitHub**，再選**同一個倉庫** **diaochuan8888/Tattoo**。
3. 部署開始後，點進**這個新服務**（前端）。
4. 到 **Settings**，**Root Directory** 填：**`frontend`**。
5. 到 **Variables**，新增（**建置前就要設好**，否則前端會連錯後端）：

   | 變數名稱 | 值 |
   |----------|-----|
   | `NEXT_PUBLIC_API_URL` | 步驟 2 記下的**後端網址**，例如 `https://xxxxx.zeabur.app` |
   | `NEXT_PUBLIC_BACKEND_URL` | 同上，後端網址 |

6. （可選）**Watch Paths** 設成 **`/frontend`**。
7. 儲存後等前端**建置並啟動成功**。
8. 到這個前端服務的 **Domains**，記下前端的網址，例如：  
   **`https://yyyyy.zeabur.app`**

---

## 步驟 4：把後端的 CORS 改成前端的網址

1. 回到**後端**那個服務，進 **Variables**。
2. 把 **`CORS_ORIGIN`** 改成**步驟 3 記下的前端網址**（例如 `https://yyyyy.zeabur.app`），多個網址用逗號分隔。
3. 儲存後 Zeabur 會自動重新部署後端，等它跑完即可。

---

## 步驟 5：匯入初始資料（分店、管理員、刺青師）

1. **方式 A（Zeabur 後端 Terminal）**  
   在**後端**服務的 **Terminal** 執行（需加 `--schema`）：  
   ```bash
   npx prisma db execute --file prisma/seed-data.sql --schema prisma/schema.prisma
   ```  
   **若出現 `doesn't exist`**：表示建置映像裡沒有打包到 `seed-data.sql`，請改用下方方式 B。

2. **方式 B（本機用 psql，建議）**  
   - 到 Zeabur 的 **postgresql** 服務，從 **使用說明** 或 **環境變數** 複製 **Connection String**（或 `DATABASE_URL`），整段連線字串。  
   - 在您**本機**打開終端機，切到專案根目錄（有 `backend`、`frontend` 的那一層），執行（把 `你的連線字串` 換成剛複製的，保留雙引號）：  
     ```bash
     psql "你的連線字串" -f backend/prisma/seed-data.sql
     ```  
   - 若本機沒有 `psql`，可安裝 PostgreSQL 用戶端（如 `brew install libpq` 後用 `psql`），或從 [PostgreSQL 官網](https://www.postgresql.org/download/) 安裝。

完成後，資料庫裡會有預設分店、管理員與刺青師（說明文件裡有預設帳密，上線後請客戶改密碼）。

3. **（可選）首頁「刺青分類」與 Railway 一致**  
   若希望首頁「刺青分類」顯示完整服務卡片與「加入購物車」（而非全部「尚未建立」），請再執行一次首頁用種子（本機）：  
   ```bash
   psql "你的連線字串" -f backend/prisma/seed-data-homepage.sql
   ```  
   刺青師頭像若未上傳則會顯示姓名首字；客戶可於後台「刺青師管理」上傳照片後即會顯示。

---

## 步驟 6：驗證是否成功

1. **後端**：用瀏覽器打開 **`https://您記下的後端網址/health/simple`**，應看到正常回傳（例如 OK 或健康狀態）。
2. **前端**：打開**前端網址**，應能進首頁；用說明文件裡的預設管理員帳密登入，可操作後台。

---

## 給客戶的資訊（部署完成後可交給客戶）

- **前台／官網網址**：前端的 Zeabur 網址（例如 `https://yyyyy.zeabur.app`）。
- **後台登入**：同上網址，登入頁用說明文件中的預設帳號（例如 `admin@test.com` / 密碼 `12345678`），**請客戶登入後儘快修改密碼**。
- 若客戶要綁自己的網域，可在 Zeabur 各服務的 **Domains** 裡設定。

---

## 常見狀況

- **選不到倉庫 diaochuan8888/Tattoo**：確認是用**客戶的 Zeabur 帳號**登入，且該帳號是用**客戶的 GitHub** 註冊／連結的；必要時在 Zeabur 的設定裡重新授權 GitHub。
- **後端建置失敗**：確認 Root Directory 是 **`backend`**，且 `DATABASE_URL` 有填、格式正確。
- **前端建置失敗**：確認 Root Directory 是 **`frontend`**，且 `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_BACKEND_URL` 是**後端**的完整網址（含 `https://`）。
- **登入或 API 失敗、CORS 錯誤**：確認後端 Variables 的 **`CORS_ORIGIN`** 是**前端**的完整網址（含 `https://`），且已儲存並等後端重新部署完成。

做完以上步驟，第五順序就完成了。
