# 服務規格管理策略

## 🎯 核心概念

### 靈活的規格系統設計

每個服務可以有**獨立的規格配置**，不同服務可以有不同的規格組合。

### 為什麼不會造成數據庫錯誤？

1. **關聯性設計**：規格通過 `serviceId` 與服務關聯，每個服務的規格是獨立的
2. **類型隔離**：規格按 `type` 分類，不會相互干擾
3. **啟用控制**：`isActive` 可以動態控制規格的顯示/隱藏
4. **級聯刪除**：刪除服務時，相關規格自動刪除（`onDelete: Cascade`）

## 📊 擴展的規格模型

### 新增字段

```prisma
model ServiceVariant {
  // 原有字段
  id, serviceId, type, name, code
  priceModifier, durationModifier, sortOrder
  
  // 新增字段 ⭐
  description      String?  // 規格說明
  isActive         Boolean  // 是否啟用（控制顯示/隱藏）
  isRequired       Boolean  // 是否必選
  icon             String?  // 圖示（UI 用）
  metadata         Json?    // 額外數據（任意擴展）
}
```

## 🎨 規格類型擴展建議

### 1. 基礎規格（已實作）

#### 尺寸（Size）
```typescript
[
  { name: "5x5cm", code: "XS", priceModifier: 0, isRequired: true },
  { name: "10x10cm", code: "S", priceModifier: 1000, isRequired: true },
  { name: "15x15cm", code: "M", priceModifier: 2000, isRequired: true },
  { name: "20x20cm", code: "L", priceModifier: 3000, isRequired: true },
  { name: "30x30cm", code: "XL", priceModifier: 5000, isRequired: true },
  { name: "滿背", code: "XXL", priceModifier: 15000, isRequired: true },
]
```

#### 顏色（Color）
```typescript
[
  { name: "割線", code: "A", priceModifier: 0, isRequired: true },
  { name: "黑白", code: "B", priceModifier: 500, isRequired: true },
  { name: "半彩", code: "C", priceModifier: 1000, isRequired: true },
  { name: "全彩", code: "D", priceModifier: 1500, isRequired: true },
]
```

#### 部位（Position）
```typescript
[
  { name: "手臂外側", code: "P1", priceModifier: 0, isRequired: false },
  { name: "手臂內側", code: "P2", priceModifier: 200, isRequired: false },
  { name: "小腿", code: "P3", priceModifier: 0, isRequired: false },
  { name: "大腿", code: "P4", priceModifier: 500, isRequired: false },
  { name: "背部", code: "P5", priceModifier: 1000, isRequired: false },
  { name: "胸部", code: "P6", priceModifier: 800, isRequired: false },
  { name: "腰部", code: "P7", priceModifier: 600, isRequired: false },
  { name: "肩膀", code: "P8", priceModifier: 400, isRequired: false },
]
```

### 2. 進階規格（新增）

#### 風格（Style）
```typescript
[
  { name: "傳統", code: "S1", priceModifier: 0, description: "經典傳統刺青風格" },
  { name: "寫實", code: "S2", priceModifier: 1500, description: "超寫實風格" },
  { name: "圖騰", code: "S3", priceModifier: 500, description: "部落圖騰" },
  { name: "日式", code: "S4", priceModifier: 1000, description: "日本傳統" },
  { name: "歐美", code: "S5", priceModifier: 1200, description: "歐美風格" },
  { name: "水墨", code: "S6", priceModifier: 1300, description: "中國水墨" },
  { name: "極簡", code: "S7", priceModifier: 800, description: "極簡線條" },
]
```

#### 複雜度（Complexity）
```typescript
[
  { name: "簡單", code: "C1", priceModifier: 0, durationModifier: 0 },
  { name: "中等", code: "C2", priceModifier: 1000, durationModifier: 30 },
  { name: "複雜", code: "C3", priceModifier: 2500, durationModifier: 60 },
  { name: "極度複雜", code: "C4", priceModifier: 5000, durationModifier: 120 },
]
```

#### 技法（Technique）
```typescript
[
  { name: "單針", code: "T1", priceModifier: 500, description: "單針精細" },
  { name: "點刺", code: "T2", priceModifier: 800, description: "點刺技法" },
  { name: "陰影", code: "T3", priceModifier: 600, description: "漸層陰影" },
  { name: "潑墨", code: "T4", priceModifier: 1000, description: "水墨潑墨" },
]
```

#### 圖案類型（Pattern）
```typescript
[
  { name: "動物", code: "PT1", priceModifier: 0 },
  { name: "花卉", code: "PT2", priceModifier: 0 },
  { name: "幾何", code: "PT3", priceModifier: 200 },
  { name: "文字", code: "PT4", priceModifier: -500 },
  { name: "肖像", code: "PT5", priceModifier: 3000 },
  { name: "抽象", code: "PT6", priceModifier: 1500 },
]
```

