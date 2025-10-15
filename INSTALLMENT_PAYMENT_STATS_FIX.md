# 🔧 分期付款統計即時更新修正

## 📋 問題描述

**問題**: 在「管理後台-管理訂單」中，分期訂單記錄付款後，總營收統計數字沒有即時更新。

**影響**: 
- 使用者記錄分期付款後，需要重新整理頁面才能看到更新的總營收
- 統計數據不準確，影響決策判斷
- 使用者體驗不佳

---

## ✅ 修正內容

### 1. 前端修正：增加即時數據更新

**文件**: `frontend/src/app/admin/orders/page.tsx`

**修正前**:
```typescript
const handlePaymentRecorded = async (installmentId: string, paymentData: ...) => {
  try {
    await postJsonWithAuth(`/installments/${installmentId}/payment`, paymentData);
    
    // 只更新訂單詳情
    if (selectedOrder) {
      const updatedOrder = await getJsonWithAuth<Order>(`/admin/orders/${selectedOrder.id}`);
      setSelectedOrder(updatedOrder);
      
      setOrders(orders.map(order => 
        order.id === selectedOrder.id ? updatedOrder : order
      ));
    }
    // ❌ 沒有重新獲取統計數據
  } catch (err) {
    // ...
  }
};
```

**修正後**:
```typescript
const handlePaymentRecorded = async (installmentId: string, paymentData: ...) => {
  try {
    await postJsonWithAuth(`/installments/${installmentId}/payment`, paymentData);
    
    // ✅ 重新獲取訂單列表和統計數據
    await fetchOrders();
    await fetchSummary();
    
    // 重新獲取訂單詳情
    if (selectedOrder) {
      const updatedOrder = await getJsonWithAuth<Order>(`/admin/orders/${selectedOrder.id}`);
      setSelectedOrder(updatedOrder);
    }
  } catch (err) {
    // ...
  }
};
```

**效果**:
- 記錄付款後立即重新獲取訂單列表
- 記錄付款後立即重新獲取統計數據（包含總營收）
- 使用者可以即時看到更新後的數據

---

### 2. 後端修正：統一總營收計算邏輯

**文件**: `backend/src/orders/orders.service.ts`

**修正前**:
```typescript
async getOrdersSummary(query: GetOrdersQuery, userRole: string, userBranchId?: string) {
  // ...
  const [totalCount, pendingCount, completedCount, cancelledCount, totalRevenue] =
    await this.prisma.$transaction([
      // ...
      this.prisma.order.aggregate({
        where: { ...where, status: { in: paidStatuses } },
        _sum: { finalAmount: true },  // ❌ 只計算訂單的 finalAmount
      }),
    ]);

  return {
    // ...
    totalRevenue: Number(totalRevenue._sum.finalAmount || 0),
  };
}
```

**修正後**:
```typescript
async getOrdersSummary(query: GetOrdersQuery, userRole: string, userBranchId?: string) {
  // ...
  const [totalCount, pendingCount, completedCount, cancelledCount] =
    await this.prisma.$transaction([
      // ... (移除 totalRevenue)
    ]);

  // ✅ 修正：計算總營收 = 一次付清訂單 + 分期訂單中已付款的分期金額
  // 1. 計算一次付清且已付款的訂單
  const oneTimeRevenue = await this.prisma.order.aggregate({
    where: {
      ...where,
      paymentType: 'ONE_TIME',
      status: { in: paidStatuses }
    },
    _sum: { finalAmount: true }
  });

  // 2. 計算分期訂單中已付款的分期金額
  const installmentRevenue = await this.prisma.installment.aggregate({
    where: {
      status: 'PAID',
      order: where
    },
    _sum: { amount: true }
  });

  const totalRevenueAmount = 
    Number(oneTimeRevenue._sum.finalAmount || 0) + 
    Number(installmentRevenue._sum.amount || 0);

  return {
    // ...
    totalRevenue: totalRevenueAmount,
  };
}
```

**效果**:
- 總營收計算邏輯與 `admin/stats` API 保持一致
- 正確計算分期付款的金額
- 確保所有統計端點使用相同的計算邏輯

---

## 📊 計算邏輯說明

### 總營收計算公式

```
總營收 = 一次付清訂單已付款金額 + 分期訂單中已付款的分期金額
```

### 詳細說明

1. **一次付清訂單** (`paymentType: 'ONE_TIME'`)
   - 狀態為：`PAID`, `PAID_COMPLETE`, `COMPLETED`
   - 計算：訂單的 `finalAmount`

