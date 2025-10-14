# 🎯 前端 API 連線問題修復指南

## 📊 問題分析

### 錯誤現象
- 前端首頁顯示：「載入資料失敗，已展示範例內容」
- 預約諮詢表格的分店下拉選單無法載入資料
- 前端無法連接到後端 API

### 根本原因
前端代碼中缺少正確的 `NEXT_PUBLIC_API_URL` 環境變數，導致：
1. 前端嘗試從 `http://localhost:4000` 獲取資料（生產環境中不存在）
2. 無法找到正確的後端服務 URL

---

## 🔧 解決方案

### 方案 1: 設定 Railway 環境變數（推薦）

#### 步驟 1: 找到您的後端服務 URL
1. 前往 [Railway Dashboard](https://railway.app/)
2. 選擇您的專案
3. 點擊後端服務（通常是 `tattoo-crm` 或 `backend`）
4. 在 "Settings" 或 "Variables" 標籤中找到服務的 URL
5. 複製完整的 URL（例如：`https://tattoo-crm-backend-production.up.railway.app`）

#### 步驟 2: 設定前端環境變數
1. 在 Railway Dashboard 中，點擊前端服務
2. 前往 "Variables" 標籤
3. 新增環境變數：
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```
4. 重新部署前端服務

### 方案 2: 使用代碼修復（已實施）

我已經修改了代碼，讓它能夠自動檢測 API URL：

#### 修改的文件
1. ✅ `frontend/src/lib/api.ts` - 智能 API URL 檢測
2. ✅ `frontend/src/app/home/page.tsx` - 自動檢測後端 URL
3. ✅ `frontend/src/app/appointments/public/page.tsx` - 統一 API URL 邏輯
4. ✅ `frontend/src/lib/api-debug.ts` - 調試工具（新增）

#### 自動檢測邏輯
```typescript
// 智能檢測 API URL
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const hostname = window.location.hostname;
    if (hostname.includes('railway.app')) {
      // Railway 部署：嘗試後端服務 URL
      return `https://${hostname.replace('tattoo-crm-production', 'tattoo-crm-backend')}`;
    } else {
      // 其他生產環境
      return window.location.origin.replace(/:\d+$/, ':4000');
    }
  }
  
  // 開發環境
  return "http://localhost:4000";
}
```

---

## 🚀 立即修復步驟

### 選項 A: 快速修復（推薦）
1. **找到後端 URL**：
   - 前往 Railway Dashboard
   - 查看後端服務的 URL
   - 複製完整的 URL

2. **設定環境變數**：
   - 在前端服務的 Variables 中新增：
   ```
   NEXT_PUBLIC_API_URL=https://your-actual-backend-url.railway.app
   ```

3. **重新部署**：
   - Railway 會自動重新部署前端

### 選項 B: 使用代碼修復
1. **推送修復的代碼**：
   ```bash
   git add .
   git commit -m "fix: Add intelligent API URL detection for production"
   git push origin main
   ```

2. **等待自動部署**：
   - Railway 會自動重新部署
   - 代碼會自動檢測正確的後端 URL

---

## 🔍 調試工具

我已經添加了調試工具來幫助診斷問題：

### 在瀏覽器控制台中查看
1. 打開瀏覽器開發者工具（F12）
2. 前往 Console 標籤
3. 重新整理頁面
4. 查看以下調試資訊：
   ```
   🔍 API URL 調試資訊:
   Hostname: tattoo-crm-production.up.railway.app
   Origin: https://tattoo-crm-production.up.railway.app
   Environment: production
   NEXT_PUBLIC_API_URL: undefined
   可能的 API URLs: [...]
   ```

### 手動測試 API 連線
在瀏覽器控制台中執行：
```javascript
// 測試不同的 API URL
fetch('https://your-backend-url.railway.app/services')
  .then(response => console.log('✅ 連線成功:', response.status))
  .catch(error => console.log('❌ 連線失敗:', error));
```

---

## 📋 常見的後端 URL 模式

根據 Railway 的命名慣例，您的後端 URL 可能是：

1. `https://tattoo-crm-backend-production.up.railway.app`
2. `https://tattoo-crm-production.up.railway.app` (同一個服務)
3. `https://backend-production.up.railway.app`
4. `https://api-production.up.railway.app`

### 如何確認正確的 URL
1. 前往 Railway Dashboard
2. 點擊後端服務
3. 查看 "Settings" 或 "Deployments" 標籤
4. 找到 "Domain" 或 "URL" 欄位

---

## ✅ 驗證修復

### 修復成功的標誌
1. ✅ 首頁不再顯示「載入資料失敗」錯誤
2. ✅ 預約諮詢表格的分店下拉選單有資料
3. ✅ 瀏覽器控制台沒有 API 連線錯誤
4. ✅ 所有動態內容正常載入

### 測試步驟
1. 重新整理首頁
2. 檢查預約諮詢表格
3. 確認分店下拉選單有選項
4. 查看瀏覽器控制台的調試資訊

---

## 🆘 如果仍然有問題

### 檢查清單
- [ ] 後端服務是否正在運行？
- [ ] 後端 URL 是否正確？
- [ ] 環境變數是否已設定？
- [ ] 前端是否已重新部署？

### 進一步調試
1. 查看 Railway 後端服務的日誌
2. 檢查後端服務的健康狀態
3. 確認後端 API 端點是否可訪問
4. 測試後端 API 的直接連線

---

**預計修復時間**: 5-10 分鐘  
**難度**: 簡單  
**狀態**: 🟡 等待您選擇修復方案

請選擇上述其中一種方案來修復問題！
