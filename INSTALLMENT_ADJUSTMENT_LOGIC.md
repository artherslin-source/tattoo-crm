# 📊 分期訂單調整金額邏輯說明

## 🎯 功能概述

這個功能允許 **Boss** 或 **分店經理** 調整分期訂單中**未付款**分期的金額。當調整某一期的金額時，系統會自動重新分配其他未付款且未鎖定的分期金額，確保總額始終等於訂單總金額。

---

## 🔐 權限要求

- ✅ `BOSS` (老闆)
- ✅ `BRANCH_MANAGER` (分店經理)
- ❌ 其他角色無法使用此功能

---

## 📡 API 端點

### 調整分期金額

```http
PUT /installments/order/:orderId/installment/:installmentNo/adjust
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "newAmount": 15000
}
```

**參數說明**:
- `orderId`: 訂單 ID
- `installmentNo`: 分期期數（第幾期）
- `newAmount`: 新的金額

---

## 🔄 調整邏輯流程

### 步驟 1: 驗證與檢查

```typescript
// 1. 權限檢查
if (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER') {
  throw new BadRequestException('只有 Boss 或分店經理可以調整分期金額');
}

// 2. 訂單存在性檢查
const order = await tx.order.findUnique({
  where: { id: orderId },
  include: { installments: { orderBy: { installmentNo: 'asc' } } }
});

// 3. 訂單狀態檢查
if (order.status !== 'INSTALLMENT_ACTIVE' && order.status !== 'PARTIALLY_PAID') {
  throw new BadRequestException('只有分期付款中的訂單才能調整金額');
}

// 4. 分期付款存在性檢查
const targetInstallment = order.installments.find(i => i.installmentNo === installmentNo);
if (!targetInstallment) {
  throw new NotFoundException('分期付款不存在');
}

// 5. 付款狀態檢查
if (targetInstallment.status === 'PAID') {
  throw new BadRequestException('已付款的分期不能調整金額');
}
```

### 步驟 2: 計算金額分配

```typescript
// 1. 計算已付款總額
const paidSum = order.installments
  .filter(i => i.status === 'PAID')
  .reduce((sum, i) => sum + i.amount, 0);

// 2. 計算未付總額
const outstanding = order.totalAmount - paidSum;

// 3. 計算其他固定金額（已付款 + 其他已鎖定且未付款的分期）
const fixedOthers = order.installments
  .filter(i => i.installmentNo !== installmentNo && 
              (i.status === 'PAID' || i.isCustom === true))
  .reduce((sum, i) => sum + i.amount, 0);

// 4. 找出可調整的其他期數（未付款且未鎖定）
const adjustableInstallments = order.installments.filter(
  i => i.installmentNo !== installmentNo && 
       i.status === 'UNPAID' && 
       i.isCustom !== true
);

// 5. 計算剩餘金額
const remaining = outstanding - newAmount - fixedOthers;
```

### 步驟 3: 金額驗證

```typescript
// 驗證：剩餘金額不能為負數
if (remaining < 0) {
  const maxAllowed = outstanding - fixedOthers;
  throw new BadRequestException(
    `金額超過可分配上限。本期最大可輸入金額：${maxAllowed} 元，剩餘可分配金額：${outstanding - fixedOthers} 元`
  );
}
```

### 步驟 4: 更新分期金額

#### 情況 A: 沒有其他可調整的分期

```typescript
if (adjustableInstallments.length === 0) {
  await tx.installment.update({
    where: { id: targetInstallment.id },
    data: {
      amount: newAmount,
      isCustom: true,        // 標記為自定義金額
      autoAdjusted: false    // 不是自動調整的
    }
  });
}
```

#### 情況 B: 有其他可調整的分期

```typescript
else {
  // 1. 平均分配剩餘金額
  const each = Math.floor(remaining / adjustableInstallments.length);
  const remainder = remaining - (each * adjustableInstallments.length);
  
  // 2. 更新目標分期付款
  await tx.installment.update({
    where: { id: targetInstallment.id },
    data: {
      amount: newAmount,
      isCustom: true,        // 標記為自定義金額
      autoAdjusted: false    // 不是自動調整的
    }
  });
  
  // 3. 更新其他可調整的分期付款
  for (let i = 0; i < adjustableInstallments.length; i++) {
    const installment = adjustableInstallments[i];
    const isLast = i === adjustableInstallments.length - 1;
    const adjustedAmount = isLast ? each + remainder : each;  // 最後一期加上餘數
    
    await tx.installment.update({
      where: { id: installment.id },
      data: {
        amount: adjustedAmount,
        isCustom: false,       // 不是自定義金額
        autoAdjusted: true     // 是自動調整的
      }
    });
  }
}
```

### 步驟 5: 驗證總和

```typescript
// 重新獲取更新後的分期付款
const updatedInstallments = await tx.installment.findMany({
  where: { orderId },
  orderBy: { installmentNo: 'asc' }
});

// 驗證總和
const totalSum = updatedInstallments.reduce((sum, i) => sum + i.amount, 0);

if (totalSum !== order.totalAmount) {
  throw new BadRequestException(`計算錯誤：分期總和 ${totalSum} 不等於訂單金額 ${order.totalAmount}`);
}
```

