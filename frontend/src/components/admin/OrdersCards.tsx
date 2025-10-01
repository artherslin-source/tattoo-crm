"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Eye, Clock } from "lucide-react";

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

interface OrdersCardsProps {
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

export default function OrdersCards({ orders, onViewDetails, onUpdateStatus }: OrdersCardsProps) {
  return (
    <div className="xl:hidden">
      {/* 平板版 - 橫向布局 */}
      <div className="hidden md:block">
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                {/* 左側：基本資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <div className="text-lg font-semibold mb-1">訂單 #{order.id.slice(-8)}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                        {order.branch?.name || '未分配'}
                      </span>
                      <Badge className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(order.status)}`}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {order.member.name || '未設定'} • {order.member.email}
                  </div>
                </div>

                {/* 中間：金額資訊 */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">訂單金額</div>
                    <div className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">建立時間</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>
                </div>

                {/* 右側：操作按鈕 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* 主按鈕：查看 */}
                  <Button
                    size="sm"
                    onClick={() => onViewDetails(order)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 min-w-[80px]"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    查看
                  </Button>

                  {/* 更多選單 */}
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 手機版 - 垂直卡片布局 */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="space-y-3">
              {/* 訂單標題和狀態 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">訂單 #{order.id.slice(-8)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {order.member.name || '未設定'} • {order.member.email}
                  </div>
                </div>
                <Badge className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(order.status)}`}>
                  {getStatusText(order.status)}
                </Badge>
              </div>

              {/* 詳細資訊 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 text-xs">分店</div>
                  <div className="font-medium">{order.branch?.name || '未分配'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">訂單金額</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-500 text-xs">建立時間</div>
                  <div className="text-sm">{formatDate(order.createdAt)}</div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  size="sm"
                  onClick={() => onViewDetails(order)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 min-w-[80px]"
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
