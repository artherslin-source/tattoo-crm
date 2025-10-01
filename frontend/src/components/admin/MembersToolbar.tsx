"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MembersToolbarProps {
  sortField: string;
  sortOrder: 'asc' | 'desc';
  itemsPerPage: number;
  search: string;
  branchId: string;
  role: string;
  membershipLevel: string;
  onSortFieldChange: (field: string) => void;
  onSortOrderToggle: () => void;
  onItemsPerPageChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onMembershipLevelChange: (value: string) => void;
}

export default function MembersToolbar({
  sortField,
  sortOrder,
  itemsPerPage,
  search,
  branchId,
  role,
  membershipLevel,
  onSortFieldChange,
  onSortOrderToggle,
  onItemsPerPageChange,
  onSearchChange,
  onBranchChange,
  onRoleChange,
  onMembershipLevelChange,
}: MembersToolbarProps) {
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
              placeholder="搜尋姓名 / Email…"
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
                <SelectItem value="cmg7dp8t10001sbdjirjya7tp">三重店</SelectItem>
                <SelectItem value="cmg7dp8t20002sbdj7go17bx0">東港店</SelectItem>
              </SelectContent>
            </Select>

            <Select value={role} onValueChange={onRoleChange}>
              <SelectTrigger className="h-10 w-24">
                <SelectValue placeholder="角色" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="MEMBER">會員</SelectItem>
                <SelectItem value="ADMIN">管理員</SelectItem>
              </SelectContent>
            </Select>

            <Select value={membershipLevel} onValueChange={onMembershipLevelChange}>
              <SelectTrigger className="h-10 w-28">
                <SelectValue placeholder="等級" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部等級</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
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
                <SelectItem value="name">姓名</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="branch">分店</SelectItem>
                <SelectItem value="role">角色</SelectItem>
                <SelectItem value="totalSpent">累計消費</SelectItem>
                <SelectItem value="membershipLevel">會員等級</SelectItem>
                <SelectItem value="balance">儲值餘額</SelectItem>
                <SelectItem value="createdAt">註冊時間</SelectItem>
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
              placeholder="搜尋姓名 / Email…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* 第二行：篩選器 - 三等分 */}
          <div className="grid grid-cols-3 gap-2">
            <Select value={branchId} onValueChange={onBranchChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="分店" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部分店</SelectItem>
                <SelectItem value="cmg7dp8t10001sbdjirjya7tp">三重店</SelectItem>
                <SelectItem value="cmg7dp8t20002sbdj7go17bx0">東港店</SelectItem>
              </SelectContent>
            </Select>

            <Select value={role} onValueChange={onRoleChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="角色" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="MEMBER">會員</SelectItem>
                <SelectItem value="ADMIN">管理員</SelectItem>
              </SelectContent>
            </Select>

            <Select value={membershipLevel} onValueChange={onMembershipLevelChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="等級" />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="all">全部等級</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 第三行：排序和分頁控制 - 平均分佈 */}
          <div className="grid grid-cols-3 gap-2">
            <Select value={sortField} onValueChange={onSortFieldChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="name">姓名</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="branch">分店</SelectItem>
                <SelectItem value="role">角色</SelectItem>
                <SelectItem value="totalSpent">累計消費</SelectItem>
                <SelectItem value="membershipLevel">會員等級</SelectItem>
                <SelectItem value="balance">儲值餘額</SelectItem>
                <SelectItem value="createdAt">註冊時間</SelectItem>
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
              placeholder="搜尋姓名 / Email…"
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
          <DialogContent className="sm:max-w-md">
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">分店</label>
                <Select value={branchId} onValueChange={onBranchChange}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="選擇分店" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="all">全部分店</SelectItem>
                    <SelectItem value="cmg7dp8t10001sbdjirjya7tp">三重店</SelectItem>
                    <SelectItem value="cmg7dp8t20002sbdj7go17bx0">東港店</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 角色篩選 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">角色</label>
                <Select value={role} onValueChange={onRoleChange}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="選擇角色" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="all">全部角色</SelectItem>
                    <SelectItem value="MEMBER">會員</SelectItem>
                    <SelectItem value="ADMIN">管理員</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 會員等級篩選 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">等級</label>
                <Select value={membershipLevel} onValueChange={onMembershipLevelChange}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="選擇等級" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="all">全部等級</SelectItem>
                    <SelectItem value="Bronze">Bronze</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序依據 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">排序依據</label>
                <Select value={sortField} onValueChange={onSortFieldChange}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/85">
                    <SelectItem value="name">姓名</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="branch">分店</SelectItem>
                    <SelectItem value="role">角色</SelectItem>
                    <SelectItem value="totalSpent">累計消費</SelectItem>
                    <SelectItem value="membershipLevel">會員等級</SelectItem>
                    <SelectItem value="balance">儲值餘額</SelectItem>
                    <SelectItem value="createdAt">註冊時間</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 排序方向 */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">排序方向</label>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">每頁顯示</label>
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
