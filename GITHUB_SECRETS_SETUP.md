# 🔐 GitHub Secrets 設定指南

## 必要的 Secrets

為了讓 GitHub Actions 能夠自動部署到 Railway，你需要在 GitHub Repository 設定以下 Secret。

---

## 📋 需要設定的 Secrets

### 1. RAILWAY_TOKEN（必須）

**用途：** 允許 GitHub Actions 使用 Railway CLI 部署應用

**如何獲取：**

1. 登入 [Railway Dashboard](https://railway.app)
2. 點擊右上角頭像 → Account Settings
3. 前往 "Tokens" 標籤
4. 點擊 "Create New Token"
5. 輸入 Token 名稱（例如：`github-actions-deploy`）
6. 點擊 "Create"
7. **立即複製 token**（只會顯示一次！）

**Token 權限：**
- ✅ 可以部署專案
- ✅ 可以讀取專案資訊
- ✅ 可以查看環境變數（但不會修改）

---

## 🔧 在 GitHub 設定 Secrets

### 步驟 1：進入 Repository 設定

1. 前往你的 GitHub Repository：
   ```
   https://github.com/artherslin-source/tattoo-crm
   ```

2. 點擊 **Settings** 標籤

3. 在左側選單中，展開 **Secrets and variables** → 點擊 **Actions**

### 步驟 2：新增 Secret

1. 點擊右上角的 **"New repository secret"** 按鈕

2. 填寫資訊：
   ```
   Name: RAILWAY_TOKEN
   Secret: [貼上你從 Railway 複製的 token]
   ```

3. 點擊 **"Add secret"** 完成

### 步驟 3：驗證設定

設定完成後，你應該會看到：

```
Repository secrets
┌─────────────────────────────────────────┐
│ RAILWAY_TOKEN                   Updated │
│ [Secret values are hidden]              │
└─────────────────────────────────────────┘
```

---

## ✅ 驗證 Secret 是否生效

### 方法 1：觸發 Workflow

1. 修改任何檔案並推送到 `staging` 分支
2. 前往 Actions 標籤查看 workflow 執行
3. 如果成功，代表 Secret 設定正確

### 方法 2：手動執行 Workflow

1. 前往 Actions 標籤
2. 選擇 "Deploy Backend to Railway" 或 "Deploy Frontend to Railway"
3. 點擊 "Run workflow"
4. 選擇 `staging` 環境
5. 點擊 "Run workflow" 執行
6. 查看執行結果

---

## 🔒 安全最佳實踐

### Token 管理

✅ **應該做的：**
- 使用描述性的 token 名稱（例如：`github-actions-deploy`）
- 定期輪換 token（建議每 3-6 個月）
- 只給予必要的權限
- 如果 token 洩漏，立即撤銷並重新生成

❌ **不應該做的：**
- 在代碼中硬編碼 token
- 在日誌中輸出 token
- 分享 token 給他人
- 使用同一個 token 用於多個用途

### Token 撤銷

如果 token 不慎洩漏：

1. 立即前往 Railway Dashboard → Account Settings → Tokens
2. 找到對應的 token
3. 點擊 "Revoke" 撤銷
4. 生成新的 token
5. 在 GitHub Secrets 中更新

---

## 🆘 常見問題

### Q1: 找不到 "Tokens" 選項？

**A:** 確認你已登入 Railway，並在 Account Settings 頁面。如果還是找不到，嘗試重新登入。

### Q2: Token 建立後沒有複製怎麼辦？

**A:** Token 只會顯示一次。如果忘記複製，你需要：
1. 撤銷舊 token
2. 建立新 token
3. 立即複製並儲存

### Q3: Workflow 執行失敗，顯示 "RAILWAY_TOKEN is not set"？

**A:** 檢查：
1. Secret 名稱是否正確（必須是 `RAILWAY_TOKEN`，大小寫敏感）
2. Secret 是否已儲存（在 Settings → Secrets and variables → Actions 查看）
3. 重新執行 workflow

### Q4: Token 過期了怎麼辦？

**A:** Railway tokens 預設不會過期，但如果你的帳戶有變更或 token 被撤銷：
1. 生成新 token
2. 在 GitHub Secrets 中更新 `RAILWAY_TOKEN`
3. 不需要修改 workflow 檔案

### Q5: 可以使用環境 Secrets 嗎？

**A:** 可以！如果你想為不同環境使用不同的 token：

1. 在 Repository Settings → Environments 創建環境
2. 為每個環境設定 Secret
3. 修改 workflow 使用環境（但當前的設定已經足夠）

---

## 📊 Secret 使用情況

在 workflow 中，Secret 的使用方式：

```yaml
- name: 🚀 Deploy to Railway
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  run: |
    railway up --detach
```

**重要：**
- ✅ Secret 不會顯示在日誌中
- ✅ Secret 會被自動遮蔽（顯示為 `***`）
- ✅ Secret 只在需要時載入

---

## 🔄 更新 Secret

如果需要更新 RAILWAY_TOKEN：

1. 前往 GitHub Repository → Settings → Secrets and variables → Actions
2. 找到 `RAILWAY_TOKEN`
3. 點擊旁邊的 "Update" 按鈕
4. 貼上新的 token
5. 點擊 "Update secret"
6. 重新執行 workflow 驗證

---

## 📝 快速設定檢查清單

設定完成後，請確認：

- [ ] 已在 Railway 生成 token
- [ ] 已將 token 複製並安全儲存
- [ ] 已在 GitHub Repository 設定 `RAILWAY_TOKEN` Secret
- [ ] Secret 名稱正確（`RAILWAY_TOKEN`，大小寫敏感）
- [ ] 已測試 workflow 執行（手動或自動觸發）
- [ ] Workflow 執行成功，沒有 token 相關錯誤

---

## 🎉 完成！

設定完成後，你的 GitHub Actions workflows 就可以自動部署到 Railway 了！

**下一步：**
- 閱讀 [Git 工作流程指南](GIT_WORKFLOW_GUIDE.md)
- 查看 [Workflow 使用說明](.github/workflows/README.md)
- 開始使用自動部署！

---

**💡 提示：** 將 Railway token 安全地儲存在密碼管理器中，以備將來需要重新設定。

