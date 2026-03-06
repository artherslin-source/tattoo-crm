# 腳本與部署環境對應（Zeabur / Railway）

**請勿在 Railway 上執行僅供 Zeabur 使用的腳本；反之亦然。**

## 僅供 Zeabur 使用（勿在 Railway 執行）

以下腳本用於 Zeabur 後端 Execute Command 或本機連 Zeabur DB，內建偵測到 Railway 會立即退出：

- `run-seed-homepage-and-variants.js` — 首頁服務 + 規格種子
- `seed-zeabur-variants-railway-style.js` — Zeabur 規格對齊 Railway 結構

## 僅供本機使用（勿在部署流程中執行）

- `download-zeabur-uploads.js` — 從 Zeabur API 下載刺青師照片與作品備份到本機
- `sync-image-urls-from-railway.js` — 將 Railway 圖片網址同步到 Zeabur DB（需同時能連兩邊）

## Railway 部署時

後端啟動為 `npm run start:prod`（`scripts/start-prod.js`），**不會**自動執行上述 Zeabur 腳本。  
若在 Railway 手動執行指令，請勿執行 `run-seed-homepage-and-variants.js` 或 `seed-zeabur-variants-railway-style.js`。

詳見專案根目錄：`安裝與設定/推送與部署來源說明.md`。
