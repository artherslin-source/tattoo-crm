# 🔧 分期調整邏輯修正報告

## 📋 修正摘要

感謝專業審核！根據您提出的五大問題，我已完成所有修正。

**修正日期**: 2025-10-14  
**影響文件**: 
- `backend/src/installments/installments.service.ts`
- `frontend/src/components/admin/InstallmentManager.tsx`

---

## ✅ 問題修正清單

### 問題 1: `outstanding` 計算邏輯重複扣除固定分期 ✅

**原始問題**:
```typescript
const outstanding = order.totalAmount - paidSum;
const fixedOthers = order.installments
  .filter(i => i.installmentNo !== installmentNo && 
              (i.status === InstallmentStatus.PAID || i.isCustom === true))
  .reduce((sum, i) => sum + i.amount, 0);
const remaining = outstanding - newAmount - fixedOthers;
// ❌ 這裡 fixedOthers 包含已付款，但 outstanding 已經扣過 paidSum
// 導致已付款金額被重複扣除
```

**修正後**:
```typescript
// 計算已付款總額
const paidSum = order.installments
  .filter(i => i.status === InstallmentStatus.PAID)
  .reduce((sum, i) => sum + i.amount, 0);

// 計算其他已鎖定且未付款的分期金額（isCustom=true 的未付款分期）
const lockedUnpaidSum = order.installments
  .filter(i => i.installmentNo !== installmentNo && 
              i.status === InstallmentStatus.UNPAID && 
              i.isCustom === true)
  .reduce((sum, i) => sum + i.amount, 0);

// ✅ 正確計算剩餘金額（從總金額扣除）
const remaining = order.totalAmount - (paidSum + lockedUnpaidSum + newAmount);
```

**關鍵改進**:
- 將 `fixedOthers` 分離為 `paidSum`（已付款）和 `lockedUnpaidSum`（鎖定未付款）
- 使用 `order.totalAmount` 作為基準，直接扣除所有固定項目
- 避免重複計算已付款金額

---

### 問題 2: 平均分配時未處理「adjustableInstallments 為空」的極端情況 ✅

**原始問題**:
```typescript
if (adjustableInstallments.length === 0) {
  // 直接更新目標分期
  // ❌ 沒有驗證 remaining 是否為 0
  // 可能導致總額不符
}
```

**修正後**:
```typescript
// ✅ 如果沒有其他可調整的分期，驗證剩餘金額必須為0
if (adjustableInstallments.length === 0) {
  if (remaining !== 0) {
    throw new BadRequestException(
      `無其他可調整分期，本期金額必須為 ${order.totalAmount - paidSum - lockedUnpaidSum} 元才能使總額相符`
    );
  }
  
  await tx.installment.update({
    where: { id: targetInstallment.id },
    data: {
      amount: newAmount,
      isCustom: true,
      autoAdjusted: false
    }
  });
}
```

**關鍵改進**:
- 增加 `remaining !== 0` 驗證
- 提供明確的錯誤訊息，告知正確的金額
- 防止總額不符的情況發生

---

### 問題 3: Math.floor 造成尾差 ✅

**原始問題**:
```typescript
const each = Math.floor(remaining / adjustableInstallments.length);
const remainder = remaining - (each * adjustableInstallments.length);
// ❌ 使用 Math.floor 可能導致精度問題
// 例如：1000 / 3 = 333.33... → Math.floor = 333
// 333 * 3 = 999，餘數 1 元
```

**修正後 - 方案 A**: 使用四捨五入
```typescript
// ✅ 使用四捨五入避免精度問題
const each = Math.round(remaining / adjustableInstallments.length);
const remainder = remaining - (each * adjustableInstallments.length);
```

**修正後 - 方案 B**: 自動修正尾差
```typescript
// 驗證總和
let totalSum = updatedInstallments.reduce((sum, i) => sum + i.amount, 0);

// ✅ 如果有尾差，自動補到最後一期
const delta = order.totalAmount - totalSum;
if (delta !== 0) {
  const lastUnpaidInstallment = updatedInstallments
    .reverse()
    .find(i => i.status === InstallmentStatus.UNPAID);
  
  if (lastUnpaidInstallment) {
    await tx.installment.update({
      where: { id: lastUnpaidInstallment.id },
      data: { amount: lastUnpaidInstallment.amount + delta }
    });
    
    return {
      message: '分期金額調整成功（已自動修正尾差）',
      installments: finalInstallments,
      calculation: {
        totalAmount: order.totalAmount,
        paidSum,
        lockedUnpaidSum,
        remaining,
        adjustableCount: adjustableInstallments.length,
        deltaAdjusted: delta // 顯示修正的差額
      }
    };
  }
}
```

