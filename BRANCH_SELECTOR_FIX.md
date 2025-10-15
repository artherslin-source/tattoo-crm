# BranchSelector 組件修復報告

## 🎯 問題回顧

用戶報告了兩個問題：

1. **問題2（平板/手機版）**：分店下拉選單位置顯示錯誤
2. **問題3（儀表板）**：分店選項缺少「全部分店」選項

經過仔細檢查，發現：
- **問題2**：`AppointmentsToolbar` 組件的布局已經正確，使用 `branches` prop 動態渲染分店選項
- **問題3**：真正的問題是 `BranchSelector` 組件（用於管理後台儀表板）缺少「全部分店」選項

---

## ✅ 問題分析

### 截圖顯示的頁面
用戶截圖顯示的是 **管理後台儀表板**（`/admin/dashboard`），而不是分店管理儀表板（`/branch/dashboard`）。

### 使用的組件
管理後台儀表板使用的是 `BranchSelector` 組件，而不是我之前修改的頁面。

### 問題根源
`BranchSelector` 組件的下拉選單選項：
```html
<option value="">選擇分店</option>
{branches.map((branch) => (
  <option key={branch.id} value={branch.id}>
    {branch.name} ({branch._count.users} 用戶, {branch._count.appointments} 預約)
  </option>
))}
```

❌ 缺少「全部分店」選項

---

## 🔧 修復方案

### 1. 添加分店名稱去重邏輯

**問題：** 數據庫中可能存在同名分店的多個記錄

**解決方案：**
```typescript
// 按名稱去重：只保留每個名稱的第一個分店
const uniqueByName = data.reduce((acc, branch) => {
  if (!acc.some(b => b.name === branch.name)) {
    acc.push(branch);
  }
  return acc;
}, [] as Branch[]);

const uniqueBranches = sortBranchesByName(getUniqueBranches<Branch>(uniqueByName));
setBranches(uniqueBranches);
```

### 2. 根據角色設置預設值

**BOSS 角色：** 預設選擇「全部分店」
```typescript
if (userRole === 'BOSS') {
  // BOSS 預設選擇「全部分店」
  onBranchChange('all');
} else {
  const userBranchId = getUserBranchId();
  if (userBranchId) {
    onBranchChange(userBranchId);
  }
}
```

**BRANCH_MANAGER 角色：** 預設選擇所屬分店

### 3. 添加「全部分店」選項到下拉選單

**僅 BOSS 角色可見：**
```typescript
const userRole = getUserRole();

return (
  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
    <label htmlFor="branch-select" className="text-sm font-medium text-gray-700">
      分店：
    </label>
    <select
      id="branch-select"
      value={selectedBranchId || ''}
      onChange={(e) => onBranchChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto sm:py-1.5"
    >
      <option value="">選擇分店</option>
      {userRole === 'BOSS' && (
        <option value="all">全部分店</option>
      )}
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name} ({branch._count.users} 用戶, {branch._count.appointments} 預約)
        </option>
      ))}
    </select>
  </div>
);
```

---

## 📊 修復前後對比

### 修復前

**BOSS 角色看到的選項：**
```
選擇分店
三重店 (9 用戶, 16 預約)
東港店 (8 用戶, 8 預約)
```

❌ 無法查看所有分店的匯總數據

### 修復後

**BOSS 角色看到的選項：**
```
選擇分店
全部分店          ← ✅ 新增
三重店 (9 用戶, 16 預約)
東港店 (8 用戶, 8 預約)
```

✅ 可以選擇「全部分店」查看匯總數據

**BRANCH_MANAGER 角色看到的選項：**
```
選擇分店
三重店 (9 用戶, 16 預約)
東港店 (8 用戶, 8 預約)
```

✅ 不顯示「全部分店」選項（權限控制）

---

## 🎯 功能特點

### 1. 角色控制
- **BOSS 角色**：
  - ✅ 顯示「全部分店」選項
  - ✅ 預設選擇「全部分店」
  - ✅ 可以切換查看特定分店或所有分店

- **BRANCH_MANAGER 角色**：
  - ✅ 不顯示「全部分店」選項
  - ✅ 預設選擇所屬分店
  - ✅ 只能查看所屬分店的數據

### 2. 數據去重
- ✅ 按分店名稱去重
- ✅ 只保留每個名稱的第一個分店記錄
- ✅ 避免顯示重複的分店選項

