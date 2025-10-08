# 🚨 後端 Crash 修復方案

## 問題診斷

從日誌 `logs/backend/logs.1759923478449.json` 可以看到：

```
Error: Cannot find module '/app/dist/main.js'
```

**根本原因**: Railway 沒有執行 TypeScript 構建步驟，導致 `dist/main.js` 文件不存在。

## 已實施的修復

### 1. 更新啟動腳本
```json
{
  "start:prod": "npm run build && npx prisma db push --accept-data-loss && node dist/main.js",
  "start:force-build": "npm run build && npx prisma db push --accept-data-loss && node dist/main.js"
}
```

### 2. 更新 Railway 配置
- `railway.json`: 使用 `start:force-build` 命令
- `nixpacks.toml`: 強制構建步驟

### 3. 版本號更新
- 從 `0.0.2` 更新到 `0.0.3` 強制 Railway 重新部署

## 部署步驟

### 立即執行以下命令：

```bash
# 1. 提交所有更改
git add .
git commit -m "🚨 修復後端構建問題 - 強制構建步驟

✅ 更新啟動腳本：
- 添加 start:force-build 命令
- 確保構建步驟一定會執行

✅ 更新 Railway 配置：
- 使用強制構建命令
- 更新版本號強制重新部署

✅ 解決問題：
- Railway 沒有執行 TypeScript 構建
- dist/main.js 文件不存在導致 crash"

# 2. 推送到 GitHub
git push origin main
```

### 等待部署結果

1. **等待 5-8 分鐘** Railway 自動部署
2. **檢查日誌** 確認構建步驟執行
3. **驗證服務** 確認後端正常運行

## 預期結果

部署成功後，日誌應該顯示：

```
> backend@0.0.3 start:force-build
> npm run build && npx prisma db push --accept-data-loss && node dist/main.js

> npx prisma generate && npx nest build
✓ Compiled successfully
✔ Generated Prisma Client

> npx prisma db push --accept-data-loss
The database is already in sync with the Prisma schema.

> node dist/main.js
🚀 Backend running on port 4000
```

## 技術細節

### 問題原因分析
1. Railway 的構建緩存可能導致構建步驟被跳過
2. `dist` 文件夾在部署過程中沒有被創建
3. TypeScript 代碼沒有被編譯為 JavaScript

### 解決方案
1. **強制構建**: 在啟動時強制執行 `npm run build`
2. **版本更新**: 更新版本號打破 Railway 緩存
3. **雙重保障**: 構建階段 + 啟動階段都執行構建

## 如果問題持續

如果修復後仍然出現同樣錯誤，可能需要：

1. **清除 Railway 緩存**: 在 Railway 儀表板中清除構建緩存
2. **檢查環境變數**: 確認所有必要的環境變數已設置
3. **檢查依賴**: 確認所有構建工具都在 `dependencies` 中

## 下一步

修復完成後，我們將：
1. 測試後端 API 功能
2. 確認前端可以正常連接後端
3. 進行完整的系統測試

**請立即執行上述 git 命令推送更改！** 🚀