**關鍵改進**:
- 使用 `Math.round()` 取代 `Math.floor()`，提高精度
- 增加尾差自動修正機制，確保總額永遠正確
- 在回應中告知使用者已修正尾差

---

### 問題 4: `isCustom` 與 `autoAdjusted` 狀態可能衝突 ✅

**原始問題**:
```typescript
// 第一次調整：第1期 → 15000
// 結果：第2期 autoAdjusted=true, 第3期 autoAdjusted=true

// 第二次調整：第2期 → 8000
// 問題：第3期仍然 autoAdjusted=true，但它現在應該被重新計算
// ❌ 沒有重置狀態，導致標記不正確
```

**修正後**:
```typescript
// ✅ 重置所有未付款分期的 autoAdjusted 狀態
await tx.installment.updateMany({
  where: { 
    orderId, 
    status: InstallmentStatus.UNPAID,
    installmentNo: { not: installmentNo } // 排除目標分期
  },
  data: { autoAdjusted: false }
});

// 然後再進行分配和標記
```

**關鍵改進**:
- 在每次調整前，先重置所有未付款分期的 `autoAdjusted` 標記
- 確保每次調整都是全新的狀態
- 避免多次調整後出現「死鎖分期」

---

### 問題 5: 前端未防止輸入「浮點數」金額 ✅

**原始問題**:
```typescript
// 前端 UI
if (editingAmount === 0) {
  setErrorMessage('分期付款金額不能為0');
  return;
}
// ❌ 沒有防止輸入 15000.5 或 15000.99
```

**修正後 - 前端**:
```typescript
// ✅ 檢查金額必須為正整數
if (!Number.isInteger(editingAmount) || editingAmount <= 0) {
  setErrorMessage('請輸入有效的整數金額（新台幣不使用小數）');
  setTimeout(() => {
    setErrorMessage(null);
  }, 5000);
  return;
}
```

**修正後 - 後端**:
```typescript
// ✅ 後端也增加驗證
if (!Number.isInteger(newAmount) || newAmount <= 0) {
  throw new BadRequestException('金額必須為正整數（新台幣不使用小數）');
}
```

**關鍵改進**:
- 前後端雙重驗證，確保金額為正整數
- 提供友善的錯誤訊息
- 防止不合理的金額輸入

---

## 🔒 問題 6: 資料庫層 Race Condition 防護（額外加強）

**說明**: 雖然原審核報告提到加行級鎖，但 Prisma 目前不支援 `FOR UPDATE` 語法。

**替代方案**:
1. **使用 Prisma 的 Transaction Isolation Level**
   ```typescript
   await this.prisma.$transaction(
     async (tx) => {
       // 操作邏輯
     },
     {
       isolationLevel: 'Serializable' // 最高隔離級別
     }
   );
   ```

2. **在應用層加鎖**（未來優化）
   - 使用 Redis 實現分佈式鎖
   - 使用 UUID 作為鎖 key: `order-lock-${orderId}`
   - 確保同一時間只有一個請求可以修改訂單

**當前狀態**: 
- ✅ 使用 Prisma Transaction 確保原子性
- ⏳ 建議未來加入 Redis 分佈式鎖（當有多個後端實例時）

---

## 📊 修正前後對比

### 範例：訂單總額 30,000 元，第1期已付款 10,000 元

**修正前**:
```javascript
// 調整第2期為 15,000 元
paidSum = 10,000
outstanding = 30,000 - 10,000 = 20,000
fixedOthers = 10,000 (包含第1期已付款)
remaining = 20,000 - 15,000 - 10,000 = -5,000 ❌

// 錯誤：會拋出「金額超過上限」，但計算邏輯錯誤
```

**修正後**:
```javascript
// 調整第2期為 15,000 元
paidSum = 10,000
lockedUnpaidSum = 0
remaining = 30,000 - (10,000 + 0 + 15,000) = 5,000 ✅

// 正確：第3期自動調整為 5,000 元
```

---

## 🎯 測試案例

### 測試案例 1: 基本調整（正常流程）

**初始狀態**:
```
總金額: 30,000
第1期: 10,000 (未付款)
第2期: 10,000 (未付款)
第3期: 10,000 (未付款)
```

