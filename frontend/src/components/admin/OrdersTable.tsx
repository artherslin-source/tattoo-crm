"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

interface Order {
  id: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
  member: {
    id: string;
    name: string | null;
    email: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

interface OrdersTableProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'PAID':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'PENDING':
      return '待付款';
    case 'PAID':
      return '已付款';
    case 'COMPLETED':
      return '已完成';
    case 'CANCELLED':
      return '已取消';
    default:
      return status;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrdersTable({ orders, onViewDetails, onUpdateStatus }: OrdersTableProps) {
  return (
    <div className="hidden xl:block">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-2 text-left w-[20%]">訂單ID / 客戶</th>
              <th className="px-4 py-2 text-left w-[12%] md:table-cell hidden">分店</th>
              <th className="px-4 py-2 text-left w-[10%] lg:table-cell hidden">狀態</th>
              <th className="px-4 py-2 text-right w-[12%]">訂單金額</th>
              <th className="px-4 py-2 text-left w-[14%] xl:table-cell hidden">建立時間</th>
              <th className="px-4 py-2 text-right w-[12%]">操作</th>
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="odd:bg-gray-50">
                <td className="px-4 py-3" data-label="訂單ID / 客戶">
                  <div className="font-medium text-sm">{order.id.slice(-8)}</div>
                  <div className="text-gray-500 text-xs truncate">
                    {order.member.name || '未設定'}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {order.member.email}
                  </div>
                </td>
                <td className="px-4 py-3 md:table-cell hidden" data-label="分店">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {order.branch?.name || '未分配'}
                  </span>
                </td>
                <td className="px-4 py-3 lg:table-cell hidden" data-label="狀態">
                  <Badge className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(order.status)}`}>
                    {getStatusText(order.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums" data-label="訂單金額">
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </td>
                <td className="px-4 py-3 xl:table-cell hidden text-gray-500 text-sm" data-label="建立時間">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-4 py-3 text-right" data-label="操作">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => onViewDetails(order)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 min-w-[60px]"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      查看
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white/85">
                        {order.status === 'PENDING' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(order, 'PAID')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            標記為已付款
                          </DropdownMenuItem>
                        )}
                        {order.status === 'PAID' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(order, 'COMPLETED')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            標記為已完成
                          </DropdownMenuItem>
                        )}
                        {(order.status === 'PENDING' || order.status === 'PAID') && (
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(order, 'CANCELLED')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            取消訂單
                          </DropdownMenuItem>
                        )}
                        {order.status === 'COMPLETED' && (
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(order, 'PAID')}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            重新開啟為已付款
                          </DropdownMenuItem>
                        )}
                        {order.status === 'CANCELLED' && (
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(order, 'PENDING')}
                            className="text-yellow-600 focus:text-yellow-600"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            重新開啟訂單
                          </DropdownMenuItem>
                        )}
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