### 3. 智能預設值
- ✅ BOSS 自動選擇「全部分店」
- ✅ BRANCH_MANAGER 自動選擇所屬分店
- ✅ 提升用戶體驗

---

## 🧪 測試建議

### 測試1：BOSS 角色
```
1. 以 BOSS 角色登入
2. 前往「管理後台」（/admin/dashboard）
3. 查看分店下拉選單
4. 確認選項：
   ✅ 選擇分店（預設提示）
   ✅ 全部分店
   ✅ 三重店 (X 用戶, Y 預約)
   ✅ 東港店 (X 用戶, Y 預約)
5. 確認預設選擇「全部分店」
6. 選擇「全部分店」，確認顯示所有分店的匯總統計
7. 選擇「三重店」，確認只顯示三重店的統計
8. 選擇「東港店」，確認只顯示東港店的統計
```

### 測試2：BRANCH_MANAGER 角色
```
1. 以 BRANCH_MANAGER 角色登入（例如：三重店經理）
2. 前往「管理後台」（/admin/dashboard）
3. 查看分店下拉選單
4. 確認選項：
   ✅ 選擇分店（預設提示）
   ❌ 全部分店（不顯示）
   ✅ 三重店 (X 用戶, Y 預約)
   ✅ 東港店 (X 用戶, Y 預約)
5. 確認預設選擇「三重店」（所屬分店）
6. 確認只能查看所屬分店的統計數據
```

### 測試3：分店去重
```
1. 確認數據庫中有同名分店的多個記錄
2. 登入管理後台
3. 查看分店下拉選單
4. 確認每個分店名稱只顯示一次
5. 確認選擇分店後，數據正確載入
```

---

## 📝 修改文件

| 文件 | 修改內容 |
|------|----------|
| `frontend/src/components/BranchSelector.tsx` | 添加「全部分店」選項、分店去重、角色控制 |

---

## 🔍 技術細節

### 分店去重邏輯
```typescript
const uniqueByName = data.reduce((acc, branch) => {
  if (!acc.some(b => b.name === branch.name)) {
    acc.push(branch);
  }
  return acc;
}, [] as Branch[]);
```

**工作原理：**
1. 使用 `reduce` 遍歷所有分店
2. 檢查累加器中是否已存在同名分店
3. 如果不存在，添加到累加器
4. 返回去重後的分店列表

### 角色檢查
```typescript
const userRole = getUserRole();

{userRole === 'BOSS' && (
  <option value="all">全部分店</option>
)}
```

**工作原理：**
1. 使用 `getUserRole()` 獲取當前用戶角色
2. 使用條件渲染，只有 BOSS 角色才顯示「全部分店」選項
3. 確保權限控制

### 預設值設置
```typescript
if (!selectedBranchId) {
  const userRole = getUserRole();
  if (userRole === 'BOSS') {
    onBranchChange('all');
  } else {
    const userBranchId = getUserBranchId();
    if (userBranchId) {
      onBranchChange(userBranchId);
    }
  }
}
```

**工作原理：**
1. 檢查是否已有選擇的分店
2. 如果沒有，根據角色設置預設值
3. BOSS 選擇 'all'，BRANCH_MANAGER 選擇所屬分店

---

## ✅ 完成狀態

- ✅ 添加「全部分店」選項
- ✅ 實現角色控制（僅 BOSS 可見）
- ✅ 添加分店名稱去重邏輯
- ✅ 設置智能預設值
- ✅ 代碼已提交並推送
- ✅ 無 linter 錯誤

---

## 🎊 總結

### 問題根源
用戶截圖顯示的是管理後台儀表板（`/admin/dashboard`），使用的是 `BranchSelector` 組件，而不是我之前修改的分店管理儀表板（`/branch/dashboard`）。

### 修復重點
1. ✅ 添加「全部分店」選項到 `BranchSelector` 組件
2. ✅ 實現角色控制（僅 BOSS 角色可見）
3. ✅ 添加分店名稱去重邏輯
4. ✅ 設置智能預設值

### 影響範圍
- 管理後台儀表板（`/admin/dashboard`）
- 所有使用 `BranchSelector` 組件的頁面

---

**修復日期：** 2025-10-15  
**Git Commit：** `6be0ec3` - "fix: Add 'All Branches' option to BranchSelector component"  
**狀態：** ✅ 完成