---

## 📝 實際範例

### 範例 1: 調整第 1 期金額

**初始狀態**:
```
訂單總金額: 30,000 元
第 1 期: 10,000 元 (未付款)
第 2 期: 10,000 元 (未付款)
第 3 期: 10,000 元 (未付款)
```

**操作**: 將第 1 期調整為 15,000 元

**計算過程**:
```javascript
outstanding = 30,000 - 0 = 30,000 元        // 未付總額
fixedOthers = 0 元                           // 沒有已付款或鎖定的分期
remaining = 30,000 - 15,000 - 0 = 15,000 元 // 剩餘金額
adjustableInstallments = [第2期, 第3期]      // 可調整的分期

// 平均分配
each = Math.floor(15,000 / 2) = 7,500 元
remainder = 15,000 - (7,500 * 2) = 0 元
```

**結果**:
```
第 1 期: 15,000 元 (isCustom: true, autoAdjusted: false)
第 2 期:  7,500 元 (isCustom: false, autoAdjusted: true)
第 3 期:  7,500 元 (isCustom: false, autoAdjusted: true)
總計: 30,000 元 ✅
```

### 範例 2: 第 1 期已付款，調整第 2 期

**初始狀態**:
```
訂單總金額: 30,000 元
第 1 期: 10,000 元 (已付款)
第 2 期: 10,000 元 (未付款)
第 3 期: 10,000 元 (未付款)
```

**操作**: 將第 2 期調整為 15,000 元

**計算過程**:
```javascript
paidSum = 10,000 元                          // 已付款總額
outstanding = 30,000 - 10,000 = 20,000 元   // 未付總額
fixedOthers = 10,000 元                      // 第 1 期已付款
remaining = 20,000 - 15,000 - 10,000 = -5,000 元 ❌

// 驗證失敗！
maxAllowed = 20,000 - 10,000 = 10,000 元
錯誤訊息: "金額超過可分配上限。本期最大可輸入金額：10,000 元"
```

**正確操作**: 將第 2 期調整為 5,000 元

**計算過程**:
```javascript
outstanding = 20,000 元
fixedOthers = 10,000 元                      // 第 1 期已付款
remaining = 20,000 - 5,000 - 10,000 = 5,000 元
adjustableInstallments = [第3期]

// 第 3 期自動調整為 5,000 元
```

**結果**:
```
第 1 期: 10,000 元 (已付款)
第 2 期:  5,000 元 (isCustom: true, autoAdjusted: false)
第 3 期:  5,000 元 (isCustom: false, autoAdjusted: true)
總計: 20,000 元 ✅（未付款部分）
```

### 範例 3: 有餘數的情況

**初始狀態**:
```
訂單總金額: 10,000 元
第 1 期: 3,000 元 (未付款)
第 2 期: 3,000 元 (未付款)
第 3 期: 4,000 元 (未付款)
```

**操作**: 將第 1 期調整為 5,000 元

**計算過程**:
```javascript
outstanding = 10,000 元
fixedOthers = 0 元
remaining = 10,000 - 5,000 = 5,000 元
adjustableInstallments = [第2期, 第3期]

// 平均分配
each = Math.floor(5,000 / 2) = 2,500 元
remainder = 5,000 - (2,500 * 2) = 0 元
```

**結果**:
```
第 1 期: 5,000 元 (isCustom: true, autoAdjusted: false)
第 2 期: 2,500 元 (isCustom: false, autoAdjusted: true)
第 3 期: 2,500 元 (isCustom: false, autoAdjusted: true)  <- 最後一期加上餘數
總計: 10,000 元 ✅
```

### 範例 4: 調整後只剩一期未付款

**初始狀態**:
```
訂單總金額: 30,000 元
第 1 期: 10,000 元 (已付款)
第 2 期: 10,000 元 (未付款, isCustom: true)  <- 已鎖定
第 3 期: 10,000 元 (未付款)
```

**操作**: 將第 3 期調整為 15,000 元

**計算過程**:
```javascript
paidSum = 10,000 元
outstanding = 20,000 元
fixedOthers = 10,000 + 10,000 = 20,000 元   // 第1期已付款 + 第2期已鎖定
remaining = 20,000 - 15,000 - 20,000 = -15,000 元 ❌

// 驗證失敗！
maxAllowed = 20,000 - 20,000 = 0 元
錯誤訊息: "金額超過可分配上限。本期最大可輸入金額：0 元"
```

**說明**: 因為第 2 期已經標記為 `isCustom: true`（鎖定），所以第 3 期無法調整。

---

## 🏷️ 欄位說明

### `isCustom` (是否為自定義金額)
- `true`: 此分期的金額是由管理員手動設定的，不會被自動調整
- `false`: 此分期的金額可以被系統自動調整

### `autoAdjusted` (是否為自動調整)
- `true`: 此分期的金額是由系統自動計算的（因為其他分期調整而被動調整）
- `false`: 此分期的金額不是自動調整的

