"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, DollarSign, ShoppingCart, Wallet, History, Key, Trash2 } from "lucide-react";

interface Member {
  id: string;
  totalSpent: number;
  balance: number;
  membershipLevel?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'MEMBER' | 'ADMIN';
    status: string;
    createdAt: string;
    updatedAt: string;
    branch?: {
      id: string;
      name: string;
    };
  };
}

interface MembersCardsProps {
  members: Member[];
  onTopUp: (member: Member) => void;
  onSpend: (member: Member) => void;
  onAdjustBalance: (member: Member) => void;
  onViewHistory: (memberId: string) => void;
  onResetPassword: (member: Member) => void;
  onDelete: (memberId: string) => void;
  getUserRole: () => string;
}

// 會員等級徽章樣式
const getLevelBadgeClass = (level?: string) => {
  switch (level) {
    case 'Bronze':
      return 'level-tag-bronze';
    case 'Silver':
      return 'level-tag-silver';
    case 'Gold':
      return 'level-tag-gold';
    case 'Platinum':
      return 'level-tag-platinum';
    default:
      return 'level-tag-default';
  }
};

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW');
};

// 格式化金額
const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined || amount === null) return "NT$ 0";
  return `NT$ ${amount.toLocaleString()}`;
};

export default function MembersCards({
  members,
  onTopUp,
  onSpend,
  onAdjustBalance,
  onViewHistory,
  onResetPassword,
  onDelete,
  getUserRole,
}: MembersCardsProps) {
  return (
    <div className="xl:hidden space-y-3">
      {members.map((member) => (
        <div key={member.id} className="rounded-xl border bg-white p-4 shadow-sm">
          {/* 平板版本：橫向佈局 */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between gap-4">
              {/* 左側：基本資訊 */}
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <div className="text-lg font-semibold mb-1">{member.user?.name || '未設定'}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full px-2 py-0.5 text-xs branch-tag">
                      {member.user?.branch?.name || '未分配'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      member.user?.role === 'ADMIN' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {member.user?.role === 'ADMIN' ? '管理員' : '會員'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getLevelBadgeClass(member.membershipLevel)}`}>
                      {member.membershipLevel || '未設定'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-text-muted-light truncate">{member.user?.email || 'N/A'}</div>
              </div>

              {/* 中間：金額資訊 */}
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-center">
                  <div className="text-xs text-text-muted-light">累計消費</div>
                  <div className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {formatCurrency(member.totalSpent)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-text-muted-light">儲值餘額</div>
                  <div className="text-lg font-semibold tabular-nums text-purple-600 dark:text-purple-400">
                    {formatCurrency(member.balance)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-text-muted-light">註冊時間</div>
                  <div className="text-sm text-text-muted-light">
                    {member.user?.createdAt ? formatDate(member.user.createdAt) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* 右側：操作按鈕 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* 主按鈕：儲值 */}
                {['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(getUserRole()) && (
                  <Button
                    size="sm"
                    onClick={() => onTopUp(member)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 min-w-[80px]"
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    儲值
                  </Button>
                )}

                {/* 更多選單 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2 action-menu-btn">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white dark:bg-white">
                    {['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(getUserRole()) && (
                      <>
                        <DropdownMenuItem onClick={() => onSpend(member)} className="dropdown-menu-item">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          消費
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdjustBalance(member)} className="dropdown-menu-item">
                          <Wallet className="h-4 w-4 mr-2" />
                          調整餘額
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => onViewHistory(member.id)} className="dropdown-menu-item">
                      <History className="h-4 w-4 mr-2" />
                      查看儲值紀錄
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onResetPassword(member)} className="dropdown-menu-item">
                      <Key className="h-4 w-4 mr-2" />
                      重設密碼
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(member.id)}
                      className="dropdown-menu-item-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      刪除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* 手機版本：垂直佈局 */}
          <div className="md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-base font-semibold">{member.user?.name || '未設定'}</div>
                <div className="text-xs text-text-muted-light">{member.user?.email || 'N/A'}</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="rounded-full px-2 py-0.5 text-xs branch-tag">
                    {member.user?.branch?.name || '未分配'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    member.user?.role === 'ADMIN' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {member.user?.role === 'ADMIN' ? '管理員' : '會員'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${getLevelBadgeClass(member.membershipLevel)}`}>
                    {member.membershipLevel || '未設定'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-text-muted-light">累計消費</div>
                <div className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatCurrency(member.totalSpent)}
                </div>
              </div>
            </div>

            <details className="mt-2">
              <summary className="text-xs text-text-muted-light cursor-pointer hover:text-text-primary-light">
                更多細節
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="text-text-muted-light">儲值餘額</div>
                <div className="text-right tabular-nums font-medium text-purple-600 dark:text-purple-400">
                  {formatCurrency(member.balance)}
                </div>
                <div className="text-text-muted-light">註冊時間</div>
                <div className="text-right text-text-muted-light">
                  {member.user?.createdAt ? formatDate(member.user.createdAt) : 'N/A'}
                </div>
              </div>
            </details>

            <div className="mt-3 flex items-center justify-end gap-2">
              {/* 主按鈕：儲值 */}
              {['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(getUserRole()) && (
                <Button
                  size="sm"
                  onClick={() => onTopUp(member)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  儲值
                </Button>
              )}

              {/* 更多選單 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="action-menu-btn">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-white">
                  {['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(getUserRole()) && (
                    <>
                      <DropdownMenuItem onClick={() => onSpend(member)} className="dropdown-menu-item">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        消費
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAdjustBalance(member)} className="dropdown-menu-item">
                        <Wallet className="h-4 w-4 mr-2" />
                        調整餘額
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onViewHistory(member.id)} className="dropdown-menu-item">
                    <History className="h-4 w-4 mr-2" />
                    查看儲值紀錄
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onResetPassword(member)} className="dropdown-menu-item">
                    <Key className="h-4 w-4 mr-2" />
                    重設密碼
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(member.id)}
                    className="dropdown-menu-item-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    刪除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