#### 客製化選項（Custom）
```typescript
[
  { name: "加急服務", code: "CU1", priceModifier: 2000, description: "7天內完成" },
  { name: "指定刺青師", code: "CU2", priceModifier: 1000, description: "指定特定刺青師" },
  { name: "修改圖稿", code: "CU3", priceModifier: 500, description: "免費修改1次圖稿" },
  { name: "提供設計", code: "CU4", priceModifier: 1500, description: "由刺青師設計圖案" },
]
```

## 🛠️ 使用場景範例

### 場景 1：小型圖騰刺青

**服務名稱：** 小型圖騰  
**基礎價格：** 3000 元

**啟用的規格：**
- ✅ 尺寸：5x5cm、10x10cm
- ✅ 顏色：割線、黑白
- ✅ 部位：手臂外側、小腿、肩膀
- ❌ 風格：隱藏（不提供選擇）
- ❌ 複雜度：隱藏

**前端顯示：** 用戶只會看到 3 個選項（尺寸、顏色、部位）

---

### 場景 2：客製化大型刺青

**服務名稱：** 客製化大型刺青  
**基礎價格：** 15000 元

**啟用的規格：**
- ✅ 尺寸：15x15cm、20x20cm、30x30cm、滿背
- ✅ 顏色：全部啟用
- ✅ 部位：全部啟用
- ✅ 風格：全部啟用
- ✅ 複雜度：全部啟用
- ✅ 技法：全部啟用
- ✅ 客製化選項：指定刺青師、提供設計

**前端顯示：** 用戶會看到完整的規格選項

---

### 場景 3：文字刺青

**服務名稱：** 文字刺青  
**基礎價格：** 1500 元

**啟用的規格：**
- ✅ 尺寸：5x5cm、10x10cm（限制小尺寸）
- ✅ 顏色：割線、黑白（不提供彩色）
- ✅ 部位：全部啟用
- ❌ 風格：隱藏
- ❌ 複雜度：隱藏（文字統一簡單）
- ✅ 圖案類型：僅顯示「文字」

**前端顯示：** 簡化的選項，適合文字刺青

## 🔄 規格管理流程

### 1. 創建服務時

```typescript
// Step 1: 創建服務
POST /admin/services
{
  "name": "小型圖騰刺青",
  "price": 3000,
  "durationMin": 120,
  "hasVariants": false  // 先創建服務
}

// Step 2: 初始化默認規格
POST /admin/service-variants/initialize/{serviceId}

// Step 3: 調整規格（隱藏不需要的）
PATCH /admin/service-variants/{variantId}
{
  "isActive": false  // 隱藏此規格
}
```

### 2. 針對特定商品調整

```typescript
// 禁用某個規格（例如：此商品不提供「滿背」尺寸）
PATCH /admin/service-variants/{variantId}
{
  "isActive": false
}

// 設定必選項
PATCH /admin/service-variants/{variantId}
{
  "isRequired": true
}

// 調整價格
PATCH /admin/service-variants/{variantId}
{
  "priceModifier": 2000
}
```

### 3. 批量管理

```typescript
// 批量創建規格
POST /admin/service-variants/batch/{serviceId}
{
  "variants": [
    { "type": "size", "name": "5x5cm", "priceModifier": 0 },
    { "type": "size", "name": "10x10cm", "priceModifier": 1000 },
    { "type": "color", "name": "割線A", "priceModifier": 0 },
    { "type": "color", "name": "黑白B", "priceModifier": 500 }
  ]
}
```

## 🎯 管理後台 UI 建議

### 服務編輯頁面

```
┌─────────────────────────────────────┐
│ 服務資訊                            │
├─────────────────────────────────────┤
│ 服務名稱: 小型圖騰刺青              │
│ 基礎價格: 3000 元                   │
│ 基礎時長: 120 分鐘                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 規格管理 📐                         │
├─────────────────────────────────────┤
│                                     │
│ [🎯 一鍵初始化默認規格]             │
│                                     │
│ 🔹 尺寸 (Size)                      │
│   ☑ 5x5cm      (+0元)    [啟用]    │
│   ☑ 10x10cm    (+1000元) [啟用]    │
│   ☐ 15x15cm    (+2000元) [停用]    │
│   ☐ 20x20cm    (+3000元) [停用]    │
│   [+ 新增尺寸]                      │
│                                     │
│ 🎨 顏色 (Color)                     │
│   ☑ 割線A      (+0元)    [啟用] ⭐  │
│   ☑ 黑白B      (+500元)  [啟用]    │
│   ☐ 半彩C      (+1000元) [停用]    │
│   ☐ 全彩D      (+1500元) [停用]    │
│   [+ 新增顏色]                      │
│                                     │
│ 📍 部位 (Position)                  │
│   ☑ 手臂外側   (+0元)    [啟用]    │
│   ☑ 小腿       (+0元)    [啟用]    │
│   ☐ 背部       (+1000元) [停用]    │
│   [+ 新增部位]                      │
│                                     │
│ 🎭 風格 (Style) - 全部停用          │
│   [+ 新增風格]                      │
│                                     │
└─────────────────────────────────────┘

註：⭐ 表示必選項
```