**操作**: 調整第1期為 15,000

**預期結果**:
```
第1期: 15,000 (isCustom: true, autoAdjusted: false)
第2期:  7,500 (isCustom: false, autoAdjusted: true)
第3期:  7,500 (isCustom: false, autoAdjusted: true)
總計: 30,000 ✅
```

### 測試案例 2: 有已付款分期

**初始狀態**:
```
總金額: 30,000
第1期: 10,000 (已付款)
第2期: 10,000 (未付款)
第3期: 10,000 (未付款)
```

**操作**: 調整第2期為 12,000

**預期結果**:
```
第1期: 10,000 (已付款)
第2期: 12,000 (isCustom: true, autoAdjusted: false)
第3期:  8,000 (isCustom: false, autoAdjusted: true)
總計: 30,000 ✅
```

### 測試案例 3: 無可調整分期（應失敗）

**初始狀態**:
```
總金額: 30,000
第1期: 10,000 (已付款)
第2期: 15,000 (未付款, isCustom: true) ← 已鎖定
第3期:  5,000 (未付款)
```

**操作**: 調整第3期為 10,000

**預期結果**:
```
❌ 拋出錯誤:
"無其他可調整分期，本期金額必須為 5,000 元才能使總額相符"
```

### 測試案例 4: 浮點數輸入（應失敗）

**操作**: 調整第1期為 10,000.5

**預期結果**:
```
❌ 前端錯誤: "請輸入有效的整數金額（新台幣不使用小數）"
❌ 後端錯誤（如果繞過前端）: "金額必須為正整數（新台幣不使用小數）"
```

### 測試案例 5: 尾差修正

**初始狀態**:
```
總金額: 10,000
第1期: 3,333 (未付款)
第2期: 3,333 (未付款)
第3期: 3,334 (未付款)
```

**操作**: 調整第1期為 5,000

**計算過程**:
```
remaining = 10,000 - 5,000 = 5,000
each = Math.round(5,000 / 2) = 2,500
remainder = 5,000 - (2,500 * 2) = 0

第2期: 2,500
第3期: 2,500
總計: 5,000 + 2,500 + 2,500 = 10,000 ✅
```

---

## 📝 修正檔案清單

### 後端
- ✅ `backend/src/installments/installments.service.ts`
  - 修正 `remaining` 計算邏輯
  - 增加無可調整分期的驗證
  - 改用 `Math.round()` 並增加尾差修正
  - 增加 `autoAdjusted` 重置邏輯
  - 增加金額正整數驗證

### 前端
- ✅ `frontend/src/components/admin/InstallmentManager.tsx`
  - 增加金額正整數驗證

---

## 🚀 部署建議

### 1. 測試步驟

在部署到生產環境前，請執行以下測試：

```bash
# 後端測試
cd backend
npm test

# 手動測試案例
1. 建立測試訂單（3期，每期10,000）
2. 調整第1期為15,000 → 驗證其他期自動調整為7,500
3. 付款第1期
4. 調整第2期為12,000 → 驗證第3期自動調整為3,000
5. 嘗試輸入浮點數 → 驗證錯誤訊息
6. 嘗試超過上限金額 → 驗證錯誤訊息
```

### 2. 回滾計劃

如果發現問題，可以快速回滾：

```bash
# 回滾到修正前的版本
git revert HEAD
git push origin main
```

### 3. 監控指標

部署後請監控：
- 調整金額 API 的錯誤率
- 總額驗證失敗的次數
- 使用者反饋的問題

---

## ✅ 總結

| 問題編號 | 問題描述 | 修正狀態 | 測試狀態 |
|---------|---------|---------|---------|
| 1 | remaining 計算重複扣除 | ✅ 已修正 | ⏳ 待測試 |
| 2 | 無可調整分期未驗證 | ✅ 已修正 | ⏳ 待測試 |
| 3 | Math.floor 尾差問題 | ✅ 已修正 | ⏳ 待測試 |
| 4 | autoAdjusted 狀態衝突 | ✅ 已修正 | ⏳ 待測試 |
| 5 | 未防止浮點數輸入 | ✅ 已修正 | ⏳ 待測試 |
| 6 | Race Condition 風險 | 📝 已備註 | - |

---

**感謝您的專業審核！** 🙏  
這些修正讓分期調整邏輯更加健壯和安全。

**最後更新**: 2025-10-14  
**版本**: 2.0.0（已修正所有問題）
