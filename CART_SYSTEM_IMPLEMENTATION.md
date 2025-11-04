# 購物車系統實作總結

## ✅ 已完成 - 後端 API

### 1. 資料庫 Schema

已新增以下模型：

#### ServiceVariant（服務規格）
```prisma
model ServiceVariant {
  id               String   @id @default(cuid())
  serviceId        String
  type             String   // "size" / "color" / "position"
  name             String   // "5x5cm" / "割線A" / "部位1"
  code             String?  // "A" / "B" / "C" / "D"
  priceModifier    Int      @default(0)
  durationModifier Int      @default(0)
  sortOrder        Int      @default(0)
  isActive         Boolean  @default(true)
}
```

#### Cart（購物車）
```prisma
model Cart {
  id           String        @id @default(cuid())
  userId       String?       // 已登入用戶
  sessionId    String?       // 訪客 session ID
  status       String        @default("active")
  expiresAt    DateTime      // 7天過期
  items        CartItem[]
}
```

#### CartItem（購物車項目）
```prisma
model CartItem {
  id                String   @id @default(cuid())
  cartId            String
  serviceId         String
  selectedVariants  Json     // 選擇的規格
  basePrice         Int
  finalPrice        Int
  estimatedDuration Int
  notes             String?
  referenceImages   String[]
}
```

### 2. 後端 API 端點

#### 購物車 API（`/cart`）

| 方法 | 端點 | 描述 | 認證 |
|------|------|------|------|
| GET | `/cart` | 獲取購物車 | 可選 |
| POST | `/cart/items` | 加入購物車 | 可選 |
| PATCH | `/cart/items/:itemId` | 更新項目 | 可選 |
| DELETE | `/cart/items/:itemId` | 刪除項目 | 可選 |
| POST | `/cart/checkout` | 結帳 | 可選 |

**加入購物車請求範例：**
```json
{
  "serviceId": "service_id",
  "selectedVariants": {
    "size": "10x10cm",
    "color": "割線A",
    "position": "部位1"
  },
  "notes": "希望在手臂內側",
  "referenceImages": ["url1", "url2"]
}
```

**結帳請求範例：**
```json
{
  "branchId": "branch_id",
  "artistId": "artist_id",
  "preferredDate": "2025-11-10T00:00:00.000Z",
  "preferredTimeSlot": "14:00",
  "customerName": "王小明",
  "customerPhone": "0912345678",
  "customerEmail": "example@email.com",
  "specialRequests": "希望使用黑色墨水"
}
```

#### 服務規格管理 API（`/admin/service-variants`）

| 方法 | 端點 | 描述 | 權限 |
|------|------|------|------|
| POST | `/admin/service-variants` | 創建規格 | BOSS/BRANCH_MANAGER |
| POST | `/admin/service-variants/batch/:serviceId` | 批量創建 | BOSS/BRANCH_MANAGER |
| GET | `/admin/service-variants/service/:serviceId` | 獲取服務規格 | BOSS/BRANCH_MANAGER |
| PATCH | `/admin/service-variants/:variantId` | 更新規格 | BOSS/BRANCH_MANAGER |
| DELETE | `/admin/service-variants/:variantId` | 刪除規格 | BOSS/BRANCH_MANAGER |
| POST | `/admin/service-variants/initialize/:serviceId` | 初始化默認規格 | BOSS/BRANCH_MANAGER |

**初始化默認規格：**

一鍵為服務創建默認規格：

**尺寸選項：**
- 5x5cm（基礎價）
- 10x10cm（+1000元，+30分鐘）
- 15x15cm（+2000元，+60分鐘）
- 20x20cm（+3000元，+90分鐘）

**顏色選項：**
- 割線A（基礎價）
- 黑白B（+500元，+15分鐘）
- 半彩C（+1000元，+30分鐘）
- 全彩D（+1500元，+45分鐘）

**部位選項：**
- 部位1（基礎價）
- 部位2（+500元，+15分鐘）

### 3. 訪客購物車支持

- 使用 `OptionalJwtAuthGuard` 讓 API 支持訪客和登入用戶
- 訪客通過 session ID 識別
- 登入後可以合併購物車（需前端實作）
- 購物車 7 天自動過期

### 4. 完整流程

```
用戶瀏覽服務
    ↓
選擇規格（尺寸、顏色、部位）
    ↓
加入購物車
    ↓
查看購物車（可修改規格、刪除項目）
    ↓
結帳（填寫預約資訊）
    ↓
系統創建：
  - Appointment（預約記錄，包含 cartSnapshot）
  - Order（訂單，包含 cartSnapshot）
    ↓
刺青師查看預約詳情（可看到所有購物車項目）
    ↓
完成施作
    ↓
訂單完成
```

---

## 🚧 待實作 - 前端功能

### 1. 規格選擇器組件

**位置：** `frontend/src/components/service/VariantSelector.tsx`

**功能：**
- 顯示尺寸選項（必選）
- 顯示顏色選項（必選）：割線A、黑白B、半彩C、全彩D
- 顯示部位選項（可選）
- 即時計算並顯示最終價格和預估時長
- 添加備註和參考圖片

**UI 建議：**
```tsx
<VariantSelector
  service={service}
  variants={variants}
  onAddToCart={(selectedVariants, notes, images) => {}}
/>
```

### 2. 購物車頁面

**位置：** `frontend/src/app/cart/page.tsx`

**功能：**
- 顯示購物車項目列表
- 每個項目顯示：
  - 服務名稱和縮圖
  - 選擇的規格（尺寸、顏色、部位）
  - 價格和時長
  - 備註