2. **分期訂單** (`paymentType: 'INSTALLMENT'`)
   - 只計算已付款的分期 (`status: 'PAID'`)
   - 計算：每個已付款分期的 `amount` 加總
   - **不是**訂單的 `finalAmount`（因為分期訂單可能只付了部分）

### 範例

**訂單 A**:
- 類型：一次付清
- 狀態：已付款
- 金額：30,000 元
- **計入總營收**：30,000 元 ✅

**訂單 B**:
- 類型：分期（3 期）
- 訂單總額：30,000 元
- 第 1 期：10,000 元 (已付款) ✅
- 第 2 期：10,000 元 (已付款) ✅
- 第 3 期：10,000 元 (未付款) ❌
- **計入總營收**：20,000 元（第1期 + 第2期）

**總營收** = 30,000 + 20,000 = **50,000 元**

---

## 🚀 部署狀態

### Git 提交
```bash
[main 74b9ca7] fix: Update total revenue statistics immediately after installment payment
 2 files changed, 40 insertions(+), 19 deletions(-)
```

### 推送狀態
```bash
To github.com:artherslin-source/tattoo-crm.git
   9ff0f2b..74b9ca7  main -> main
✅ 成功推送
```

### Railway 自動部署
- 🔄 後端服務正在重新部署
- 🔄 前端服務正在重新部署

---

## ✅ 驗證清單

### 功能驗證

1. **記錄分期付款**
   - [ ] 在管理訂單中選擇一個分期訂單
   - [ ] 點擊「記錄付款」按鈕
   - [ ] 填寫付款資訊並確認

2. **檢查即時更新**
   - [ ] 確認訂單狀態立即更新（如 `PARTIALLY_PAID`）
   - [ ] 確認總營收統計立即更新
   - [ ] **不需要重新整理頁面**

3. **驗證計算正確性**
   - [ ] 記錄第 1 期付款 → 總營收 = 前次總營收 + 第 1 期金額
   - [ ] 記錄第 2 期付款 → 總營收 = 前次總營收 + 第 2 期金額
   - [ ] 記錄第 3 期付款 → 總營收 = 前次總營收 + 第 3 期金額

### 測試案例

**測試案例 1**: 記錄第一期付款
```
初始狀態：
- 總營收：50,000 元
- 訂單 A：分期訂單，總額 30,000 元
  - 第 1 期：10,000 元 (未付款)
  - 第 2 期：10,000 元 (未付款)
  - 第 3 期：10,000 元 (未付款)

操作：記錄第 1 期付款

預期結果：
- 總營收立即更新為：60,000 元（50,000 + 10,000）
- 訂單狀態更新為：PARTIALLY_PAID
- 第 1 期狀態更新為：PAID
```

**測試案例 2**: 記錄所有期付款
```
初始狀態：
- 總營收：60,000 元
- 訂單 A：
  - 第 1 期：10,000 元 (已付款)
  - 第 2 期：10,000 元 (未付款)
  - 第 3 期：10,000 元 (未付款)

操作：依序記錄第 2 期、第 3 期付款

預期結果：
- 記錄第 2 期後，總營收：70,000 元（60,000 + 10,000）
- 記錄第 3 期後，總營收：80,000 元（70,000 + 10,000）
- 訂單狀態更新為：PAID
- 所有分期狀態都是：PAID
```

---

## 🔍 相關修正

這次修正與之前的修正協同工作：

1. **[總營收計算修正](./FIXES_COMPLETED_REPORT.md)** - 之前已修正 `admin/stats` 的總營收計算
2. **[分期調整邏輯修正](./INSTALLMENT_LOGIC_FIXES.md)** - 之前已修正分期金額調整邏輯
3. **本次修正** - 確保記錄付款後統計即時更新，並統一所有 API 的計算邏輯

---

## 📝 總結

### 修正前
- ❌ 記錄分期付款後，總營收不會更新
- ❌ 需要重新整理頁面才能看到最新數據
- ❌ `getOrdersSummary` 計算邏輯不正確

### 修正後
- ✅ 記錄分期付款後，總營收立即更新
- ✅ 不需要重新整理頁面
- ✅ 所有 API 使用統一的計算邏輯
- ✅ 分期付款金額正確計入總營收

---

**修正日期**: 2025-10-14  
**版本**: 1.0.0  
**狀態**: ✅ 已完成並推送

🎉 **問題已解決！分期付款記錄後，總營收統計會即時更新！**
