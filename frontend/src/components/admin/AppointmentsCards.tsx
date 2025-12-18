"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Clock, Eye, Trash2 } from "lucide-react";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: 'INTENT' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
  notes: string | null;
  createdAt: string;
  orderId: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    durationMin: number;
  } | null;
  artist: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  };
  order?: {
    id: string;
    totalAmount: number;
    finalAmount: number;
    status: string;
    paymentType: string;
  };
  cartSnapshot?: {
    items: Array<{
      serviceId: string;
      serviceName: string;
      selectedVariants: Record<string, unknown>;
      basePrice: number;
      finalPrice: number;
      estimatedDuration: number;
      notes?: string;
    }>;
    totalPrice: number;
    totalDuration: number;
  };
}

interface AppointmentsCardsProps {
  appointments: Appointment[];
  onViewDetails: (appointment: Appointment) => void;
  onUpdateStatus: (appointment: Appointment, status: string) => void;
  onDelete: (appointmentId: string) => void;
}

export default function AppointmentsCards({
  appointments,
  onViewDetails,
  onUpdateStatus,
  onDelete,
}: AppointmentsCardsProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'INTENT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CANCELED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'NO_SHOW':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'INTENT':
        return '意向';
      case 'PENDING':
        return '待確認';
      case 'CONFIRMED':
        return '已確認';
      case 'IN_PROGRESS':
        return '進行中';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELED':
        return '已取消';
      case 'NO_SHOW':
        return '未到場';
      default:
        return status;
    }
  };

  const getOrderStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'PENDING_PAYMENT':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PAID_COMPLETE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'INSTALLMENT_ACTIVE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PARTIALLY_PAID':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark';
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '未付款';
      case 'PENDING_PAYMENT':
        return '待結帳';
      case 'PAID':
        return '已付款';
      case 'PAID_COMPLETE':
        return '已結清';
      case 'INSTALLMENT_ACTIVE':
        return '分期付款中';
      case 'PARTIALLY_PAID':
        return '部分付款';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
    }).format(amount);
  };

  return (
    <div className="xl:hidden">
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 text-on-dark shadow-sm">
            {/* 平板版 (768px ~ 1023px) - 橫向布局 */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between gap-4">
                {/* 左側：基本資訊 */}
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <div className="text-lg font-semibold mb-1">{formatDate(appointment.startAt)}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                        {appointment.branch?.name || '未分配'}
                      </span>
                      <span className="text-sm text-on-dark-muted">
                        {appointment.artist?.name || '未分配'}
                      </span>
                      <Badge className={`text-xs ${getStatusBadgeClass(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </Badge>
                      {appointment.order && (
                        <Badge className={`text-xs ${getOrderStatusBadgeClass(appointment.order.status)}`}>
                          {getOrderStatusText(appointment.order.status)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-on-dark-subtle">
                    <div>{appointment.user?.name || '未設定'} ({appointment.user?.phone || 'N/A'})</div>
                    {appointment.cartSnapshot && appointment.cartSnapshot.items.length > 0 ? (
                      <div className="text-blue-400">
                        購物車 ({appointment.cartSnapshot.items.length} 項) - {formatCurrency(appointment.cartSnapshot.totalPrice)}
                      </div>
                    ) : (
                      <div>{appointment.service?.name || '未設定'} - {appointment.service?.price ? formatCurrency(appointment.service.price) : 'N/A'}</div>
                    )}
                  </div>
                </div>

                {/* 右側：操作按鈕 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* 主按鈕：查看 */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(appointment)}
                    className="px-4 min-w-[80px]"
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
                      {appointment.status === 'PENDING' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CONFIRMED')}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            確認預約
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CANCELED')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            取消預約
                          </DropdownMenuItem>
                        </>
                      )}
                      {appointment.status === 'CONFIRMED' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'IN_PROGRESS')}
                            className="text-purple-600 focus:text-purple-600"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            開始進行
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'COMPLETED')}
                            className="text-green-600 focus:text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            標記完成
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CANCELED')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            取消預約
                          </DropdownMenuItem>
                        </>
                      )}
                      {appointment.status === 'IN_PROGRESS' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'COMPLETED')}
                            className="text-green-600 focus:text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            標記完成
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CONFIRMED')}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            回到已確認
                          </DropdownMenuItem>
                        </>
                      )}
                      {appointment.status === 'COMPLETED' && (
                        <DropdownMenuItem 
                          onClick={() => onUpdateStatus(appointment, 'CONFIRMED')}
                          className="text-blue-600 focus:text-blue-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          重新開啟為已確認
                        </DropdownMenuItem>
                      )}
                      {appointment.status === 'CANCELED' && (
                        <DropdownMenuItem 
                          onClick={() => onUpdateStatus(appointment, 'PENDING')}
                          className="text-yellow-600 focus:text-yellow-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          重新開啟預約
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(appointment.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        刪除預約
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* 手機版 (<768px) - 垂直布局 */}
            <div className="md:hidden">
              <div className="space-y-3">
                {/* 標題區域 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-on-dark truncate">
                      {formatDate(appointment.startAt)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${getStatusBadgeClass(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </Badge>
                      {appointment.order && (
                        <Badge className={`text-xs ${getOrderStatusBadgeClass(appointment.order.status)}`}>
                          {getOrderStatusText(appointment.order.status)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="px-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[color-mix(in_srgb,var(--paper)_94%,#fff)] text-on-light">
                      {appointment.status === 'PENDING' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CONFIRMED')}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            確認預約
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CANCELED')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            取消預約
                          </DropdownMenuItem>
                        </>
                      )}
                      {appointment.status === 'CONFIRMED' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'IN_PROGRESS')}
                            className="text-purple-600 focus:text-purple-600"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            開始進行
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'COMPLETED')}
                            className="text-green-600 focus:text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            標記完成
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CANCELED')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            取消預約
                          </DropdownMenuItem>
                        </>
                      )}
                      {appointment.status === 'IN_PROGRESS' && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'COMPLETED')}
                            className="text-green-600 focus:text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            標記完成
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus(appointment, 'CONFIRMED')}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            回到已確認
                          </DropdownMenuItem>
                        </>
                      )}
                      {appointment.status === 'COMPLETED' && (
                        <DropdownMenuItem 
                          onClick={() => onUpdateStatus(appointment, 'CONFIRMED')}
                          className="text-blue-600 focus:text-blue-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          重新開啟為已確認
                        </DropdownMenuItem>
                      )}
                      {appointment.status === 'CANCELED' && (
                        <DropdownMenuItem 
                          onClick={() => onUpdateStatus(appointment, 'PENDING')}
                          className="text-yellow-600 focus:text-yellow-600"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          重新開啟預約
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(appointment.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        刪除預約
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* 詳細資訊 */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-on-dark hover:text-on-dark">
                    <span>詳細資訊</span>
                    <span className="transform transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-on-dark-muted">
                    <div className="flex justify-between">
                      <span>客戶姓名:</span>
                      <span className="font-medium">{appointment.user?.name || '未設定'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>客戶手機號碼:</span>
                      <span className="font-medium">{appointment.user?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>分店:</span>
                      <span className="font-medium">{appointment.branch?.name || '未分配'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>刺青師:</span>
                      <span className="font-medium">{appointment.artist?.name || '未分配'}</span>
                    </div>
                    {appointment.cartSnapshot && appointment.cartSnapshot.items.length > 0 ? (
                      <>
                        <div className="flex justify-between">
                          <span>服務項目:</span>
                          <span className="font-medium text-blue-400">購物車 ({appointment.cartSnapshot.items.length} 項)</span>
                        </div>
                        <div className="col-span-2 bg-gray-800 rounded p-2 text-xs">
                          {appointment.cartSnapshot.items.map((item, idx) => {
                            const color = item.selectedVariants.color as string | undefined;
                            return (
                              <div key={idx} className="flex justify-between py-1">
                                <span>{item.serviceName} {color && `(${color})`}</span>
                                <span className="font-semibold text-blue-400">{formatCurrency(item.finalPrice)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>總價格:</span>
                          <span className="text-blue-400">{formatCurrency(appointment.cartSnapshot.totalPrice)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>服務項目:</span>
                          <span className="font-medium">{appointment.service?.name || '未設定'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>服務價格:</span>
                          <span className="font-medium">{appointment.service?.price ? formatCurrency(appointment.service.price) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>服務時長:</span>
                          <span className="font-medium">{appointment.service?.durationMin || 'N/A'} 分鐘</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span>結束時間:</span>
                      <span className="font-medium">{formatDate(appointment.endAt)}</span>
                    </div>
                    {appointment.notes && (
                      <div className="flex justify-between">
                        <span>備註:</span>
                        <span className="font-medium">{appointment.notes}</span>
                      </div>
                    )}
                  </div>
                </details>

                {/* 操作按鈕 */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(appointment)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    查看詳細
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
