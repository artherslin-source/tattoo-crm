"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Branch {
  id: string;
  name: string;
}

interface OrdersToolbarProps {
  sortField: string;
  sortOrder: 'asc' | 'desc';
  itemsPerPage: number;
  search: string;
  branchId: string;
  status: string;
  branches?: Branch[];
  onSortFieldChange: (value: string) => void;
  onSortOrderToggle: () => void;
  onItemsPerPageChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export default function OrdersToolbar({
  sortField,
  sortOrder,
  itemsPerPage,
  search,
  branchId,
  status,
  branches = [],
  onSortFieldChange,
  onSortOrderToggle,
  onItemsPerPageChange,
  onSearchChange,
  onBranchChange,
  onStatusChange,
}: OrdersToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-gray-200/50 dark:border-gray-700/50">
      {/* 桌機版 (≥1280px) - 橫向展開 */}
      <div className="hidden xl:block">
        <div className="flex items-center gap-4">
          {/* 搜尋框 */}
          <div className="flex-1">
            <input 
              className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="搜尋訂單ID / 客戶姓名 / Email…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 篩選器 */}
          <div className="flex items-center gap-3">
            <Select value={branchId} onValueChange={onBranchChange}>
              <SelectTrigger className="h-10 w-32">
                <SelectValue placeholder="分店" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部分店</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-10 w-28">
                <SelectValue placeholder="狀態" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="PENDING_PAYMENT">待結帳</SelectItem>
                <SelectItem value="PAID">已付款</SelectItem>
                <SelectItem value="COMPLETED">已完成</SelectItem>
                <SelectItem value="CANCELLED">已取消</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 排序和分頁控制 */}
          <div className="flex items-center gap-3">
            <Select value={sortField} onValueChange={onSortFieldChange}>
              <SelectTrigger className="h-10 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="createdAt">建立時間</SelectItem>
                <SelectItem value="totalAmount">訂單金額</SelectItem>
                <SelectItem value="status">訂單狀態</SelectItem>
                <SelectItem value="customerName">客戶姓名</SelectItem>
                <SelectItem value="customerEmail">客戶Email</SelectItem>
                <SelectItem value="branch">分店</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={onSortOrderToggle}
              className="h-10 w-20 flex items-center justify-center gap-1"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="h-3 w-3" />
                  <span className="text-xs">升序</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3" />
                  <span className="text-xs">降序</span>
                </>
              )}
            </Button>

            <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
              <SelectTrigger className="h-10 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 平板版 (768px ~ 1279px) - 優化的兩行布局 */}
      <div className="hidden md:block xl:hidden">
        <div className="space-y-4">
          {/* 第一行：搜尋框 - 加大並優化樣式 */}
          <div>
            <input 
              className="h-12 w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 text-base bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
              placeholder="🔍 搜尋訂單編號、客戶姓名或 Email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 第二行：所有控制項 - 優化間距和大小 */}
          <div className="flex items-center gap-3">
            {/* 篩選器組 */}
            <div className="flex items-center gap-2 flex-1">
              <Select value={branchId} onValueChange={onBranchChange}>
                <SelectTrigger className="h-11 flex-1 text-base font-medium">
                  <SelectValue placeholder="📍 分店" />
                </SelectTrigger>
                <SelectContent className="bg-white/85">
                  <SelectItem value="all">全部分店</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={onStatusChange}>
                <SelectTrigger className="h-11 flex-1 text-base font-medium">
                  <SelectValue placeholder="🏷️ 狀態" />
                </SelectTrigger>
                <SelectContent className="bg-white/85">
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="PENDING_PAYMENT">待結帳</SelectItem>
                  <SelectItem value="PAID">已付款</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 排序控制組 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={sortField} onValueChange={onSortFieldChange}>
                <SelectTrigger className="h-11 w-36 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/85">
                  <SelectItem value="createdAt">⏰ 建立時間</SelectItem>
                  <SelectItem value="totalAmount">💰 訂單金額</SelectItem>
                  <SelectItem value="status">📊 訂單狀態</SelectItem>
                  <SelectItem value="customerName">👤 客戶姓名</SelectItem>
                  <SelectItem value="customerEmail">📧 客戶Email</SelectItem>
                  <SelectItem value="branch">🏢 分店</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="default"
                onClick={onSortOrderToggle}
                className="h-11 w-11 p-0 flex items-center justify-center"
              >
                {sortOrder === 'asc' ? (
                  <ArrowUp className="h-5 w-5" />
                ) : (
                  <ArrowDown className="h-5 w-5" />
                )}
              </Button>

              <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
                <SelectTrigger className="h-11 w-20 text-base font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/85">
                  <SelectItem value="5">5 筆</SelectItem>
                  <SelectItem value="10">10 筆</SelectItem>
                  <SelectItem value="20">20 筆</SelectItem>
                  <SelectItem value="50">50 筆</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 手機版 (< 768px) - 保持原有設計但稍作優化 */}
      <div className="md:hidden">
        <div className="space-y-3">
          {/* 搜尋框 */}
          <div>
            <input 
              className="h-11 w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 text-base bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              placeholder="🔍 搜尋訂單..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 篩選按鈕 */}
          <Button
            variant="outline"
            size="default"
            onClick={() => setIsFilterOpen(true)}
            className="h-11 w-full flex items-center justify-center gap-2 font-medium"
          >
            <Filter className="h-5 w-5" />
            <span>篩選和排序</span>
          </Button>
        </div>

        {/* 篩選對話框 */}
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">篩選和排序</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              {/* 分店篩選 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">📍 選擇分店</label>
                <Select value={branchId} onValueChange={(value) => { onBranchChange(value); }}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="選擇分店" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="all">全部分店</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 狀態篩選 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">🏷️ 訂單狀態</label>
                <Select value={status} onValueChange={(value) => { onStatusChange(value); }}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="all">全部狀態</SelectItem>
                    <SelectItem value="PENDING_PAYMENT">待結帳</SelectItem>
                    <SelectItem value="PAID">已付款</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="CANCELLED">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序欄位 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">📊 排序方式</label>
                <Select value={sortField} onValueChange={(value) => { onSortFieldChange(value); }}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="createdAt">⏰ 建立時間</SelectItem>
                    <SelectItem value="totalAmount">💰 訂單金額</SelectItem>
                    <SelectItem value="status">📊 訂單狀態</SelectItem>
                    <SelectItem value="customerName">👤 客戶姓名</SelectItem>
                    <SelectItem value="customerEmail">📧 客戶Email</SelectItem>
                    <SelectItem value="branch">🏢 分店</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序方向 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">🔄 排序方向</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={sortOrder === 'asc' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => { if (sortOrder !== 'asc') onSortOrderToggle(); }}
                    className="h-12 flex items-center justify-center gap-2 font-medium"
                  >
                    <ArrowUp className="h-5 w-5" />
                    <span>升序</span>
                  </Button>
                  <Button
                    variant={sortOrder === 'desc' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => { if (sortOrder !== 'desc') onSortOrderToggle(); }}
                    className="h-12 flex items-center justify-center gap-2 font-medium"
                  >
                    <ArrowDown className="h-5 w-5" />
                    <span>降序</span>
                  </Button>
                </div>
              </div>

              {/* 每頁顯示數量 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">📄 每頁顯示</label>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => { onItemsPerPageChange(value); }}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="5">5 筆</SelectItem>
                    <SelectItem value="10">10 筆</SelectItem>
                    <SelectItem value="20">20 筆</SelectItem>
                    <SelectItem value="50">50 筆</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 操作按鈕 */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 h-12 font-medium"
                >
                  完成
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
