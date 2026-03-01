# Zeabur 服務規格：請依 Railway 對照表檢視後再部署

以下為從 **Railway 目前正確環境**（[首頁](https://tattoo-crm-production.up.railway.app/home)）取得的規格結構整理，供您與目前 Zeabur 使用的種子比對。**請您確認此對照表無誤後，再通知我執行 Zeabur 規格種子／部署。**

---

## 一、Railway 正確規格結構（2026/3 從 API 取得）

### 1. 大部分服務（無「尺寸」、以「顏色」為完整價格）

以下服務在 Railway 上**沒有「尺寸」(size)**，也沒有「部位」(position)；只有**顏色**（割線、黑白、半彩、全彩）為**完整價格**（選哪個就顯示該價格），加上**左/右半邊**、**設計費**、**增出範圍與細膩度加購**。

| 服務名稱       | 顏色規格（均為完整價格，單位 NT$）     | 其他規格 |
|----------------|----------------------------------------|----------|
| 單胸到包全手   | 割線 15,000／黑白 100,000／半彩 150,000／全彩 180,000 | side(左/右)、design_fee、custom_addon |
| 上手臂         | 割線 5,000／黑白 30,000／半彩 35,000／全彩 40,000     | side、design_fee、custom_addon |
| 大小腿包全肢   | 割線 20,000／黑白 150,000／半彩 180,000／全彩 200,000 | side、design_fee、custom_addon |
| 排胛圖         | 割線 15,000／黑白 100,000／半彩 120,000／全彩 150,000 | side、design_fee、custom_addon |
| 小腿表面       | 割線 5,000／黑白 20,000／半彩 30,000／全彩 40,000     | side、design_fee、custom_addon |

其餘首頁服務（單胸口圖、半胛圖、大腿表面、大腿全包、小腿全包、前手臂、上下手臂全肢、雙胸到腹肚圖、大背後圖、背後左或右圖、大背到大腿圖、雙前胸口圖、腹肚圖、單胸腹肚圖等）在 Railway 上也是**同一套邏輯**：**僅 color（割線/黑白/半彩/全彩 完整價）+ side + design_fee + custom_addon**，**沒有 size、沒有 position**。

### 2. 圖騰小圖案（有「尺寸」+ 黑白/彩色）

- **尺寸 (size)**：Z (≤3cm)、T-1 (5-6cm)、T-2 (6-7cm)、U-1、U-2、V-1、V-2、W-1、W-2、X-1、X-2、Y-1、Y-2（共 13 檔），每檔有黑白價與彩色價（存在 metadata）。
- **顏色 (color)**：黑白、彩色（價格依尺寸從 metadata 計算，非固定加價）。
- **其他**：side、design_fee、custom_addon。

---

## 二、目前 Zeabur 種子錯在哪裡

目前 `seed-data-service-variants.sql`（與 run-seed-homepage-and-variants.js）的內容是：

- 對**所有 20 個服務**一律套用：
  - **尺寸**：12 個（5-6cm～16-17cm）
  - **顏色**：黑白、彩色（當作「加價」+1000）
  - **部位**：6 個（手臂外側、手臂內側、小腿、大腿、背部、胸部）
  - **設計費**：1 個

這與 Railway 正確邏輯不一致：

1. Railway 上**只有「圖騰小圖案」有尺寸**，其餘服務都沒有尺寸、沒有部位。
2. Railway 上多數服務的**顏色是「割線／黑白／半彩／全彩」四種，且為完整價格**，不是「黑白 + 彩色加價 1000」。
3. Railway 有 **side（左半邊／右半邊）** 與 **custom_addon（增出範圍與細膩度加購）**，目前 Zeabur 種子沒有。

因此若直接用現有 Zeabur 種子，會出現「錯誤的規格選項與價格」（例如截圖中出現尺寸/部位與 NT$ 1,000 等）。

---

## 三、建議的下一步（待您確認）

1. **Zeabur 服務與 ID**  
   Zeabur 若用 `seed-data-homepage.sql`，會建立 **seed-hp-1～seed-hp-20** 的服務（固定 ID）。  
   Railway 則是 **cuid**（每個環境不同）。  
   要對齊 Railway 的「規格邏輯」，有兩種做法：

   - **做法 A**：重寫 Zeabur 的規格種子，讓「服務名稱」對應到與 Railway 相同的規格結構（例如依服務名稱判斷：圖騰小圖案 → 尺寸+黑白/彩色；其餘 → 割線/黑白/半彩/全彩 + side + design_fee + custom_addon），並寫入對應的價格與 metadata。  
     → 需要您確認：Zeabur 首頁 20 個服務的「名稱」是否與上表一致（或提供 Zeabur 服務名稱列表），以及是否同意用「名稱對應」來決定每個服務要掛哪些規格。

   - **做法 B**：從 Railway 資料庫匯出 `Service` 與 `ServiceVariant`（或至少匯出規格定義與價格），再在 Zeabur 用匯入腳本寫入；Zeabur 的服務 ID 會是 seed-hp-*，匯入時需對應到正確的 serviceId。  
     → 需要您提供 Railway 的 DB 匯出（或後台匯出規格），或授權我依 API 抓取的完整 19 筆服務規格產出「可匯入 Zeabur 的 SQL/腳本」供您檢視。

2. **請您回覆**  
   - 上表「Railway 正確規格結構」是否有需要修正或補充（例如某服務實際還有/沒有哪些規格）？  
   - 您較傾向 **做法 A（依名稱重寫 Zeabur 種子）** 還是 **做法 B（從 Railway 匯出再匯入 Zeabur）**？  
   - 若選 A，Zeabur 首頁的 20 個服務名稱是否與本文件「一、」的列表一致？

確認後，我會依您的選擇產出「僅供檢視」的規格定義或 SQL/腳本，**不會直接改寫種子或部署**；您確認無誤後再告訴我執行部署。

---

## 四、Railway API 參考

- 服務列表：`GET https://tattoo-crm-production.up.railway.app/api/services`
- 某服務規格：`GET https://tattoo-crm-production.up.railway.app/api/services/{serviceId}/variants`

本對照表是依上述 API 於 2026/3 取得之結果整理。

---

## 五、做法 A 已實作（2026/2）

- **規格種子腳本**：`backend/scripts/seed-zeabur-variants-railway-style.js`
- **一鍵流程**：`run-seed-homepage-and-variants.js` 第一步仍執行 `seed-data-homepage.sql`，第二步改為執行上述腳本（不再執行 `seed-data-service-variants.sql`）。
- Railway 環境偵測：兩支腳本皆會偵測 Railway 並略過，僅在 Zeabur 執行。

---

## 六、完整比對（Railway API vs Zeabur 種子）2026/2

已用 Railway API 逐服務取得 `GET /api/services/{id}/variants`，與種子腳本寫入的規格比對如下。

### 6.1 價格與結構（19 個一般服務）

| 服務名稱 | 割線 | 黑白 | 半彩 | 全彩 | 有 side | Railway 備註 |
|----------|------|------|------|------|---------|--------------|
| 半胛圖 | 5000 | 40000 | 50000 | 60000 | 是 | 顏色 code：LINE / HALF / FULL（種子已對齊） |
| 排胛圖 | 15000 | 100000 | 120000 | 150000 | 是 | 一致 |
| 大腿表面 | 5000 | 30000 | 40000 | 50000 | 是 | 一致 |
| 大腿全包 | 10000 | 80000 | 100000 | 150000 | 是 | 一致 |
| 小腿表面 | 5000 | 20000 | 30000 | 40000 | 是 | 一致 |
| 小腿全包 | 5000 | 40000 | 50000 | 60000 | 是 | 一致 |
| 前手臂 | 5000 | 30000 | 35000 | 40000 | 是 | 一致 |
| 上手臂 | 5000 | 30000 | 35000 | 40000 | 是 | 一致 |
| 大小腿包全肢 | 20000 | 150000 | 180000 | 200000 | 是 | 一致 |
| 上下手臂全肢 | 10000 | 80000 | 120000 | 150000 | 是 | 一致 |
| 單胸到包全手 | 15000 | 100000 | 150000 | 180000 | 是 | 一致 |
| 大背後圖 | 15000 | 150000 | 180000 | 200000 | 否 | 一致 |
| 背後左或右圖 | 10000 | 70000 | 80000 | 100000 | 是 | 一致 |
| 大背到大腿圖 | 25000 | 180000 | 250000 | 300000 | 否 | 一致 |
| 雙胸到腹肚圖 | 10000 | 50000 | 70000 | 90000 | 否 | 一致 |
| 雙前胸口圖 | 10000 | 40000 | 50000 | 60000 | 否 | 一致 |
| 單胸口圖 | 5000 | 20000 | 25000 | 30000 | 是 | 顏色 code：LINE / HALF / FULL（種子已對齊） |
| 腹肚圖 | 15000 | 150000 | 180000 | 200000 | 否 | 一致 |
| 單胸腹肚圖 | 10000 | 80000 | 100000 | 120000 | 是 | 一致（顏色＋左右半邊＋設計費＋加購，與 Railway 首頁規格彈窗一致） |

### 6.2 圖騰小圖案

- **size**：13 檔（Z, T-1～Y-2）、name/code/priceModifier/sortOrder 與 Railway 一致；metadata（blackWhitePrice、colorPrice、priceDiff）與 Railway 一致。
- **color**：黑白（metadata.note）、彩色（useSizeMetadata: true）與 Railway 一致。
- **side / design_fee / custom_addon**：與 Railway 一致。

### 6.3 差異摘要

| 項目 | 說明 |
|------|------|
| 顏色 code | Railway 上「半胛圖」「單胸口圖」為 LINE / HALF / FULL，其餘為 OUTLINE / SEMI_COLOR / COLOR。種子已依服務名稱對齊。 |
| 單胸腹肚圖 | 先前比對時誤用錯誤的 service ID（`wqn` 與 `wq7` 混淆）導致 API 回傳空；正確 ID 為 `cmhec2wq7002aogb6e0axqgih`。Railway 上該服務有完整規格（割線/黑白/半彩/全彩 + 左右半邊 + 設計費 + 加購），與 Zeabur 種子一致。 |
| design_fee / custom_addon | 種子與 Railway 多數服務一致（description、metadata.displayText / isCustomPrice）。 |

結論：**價格、是否有 side、規格類型與圖騰 size/color metadata 已與 Railway 完整比對並對齊；20 個服務（含單胸腹肚圖）皆與 [Railway 首頁](https://tattoo-crm-production.up.railway.app/home) 規格一致。**

---

## 七、首頁服務項目：Railway vs Zeabur 前端比對（2026/2）

已比對兩邊首頁使用的 **API 資料**（Railway: `https://tattoo-crm-production.up.railway.app/api/services`，Zeabur: `https://tattoo-frontend.zeabur.app/api/services` → 轉發至 Zeabur 後端）。

### 7.1 一致的部分

- **20 個服務名稱**：兩邊皆有且名稱相同（半胛圖、排胛圖、…、圖騰小圖案），與 `SERVICE_DISPLAY_ORDER` 一致。
- **首頁顯示順序**：前端依 `SERVICE_DISPLAY_ORDER` 排序，故兩邊首頁看到的「服務列表順序」相同。
- **hasVariants**：20 筆皆為 `true`，點「加入購物車」都會開規格彈窗。
- **規格內容**：Zeabur 已用做法 A 種子對齊 Railway（割線/黑白/半彩/全彩、左右半邊、設計費、加購；圖騰為尺寸＋黑白/彩色）。

### 7.2 完全對齊（已實作）

- **首頁服務資料**：`seed-data-homepage.sql` 已改為與 Railway API 完全一致（`price`、`durationMin`、`description`、`category`），並使用 `ON CONFLICT DO UPDATE`，每次執行種子都會更新為 Railway 數值。
- **多餘 3 筆**：執行 Zeabur 規格種子時（`seed-zeabur-variants-railway-style.js`）會**自動刪除** `seed-svc-1`、`seed-svc-2`、`seed-svc-3`（小圖/中圖/大圖刺青）及其關聯資料，故 API 回傳僅 20 筆，與 Railway 一致。
