# JWT_SECRET 環境變數修正

## 問題診斷

後端應用啟動失敗，錯誤訊息：
```
JwtStrategy requires a secret or key
```

## 根本原因

代碼中使用的是 `JWT_ACCESS_SECRET` 環境變數，但 Railway 中設定的是 `JWT_SECRET`。

### 相關文件：
- `backend/src/auth/jwt.strategy.ts` (第 11 行)
- `backend/src/auth/auth.module.ts` (第 14 行)

## 解決方案

### 方案 1：修改 Railway 環境變數（推薦）

1. 進入 Railway 後端服務的 Variables 頁面
2. 將 `JWT_SECRET` 刪除
3. 新增 `JWT_ACCESS_SECRET` 並設定相同的值
4. 重新部署後端服務

### 方案 2：修改代碼

如果不想修改 Railway 設定，可以修改代碼使用 `JWT_SECRET`：

```typescript
// backend/src/auth/jwt.strategy.ts
secretOrKey: process.env.JWT_SECRET as string,

// backend/src/auth/auth.module.ts  
secret: process.env.JWT_SECRET,
```

## 推薦操作

**建議使用方案 1**，因為：
1. 不需要修改代碼
2. 保持代碼的一致性
3. 避免未來混淆

## 其他需要的環境變數

檢查是否還需要設定：
- `JWT_ACCESS_TTL` (可選，預設 15m)
- `JWT_REFRESH_SECRET` (如果使用 refresh token)
- `JWT_REFRESH_TTL` (如果使用 refresh token)

## 驗證步驟

修正後，重新部署後端服務，檢查：
1. 後端服務成功啟動
2. 沒有 JWT 相關錯誤
3. 前端可以正常登入
