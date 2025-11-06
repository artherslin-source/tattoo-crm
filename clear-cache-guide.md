# 清除緩存和測試指南

## 🔄 Railway 部署狀態檢查

**最新提交：** `6049337` - Session cookie 跨域配置修復

### 1. 確認 Railway 部署完成

**Railway 後端服務：**
- 前往：https://railway.app/
- 檢查後端服務（tattoo-crm-backend）
- 確認部署狀態顯示 "✅ Deployed"
- 查看部署日誌，確認最新 commit

**預計時間：** 提交後 2-3 分鐘

---

## 🧹 清除瀏覽器緩存步驟

### Chrome 完整清除步驟

**方法 1：快速清除（推薦）**

1. 按下快捷鍵：
   - **Windows/Linux:** `Ctrl + Shift + Delete`
   - **Mac:** `Command + Shift + Delete`

2. 在彈出的視窗中：
   - 時間範圍：選擇「**不限時間**」
   - 勾選以下選項：
     - ✅ **Cookie 和其他網站資料**
     - ✅ **快取圖片和檔案**
   - 取消勾選：
     - ⬜ 瀏覽記錄（可選）
     - ⬜ 下載記錄（可選）

3. 點擊「**清除資料**」

4. 等待完成（約 5-10 秒）

**方法 2：開發者工具清除**

1. 打開開發者工具（F12）

2. 切換到「**Application**」標籤

3. 左側找到「**Storage**」區域

4. 點擊「**Clear site data**」

5. 確認清除

**方法 3：無痕模式測試**

1. 按下快捷鍵：
   - **Windows/Linux:** `Ctrl + Shift + N`
   - **Mac:** `Command + Shift + N`

2. 在無痕視窗中測試

3. 這樣可以避免舊 cookie 影響

---

## 🧪 完整測試流程

### 步驟 1：確認部署完成

```bash
# 方法 1：檢查後端 API
curl https://tattoo-crm-production-413f.up.railway.app/services

# 方法 2：檢查後端健康狀態
curl https://tattoo-crm-production-413f.up.railway.app/
```

**預期結果：** 返回 JSON 數據或正常響應

### 步驟 2：清除所有緩存

1. 關閉所有相關的瀏覽器標籤
2. 按 `Ctrl/Cmd + Shift + Delete`
3. 選擇「不限時間」
4. 清除「Cookie」和「快取」
5. 點擊「清除資料」

### 步驟 3：重新測試購物車

**完整測試流程：**

1. **前往首頁**
   ```
   https://tattoo-crm-production.up.railway.app/home
   ```

2. **選擇服務**
   - 點擊任意服務的「加入購物車」
   - 例如：「前手臂」

3. **選擇規格**
   - 選擇顏色：割線/黑白/半彩/全彩
   - 不需要選擇尺寸（已停用）
   - 點擊「加入購物車」

4. **確認成功**
   - ✅ 購物車圖標應顯示 "1"
   - ✅ 應該看到成功訊息

5. **查看購物車**
   - 點擊購物車圖標
   - 或前往：`/cart`

6. **驗證結果**
   - ✅ 應該看到剛加入的商品
   - ✅ 商品信息應該正確顯示
   - ✅ 價格應該正確

---

## 🔍 開發者工具檢查

### 檢查 1：Network 請求

**打開開發者工具：** F12 → Network 標籤

**加入購物車時：**
```
POST https://tattoo-crm-production-413f.up.railway.app/cart/items

請求標頭：
- Content-Type: application/json

響應標頭：
- Set-Cookie: connect.sid=xxx; SameSite=None; Secure; HttpOnly
```

**查看購物車時：**
```
GET https://tattoo-crm-production-413f.up.railway.app/cart

請求標頭：
- Cookie: connect.sid=xxx  ← 應該有這個！
```

### 檢查 2：Cookie 設置

**打開開發者工具：** F12 → Application 標籤

**位置：** Application > Cookies > `tattoo-crm-production-413f.up.railway.app`

**查找 Cookie：** `connect.sid`

**確認屬性：**
- ✅ Name: `connect.sid`
- ✅ Value: 長字符串（例如：`s%3Aguest_xxx.yyy`）
- ✅ Domain: `.up.railway.app` 或 `tattoo-crm-production-413f.up.railway.app`
- ✅ Path: `/`
- ✅ Expires: 7 天後的日期
- ✅ HttpOnly: `true` ✔
- ✅ Secure: `true` ✔
- ✅ SameSite: `None` ✔

### 檢查 3：Console 錯誤

**打開開發者工具：** F12 → Console 標籤

