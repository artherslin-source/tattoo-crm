"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import InstallmentManager from "./InstallmentManager";

interface Order {
  id: string;
  totalAmount: number;
  finalAmount: number;
  paymentType: 'ONE_TIME' | 'INSTALLMENT';
  isInstallment: boolean;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'COMPLETED' | 'INSTALLMENT_ACTIVE' | 'PARTIALLY_PAID' | 'PAID_COMPLETE';
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
  installments: {
    id: string;
    installmentNo: number;
    dueDate: string;
    amount: number;
    status: 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paidAt?: string;
    paymentMethod?: string;
    notes?: string;
  }[];
}

interface OrdersCardsProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onCheckout: (order: Order) => void;
  onPaymentRecorded: (installmentId: string, paymentData: { paymentMethod: string; notes?: string }) => Promise<void>;
  onInstallmentUpdated: (installmentId: string, updateData: { dueDate: string; notes?: string }) => Promise<void>;
  onInstallmentAmountAdjusted: (orderId: string, installmentNo: number, newAmount: number) => Promise<void>;
  userRole: string;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'PAID':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'INSTALLMENT_ACTIVE':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'PARTIALLY_PAID':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case 'PAID_COMPLETE':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    default:
      return 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return '待結帳';
    case 'PAID':
      return '已付款';
    case 'COMPLETED':
      return '已完成';
    case 'CANCELLED':
      return '已取消';
    case 'INSTALLMENT_ACTIVE':
      return '分期中';
    case 'PARTIALLY_PAID':
      return '部分付款';
    case 'PAID_COMPLETE':
      return '分期完成';
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

export default function OrdersCards({ 
  orders, 
  onViewDetails, 
  onUpdateStatus, 
  onCheckout,
  onPaymentRecorded,
  onInstallmentUpdated,
  onInstallmentAmountAdjusted,
  userRole
}: OrdersCardsProps) {
  return (
    <div className="xl:hidden">
      {/* 平板版 - 橫向布局 */}
      <div className="hidden md:block">
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 text-on-dark shadow-sm">
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
                  <div className="text-sm text-on-dark-muted truncate">
                    {order.member.name || '未設定'} • {order.member.email}
                  </div>
                </div>

                {/* 中間：金額資訊 */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-xs text-on-dark-subtle">訂單金額</div>
                    <div className="text-lg font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-on-dark-subtle">建立時間</div>
                    <div className="text-sm text-on-dark-muted">
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
                  <DropdownMenuContent align="end" className="bg-[color-mix(in_srgb,var(--paper)_94%,#fff)] text-on-light">
                      {order.status === 'PENDING_PAYMENT' && (
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
                      {(order.status === 'PENDING_PAYMENT' || order.status === 'PAID') && (
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
                          onClick={() => onUpdateStatus(order, 'PENDING_PAYMENT')}
                          className="text-yellow-600 focus:text-yellow-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          重新開啟訂單
                        </DropdownMenuItem>
                      )}
                      {(order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID') && (
                        <DropdownMenuItem onClick={() => onViewDetails(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看分期詳情
                        </DropdownMenuItem>
                      )}
                      {(order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID') && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(order, 'COMPLETED')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          標記為已完成
                        </DropdownMenuItem>
                      )}
                      {(order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID') && (
                        <DropdownMenuItem 
                          onClick={() => onUpdateStatus(order, 'CANCELLED')}
                          className="text-red-600 focus:text-red-600"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          取消訂單
                        </DropdownMenuItem>
                      )}
                      {order.status === 'PAID_COMPLETE' && (
                        <DropdownMenuItem onClick={() => onViewDetails(order)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看分期詳情
                        </DropdownMenuItem>
                      )}
                      {order.status === 'PENDING_PAYMENT' && onCheckout && (
                        <DropdownMenuItem onClick={() => onCheckout(order)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          結帳
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
          <div key={order.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 text-on-dark shadow-sm">
            <div className="space-y-3">
              {/* 訂單標題和狀態 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold">訂單 #{order.id.slice(-8)}</div>
                  <div className="text-xs text-on-dark-subtle mt-1">
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
                  <div className="text-xs text-on-dark-subtle">分店</div>
                  <div className="font-medium">{order.branch?.name || '未分配'}</div>
                </div>
                <div>
                  <div className="text-xs text-on-dark-subtle">訂單金額</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-on-dark-subtle">建立時間</div>
                  <div className="text-sm text-on-dark-muted">{formatDate(order.createdAt)}</div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[color-mix(in_srgb,var(--panel)_85%,#fff)]">
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
                  <DropdownMenuContent align="end" className="bg-[color-mix(in_srgb,var(--paper)_94%,#fff)] text-on-light">
                    {order.status === 'PENDING_PAYMENT' && (
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
                    {(order.status === 'PENDING_PAYMENT' || order.status === 'PAID') && (
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
                        onClick={() => onUpdateStatus(order, 'PENDING_PAYMENT')}
                        className="text-yellow-600 focus:text-yellow-600"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        重新開啟訂單
                      </DropdownMenuItem>
                    )}
                    {(order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID') && (
                      <DropdownMenuItem onClick={() => onViewDetails(order)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看分期詳情
                      </DropdownMenuItem>
                    )}
                    {(order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID') && (
                      <DropdownMenuItem onClick={() => onUpdateStatus(order, 'COMPLETED')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        標記為已完成
                      </DropdownMenuItem>
                    )}
                    {(order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID') && (
                      <DropdownMenuItem 
                        onClick={() => onUpdateStatus(order, 'CANCELLED')}
                        className="text-red-600 focus:text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        取消訂單
                      </DropdownMenuItem>
                    )}
                    {order.status === 'PAID_COMPLETE' && (
                      <DropdownMenuItem onClick={() => onViewDetails(order)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看分期詳情
                      </DropdownMenuItem>
                    )}
                    {order.status === 'PENDING_PAYMENT' && onCheckout && (
                      <DropdownMenuItem onClick={() => onCheckout(order)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        結帳
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* InstallmentManager for managing installments */}
      {orders.some(order => order.isInstallment && (order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID' || order.status === 'PAID_COMPLETE')) && (
        <div className="mt-6">
          {orders
            .filter(order => order.isInstallment && (order.status === 'INSTALLMENT_ACTIVE' || order.status === 'PARTIALLY_PAID' || order.status === 'PAID_COMPLETE'))
            .map(order => (
              <div key={order.id} className="mb-4">
                <InstallmentManager
                  order={order}
                  onPaymentRecorded={onPaymentRecorded}
                  onInstallmentUpdated={onInstallmentUpdated}
                  onInstallmentAmountAdjusted={onInstallmentAmountAdjusted}
                  userRole={userRole}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
