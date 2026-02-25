# A 方案：客戶建倉庫、您推送 — 一步一步做

用最簡單的方式，把程式放到**客戶的 GitHub**，之後客戶可以用自己的帳號在 Zeabur 部署，您也可以繼續幫客戶更新程式。

---

## 先搞懂誰要做什麼

- **客戶**：在 GitHub 建立一個「空倉庫」，把您加為共同編輯者，之後用 Zeabur 部署。
- **您**：把現在電腦裡的程式，推送到客戶剛建的那個倉庫。

**順序**：先客戶做完全部 → 再您做完全部。

---

# 第一部分：客戶在 GitHub 要做的事

請把這一段**整段複製給客戶**，讓客戶照著做。

---

### 步驟 1：登入 GitHub

1. 打開瀏覽器，前往：**https://github.com**
2. 用**客戶自己的帳號**登入（沒有帳號就先註冊一個）。

---

### 步驟 2：建立一個「新的空倉庫」

1. 登入後，點右上角 **「+」** → 選 **「New repository」**（新增倉庫）。
2. 填寫：
   - **Repository name**（倉庫名稱）：例如填 **`tattoo-crm`**（或客戶想用的英文名字，不要空格）。
   - **Description**：可留白或隨便寫，例如「刺青店管理系統」。
   - **Public**：選 **Public**（公開）。
   - **請不要**勾選 「Add a README file」、不要選「Add .gitignore」——要保持**空倉庫**。
3. 點下方綠色按鈕 **「Create repository」**。
4. 建立好後，會看到一個頁面，上面有一行網址，長得像：  
   `https://github.com/客戶的帳號名稱/tattoo-crm`  
   **請把這行網址記下來（或複製下來），傳給開發方。**

---

### 步驟 3：把開發方加為「共同編輯者」（Collaborator）

1. 在**同一個倉庫**的頁面，點上方的 **「Settings」**（設定）。
2. 左邊選單點 **「Collaborators」**（或「Collaborators and teams」）。
3. 若出現「Add people」或「Invite a collaborator」，點進去。
4. 在欄位裡輸入**開發方給您的 GitHub 使用者名稱**（不是 email，是登入 GitHub 用的帳號名稱），按 Enter 或點「Add」。
5. 會發出邀請；開發方要去自己的 GitHub 或 email 點「接受邀請」（Accept invite）後，才算完成。
6. 完成後，開發方就可以把程式推送到這個倉庫了。

---

**客戶做到這裡就好。** 接下來換**您（開發方）**在電腦上操作。

---

# 第二部分：您（開發方）在電腦上要做的事

您只需要做三件事：**(1) 拿到客戶的倉庫網址 (2) 在終端機加一個「遠端」 (3) 推送到客戶的倉庫**。全部做完大約 2 分鐘。

請在**刺青店管理系統的專案資料夾**裡操作（就是有 `backend`、`frontend` 那個資料夾）。

---

### 步驟 1：確認您有「客戶的倉庫網址」和「主分支名稱」

- **客戶的倉庫網址**：客戶在「步驟 2」建立好倉庫後給您的那行，例如：  
  `https://github.com/客戶帳號/tattoo-crm`
- **主分支名稱**：多半是 **`main`**。不確定的話，在 GitHub 桌面版上方看一下目前分支名字，通常就是 `main`。

---

### 步驟 2：用終端機把程式推送到客戶的倉庫（推薦，一步一步來）

GitHub 桌面版沒辦法直接「加第二個遠端」，所以我們用電腦內建的**終端機**輸入幾行指令就好，不用怕，照著做即可。

1. **打開終端機**
   - **Mac**：按 `Command + 空白鍵` 叫出 Spotlight，輸入「終端機」或「Terminal」，按 Enter。
   - **Windows**：在開始選單搜尋「命令提示字元」或「PowerShell」或「終端機」打開。

2. **切換到專案資料夾**  
   在終端機裡輸入下面這一行（**請把路徑改成您電腦上刺青店專案的真實位置**），按 Enter：
   ```bash
   cd /Users/您的使用者名稱/某個資料夾/tattoo-crm
   ```
   - **不確定路徑怎麼查**：打開 GitHub Desktop、選好這個專案，點選單 **Repository** → **Show in Finder**（Mac）或 **Reveal in File Explorer**（Windows），就會打開專案資料夾；Mac 可在 Finder 裡按 **Option + 點一下上方路徑列** 顯示完整路徑，複製後貼到 `cd` 後面（路徑有空格時記得加引號）。
   - **Windows** 路徑長得像：`cd C:\Users\您的使用者名稱\某個資料夾\tattoo-crm`