### 規格模板功能

**預設模板：**
```
1. 基礎模板      - 尺寸 + 顏色
2. 標準模板      - 尺寸 + 顏色 + 部位
3. 進階模板      - 尺寸 + 顏色 + 部位 + 風格 + 複雜度
4. 完整模板      - 所有規格
5. 文字專用模板  - 小尺寸 + 單色 + 部位
6. 自訂模板      - 店家自行設定
```

## 📊 數據庫查詢優化

### 獲取服務的啟用規格

```typescript
// 前端只獲取啟用的規格
const variants = await prisma.serviceVariant.findMany({
  where: {
    serviceId: 'xxx',
    isActive: true,  // 只取啟用的
  },
  orderBy: [
    { type: 'asc' },
    { sortOrder: 'asc' },
  ],
});

// 分組返回
const grouped = {
  size: variants.filter(v => v.type === 'size' && v.isRequired),
  color: variants.filter(v => v.type === 'color' && v.isRequired),
  position: variants.filter(v => v.type === 'position'),
  style: variants.filter(v => v.type === 'style'),
  complexity: variants.filter(v => v.type === 'complexity'),
};
```

### 驗證規格選擇

```typescript
// 後端驗證：確保用戶選擇了所有必選項
function validateVariants(selectedVariants, serviceVariants) {
  const requiredTypes = serviceVariants
    .filter(v => v.isRequired)
    .map(v => v.type);
  
  const selectedTypes = Object.keys(selectedVariants);
  
  const missingTypes = requiredTypes.filter(
    type => !selectedTypes.includes(type)
  );
  
  if (missingTypes.length > 0) {
    throw new Error(`缺少必選規格: ${missingTypes.join(', ')}`);
  }
}
```

## 🚀 實作步驟

### 階段 1：基礎規格（已完成）
- ✅ 尺寸、顏色、部位

### 階段 2：進階規格（建議實作）
- [ ] 風格（Style）
- [ ] 複雜度（Complexity）
- [ ] 技法（Technique）

### 階段 3：規格模板系統
- [ ] 預設模板
- [ ] 快速套用模板
- [ ] 模板管理

### 階段 4：批量管理工具
- [ ] 批量啟用/停用
- [ ] 批量價格調整
- [ ] 批量複製規格到其他服務

## 💡 最佳實踐

### 1. 規格命名規範
- **統一格式**：`[類型][編號] - [名稱]`
- **例如**：`SIZE-001 - 5x5cm`、`COLOR-A - 割線`

### 2. 價格策略
- **基礎服務**：設定最低配置的價格
- **規格加價**：使用 `priceModifier` 調整
- **組合優惠**：在 metadata 中設定組合規則

### 3. 數據完整性
- **級聯刪除**：刪除服務時自動刪除規格
- **軟刪除**：使用 `isActive` 而非真正刪除
- **歷史記錄**：保留規格變更歷史（可選）

### 4. 前端用戶體驗
- **必選項優先**：將必選規格放在前面
- **智能推薦**：根據用戶選擇推薦相關規格
- **即時計算**：選擇時立即顯示總價

## ❓ 常見問題

### Q: 如果服務沒有規格會怎樣？
**A:** 系統會將 `hasVariants` 設為 `false`，用戶直接加入購物車，無需選擇規格。

### Q: 可以動態新增規格類型嗎？
**A:** 可以！`type` 字段是字串，可以自由設定新的類型（如 `warranty`、`packaging` 等）。

### Q: 規格太多會影響性能嗎？
**A:** 不會。有索引優化，且前端只查詢 `isActive: true` 的規格。

### Q: 可以複製規格到其他服務嗎？
**A:** 可以實作「複製規格」功能，將一個服務的規格批量複製到另一個服務。

## 🎓 總結

**這套規格系統的優勢：**

1. ✅ **靈活擴展** - 可以無限新增規格類型
2. ✅ **商品獨立** - 每個商品有獨立的規格配置
3. ✅ **動態控制** - 隨時啟用/停用規格
4. ✅ **不會錯誤** - 資料結構設計避免衝突
5. ✅ **易於管理** - 管理後台直觀操作
6. ✅ **性能優化** - 索引和查詢優化

**不會造成數據庫錯誤的原因：**
- 使用外鍵約束確保數據完整性
- 級聯刪除自動清理關聯數據
- 索引優化查詢性能
- 分層設計避免數據衝突

---

**文檔版本：** v1.0  
**更新日期：** 2025-11-04