- 可以修改項目規格
- 可以刪除項目
- 顯示總價和總時長
- 結帳按鈕

**購物車圖標：**
在首頁和全域導航添加購物車圖標，顯示項目數量

### 3. 結帳流程

**位置：** `frontend/src/app/cart/checkout/page.tsx`

**功能：**
- 顯示購物車摘要
- 填寫預約資訊：
  - 選擇分店
  - 選擇刺青師（可選）
  - 選擇日期和時間
  - 填寫聯絡資訊（姓名、電話、Email）
  - 特殊需求
- 提交後跳轉到預約確認頁面

### 4. 服務列表集成

**修改：** `frontend/src/components/home/ServiceCard.tsx`

**新增：**
- 「加入購物車」按鈕
- 點擊後彈出規格選擇器
- 添加成功後顯示通知

### 5. 管理後台 - 服務規格管理

**位置：** `frontend/src/app/admin/services/page.tsx`

**新增功能：**
- 在服務編輯頁面添加「規格管理」標籤
- 可以為服務添加、編輯、刪除規格
- 一鍵初始化默認規格按鈕

### 6. 刺青師後台 - 預約詳情增強

**修改：** 刺青師查看預約時，顯示購物車項目詳情

**顯示：**
- 所有服務項目
- 每個項目的規格選擇
- 總價和總時長

---

## 📝 實作建議

### 前端 API 調用

**創建 cart API 工具：** `frontend/src/lib/cart-api.ts`

```typescript
export async function getCart() {
  const res = await fetch(`${getApiBase()}/cart`, {
    credentials: 'include', // 重要：發送 session cookie
  });
  return res.json();
}

export async function addToCart(data: AddToCartDto) {
  const res = await fetch(`${getApiBase()}/cart/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function checkout(data: CheckoutCartDto) {
  const res = await fetch(`${getApiBase()}/cart/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}
```

### 全域購物車狀態管理

**使用 React Context：** `frontend/src/context/CartContext.tsx`

```typescript
export const CartContext = createContext<{
  cart: CartResponseDto | null;
  refreshCart: () => Promise<void>;
  itemCount: number;
}>({
  cart: null,
  refreshCart: async () => {},
  itemCount: 0,
});
```

### Session 管理

**重要：** 確保所有購物車相關的 API 調用都包含 `credentials: 'include'`，以便發送 session cookie。

---

## 🎨 UI/UX 建議

### 購物車圖標
- 位置：導航欄右上角
- 顯示項目數量徽章
- 點擊打開購物車頁面

### 規格選擇器
- 使用卡片式設計
- 選中的規格高亮顯示
- 即時顯示價格變化
- 添加動畫效果

### 購物車頁面
- 空購物車時顯示友好提示
- 使用卡片展示每個項目
- 滑動刪除功能（移動端）

### 結帳流程
- 分步驟展示（1. 購物車 → 2. 填寫資訊 → 3. 確認）
- 表單驗證
- 提交後顯示成功頁面，包含預約編號

---

## 🧪 測試建議

### 1. 後端測試

**測試訪客購物車：**
```bash
# 加入購物車（無 token）
curl -X POST http://localhost:4000/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_id",
    "selectedVariants": {
      "size": "10x10cm",
      "color": "割線A"
    }
  }'

# 獲取購物車
curl http://localhost:4000/cart
```

**測試規格管理：**
```bash
# 初始化默認規格
curl -X POST http://localhost:4000/admin/service-variants/initialize/{serviceId} \
  -H "Authorization: Bearer {admin_token}"

# 獲取服務規格
curl http://localhost:4000/admin/service-variants/service/{serviceId}
```

### 2. 前端測試

- [ ] 訪客可以加入購物車
- [ ] 登入用戶可以加入購物車
- [ ] 可以修改購物車項目規格
- [ ] 可以刪除購物車項目
- [ ] 價格和時長計算正確
- [ ] 結帳流程完整
- [ ] 購物車 7 天後過期
- [ ] 刺青師可以查看購物車快照

---

## 📦 部署注意事項

### Railway 環境變量

後端已經支持，無需額外配置。

### Session 配置

**重要：** 需要在 `backend/src/main.ts` 中配置 session middleware：

```typescript
import * as session from 'express-session';

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  }),
);
```

**安裝依賴：**
```bash
npm install express-session
npm install -D @types/express-session
```

---

## 🎯 下一步行動

1. **配置 Session** - 在後端 main.ts 配置 express-session
2. **測試後端 API** - 使用 curl 或 Postman 測試購物車 API
3. **創建規格選擇器組件** - 實作前端規格選擇 UI
4. **創建購物車頁面** - 實作購物車列表和管理
5. **實作結帳流程** - 完成預約流程集成
6. **整合到現有頁面** - 在服務列表添加「加入購物車」按鈕
7. **測試完整流程** - 從選擇規格到完成預約
8. **優化 UI/UX** - 添加動畫、反饋和錯誤處理

---

## 💡 額外功能建議

### 短期
- [ ] 購物車項目拖拽排序
- [ ] 收藏功能（收藏服務項目）
- [ ] 分享購物車（生成連結）

### 中期
- [ ] 推薦規格組合
- [ ] 價格計算器（預估總價）
- [ ] 優惠券系統

### 長期
- [ ] 購物車同步（多設備）
- [ ] 預約提醒（Email/SMS）
- [ ] 刺青進度追蹤

---

**文檔版本：** v1.0  
**更新日期：** 2025-11-04  
**作者：** AI Assistant