3. **加入「客戶的倉庫」為遠端**  
   輸入下面這一行，**請把 `https://github.com/客戶帳號/tattoo-crm.git` 換成客戶給您的倉庫網址**（結尾加 `.git`），按 Enter：
   ```bash
   git remote add client https://github.com/客戶帳號/tattoo-crm.git
   ```
   - 若出現「fatal: remote client already exists」表示加過了，沒關係，跳過這一步。

4. **把程式推送到客戶的倉庫**  
   輸入下面這一行，按 Enter（主分支是 `main` 的話）：
   ```bash
   git push client main
   ```
   - 若您的主分支叫 `master`，改成：`git push client master`
   - 若畫面問您登入 GitHub，用**您自己的 GitHub 帳號**登入即可。

5. **完成**  
   看到類似 「done」或「Everything up-to-date」就成功了。請客戶到他的 GitHub 倉庫頁面重新整理，應該會看到程式碼都出現了。

**小提醒**：若專案路徑裡有**空格**，請用英文引號包起來，例如：  
`cd "/Users/您的名字/My Projects/tattoo-crm"`

---

### 步驟 3：之後要幫客戶「更新程式」時怎麼做？

- **平常**：您一樣用 **GitHub 桌面版** 改程式、Commit、Push 到**您自己的**倉庫（origin），沒問題。
- **要讓客戶的網站更新時**：到專案資料夾打開**終端機**，執行：
  ```bash
  git push client main
  ```
  （若主分支是 `master` 就改成 `git push client master`）  
  這樣程式就會推到**客戶的**倉庫，客戶的 Zeabur 若已連接該倉庫，會自動重新部署。
- 若您喜歡全程用終端機，改完程式後可以：
  ```bash
  git add .
  git commit -m "更新說明"
  git push client main
  ```

---

# 第三部分：第五順序 — 在 Zeabur 部署（您代客操作）

程式已經在客戶的 GitHub 倉庫裡之後，若**客戶委託您代為部署**，您可用客戶的 Zeabur 帳號登入，依 **[第五順序 Zeabur 代客部署步驟](./第五順序-Zeabur代客部署步驟.md)** 一步一步做即可（選倉庫 **diaochuan8888/Tattoo**，後端根目錄 `backend`、前端根目錄 `frontend`，設好環境變數與 CORS，最後匯入初始資料）。

若客戶要自己操作：用**客戶自己的帳號**登入 [Zeabur](https://zeabur.com)，連結**客戶自己的 GitHub**，選擇客戶的倉庫，其餘照 **[Zeabur 部署指南](./Zeabur部署指南.md)** 的「二」～「七」做即可。

---

## 給您的小抄：要給客戶的資訊

請先準備好這兩樣，傳給客戶，客戶才能在「步驟 3」把您加為共同編輯者：

1. **您的 GitHub 使用者名稱**  
   - 就是您登入 https://github.com 時用的帳號名稱（網址裡的那個名字），例如：`jerrylin`。  
   - 查詢方式：登入 GitHub → 點右上角大頭照 → 就能看到您的 username。

2. **一句說明**  
   - 例如：「請在倉庫的 Settings → Collaborators 裡，用我的 GitHub 帳號 **您的帳號名** 加我為 Collaborator，並接受邀請，我才能把程式推送到您的倉庫。」

---

## 常見問題

**Q：客戶沒有 GitHub 帳號怎麼辦？**  
請客戶先到 https://github.com 註冊一個（免費），再照「第一部分」做。

**Q：客戶找不到 Collaborators？**  
在倉庫頁面 → 點 **Settings** → 左邊找 **Collaborators** 或 **Collaborators and teams**（可能要在「Access」底下）。

**Q：推送時說沒有權限？**  
請確認客戶已經把您加為 Collaborator，且您已在 GitHub 或 email 裡**接受邀請**。

**Q：之後我改程式，要推送到哪裡？**  
推送到 **client** 這個遠端（客戶的倉庫），客戶的 Zeabur 才會自動更新。推送到 **origin**（您自己的倉庫）不會影響客戶的網站。
