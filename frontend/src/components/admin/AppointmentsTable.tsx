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
  contactId?: string | null;
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
  bill?: {
    id: string;
    billTotal: number;
    status: string;
    billType: string;
  } | null;
  // ✅ 購物車快照
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

interface AppointmentsTableProps {
  appointments: Appointment[];
  onViewDetails: (appointment: Appointment) => void;
  onUpdateStatus: (appointment: Appointment, status: string) => void;
  onDelete: (appointmentId: string) => void;
  highlightId?: string | null;
  onRowClick?: (appointment: Appointment) => void;
}

export default function AppointmentsTable({
  appointments,
  onViewDetails,
  onUpdateStatus,
  onDelete,
  highlightId,
  onRowClick,
}: AppointmentsTableProps) {
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

  const getBillStatusText = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '未結清';
      case 'SETTLED':
        return '已結清';
      case 'VOID':
        return '作廢';
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

  const getPreferredAmount = (appointment: Appointment): number | null => {
    const cartTotal = appointment.cartSnapshot?.totalPrice;
    if (typeof cartTotal === "number" && cartTotal > 0) return cartTotal;
    const billTotal = appointment.bill?.billTotal;
    if (typeof billTotal === "number" && billTotal > 0) return billTotal;
    const servicePrice = appointment.service?.price;
    if (typeof servicePrice === "number" && servicePrice > 0) return servicePrice;
    return null;
  };

  const toMoney = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  return (
    <div className="hidden xl:block">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[20%]">
                  預約時間
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[15%]">
                  客戶資訊
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[12%]">
                  分店
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[12%]">
                  刺青師
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[15%]">
                  服務項目
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[8%]">
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[8%]">
                  帳務
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted-light dark:text-text-secondary-dark uppercase tracking-wider w-[16%]">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {appointments.map((appointment) => (
                <tr
                  key={appointment.id}
                  id={`appt-row-${appointment.id}`}
                  className={
                    highlightId === appointment.id
                      ? "bg-amber-100/60"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }
                  onClick={() => onRowClick?.(appointment)}
                >
                  <td className="px-4 py-3" data-label="預約時間">
                    <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                      {formatDate(appointment.startAt)}
                    </div>
                    <div className="text-xs text-text-muted-light dark:text-text-muted-dark">
                      {appointment.service?.durationMin} 分鐘
                    </div>
                  </td>
                  <td className="px-4 py-3" data-label="客戶資訊">
                    <div className="font-medium text-text-primary-light dark:text-text-primary-dark">
                      {appointment.user?.name || '未設定'}
                    </div>
                    <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
                      {appointment.user?.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3" data-label="分店">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                      {appointment.branch?.name || '未分配'}
                    </span>
                  </td>
                  <td className="px-4 py-3" data-label="刺青師">
                    <span className="text-sm text-text-primary-light dark:text-text-primary-dark">
                      {appointment.artist?.name || '未分配'}
                    </span>
                  </td>
                  <td className="px-4 py-3" data-label="服務項目">
                    {appointment.cartSnapshot && (appointment.cartSnapshot.items.length > 0 || !!appointment.cartSnapshot.totalPrice) ? (
                      <div className="text-sm">
                        <div className="font-medium text-blue-600 mb-1">
                          購物車{appointment.cartSnapshot.items.length > 0 ? ` (${appointment.cartSnapshot.items.length} 項)` : ""}
                        </div>
                        {appointment.cartSnapshot.items.length > 0 ? (
                          (() => {
                            const item = appointment.cartSnapshot!.items[0];
                            const selectedVariants = (item.selectedVariants || {}) as Record<string, unknown>;
                            const color = typeof selectedVariants.color === "string" ? selectedVariants.color : null;
                            const designFee = toMoney(selectedVariants.design_fee);
                            const customAddon = toMoney(selectedVariants.custom_addon);
                            const rawFinal = typeof item.finalPrice === "number" ? item.finalPrice : (typeof item.basePrice === "number" ? item.basePrice : 0);
                            const servicePrice = Math.max(0, rawFinal - (designFee ?? 0) - (customAddon ?? 0));
                            return (
                              <div className="space-y-0.5">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {(item.serviceName || "服務")}{color ? `-${color}` : ""}
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(servicePrice)}
                                </div>
                                <div className="text-xs text-blue-600">
                                  {customAddon !== null ? `加購價${new Intl.NumberFormat('zh-TW').format(customAddon)}` : ""}
                                  {customAddon !== null && designFee !== null ? " " : ""}
                                  {designFee !== null ? `設計費${new Intl.NumberFormat('zh-TW').format(designFee)}` : ""}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="text-xs text-blue-600 mt-1">
                            {typeof appointment.cartSnapshot.totalPrice === "number" ? formatCurrency(appointment.cartSnapshot.totalPrice) : "—"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                          {appointment.service?.name || '未設定'}
                        </div>
                        <div className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {getPreferredAmount(appointment) !== null ? formatCurrency(getPreferredAmount(appointment) as number) : 'N/A'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3" data-label="狀態">
                    <Badge className={`text-xs ${getStatusBadgeClass(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" data-label="帳務">
                    {appointment.bill ? (
                      <div className="text-xs">
                        <div className="font-medium">#{appointment.bill.id.slice(-8)}</div>
                        <div className="text-text-muted-light dark:text-text-muted-dark">
                          {getBillStatusText(appointment.bill.status)} ·{" "}
                          {new Intl.NumberFormat('zh-TW').format(appointment.bill.billTotal)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted-light">尚未建立</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" data-label="操作">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(appointment);
                        }}
                        className="px-3"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
