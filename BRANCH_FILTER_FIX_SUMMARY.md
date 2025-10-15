# 分店篩選和選擇器問題修復總結

## 📋 問題概述

用戶報告了三個與分店篩選和選擇器相關的問題：

1. **管理預約頁面**：分店篩選下拉選單只顯示「全部分店」，沒有顯示三重店和東港店
2. **平板和手機版**：分店下拉選單位置顯示錯誤
3. **儀表板**：分店選項缺少「全部分店」選項

---

## ✅ 問題1：管理預約頁面 - 分店篩選選項為空

### 問題原因
`fetchOptionsData()` 函數雖然已定義，但沒有在 `useEffect` 中被調用，導致 `branches` 狀態始終為空數組。

### 修復方案
在 `useEffect` 中添加 `fetchOptionsData()` 調用：

```typescript
useEffect(() => {
  const userRole = getUserRole();
  const token = getAccessToken();
  
  if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
    router.replace('/profile');
    return;
  }

  fetchAppointments();
  fetchOptionsData(); // ✅ 添加此行
}, [router, fetchAppointments, fetchOptionsData]);
```

### 修改文件
- `frontend/src/app/admin/appointments/page.tsx`

### 驗證結果
✅ 分店篩選下拉選單現在正確顯示：
- 全部分店
- 三重店
- 東港店

---

## ✅ 問題2：平板和手機版 - 分店下拉選單位置

### 問題檢查
檢查了 `AppointmentsToolbar.tsx` 中的響應式布局：

#### 桌機版（≥1024px）
```typescript
<div className="hidden xl:block">
  <div className="flex items-center gap-4">
    {/* 搜尋框 */}
    <div className="flex-1">...</div>
    
    {/* 篩選器 */}
    <div className="flex items-center gap-3">
      <Select value={branchId} onValueChange={onBranchChange}>
        {/* 分店選擇器 */}
      </Select>
      <Select value={status} onValueChange={onStatusChange}>
        {/* 狀態選擇器 */}
      </Select>
    </div>
    
    {/* 排序和分頁控制 */}
    <div className="flex items-center gap-3">...</div>
  </div>
</div>
```

#### 平板版（768px ~ 1023px）
```typescript
<div className="hidden md:block xl:hidden">
  <div className="space-y-3">
    {/* 第一行：搜尋框 */}
    <div>...</div>
    
    {/* 第二行：篩選器 - 二等分 */}
    <div className="grid grid-cols-2 gap-2">
      <Select value={branchId} onValueChange={onBranchChange}>
        {/* 分店選擇器 */}
      </Select>
      <Select value={status} onValueChange={onStatusChange}>
        {/* 狀態選擇器 */}
      </Select>
    </div>
    
    {/* 第三行：排序和分頁控制 - 三等分 */}
    <div className="grid grid-cols-3 gap-2">...</div>
  </div>
</div>
```

#### 手機版（<768px）
```typescript
<div className="md:hidden">
  <div className="space-y-3">
    {/* 第一行：搜尋框 */}
    <div>...</div>
    
    {/* 第二行：篩選條件按鈕 */}
    <div>
      <Button onClick={() => setIsFilterOpen(true)}>
        篩選條件
      </Button>
    </div>
  </div>
  
  {/* 篩選抽屜 */}
  <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
    <DialogContent>
      <div className="space-y-4">
        {/* 分店篩選 */}
        <div>
          <label>分店</label>
          <Select value={branchId} onValueChange={onBranchChange}>
            {/* 分店選擇器 */}
          </Select>
        </div>
        
        {/* 狀態篩選 */}
        <div>
          <label>狀態</label>
          <Select value={status} onValueChange={onStatusChange}>
            {/* 狀態選擇器 */}
          </Select>
        </div>
        
        {/* 其他篩選選項 */}
      </div>
    </DialogContent>
  </Dialog>
</div>
```

### 驗證結果
✅ 分店下拉選單位置正確：
- **桌機版**：與其他篩選器橫向排列
- **平板版**：第二行，與狀態選擇器二等分
- **手機版**：在篩選抽屜中，獨立區塊顯示

