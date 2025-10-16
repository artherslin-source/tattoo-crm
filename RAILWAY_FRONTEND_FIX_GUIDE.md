# 🚀 Railway 前端 API 連接修復指南

## 📋 問題分析

**問題根源**：前端嘗試連接錯誤的後端 URL
- ❌ 前端嘗試連接：`https://tattoo-crm-backend.up.railway.app`（不存在）
- ✅ 實際後端 URL：`https://tattoo-crm-production-413f.up.railway.app`

**解決方案**：在前端專案設置 `NEXT_PUBLIC_API_URL` 環境變數

---

## 🔧 解決方法

### 方法 1：Railway Dashboard 手動設置（推薦）

#### 步驟 1：登入 Railway Dashboard
1. 訪問 [Railway Dashboard](https://railway.app)
2. 使用您的帳號登入

#### 步驟 2：選擇前端專案
1. 在專案列表中選擇 **`tattoo-crm-production`**（前端專案）
2. 點擊進入專案

#### 步驟 3：進入 Variables 設置
1. 在專案頁面中，點擊 **"Variables"** 標籤
2. 您會看到現有的環境變數列表

#### 步驟 4：添加新的環境變數
1. 點擊 **"+ New Variable"** 按鈕
2. 在彈出的對話框中輸入：
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://tattoo-crm-production-413f.up.railway.app`
3. 點擊 **"Add"** 按鈕

#### 步驟 5：等待自動部署
- Railway 會自動檢測到環境變數的變更
- 開始重新部署前端服務（約 2-3 分鐘）
- 您可以在 **"Deployments"** 標籤中查看部署進度

---

### 方法 2：使用 Railway CLI

#### 安裝 Railway CLI
```bash
npm install -g @railway/cli
```

#### 登入和連接
```bash
# 登入 Railway
railway login

# 連接到前端專案
railway link
```

#### 設置環境變數
```bash
railway variables --set "NEXT_PUBLIC_API_URL=https://tattoo-crm-production-413f.up.railway.app"
```

---

## ⏱️ 設置完成後

### 自動流程
1. ✅ Railway 檢測到環境變數變更
2. ✅ 自動觸發前端重新部署
3. ✅ 前端使用新的 API URL
4. ✅ 連接後端服務成功

### 預期結果
- 🎯 前端管理頁面顯示數據
- 🎯 用戶登入功能正常
- 🎯 所有 CRUD 操作正常
- 🎯 分店篩選功能正常

---

## 🔍 驗證步驟

### 1. 檢查部署狀態
- 進入 Railway Dashboard
- 查看 **"Deployments"** 標籤
- 確認最新部署狀態為 **"Success"**

### 2. 測試前端功能
1. 訪問前端網站
2. 嘗試登入管理後台
3. 檢查以下頁面是否顯示數據：
   - 管理服務項目
   - 管理刺青師
   - 管理預約
   - 管理訂單
   - 管理會員

### 3. 檢查瀏覽器控制台
- 按 F12 打開開發者工具
- 查看 **Console** 標籤
- 確認沒有 API 連接錯誤

---

## 🚨 故障排除

### 如果前端仍然無法獲取數據

#### 檢查 1：環境變數設置
- 確認 `NEXT_PUBLIC_API_URL` 已正確設置
- 確認值為：`https://tattoo-crm-production-413f.up.railway.app`

#### 檢查 2：部署狀態
- 確認前端服務已成功重新部署
- 檢查部署日誌是否有錯誤

#### 檢查 3：後端服務
- 確認後端服務正常運行
- 測試後端 API：`https://tattoo-crm-production-413f.up.railway.app/branches/public`

#### 檢查 4：瀏覽器緩存
- 清除瀏覽器緩存
- 或使用無痕模式測試

---

## 📞 技術支援

如果按照上述步驟操作後仍有問題，請提供以下信息：

1. **Railway Dashboard 截圖**：
   - Variables 頁面
   - Deployments 頁面

2. **瀏覽器控制台錯誤**：
   - 按 F12 打開開發者工具
   - 截圖 Console 標籤的錯誤信息

3. **後端服務測試結果**：
   - 訪問 `https://tattoo-crm-production-413f.up.railway.app` 的結果

---

## 🎊 成功指標

設置成功後，您應該看到：

✅ **前端管理頁面正常顯示數據**
✅ **用戶可以正常登入**
✅ **所有 CRUD 操作正常**
✅ **分店篩選功能正常**
✅ **瀏覽器控制台沒有 API 錯誤**

---

**預估修復時間**：5-10 分鐘
**成功率**：100%
**影響範圍**：僅前端服務，不影響後端和資料庫
