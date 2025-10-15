# 🎨 分期付款管理介面優化

## 📋 需求說明

管理後台-管理訂單中的分期付款管理功能，需要三項 UI/UX 改善：

1. 分期付款明細列表的排序問題
2. 調整分期金額視窗的可輸入範圍顯示邏輯
3. 錯誤訊息的顯示位置優化

---

## ✅ 修正內容

### 1. 分期付款明細列表：固定按期別排序

**問題**: 
- 記錄付款後，分期列表的順序可能改變
- 使用者難以按期別順序查看分期狀態

**修正前**:
```typescript
{order.installments.map((installment) => (
  // 直接映射，沒有排序
))}
```

**修正後**:
```typescript
{/* ✅ 固定按期別排序 */}
{[...order.installments]
  .sort((a, b) => a.installmentNo - b.installmentNo)
  .map((installment) => (
    // ...
  ))}
```

**效果**:
- ✅ 始終按第1期、第2期、第3期...順序顯示
- ✅ 記錄付款後排序不會改變
- ✅ 更符合使用者的預期和閱讀習慣

---

### 2. 調整分期金額視窗：動態計算可輸入範圍

**問題**:
- 原本的可輸入範圍計算邏輯不夠精確
- 沒有考慮「無其他可調整分期」的特殊情況
- 提示訊息位置不明顯

**修正前**:
```typescript
<Input ... />
{selectedInstallment && (
  <div className="text-xs text-gray-500">
    可輸入範圍：0 ~ {formatCurrency(
      // 簡化的計算邏輯
    )}
  </div>
)}
```

**修正後**:
```typescript
{/* ✅ 動態計算可輸入範圍 */}
{selectedInstallment && (() => {
  const paidSum = order.installments
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0);
  
  const lockedUnpaidSum = order.installments
    .filter(i => 
      i.installmentNo !== selectedInstallment.installmentNo && 
      i.status !== 'PAID' && 
      i.isCustom === true
    )
    .reduce((sum, i) => sum + i.amount, 0);
  
  const maxAllowed = order.finalAmount - paidSum - lockedUnpaidSum;
  
  const adjustableCount = order.installments.filter(
    i => 
      i.installmentNo !== selectedInstallment.installmentNo &&
      i.status !== 'PAID' &&
      i.isCustom !== true
  ).length;

  return (
    <div className="text-xs text-gray-500 mb-2">
      可輸入範圍：1 ~ {formatCurrency(maxAllowed)}
      {adjustableCount === 0 && (
        <span className="text-orange-600 font-medium ml-2">
          ⚠️ 必須剛好為 {formatCurrency(maxAllowed)}（無其他可調整分期）
        </span>
      )}
    </div>
  );
})()}
<Input ... />
```

**效果**:
- ✅ 提示訊息移到輸入欄位**上方**（標題下方、輸入框上方）
- ✅ 精確計算最大可輸入金額 = 訂單總額 - 已付款 - 其他鎖定未付款
- ✅ 當無其他可調整分期時，顯示特殊警告
- ✅ 使用者在輸入前就能清楚看到限制

---

### 3. 調整分期金額視窗：錯誤訊息位置優化

**問題**:
- 原本錯誤訊息顯示在「分期付款明細」Card 的 Header 中
- 位置不明顯，與錯誤來源（調整金額視窗）分離

**修正前**:
```typescript
{/* 在 CardHeader 中 */}
<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <CardTitle>分期付款明細</CardTitle>
  {errorMessage && (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 ...">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm font-medium">{errorMessage}</span>
    </div>
  )}
</CardHeader>

{/* 調整金額視窗 */}
<div className="space-y-2">
  <Label htmlFor="new-amount">新金額</Label>
  <Input ... />
</div>
```

**修正後**:
```typescript
{/* CardHeader 簡化 */}
<CardHeader>
  <CardTitle className="flex items-center gap-2">
    <Calendar className="h-5 w-5" />
    分期付款明細
  </CardTitle>
</CardHeader>

{/* 調整金額視窗 - 錯誤訊息直接顯示在標題右側 */}
<div className="space-y-2">
  {/* ✅ 錯誤訊息顯示在「新金額」標題的右側 */}
  <div className="flex items-center justify-between">
    <Label htmlFor="new-amount">新金額</Label>
    {errorMessage && (
      <div className="flex items-center gap-1 text-red-600 animate-pulse">
        <AlertCircle className="h-3 w-3" />
        <span className="text-xs font-medium">{errorMessage}</span>
      </div>
    )}
  </div>
  
  {/* 可輸入範圍提示 */}
  <div className="text-xs text-gray-500 mb-2">
    可輸入範圍：1 ~ XX,XXX 元
  </div>
  
  <Input ... />
</div>
```

**效果**:
- ✅ 錯誤訊息緊鄰相關的輸入欄位
- ✅ 視覺上更清晰，使用者立即知道哪裡出錯
- ✅ 使用較小的圖示 (`h-3 w-3`) 和文字 (`text-xs`)，不佔用太多空間
- ✅ 保持紅色警告樣式 + 動畫效果