### 組合情況
- `isCustom: true, autoAdjusted: false` → 管理員手動調整的分期（**目標分期**）
- `isCustom: false, autoAdjusted: true` → 系統自動調整的分期（**其他可調整分期**）
- `isCustom: false, autoAdjusted: false` → 原始分期金額（**初始狀態**）

---

## ⚠️ 重要限制

### 1. 只能調整未付款的分期
```typescript
if (targetInstallment.status === 'PAID') {
  throw new BadRequestException('已付款的分期不能調整金額');
}
```

### 2. 只能調整分期付款中的訂單
```typescript
if (order.status !== 'INSTALLMENT_ACTIVE' && order.status !== 'PARTIALLY_PAID') {
  throw new BadRequestException('只有分期付款中的訂單才能調整金額');
}
```

### 3. 新金額不能導致總額不符
```typescript
if (remaining < 0) {
  const maxAllowed = outstanding - fixedOthers;
  throw new BadRequestException(
    `金額超過可分配上限。本期最大可輸入金額：${maxAllowed} 元`
  );
}
```

### 4. 已鎖定的分期不會被調整
- 已付款的分期 (`status === 'PAID'`)
- 已標記為自定義的分期 (`isCustom === true`)

---

## 🔄 前端整合

### 調用方式

```typescript
// frontend/src/app/admin/orders/page.tsx
const handleInstallmentAmountAdjusted = async (
  orderId: string, 
  installmentNo: number, 
  newAmount: number
) => {
  try {
    await putJsonWithAuth(
      `/installments/order/${orderId}/installment/${installmentNo}/adjust`,
      { newAmount }
    );
    
    // 重新獲取訂單列表和統計
    await fetchOrders();
    await fetchSummary();
    
    // 重新獲取訂單詳情
    if (selectedOrder) {
      const updatedOrder = await getJsonWithAuth<Order>(`/admin/orders/${selectedOrder.id}`);
      setSelectedOrder(updatedOrder);
    }
    
    setSuccessMessage('分期金額調整成功');
  } catch (err) {
    const apiErr = err as ApiError;
    setError(apiErr.message || "調整分期金額失敗");
    throw err; // 讓 InstallmentManager 可以捕獲錯誤
  }
};
```

### UI 組件

```typescript
// frontend/src/components/admin/InstallmentManager.tsx
const handleAdjustAmount = async () => {
  if (!selectedInstallment || !onInstallmentAmountAdjusted) return;
  
  // 檢查金額是否為0
  if (editingAmount === 0) {
    setErrorMessage('分期付款金額不能為0，請輸入有效的金額。');
    return;
  }
  
  try {
    await onInstallmentAmountAdjusted(order.id, selectedInstallment.installmentNo, editingAmount);
    setIsAmountEditDialogOpen(false);
    setErrorMessage(null);
  } catch (error) {
    console.error('調整分期金額失敗:', error);
    setErrorMessage('調整分期金額失敗，請稍後再試。');
  }
};
```

---

## 📊 API 回應格式

### 成功回應

```json
{
  "message": "分期金額調整成功",
  "installments": [
    {
      "id": "inst_001",
      "installmentNo": 1,
      "amount": 15000,
      "status": "UNPAID",
      "isCustom": true,
      "autoAdjusted": false,
      "dueDate": "2025-01-15T00:00:00.000Z"
    },
    {
      "id": "inst_002",
      "installmentNo": 2,
      "amount": 7500,
      "status": "UNPAID",
      "isCustom": false,
      "autoAdjusted": true,
      "dueDate": "2025-02-15T00:00:00.000Z"
    },
    {
      "id": "inst_003",
      "installmentNo": 3,
      "amount": 7500,
      "status": "UNPAID",
      "isCustom": false,
      "autoAdjusted": true,
      "dueDate": "2025-03-15T00:00:00.000Z"
    }
  ],
  "calculation": {
    "totalAmount": 30000,
    "paidSum": 0,
    "outstanding": 30000,
    "fixedOthers": 0,
    "remaining": 15000,
    "adjustableCount": 2
  }
}
```

### 錯誤回應

```json
{
  "statusCode": 400,
  "message": "金額超過可分配上限。本期最大可輸入金額：10000 元，剩餘可分配金額：10000 元",
  "error": "Bad Request"
}
```

---

## 🎯 總結

### 核心原則
1. **總額守恆**: 所有分期金額之和必須等於訂單總金額
2. **已付款鎖定**: 已付款的分期不能調整
3. **自定義鎖定**: 已標記為自定義的分期不會被自動調整
4. **自動平衡**: 調整某一期時，其他可調整的分期會自動重新分配

### 金額分配策略
- 使用 **整數除法** 平均分配剩餘金額
- 使用 **餘數** 加到最後一期，避免小數問題
- 確保所有金額都是整數（新台幣不使用小數）

### 交易安全
- 使用 **Prisma Transaction** 確保所有更新都成功或都失敗
- 在交易結束前驗證總和，確保數據一致性

---

**最後更新**: 2025-10-14  
**版本**: 1.0.0
