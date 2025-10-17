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

interface MembersTableProps {
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
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'Silver':
      return 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark';
    case 'Gold':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Platinum':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark';
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

export default function MembersTable({
  members,
  onTopUp,
  onSpend,
  onAdjustBalance,
  onViewHistory,
  onResetPassword,
  onDelete,
  getUserRole,
}: MembersTableProps) {
  return (
    <div className="hidden xl:block">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 responsive-table">
          <thead>
            <tr className="text-xs text-text-muted-light border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left w-[22%] font-medium">姓名 / Email</th>
              <th className="px-4 py-3 text-left w-[10%] md:table-cell hidden font-medium">分店</th>
              <th className="px-4 py-3 text-left w-[10%] lg:table-cell hidden font-medium">角色</th>
              <th className="px-4 py-3 text-right w-[12%] font-medium">累計消費</th>
              <th className="px-4 py-3 text-left w-[10%] lg:table-cell hidden font-medium">會員等級</th>
              <th className="px-4 py-3 text-right w-[12%] xl:table-cell hidden font-medium">儲值餘額</th>
              <th className="px-2 py-3 text-left w-[12%] xl:table-cell hidden font-medium">註冊時間</th>
              <th className="px-2 py-3 text-right w-[12%] font-medium">操作</th>
            </tr>
          </thead>

          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3" data-label="姓名 / Email">
                  <div className="font-medium">{member.user?.name || '未設定'}</div>
                  <div className="text-text-muted-light text-xs truncate">{member.user?.email || 'N/A'}</div>
                </td>

                <td className="px-4 py-3 md:table-cell hidden" data-label="分店">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {member.user?.branch?.name || '未分配'}
                  </span>
                </td>

                <td className="px-4 py-3 lg:table-cell hidden" data-label="角色">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    member.user?.role === 'ADMIN' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {member.user?.role === 'ADMIN' ? '管理員' : '會員'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right tabular-nums" data-label="累計消費">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(member.totalSpent)}
                  </span>
                </td>

                <td className="px-4 py-3 lg:table-cell hidden" data-label="會員等級">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${getLevelBadgeClass(member.membershipLevel)}`}>
                    {member.membershipLevel || '未設定'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right tabular-nums xl:table-cell hidden" data-label="儲值餘額">
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {formatCurrency(member.balance)}
                  </span>
                </td>

                <td className="px-2 py-3 xl:table-cell hidden text-text-muted-light text-sm" data-label="註冊時間">
                  {member.user?.createdAt ? formatDate(member.user.createdAt) : 'N/A'}
                </td>

                {/* 操作：主按鈕 + 更多選單 */}
                <td className="px-2 py-3 text-right" data-label="操作">
                  <div className="inline-flex items-center gap-1">
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
                        <Button variant="outline" size="sm" className="px-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800">
                        {['BOSS', 'BRANCH_MANAGER', 'SUPER_ADMIN'].includes(getUserRole()) && (
                          <>
                            <DropdownMenuItem onClick={() => onSpend(member)}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              消費
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAdjustBalance(member)}>
                              <Wallet className="h-4 w-4 mr-2" />
                              調整餘額
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => onViewHistory(member.id)}>
                          <History className="h-4 w-4 mr-2" />
                          查看儲值紀錄
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onResetPassword(member)}>
                          <Key className="h-4 w-4 mr-2" />
                          重設密碼
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(member.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
