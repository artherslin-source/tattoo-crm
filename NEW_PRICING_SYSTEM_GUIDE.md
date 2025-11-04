# 新價格體系使用指南

**更新日期：** 2025-11-04  
**版本：** v2.0

---

## 📊 價格體系變更

### 舊系統 vs 新系統

**舊系統（已淘汰）：**
```
最終價格 = 服務基礎價 + 尺寸加價 + 顏色加價
例如：3000元 + 1000元（10x10cm）+ 500元（黑白）= 4500元
```

**新系統（當前）：**
```
最終價格 = 尺寸價格（包含黑白）+ 顏色加價（彩色+1000）
例如：7000元（10-11cm黑白）或 8000元（10-11cm彩色）
```

---

## 💰 完整價格對照表

| 尺寸 | 黑白 | 彩色 | 說明 |
|------|------|------|------|
| 5-6cm | 2,000元 | 3,000元 | 最小尺寸 |
| 6-7cm | 3,000元 | 4,000元 | |
| 7-8cm | 4,000元 | 5,000元 | |
| 8-9cm | 5,000元 | 6,000元 | |
| 9-10cm | 6,000元 | 7,000元 | |
| 10-11cm | 7,000元 | 8,000元 | 常見尺寸 |
| 11-12cm | 8,000元 | 9,000元 | |
| 12-13cm | 9,000元 | 10,000元 | |
| 13-14cm | 10,000元 | 11,000元 | |
| 14-15cm | 11,000元 | 12,000元 | |
| 15-16cm | 12,000元 | 13,000元 | |
| 16-17cm | 14,000元 | 14,000元 | **⭐ 特殊：彩色不加價** |

### 規則說明

1. **黑白價格**：尺寸的 priceModifier 就是黑白的完整價格
2. **彩色加價**：大部分尺寸 +1000元
3. **特殊情況**：16-17cm 彩色不加價（黑白和彩色都是 14000元）
4. **時長計算**：尺寸越大，施作時間越長

---

## 🎨 新增功能：設計費

### 概念

設計費是獨立於尺寸和顏色之外的額外規格，用於：
- 複雜圖案的設計服務
- 客製化設計需求
- 需要刺青師額外設計時間

### 前端顯示

**顧客端：** 顯示「另外估價」  
**管理後台：** BOSS/店長/刺青師可輸入具體金額

### 技術實作

```typescript
// 規格類型
type: "design_fee"

// metadata 標記
metadata: {
  isCustomPrice: true,
  displayText: "另外估價"
}

// 購物車項目中
selectedVariants: {
  size: "10-11cm",
  color: "彩色",
  design_fee: 3000  // 管理後台輸入的價格
}

// 最終價格計算
finalPrice = 8000 (尺寸+顏色) + 3000 (設計費) = 11000元
```

---

## 🚀 如何測試

### 第一步：初始化服務規格

需要管理員 Token 才能初始化規格：

```bash
# 1. 登入獲取 Token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# 2. 提取 Token
TOKEN="your_access_token_here"

# 3. 初始化服務規格（標準模板）
SERVICE_ID="your_service_id"
curl -X POST http://localhost:4000/admin/service-variants/initialize/$SERVICE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"template":"standard"}'
```

### 第二步：驗證規格

```bash
# 查看服務規格
curl http://localhost:4000/admin/service-variants/service/$SERVICE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

應該會看到：
```json
{
  "size": [
    { "name": "5-6cm", "priceModifier": 2000, ... },
    { "name": "6-7cm", "priceModifier": 3000, ... },
    ...
  ],
  "color": [
    { "name": "黑白", "priceModifier": 0, ... },
    { "name": "彩色", "priceModifier": 1000, ... }
  ],
  "position": [...],
  "design_fee": [
    { 
      "name": "設計費", 
      "priceModifier": 0,
      "metadata": { "isCustomPrice": true, "displayText": "另外估價" }
    }
  ]
}
```

### 第三步：測試價格計算

運行測試腳本：

```bash
./test-new-pricing.sh
```

或手動測試：

```bash
# 測試 1: 5-6cm 黑白 (預期: 2000元)
curl -X POST http://localhost:4000/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'$SERVICE_ID'",
    "selectedVariants":{
      "size":"5-6cm",
      "color":"黑白"
    }
  }' | jq '.items[-1].finalPrice'

