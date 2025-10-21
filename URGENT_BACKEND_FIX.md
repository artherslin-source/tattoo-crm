# 🚨 緊急後端修復方案

## 📋 問題持續存在

**時間：** 2025-10-21 11:06  
**錯誤檔案：** logs.1761044969157.json  
**狀態：** 🔄 持續崩潰循環

### 重複出現的錯誤：
1. ❌ **JWT_SECRET 問題** - `JwtStrategy requires a secret or key`
2. ❌ **photoUrl 欄位缺失** - `The column 'photoUrl' does not exist in the current database`

---

## 🔍 根本原因分析

### 問題 1: JWT_SECRET 環境變數問題
- **現象：** JWT_SECRET 在 Railway 環境變數中存在，但應用程式無法讀取
- **可能原因：**
  - 環境變數載入時機問題
  - Railway 內部網路問題
  - 應用程式啟動順序問題

### 問題 2: 資料庫 Schema 不同步
- **現象：** photoUrl 欄位在 schema.prisma 中存在，但資料庫中不存在
- **可能原因：**
  - Prisma migrations 沒有正確執行
  - 資料庫連線問題
  - Schema 版本不一致

---

## 🛠️ 緊急修復方案

### 方案 1: 修復 JWT_SECRET 問題

#### 1.1 檢查 JWT Strategy 配置
```typescript
// 檢查 backend/src/auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET, // 這裡可能有問題
    });
  }
  // ...
}
```

#### 1.2 添加環境變數驗證
```typescript
// 在 main.ts 中添加
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET 環境變數未設置！');
  process.exit(1);
}
console.log('✅ JWT_SECRET 已設置:', process.env.JWT_SECRET ? '存在' : '不存在');
```

### 方案 2: 修復 photoUrl 欄位問題

#### 2.1 創建新的 Migration
```bash
# 在本地執行
cd backend
npx prisma migrate dev --name add-photo-url-to-artist
```

#### 2.2 手動添加欄位
```sql
-- 直接在資料庫中執行
ALTER TABLE "TattooArtist" ADD COLUMN "photoUrl" TEXT;
```

### 方案 3: 完全重置方案

#### 3.1 重置資料庫
```bash
# 在 Railway 中執行
railway run npx prisma db push --force-reset
```

#### 3.2 重新設置環境變數
```bash
# 在 Railway Dashboard 中重新設置
JWT_SECRET=your_new_secret_key_here
```

---

## 🚀 立即執行步驟

### 步驟 1: 修復 JWT_SECRET
```bash
# 1. 前往 Railway Dashboard
# 2. 進入後端服務設定
# 3. 檢查 Environment Variables
# 4. 如果 JWT_SECRET 存在，刪除並重新添加
# 5. 使用新的強密鑰
```

### 步驟 2: 修復 photoUrl 欄位
```bash
# 1. 在 Railway Dashboard 中打開資料庫
# 2. 執行 SQL 命令：
ALTER TABLE "TattooArtist" ADD COLUMN "photoUrl" TEXT;
```

### 步驟 3: 重新部署
```bash
# 1. 在 Railway Dashboard 中點擊 "Redeploy"
# 2. 選擇 "Force Rebuild"
# 3. 等待 5-8 分鐘完成
```

---

## 🔧 替代解決方案

### 方案 A: 修改 Seed 腳本
```typescript
// 在 prisma/seed.ts 中暫時移除 photoUrl
const artist = await prisma.artist.create({
  data: {
    userId: user.id,
    displayName: '測試刺青師',
    bio: '專業刺青師',
    // photoUrl: 'https://example.com/photo.jpg', // 暫時註解掉
    branchId: branch.id,
  },
});
```

### 方案 B: 修改 Schema
```prisma
model Artist {
  id          String   @id @default(cuid())
  userId      String   @unique
  displayName String?
  bio         String?
  styles      Json?
  speciality  String?
  portfolioUrl String?
  // photoUrl    String?  // 暫時註解掉
  branchId    String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // ...
}
```

---

## 📊 修復優先級

### 高優先級（立即執行）
1. **修復 JWT_SECRET** - 影響認證功能
2. **修復 photoUrl 欄位** - 影響 seeding

### 中優先級（後續處理）
1. **改善錯誤處理** - 防止再次發生
2. **添加監控機制** - 提前發現問題

### 低優先級（長期優化）
1. **遷移到其他平台** - 如果 Railway 持續有問題
2. **建立備份策略** - 確保資料安全

---

## 🚨 緊急處理

### 如果所有方法都失敗

1. **聯繫 Railway 支援**
   - 專案 ID: 474d507c-ae28-4d23-857f-317cc8a9bca6
   - 服務 ID: 0272959d-e1ad-4567-8f73-36761b50a36c
   - 提供錯誤日誌

2. **考慮遷移平台**
   - Vercel + PlanetScale
   - Heroku + PostgreSQL
   - DigitalOcean App Platform

3. **使用本地開發環境**
   - 暫時在本地運行後端
   - 使用 ngrok 暴露到網際網路

---

## 📈 預防措施

### 1. 環境變數驗證
```typescript
// 在應用程式啟動時驗證所有必要的環境變數
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ 缺少必要的環境變數: ${envVar}`);
    process.exit(1);
  }
});
```

### 2. 資料庫 Schema 驗證
```typescript
// 在應用程式啟動時驗證資料庫 schema
async function validateDatabaseSchema() {
  try {
    await prisma.$queryRaw`SELECT "photoUrl" FROM "TattooArtist" LIMIT 1`;
    console.log('✅ 資料庫 schema 驗證通過');
  } catch (error) {
    console.error('❌ 資料庫 schema 驗證失敗:', error);
    process.exit(1);
  }
}
```

### 3. 健康檢查端點
```typescript
// 添加健康檢查端點
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET ? 'set' : 'not set',
    database: 'connected'
  };
}
```

---

## 🎯 下一步行動

### 立即執行
1. **修復 JWT_SECRET** - 在 Railway Dashboard 中重新設置
2. **修復 photoUrl 欄位** - 手動添加資料庫欄位
3. **重新部署** - 強制重建

### 後續優化
1. **添加環境變數驗證** - 防止類似問題
2. **改善錯誤處理** - 提供更好的錯誤訊息
3. **建立監控機制** - 提前發現問題

---

**🚀 立即執行修復方案來解決持續的後端崩潰問題！**
