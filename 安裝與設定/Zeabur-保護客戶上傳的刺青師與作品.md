# Zeabur：保護客戶上傳的刺青師照片與作品

客戶已在 Zeabur 站點上傳刺青師照片與作品集，**重新部署或執行種子時不得刪除或覆寫這些資料**。以下說明種子腳本範圍與如何避免檔案遺失。

---

## 一、種子腳本「絕不」動到的內容

Zeabur 使用的種子腳本**只會**異動以下資料，**不會**刪除或修改刺青師、作品集或任何上傳檔案：

| 項目 | 說明 |
|------|------|
| **資料庫** | 只異動 **Service**（首頁 20 筆 seed-hp-* 的欄位）與 **ServiceVariant**（規格），以及刪除多餘的 3 筆 **Service**（seed-svc-1/2/3）及其關聯。**不碰** User、Artist、PortfolioItem、Branch 等。 |
| **檔案** | 種子腳本**不讀寫任何檔案系統**，不會刪除或覆寫 `uploads/` 底下的刺青師照片、作品圖片。 |

因此：**只要客戶的刺青師與作品是存在「資料庫 + uploads 目錄」裡，執行種子不會誤刪或改動這些資料。**

---

## 二、重新部署時為何可能遺失上傳檔案？

後端上傳的刺青師照片與作品會寫入 **`uploads/`** 目錄（程式內為 `process.cwd() + '/uploads'`，底下有 `portfolio/`、`artists/` 等）。  
若 Zeabur **沒有**為此目錄掛載持久化儲存（Volume），則：

- 每次**重新部署**時，容器會重建，容器內的檔案系統會被清空；
- `uploads/` 裡的檔案就會**一併消失**，客戶上傳的照片與作品圖會遺失。

---

## 三、一步一步：在 Zeabur 為 uploads 掛載 Volume

請在 **Zeabur 後端服務** 掛載 **Volume**，讓 `uploads` 目錄變成持久化儲存，重新部署時客戶上傳的刺青師照片與作品就不會消失。

### ⚠️ 掛載前請先看這點

Zeabur 官方說明：**首次掛載 Volume 時，該目錄裡現有的檔案會被清空**。  
若 Zeabur 上**已經有**客戶上傳的刺青師照片與作品：

- **建議**：先用本機腳本把圖片下載備份，掛載完成後再重新上傳或還原。
- **如何下載備份**：在專案 `backend` 目錄執行（請把網址改成你的 Zeabur 前端網址）：
  ```bash
  cd backend
  node scripts/download-zeabur-uploads.js https://tattoo-frontend.zeabur.app
  ```
  腳本會依 API 取得所有刺青師照片與作品集圖片並存到 `backend/zeabur-uploads-backup/`（底下有 `artists/`、`portfolio/`）。掛載完成後可依此資料重新上傳。
- 若目前還沒有上傳過、或可以接受掛載後重新上傳，可直接照下面步驟操作。

---

### 步驟 1：登入 Zeabur 並進入專案

1. 打開瀏覽器，前往 [https://zeabur.com](https://zeabur.com)，登入你的帳號。
2. 在儀表板（Dashboard）找到部署 **Tattoo**（或你專案名稱）的專案，點進去。
3. 進入後會看到專案裡的服務列表（例如前端、後端、資料庫等）。

---

### 步驟 2：點進「後端」服務

1. 在服務列表中，找到 **後端**（Backend）服務。  
   - 名稱可能是 `backend`、`api`、或你當初設定的後端服務名稱。
2. **點一下該後端服務**，進入該服務的詳細頁面（不是只展開，要進到服務自己的設定頁）。

---

### 步驟 3：打開 Volumes 分頁

1. 在後端服務頁面裡，上方或左側通常會有幾個分頁，例如：  
   **Variables**、**Settings**、**Deployments**、**Volumes** 等。
2. 點選 **「Volumes」** 分頁（或英文 **Volumes**）。
3. 若還沒掛載過，會看到說明與一個按鈕 **「Mount Volumes」**（掛載 Volume）。

---

### 步驟 4：點「Mount Volumes」並填寫兩個欄位

1. 點 **「Mount Volumes」** 按鈕。
2. 會出現兩個欄位，請這樣填：

   | 欄位 | 請填寫 | 說明 |
   |------|--------|------|
   | **掛載目錄 (Mount Directory)** | **`/app/uploads`** | Zeabur 要求**絕對路徑**（填 `uploads` 會報錯 "is not an absolute path"）。後端程式用 `process.cwd() + '/uploads'` 存檔，Zeabur Node 建置後工作目錄多為 `/app`，故填 **`/app/uploads`**。 |
   | **硬碟 ID (Volume ID)** | `tattoo-uploads` | Volume 識別名稱，例如 **`tattoo-uploads`** 或 **`uploads-data`**。 |

   **本專案實際採用（已掛載）：** 硬碟 ID = **`tattoo-uploads`**，掛載目錄 = **`/app/uploads`**（tattoo-Backend 服務）。

3. 填完後按 **確認／儲存**（或 **掛載硬碟**、**Mount**，依畫面按鈕文字為準）。

---

### 步驟 5：等 Zeabur 重新部署完成

1. 儲存後，Zeabur 會**重新部署**這個後端服務（因為掛載了 Volume，設定有變）。
2. 部署時可能會有短暫無法連線（Zeabur 說明：有掛 Volume 的服務不支援零停機重啟）。
3. 等後端狀態變成**綠勾或 Running**，就代表完成。
4. 之後**再推送程式或重新部署**，`uploads` 目錄裡的內容會保留在 Volume 上，**不會被清空**。

---

### 若找不到 Volumes 或按鈕長得不一樣

- Zeabur 介面可能因地區或版本略有不同，若你看到的選項是「儲存」、「持久化儲存」、「Data」等，點進去找「掛載目錄」或 **Mount Directory** 的設定即可。
- 官方說明可參考：[Zeabur Volumes 文件](https://zeabur.com/docs/en-US/data-management/volumes)。

---

## 四、總結

- **種子**：只會更新首頁服務與規格（Service / ServiceVariant），**絕不**刪改刺青師、作品集或 uploads 檔案。
- **重新部署**：要避免客戶上傳的刺青師照片與作品遺失，請在 Zeabur 後端為 **uploads** 目錄掛載 **Volume**，讓上傳檔案寫在持久化儲存上。