# 測試 2: 10-11cm 彩色 (預期: 8000元)
curl -X POST http://localhost:4000/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'$SERVICE_ID'",
    "selectedVariants":{
      "size":"10-11cm",
      "color":"彩色"
    }
  }' | jq '.items[-1].finalPrice'

# 測試 3: 16-17cm 彩色 (預期: 14000元，特殊情況)
curl -X POST http://localhost:4000/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'$SERVICE_ID'",
    "selectedVariants":{
      "size":"16-17cm",
      "color":"彩色"
    }
  }' | jq '.items[-1].finalPrice'

# 測試 4: 包含設計費 (預期: 8000 + 3000 = 11000元)
curl -X POST http://localhost:4000/cart/items \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"'$SERVICE_ID'",
    "selectedVariants":{
      "size":"10-11cm",
      "color":"彩色",
      "design_fee": 3000
    }
  }' | jq '.items[-1] | {size: .selectedVariants.size, color: .selectedVariants.color, designFee: .selectedVariants.design_fee, finalPrice}'
```

---

## 🎯 前端集成

### 顧客端 - 選擇規格

```typescript
// 1. 獲取服務規格
const variants = await fetch(`/admin/service-variants/service/${serviceId}`)
  .then(res => res.json());

// 2. 顯示尺寸選項
variants.size.map(v => ({
  label: v.name,  // "5-6cm"
  value: v.name,
  description: v.description  // "5-6cm（黑白2000/彩色3000）"
}))

// 3. 顯示顏色選項
variants.color.map(v => ({
  label: v.name,  // "黑白" / "彩色"
  value: v.name
}))

// 4. 顯示設計費（如果有）
if (variants.design_fee && variants.design_fee.length > 0) {
  const designFee = variants.design_fee[0];
  // 顯示: "設計費: 另外估價"
  displayText = designFee.metadata?.displayText || "設計費";
}

// 5. 用戶選擇後，即時計算價格
function calculatePrice(size: string, color: string) {
  const sizeVariant = variants.size.find(v => v.name === size);
  const colorVariant = variants.color.find(v => v.name === color);
  
  let price = sizeVariant.priceModifier;
  
  // 特殊情況：16-17cm + 彩色 不加價
  if (size === '16-17cm' && color === '彩色') {
    // 不加 colorVariant.priceModifier
  } else {
    price += colorVariant.priceModifier;
  }
  
  return price;
}

// 6. 加入購物車
await fetch('/cart/items', {
  method: 'POST',
  body: JSON.stringify({
    serviceId,
    selectedVariants: {
      size: selectedSize,
      color: selectedColor,
      design_fee: undefined  // 顧客端不輸入設計費
    }
  })
});
```

### 管理後台 - 輸入設計費

```typescript
// 管理後台創建/修改訂單時
<FormField label="設計費">
  <Input 
    type="number"
    placeholder="輸入設計費（元）"
    value={designFee}
    onChange={(e) => setDesignFee(Number(e.target.value))}
  />
</FormField>

