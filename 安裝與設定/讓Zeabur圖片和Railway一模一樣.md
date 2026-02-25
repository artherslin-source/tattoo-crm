# 讓 Zeabur 的圖片和 Railway 一模一樣（白話步驟）

客戶要看到和 Railway 一樣的刺青師照片、服務圖片時，可以照下面做。**不用搬檔案**，只要把 Zeabur 資料庫裡的「圖片網址」改成指向 Railway，前台就會從 Railway 載入同一張圖。

---

## 你需要準備的三個東西

1. **Railway 的資料庫連線字串**  
   - 到 Railway 後端服務 → Variables 或 PostgreSQL 服務 → 複製 `DATABASE_URL`（或 Connection String）。

2. **Zeabur 的資料庫連線字串**  
   - 到 Zeabur 的 postgresql 服務 → 使用說明／環境變數 → 複製 Connection String。

3. **Railway 後端網址**  
   - 就是現在 Railway 前台下單、API 用的後端網址，例如：  
     `https://tattoo-crm-production-413f.up.railway.app`  
   - 不要加結尾斜線。

---

## 你只要執行這一步

在**本機**、**專案目錄**下打開終端機，依序執行（把三個 `...` 換成上面準備好的內容）：

```bash
cd backend

export RAILWAY_DATABASE_URL="貼上 Railway 的連線字串"
export ZEABUR_DATABASE_URL="貼上 Zeabur 的連線字串"
export RAILWAY_BACKEND_URL="https://你的Railway後端網址"

node scripts/sync-image-urls-from-railway.js
```

例如（僅範例，請換成你的真實值）：

```bash
cd backend
export RAILWAY_DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"
export ZEABUR_DATABASE_URL="postgresql://root:xxx@sjc1.clusters.zeabur.com:26344/zeabur"
export RAILWAY_BACKEND_URL="https://tattoo-crm-production-413f.up.railway.app"
node scripts/sync-image-urls-from-railway.js
```

跑完會看到類似：

- `✅ 刺青師: 朱川進 三重店 -> seed-artist-1`
- `✅ 服務: 小圖刺青 -> seed-svc-1`
- `✅ 作品: 朱川進 某作品標題 -> xxx`
- …

最後一行會寫「完成。請重新整理 Zeabur 前台…」。

---

## 之後客戶看到的是什麼？

- Zeabur 前台（刺青師團隊、刺青分類）會顯示**和 Railway 一樣的圖片**。
- 圖片檔案還在 Railway 主機上，只是 Zeabur 的畫面上是「連到 Railway 的網址」去載入那張圖。
- 所以 **Railway 後端要能正常連線**，Zeabur 才看得到圖；若之後要完全不用 Railway，再改為在 Zeabur 後台上傳圖片即可。

---

## 我這邊可以直接幫你處理嗎？

**沒辦法。** 我沒有權限登入你的 Railway 或 Zeabur，拿不到連線字串，所以不能替你執行。  
你只要把上面三個變數填好、在本機執行那一行 `node scripts/sync-image-urls-from-railway.js`，就能自己完成；腳本會把 Zeabur 資料庫裡對應的刺青師、服務的圖片網址改成 Railway，客戶在 Zeabur 就會看到和 Railway 一模一樣的圖片。