**應該沒有錯誤：**
- ❌ 如果看到 `401 Unauthorized` - 這是正常的（訪客模式）
- ❌ 如果看到 `加入購物車失敗` - 有問題
- ✅ 應該看到 `✅ 已加入購物車！`

---

## 🐛 常見問題排查

### 問題 1：部署尚未完成

**症狀：**
- 購物車仍然顯示為空
- Cookie 的 SameSite 仍然是 `Lax`

**解決方案：**
1. 等待 5 分鐘
2. 前往 Railway 控制台確認部署完成
3. 重新測試

### 問題 2：瀏覽器緩存

**症狀：**
- 已經清除緩存但問題仍然存在
- Cookie 沒有出現

**解決方案：**
1. 完全關閉瀏覽器
2. 重新打開
3. 或使用無痕模式測試

### 問題 3：Cookie 被阻擋

**症狀：**
- Cookie 沒有設置
- Application > Cookies 中找不到 `connect.sid`

**解決方案：**
1. 檢查瀏覽器設定
2. Chrome 設定 > 隱私權和安全性 > Cookie 和其他網站資料
3. 確保「允許所有 Cookie」或至少「封鎖第三方 Cookie」
4. 不要選擇「封鎖所有 Cookie」

### 問題 4：Railway 環境變數

**症狀：**
- 部署成功但行為沒有改變

**檢查：**
```bash
# Railway 環境變數應該包含：
NODE_ENV=production
SESSION_SECRET=tattoo-crm-session-secret-key-2025
```

---

## 📝 完整測試清單

部署完成後，請按順序測試：

- [ ] 1. 確認 Railway 後端部署完成
- [ ] 2. 清除瀏覽器所有緩存和 Cookie
- [ ] 3. 完全關閉並重新打開瀏覽器
- [ ] 4. 前往首頁（/home）
- [ ] 5. 打開開發者工具（F12）
- [ ] 6. 切換到 Network 標籤
- [ ] 7. 選擇任意服務
- [ ] 8. 選擇顏色
- [ ] 9. 點擊「加入購物車」
- [ ] 10. 檢查 Network：POST /cart/items
- [ ] 11. 檢查響應：Set-Cookie 包含 SameSite=None
- [ ] 12. 確認購物車圖標顯示 "1"
- [ ] 13. 點擊購物車圖標
- [ ] 14. 檢查 Network：GET /cart
- [ ] 15. 檢查請求：Cookie 包含 connect.sid
- [ ] 16. 確認購物車頁面顯示商品

---

## 🎯 預期結果

### 成功的流程

```
1. 用戶前往首頁
2. 選擇服務並加入購物車
   → POST /cart/items
   → 200 OK
   → Set-Cookie: connect.sid=xxx; SameSite=None; Secure
3. 購物車圖標更新為 "1"
4. 用戶點擊購物車圖標
   → GET /cart
   → Cookie: connect.sid=xxx
   → 200 OK
   → 返回購物車數據
5. ✅ 購物車頁面顯示商品
```

### 失敗的流程（需要修復）

```
1. 用戶前往首頁
2. 選擇服務並加入購物車
   → POST /cart/items
   → 200 OK
   → Set-Cookie: connect.sid=xxx; SameSite=Lax ❌
3. 購物車圖標更新為 "1"
4. 用戶點擊購物車圖標
   → GET /cart
   → Cookie: (沒有 connect.sid) ❌
   → 200 OK
   → 返回空購物車
5. ❌ 購物車頁面顯示為空
```

---

## 🚨 如果問題仍然存在

### 提供以下信息：

1. **Railway 部署狀態截圖**
   - 顯示最新的部署記錄
   - 確認 commit hash

2. **Network 標籤截圖**
   - POST /cart/items 的 Response Headers
   - GET /cart 的 Request Headers

3. **Application 標籤截圖**
   - Cookies 列表
   - 顯示 connect.sid 的所有屬性

4. **Console 標籤截圖**
   - 顯示所有錯誤和警告

---

## 📞 臨時解決方案（如果仍然失敗）

### 方案 1：使用無痕模式

1. 開啟無痕視窗
2. 前往首頁
3. 測試購物車功能
4. 這樣可以排除緩存影響

### 方案 2：使用不同瀏覽器

1. 嘗試使用 Firefox 或 Safari
2. 測試購物車功能
3. 確認是否瀏覽器相關問題

### 方案 3：檢查 Railway 日誌

1. 前往 Railway 控制台
2. 查看後端服務日誌
3. 查找任何錯誤或警告

---

**請先確認 Railway 部署完成，然後完整清除緩存後再測試！** 🚀