// 保存時
selectedVariants.design_fee = designFee || 0;
```

---

## 📋 API 文檔

### 規格管理 API

#### POST /admin/service-variants/initialize/:serviceId

初始化服務規格（需要管理員權限）

**Request:**
```json
{
  "template": "standard"  // basic | standard | advanced | full
}
```

**Response:**
```json
{
  "success": true,
  "message": "已使用 standard 模板創建 19 個規格",
  "count": 19
}
```

**模板說明：**
- `basic`: 前6個尺寸（5-11cm）+ 2種顏色
- `standard`: 12個尺寸 + 2種顏色 + 6個部位 + 設計費
- `advanced`: standard + 風格 + 複雜度
- `full`: 所有規格

#### GET /admin/service-variants/service/:serviceId

獲取服務的所有規格

**Response:**
```json
{
  "size": [...],
  "color": [...],
  "position": [...],
  "design_fee": [...]
}
```

### 購物車 API

#### POST /cart/items

加入購物車

**Request:**
```json
{
  "serviceId": "xxx",
  "selectedVariants": {
    "size": "10-11cm",
    "color": "彩色",
    "position": "手臂外側",    // 可選
    "design_fee": 3000        // 可選（自訂價格）
  },
  "notes": "備註"             // 可選
}
```

**Response:**
```json
{
  "id": "cart_xxx",
  "items": [{
    "id": "item_xxx",
    "serviceName": "上下手臂全肢",
    "selectedVariants": {
      "size": "10-11cm",
      "color": "彩色",
      "design_fee": 3000
    },
    "basePrice": 60000,
    "finalPrice": 11000,      // 8000 + 3000
    "estimatedDuration": 190  // 分鐘
  }],
  "totalPrice": 11000,
  "totalDuration": 190
}
```

---

## 🔧 管理後台操作

### 為現有服務添加規格

1. **進入服務管理頁面**
2. **選擇要設定規格的服務**
3. **點擊「規格管理」**
4. **選擇模板或手動添加：**
   - 快速設定：點擊「一鍵初始化」→ 選擇模板
   - 手動設定：逐個添加規格

### 調整規格價格

1. **進入規格列表**
2. **找到要修改的規格**
3. **修改 priceModifier（價格）**
4. **修改 durationModifier（時長）**
5. **保存**

### 停用特定規格

某些商品不需要某些規格時：

1. **進入規格管理**
2. **找到要停用的規格**
3. **將 isActive 設為 false**
4. **保存**

前端查詢時只會獲取 `isActive: true` 的規格。

---

## ⚠️ 注意事項

### 1. 特殊價格規則

**16-17cm 彩色** 是唯一不加價的組合：
- 16-17cm 黑白：14000元
- 16-17cm 彩色：14000元（不是 15000元）

這個規則已硬編碼在價格計算邏輯中。

### 2. 設計費處理

- 顧客端：只顯示「另外估價」，不輸入具體金額
- 管理後台：BOSS/店長/刺青師可以在創建訂單時輸入
- 訂單確認後：設計費包含在總價中

### 3. 舊數據遷移

如果系統中有舊的價格數據：
1. 舊服務不受影響（hasVariants = false）
2. 新規格系統是可選的
3. 可以逐步為服務添加規格

### 4. 價格顯示

前端應該顯示：
- 單獨顯示各規格的價格
- 即時計算並顯示最終價格
- 購物車中顯示明細

---

## 🐛 故障排除

### Q: 購物車價格顯示 0 元？

**A:** 服務還沒有初始化規格。

**解決方法：**
1. 確認服務的 `hasVariants` 是否為 `true`
2. 使用管理員 Token 初始化規格
3. 重新加入購物車測試

### Q: 16-17cm 彩色價格不對？

**A:** 檢查是否正確處理特殊情況。

**解決方法：**
查看價格計算邏輯中的特殊判斷：
```typescript
if (selectedVariants.size === '16-17cm' && selectedVariants.color === '彩色') {
  colorPrice = 0;  // 不加價
}
```

### Q: 設計費沒有生效？

**A:** 檢查 selectedVariants 中是否包含 design_fee。

**解決方法：**
```typescript
selectedVariants: {
  size: "10-11cm",
  color: "彩色",
  design_fee: 3000  // ← 確保這個欄位存在且為數字
}
```

---

## 📈 後續優化建議

### 短期

- [ ] 前端規格選擇器 UI
- [ ] 管理後台規格管理界面
- [ ] 價格預覽功能
- [ ] 設計費輸入表單

### 中期

- [ ] 規格組合優惠
- [ ] 批量價格調整工具
- [ ] 價格歷史記錄
- [ ] 動態定價規則

### 長期

- [ ] AI 價格建議
- [ ] 季節性定價
- [ ] 會員專屬價格
- [ ] 促銷活動系統

---

## 📞 支持

如有問題，請查看：
- `CART_SYSTEM_IMPLEMENTATION.md` - 購物車系統總覽
- `VARIANT_MANAGEMENT_STRATEGY.md` - 規格管理策略
- `CART_SYSTEM_TEST_REPORT.md` - 測試報告

---

**文檔版本：** v2.0  
**最後更新：** 2025-11-04  
**作者：** AI Assistant