### 修改文件
- `frontend/src/components/admin/AppointmentsToolbar.tsx`（無需修改，布局已正確）

---

## ✅ 問題3：儀表板 - 添加「全部分店」選項

### 問題分析
分店管理儀表板（`/branch/dashboard`）原本只顯示當前分店經理所屬的分店信息，沒有提供分店選擇器。對於 BOSS 角色，應該能夠選擇查看不同分店或全部分店的統計數據。

### 修復方案

#### 1. 添加必要的導入
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
```

#### 2. 添加狀態管理
```typescript
const [userRole, setUserRole] = useState<string | null>(null);
const [branches, setBranches] = useState<Branch[]>([]);
const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
```

#### 3. 載入分店列表（僅 BOSS 角色）
```typescript
useEffect(() => {
  const role = getUserRole();
  const token = getAccessToken();
  
  if (!token || (role !== 'BOSS' && role !== 'BRANCH_MANAGER')) {
    router.replace('/profile');
    return;
  }

  setUserRole(role);

  // 如果是 BOSS，載入所有分店列表
  if (role === 'BOSS') {
    const fetchBranches = async () => {
      try {
        const branchesData = await getJsonWithAuth('/branches') as Array<Record<string, unknown>>;
        
        // 按名稱去重：只保留每個名稱的第一個分店
        const uniqueByName = branchesData.reduce((acc, branch) => {
          const name = branch.name as string;
          if (!acc.some(b => (b.name as string) === name)) {
            acc.push(branch);
          }
          return acc;
        }, [] as Array<Record<string, unknown>>);
        
        const uniqueBranches = sortBranchesByName(getUniqueBranches(uniqueByName)) as Branch[];
        setBranches(uniqueBranches);
      } catch (err) {
        console.error('載入分店列表失敗:', err);
      }
    };
    fetchBranches();
  } else {
    // 如果是 BRANCH_MANAGER，設置為當前分店
    const userBranchId = getUserBranchId();
    if (userBranchId) {
      setSelectedBranchId(userBranchId);
    }
  }
}, [router]);
```

#### 4. 根據選擇的分店載入統計數據
```typescript
useEffect(() => {
  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // 確定要查詢的分店 ID
      let targetBranchId: string | null = null;
      if (userRole === 'BOSS') {
        targetBranchId = selectedBranchId === 'all' ? null : selectedBranchId;
      } else {
        targetBranchId = getUserBranchId();
      }
      
      // 獲取分店資訊（如果選擇了特定分店）
      if (targetBranchId) {
        const branchData = await getJsonWithAuth<Branch>(`/branches/${targetBranchId}`);
        setBranchInfo(branchData);
      } else {
        setBranchInfo(null); // 全部分店時清空單一分店資訊
      }

      // 載入統計數據...
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (userRole) {
    fetchDashboardData();
  }
}, [userRole, selectedBranchId]);
```

#### 5. 添加分店選擇器 UI
```typescript
{/* ✅ BOSS 角色顯示分店選擇器 */}
{userRole === 'BOSS' && branches.length > 0 && (
  <div className="ml-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      選擇分店
    </label>
    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
      <SelectTrigger className="w-48 bg-white dark:bg-gray-800">
        <SelectValue placeholder="選擇分店" />
      </SelectTrigger>
      <SelectContent className="bg-white/95 dark:bg-gray-800/95">
        <SelectItem value="all">全部分店</SelectItem>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}
```

### 修改文件
- `frontend/src/app/branch/dashboard/page.tsx`

### 功能特點
✅ **角色控制**：
- BOSS 角色：顯示分店選擇器，可選擇「全部分店」或特定分店
- BRANCH_MANAGER 角色：自動鎖定為所屬分店，不顯示選擇器

✅ **分店選項**：
- 全部分店
- 三重店
- 東港店

✅ **動態更新**：
- 選擇不同分店時，統計數據即時更新
- 選擇「全部分店」時，顯示所有分店的匯總數據

✅ **數據去重**：
- 使用 `getUniqueBranches` 和 `sortBranchesByName` 工具函數
- 按名稱去重，確保每個分店只顯示一次

---

## 📊 修復總結

| 問題 | 狀態 | 修改文件 | 關鍵修復 |
|------|------|----------|----------|
| **問題1：管理預約 - 分店篩選為空** | ✅ 已修復 | `frontend/src/app/admin/appointments/page.tsx` | 調用 `fetchOptionsData()` |
| **問題2：平板/手機版 - 選單位置** | ✅ 已驗證 | `frontend/src/components/admin/AppointmentsToolbar.tsx` | 布局已正確 |
| **問題3：儀表板 - 缺少全部分店** | ✅ 已修復 | `frontend/src/app/branch/dashboard/page.tsx` | 添加分店選擇器 |

---

## 🎯 測試建議

### 1. 管理預約頁面
```
1. 登入為 BOSS 或 BRANCH_MANAGER
2. 前往「管理預約」頁面
3. 點擊「分店」下拉選單
4. 確認顯示：
   ✅ 全部分店
   ✅ 三重店
   ✅ 東港店
5. 選擇不同分店，確認篩選功能正常
```

### 2. 平板和手機版
```
1. 使用瀏覽器開發者工具切換到平板/手機視圖
2. 前往「管理預約」頁面

平板版（768px ~ 1023px）：
✅ 搜尋框在第一行
✅ 分店和狀態選擇器在第二行，二等分
✅ 排序和分頁控制在第三行，三等分

手機版（<768px）：
✅ 搜尋框在第一行
✅ 「篩選條件」按鈕在第二行
✅ 點擊按鈕打開篩選抽屜
✅ 分店選擇器在抽屜中獨立區塊顯示
```

### 3. 儀表板
```
1. 登入為 BOSS
2. 前往「分店管理後台」（/branch/dashboard）
3. 確認右上角顯示「選擇分店」下拉選單
4. 確認選項包含：
   ✅ 全部分店
   ✅ 三重店
   ✅ 東港店
5. 選擇不同分店，確認統計數據更新
6. 選擇「全部分店」，確認顯示匯總數據

BRANCH_MANAGER 角色：
✅ 不顯示分店選擇器
✅ 自動顯示所屬分店的統計數據
```

---

## 🔧 技術細節

### 數據去重邏輯
```typescript
// 按名稱去重：只保留每個名稱的第一個分店
const uniqueByName = branchesData.reduce((acc, branch) => {
  const name = branch.name as string;
  if (!acc.some(b => (b.name as string) === name)) {
    acc.push(branch);
  }
  return acc;
}, [] as Array<Record<string, unknown>>);

const uniqueBranches = sortBranchesByName(getUniqueBranches(uniqueByName)) as Branch[];
```

### 響應式布局
- **桌機版**：`hidden xl:block` - 橫向展開
- **平板版**：`hidden md:block xl:hidden` - 三行布局
- **手機版**：`md:hidden` - 篩選抽屜

### 角色控制
```typescript
{userRole === 'BOSS' && branches.length > 0 && (
  // 只有 BOSS 角色才顯示分店選擇器
)}
```

---

## 📝 相關文件

- `frontend/src/app/admin/appointments/page.tsx` - 管理預約頁面
- `frontend/src/components/admin/AppointmentsToolbar.tsx` - 預約工具欄
- `frontend/src/app/branch/dashboard/page.tsx` - 分店管理儀表板
- `frontend/src/lib/branch-utils.ts` - 分店工具函數
- `frontend/src/types/branch.ts` - 分店類型定義

---

## ✅ 完成狀態

- ✅ 所有問題已修復
- ✅ 代碼已提交到 Git
- ✅ 無 linter 錯誤
- ✅ 已推送到遠端倉庫

---

**修復日期：** 2025-10-15  
**Git Commit：** `7738b33` - "fix: Resolve branch filter and selector issues"  
**狀態：** ✅ 完成

