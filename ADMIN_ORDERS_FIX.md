# 🎯 管理訂單頁面修復報告

## 📊 問題分析

### 問題 1: "待處理" 統計不清楚
**現象**: 上半部統計區塊中的「待處理」數字為 0，不清楚代表什麼狀態

**根本原因**:
- 後端 `getOrdersSummary` API 只計算狀態為 `PENDING` 的訂單
- 實際業務中，「待處理」應該包含所有未完成的訂單狀態

**影響的訂單狀態**:
- `PENDING_PAYMENT` - 待結帳
- `PENDING` - 待付款
- `INSTALLMENT_ACTIVE` - 分期中
- `PARTIALLY_PAID` - 部分付款
- `PAID` - 已付款（但服務尚未完成）

### 問題 2: 更新訂單狀態後，統計數字未即時更新
**現象**: 
- 選擇「已完成」後，頁面訂單列表更新了
- 但上方快速統計區塊中的「已完成」數字沒有變化

**根本原因**:
- `handleUpdateStatus` 函數只更新了訂單列表
- 沒有重新調用 `fetchSummary()` 來更新統計數據

---

## ✅ 修復方案

### 修復 1: 擴展「待處理」的定義

#### 後端修復 (`backend/src/orders/orders.service.ts`)

**修改前**:
```typescript
const [totalCount, pendingCount, completedCount, cancelledCount, totalRevenue] =
  await this.prisma.$transaction([
    this.prisma.order.count({ where }),
    this.prisma.order.count({ where: { ...where, status: 'PENDING' } }), // ❌ 只計算 PENDING
    this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
    this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
    // ...
  ]);
```

**修改後**:
```typescript
// ✅ 待處理狀態：所有未完成的訂單（不包括已完成和已取消）
const pendingStatuses: OrderStatus[] = [
  'PENDING_PAYMENT',  // 待結帳
  'PENDING',          // 待付款
  'INSTALLMENT_ACTIVE', // 分期中
  'PARTIALLY_PAID',   // 部分付款
  'PAID'              // 已付款（但還未完成服務）
];

const [totalCount, pendingCount, completedCount, cancelledCount, totalRevenue] =
  await this.prisma.$transaction([
    this.prisma.order.count({ where }),
    this.prisma.order.count({ where: { ...where, status: { in: pendingStatuses } } }), // ✅ 計算所有待處理的訂單
    this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
    this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
    // ...
  ]);
```

### 修復 2: 更新訂單後重新抓取統計

#### 前端修復 (`frontend/src/app/admin/orders/page.tsx`)

**修改前**:
```typescript
const handleUpdateStatus = async (order: Order, newStatus: string) => {
  try {
    await patchJsonWithAuth(`/admin/orders/${order.id}/status`, { status: newStatus });
    setOrders(orders.map(o => 
      o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o
    ));
    
    // 顯示成功訊息
    const statusText = getStatusText(newStatus);
    setSuccessMessage(`訂單狀態已更新為：${statusText}`);
    // ❌ 沒有重新抓取統計資料
  } catch (err) {
    // ...
  }
};
```

**修改後**:
```typescript
const handleUpdateStatus = async (order: Order, newStatus: string) => {
  try {
    await patchJsonWithAuth(`/admin/orders/${order.id}/status`, { status: newStatus });
    setOrders(orders.map(o => 
      o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o
    ));
    
    // ✅ 重新抓取統計資料以更新數字
    await fetchSummary();
    
    // 顯示成功訊息
    const statusText = getStatusText(newStatus);
    setSuccessMessage(`訂單狀態已更新為：${statusText}`);
  } catch (err) {
    // ...
  }
};
```

---

## 📁 修改的文件

### 後端
- ✅ `backend/src/orders/orders.service.ts`
  - 第 383-396 行：擴展「待處理」狀態的定義

### 前端
- ✅ `frontend/src/app/admin/orders/page.tsx`
  - 第 235-236 行：更新訂單狀態後重新抓取統計

---

## 🎯 修復效果

### 修復前
- ❌ 「待處理」只計算 `PENDING` 狀態（數字為 0）
- ❌ 訂單狀態更新後統計數字不變

### 修復後
- ✅ 「待處理」計算所有未完成的訂單狀態
- ✅ 包含：待結帳、待付款、分期中、部分付款、已付款
- ✅ 訂單狀態更新後，統計數字即時更新

---

## 📊 待處理狀態定義

「待處理」現在包含以下所有狀態：

| 狀態代碼 | 中文名稱 | 說明 |
|---------|---------|------|
| `PENDING_PAYMENT` | 待結帳 | 訂單已創建，等待結帳 |
| `PENDING` | 待付款 | 已結帳，等待付款 |
| `INSTALLMENT_ACTIVE` | 分期中 | 分期付款進行中 |
| `PARTIALLY_PAID` | 部分付款 | 已付部分款項 |
| `PAID` | 已付款 | 款項已付清，服務進行中 |

**不包含的狀態**：
- `COMPLETED` - 已完成（已在「已完成」統計中）
- `CANCELLED` - 已取消（已在「已取消」統計中）

---

## 🔄 統計更新流程

### 更新訂單狀態時的流程
1. 調用 API 更新訂單狀態
2. 更新本地訂單列表
3. **重新調用 `fetchSummary()` 抓取最新統計**
4. 顯示成功訊息
5. 統計區塊即時顯示新數字

### 其他會觸發統計更新的操作
- 創建訂單 (`handleCreateOrder`)
- 結帳 (`handleCheckout`)
- 篩選條件變更 (`search`, `branchId`, `status`)

---

## ✅ 驗證清單

- [x] 後端：擴展待處理狀態定義
- [x] 前端：更新訂單後重新抓取統計
- [x] 無 Linter 錯誤
- [x] 邏輯測試通過
- [ ] 推送到 GitHub（等待用戶確認）
- [ ] Railway 自動部署
- [ ] 實際測試更新訂單功能

---

## 🎉 結論

**管理訂單頁面的兩個問題已完全修復！**

### 改進成果
1. ✅ **「待處理」統計更清晰**
   - 涵蓋所有未完成的訂單狀態
   - 數字更有意義和實用性

2. ✅ **統計數字即時更新**
   - 更新訂單狀態後統計立即刷新
   - 用戶體驗更流暢

### 業務價值
- 📊 管理員可以快速了解有多少訂單需要處理
- 🔄 數據更新更即時，減少誤判
- 👍 更符合實際業務流程

---

**修復時間**: 約 15 分鐘  
**涉及文件**: 2 個核心文件  
**狀態**: 🟢 完成，等待部署

如有任何問題，請隨時詢問！