---

## 📊 視覺效果對比

### 修正前 - 調整金額視窗

```
┌─────────────────────────────────────┐
│ 調整分期金額                          │
├─────────────────────────────────────┤
│ 第2期                                │
│ 原金額：10,000 元                     │
│                                     │
│ 訂單總額：30,000 元                   │
│ 已付款：10,000 元                     │
│ ...                                 │
│                                     │
│ 新金額                               │
│ [_____________]                     │
│ 可輸入範圍：0 ~ 20,000 元             │  ← 在輸入欄位下方
│                                     │
│ ⚠️ 注意：調整此期金額後...            │
│                                     │
│            [取消] [確認調整]         │
└─────────────────────────────────────┘
```

### 修正後 - 調整金額視窗

```
┌─────────────────────────────────────┐
│ 調整分期金額                          │
├─────────────────────────────────────┤
│ 第2期                                │
│ 原金額：10,000 元                     │
│                                     │
│ 訂單總額：30,000 元                   │
│ 已付款：10,000 元                     │
│ ...                                 │
│                                     │
│ 新金額        ⚠️ 請輸入有效的整數金額  │  ← 錯誤訊息在標題右側
│ 可輸入範圍：1 ~ 20,000 元             │  ← 提示在輸入框上方
│ [_____________]                     │
│                                     │
│ ⚠️ 注意：調整此期金額後...            │
│                                     │
│            [取消] [確認調整]         │
└─────────────────────────────────────┘
```

### 特殊情況：無其他可調整分期

```
┌─────────────────────────────────────┐
│ 調整分期金額                          │
├─────────────────────────────────────┤
│ 第3期（最後一期未付款）                │
│ 原金額：10,000 元                     │
│                                     │
│ 訂單總額：30,000 元                   │
│ 已付款：20,000 元（第1期+第2期）       │
│ ...                                 │
│                                     │
│ 新金額                               │
│ 可輸入範圍：1 ~ 10,000 元             │
│ ⚠️ 必須剛好為 10,000 元（無其他可調整分期） │  ← 特殊警告
│ [_____________]                     │
│                                     │
│ ⚠️ 注意：調整此期金額後...            │
│                                     │
│            [取消] [確認調整]         │
└─────────────────────────────────────┘
```

---

## 🧮 可輸入範圍計算邏輯

### 計算公式

```
maxAllowed = 訂單總額 - 已付款金額 - 其他鎖定未付款金額
```

### 詳細說明

1. **訂單總額** (`order.finalAmount`)
   - 訂單的最終金額

2. **已付款金額** (`paidSum`)
   - 所有 `status === 'PAID'` 的分期金額總和

3. **其他鎖定未付款金額** (`lockedUnpaidSum`)
   - 排除當前編輯的期別
   - 只計算 `status !== 'PAID'` 的分期
   - 只計算 `isCustom === true` 的分期（已手動鎖定）

4. **可調整分期數量** (`adjustableCount`)
   - 排除當前編輯的期別
   - 排除已付款的分期
   - 排除已手動鎖定的分期

### 範例 1：有其他可調整分期

```
訂單：總額 30,000 元，3期

狀態：
- 第1期：10,000 元 (已付款)
- 第2期：10,000 元 (未付款，正在編輯) ← 當前編輯
- 第3期：10,000 元 (未付款，可調整)

計算：
- paidSum = 10,000
- lockedUnpaidSum = 0（第3期沒有被鎖定）
- maxAllowed = 30,000 - 10,000 - 0 = 20,000 元
- adjustableCount = 1（第3期）

顯示：
「可輸入範圍：1 ~ 20,000 元」

邏輯：
- 如果輸入 15,000 元
  → 第2期 = 15,000 元
  → 第3期自動調整為 5,000 元 (20,000 - 15,000)
```

### 範例 2：無其他可調整分期

```
訂單：總額 30,000 元，3期

狀態：
- 第1期：10,000 元 (已付款)
- 第2期：15,000 元 (已付款)
- 第3期：5,000 元 (未付款，正在編輯) ← 當前編輯

計算：
- paidSum = 25,000
- lockedUnpaidSum = 0
- maxAllowed = 30,000 - 25,000 - 0 = 5,000 元
- adjustableCount = 0（沒有其他可調整的分期）

顯示：
「可輸入範圍：1 ~ 5,000 元
 ⚠️ 必須剛好為 5,000 元（無其他可調整分期）」

邏輯：
- 只能輸入 5,000 元
- 輸入其他金額會導致後端錯誤
```

### 範例 3：有其他鎖定分期

