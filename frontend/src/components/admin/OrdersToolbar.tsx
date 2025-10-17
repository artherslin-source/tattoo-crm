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
      {/* 桌機版 (≥1024px) - 橫向展開 */}
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

      {/* 平板版 (768px ~ 1023px) - 三行布局 */}
      <div className="hidden md:block xl:hidden">
        <div className="space-y-3">
          {/* 第一行：搜尋框 */}
          <div>
            <input 
              className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="搜尋訂單ID / 客戶姓名 / Email…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 第二行：篩選器 - 二等分 */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={branchId} onValueChange={onBranchChange}>
              <SelectTrigger className="h-10 w-full">
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
              <SelectTrigger className="h-10 w-full">
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

          {/* 第三行：排序和分頁控制 - 三等分 */}
          <div className="grid grid-cols-3 gap-2">
            <Select value={sortField} onValueChange={onSortFieldChange}>
              <SelectTrigger className="h-10 w-full">
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
              className="h-10 w-full flex items-center justify-center gap-1"
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
              <SelectTrigger className="h-10 w-full">
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

      {/* 手機版 (<768px) - 篩選抽屜 */}
      <div className="md:hidden">
        <div className="space-y-3">
          {/* 第一行：搜尋框 */}
          <div>
            <input 
              className="h-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              placeholder="搜尋訂單ID / 客戶姓名 / Email…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 第二行：篩選條件按鈕 */}
          <div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(true)}
              className="h-10 w-full flex items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4" />
              篩選條件
            </Button>
          </div>
        </div>

        {/* 篩選抽屜 */}
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="max-w-full sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                篩選條件
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFilterOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* 分店篩選 */}
              <div>
                <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2 block">分店</label>
                <Select value={branchId} onValueChange={onBranchChange}>
                  <SelectTrigger className="h-10 w-full">
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
              <div>
                <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2 block">狀態</label>
                <Select value={status} onValueChange={onStatusChange}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="選擇狀態" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="all">全部狀態</SelectItem>
                    <SelectItem value="PAID">已付款</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                    <SelectItem value="CANCELLED">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序依據 */}
              <div>
                <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2 block">排序依據</label>
                <Select value={sortField} onValueChange={onSortFieldChange}>
                  <SelectTrigger className="h-10 w-full">
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
              </div>

              {/* 排序方向 */}
              <div>
                <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2 block">排序方向</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSortOrderToggle}
                  className="h-10 w-full flex items-center justify-center gap-2"
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      <span>升序</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4" />
                      <span>降序</span>
                    </>
                  )}
                </Button>
              </div>

              {/* 每頁顯示 */}
              <div>
                <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2 block">每頁顯示</label>
                <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
                  <SelectTrigger className="h-10 w-full">
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

              {/* 確認按鈕 */}
              <div className="pt-4">
                <Button
                  onClick={() => setIsFilterOpen(false)}
                  className="h-10 w-full"
                >
                  確認篩選
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