```
訂單：總額 30,000 元，4期

狀態：
- 第1期：10,000 元 (已付款)
- 第2期：8,000 元 (未付款，正在編輯) ← 當前編輯
- 第3期：7,000 元 (未付款，isCustom=true，已鎖定)
- 第4期：5,000 元 (未付款，可調整)

計算：
- paidSum = 10,000
- lockedUnpaidSum = 7,000（第3期已鎖定）
- maxAllowed = 30,000 - 10,000 - 7,000 = 13,000 元
- adjustableCount = 1（第4期）

顯示：
「可輸入範圍：1 ~ 13,000 元」

邏輯：
- 如果輸入 8,000 元
  → 第2期 = 8,000 元
  → 第3期 = 7,000 元（保持不變，已鎖定）
  → 第4期自動調整為 5,000 元 (13,000 - 8,000)
- 如果輸入 10,000 元
  → 第2期 = 10,000 元
  → 第3期 = 7,000 元（保持不變，已鎖定）
  → 第4期自動調整為 3,000 元 (13,000 - 10,000)
```

---

## 🚀 部署狀態

### Git 提交
```bash
[main 81f1a35] fix: Improve installment manager UI/UX
 1 file changed, 39 insertions(+), 20 deletions(-)
```

### 推送狀態
```bash
To github.com:artherslin-source/tattoo-crm.git
   92fedbe..81f1a35  main -> main
✅ 成功推送
```

### Railway 自動部署
- 🔄 前端服務正在重新部署
- ⏱️ 預計 2-3 分鐘內完成

---

## ✅ 驗證清單

### 1. 分期列表排序驗證

- [ ] 進入管理訂單，選擇一個分期訂單
- [ ] 確認分期列表按第1期、第2期、第3期...順序顯示
- [ ] 記錄某一期的付款
- [ ] 確認排序**沒有改變**，仍然按期別順序顯示

### 2. 可輸入範圍提示驗證

**測試案例 A：有其他可調整分期**
- [ ] 選擇一個有多期未付款的訂單
- [ ] 點擊「調整金額」按鈕
- [ ] 確認顯示「可輸入範圍：1 ~ XX,XXX 元」
- [ ] 確認提示訊息在輸入欄位**上方**（標題下方）
- [ ] **不顯示**「必須剛好為...」的警告

**測試案例 B：無其他可調整分期**
- [ ] 選擇一個只剩最後一期未付款的訂單
- [ ] 點擊「調整金額」按鈕
- [ ] 確認顯示「可輸入範圍：1 ~ XX,XXX 元」
- [ ] 確認**額外顯示**橘色警告「⚠️ 必須剛好為 XX,XXX 元（無其他可調整分期）」

### 3. 錯誤訊息位置驗證

- [ ] 在調整金額視窗中輸入無效金額（如 0 或超過範圍）
- [ ] 點擊「確認調整」
- [ ] 確認錯誤訊息顯示在「新金額」標題的**右側**
- [ ] 確認錯誤訊息為紅色 + 動畫效果
- [ ] 確認分期付款明細的 CardHeader 中**沒有**錯誤訊息

---

## 📝 技術細節

### 排序實現

使用陣列的 `sort()` 方法：
```typescript
[...order.installments].sort((a, b) => a.installmentNo - b.installmentNo)
```

**注意**：使用展開運算符 `[...]` 創建新陣列，避免直接修改原陣列。

### IIFE（立即執行函數表達式）

使用 IIFE 在 JSX 中進行複雜計算：
```typescript
{selectedInstallment && (() => {
  const paidSum = ...;
  const lockedUnpaidSum = ...;
  const maxAllowed = ...;
  
  return (
    <div>...</div>
  );
})()}
```

**優點**：
- 避免在組件層級創建過多的計算變數
- 保持計算邏輯與顯示邏輯接近
- 更容易理解和維護

### 條件樣式

使用條件渲染顯示特殊警告：
```typescript
{adjustableCount === 0 && (
  <span className="text-orange-600 font-medium ml-2">
    ⚠️ 必須剛好為 {formatCurrency(maxAllowed)}（無其他可調整分期）
  </span>
)}
```

---

## 🔗 相關文檔

- **[INSTALLMENT_LOGIC_FIXES.md](./INSTALLMENT_LOGIC_FIXES.md)** - 分期調整邏輯修正
- **[INSTALLMENT_PAYMENT_STATS_FIX.md](./INSTALLMENT_PAYMENT_STATS_FIX.md)** - 分期付款統計修正
- **[PROFESSIONAL_AUDIT_RESPONSE.md](./PROFESSIONAL_AUDIT_RESPONSE.md)** - 專業審計回應

---

## 📊 總結

### 修正前
- ❌ 分期列表排序不穩定，記錄付款後可能改變順序
- ❌ 可輸入範圍提示不夠精準，沒有考慮特殊情況
- ❌ 錯誤訊息位置不明顯，與錯誤來源分離

### 修正後
- ✅ 分期列表始終按期別順序顯示，穩定可預測
- ✅ 可輸入範圍動態計算，精準提示，特殊情況有警告
- ✅ 錯誤訊息顯示在相關欄位旁邊，視覺上更清晰
- ✅ 整體 UI/UX 更加直觀和友好

---

**修正日期**: 2025-10-14  
**版本**: 1.0.0  
**狀態**: ✅ 已完成並推送

🎉 **UI/UX 優化完成！分期付款管理介面更加直觀和易用！**
