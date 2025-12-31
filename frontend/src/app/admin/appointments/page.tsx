"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, patchJsonWithAuth, postJsonWithAuth, ApiError } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
import type { Branch } from "@/types/branch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, Plus } from "lucide-react";
import AppointmentsToolbar from "@/components/admin/AppointmentsToolbar";
import AppointmentsTable from "@/components/admin/AppointmentsTable";
import AppointmentsCards from "@/components/admin/AppointmentsCards";
import AppointmentForm from "@/components/appointments/AppointmentForm";
import { hasAdminAccess } from "@/lib/access";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: 'INTENT' | 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
  notes: string | null;
  createdAt: string;
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
  // ✅ 購物車快照（從購物車結帳創建的預約會有此欄位）
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
  holdMin?: number;
  // Extra fields returned by GET /admin/appointments/:id
  customerNotes?: Array<unknown>;
  historyServices?: Array<unknown>;
}

function toLocalDateTimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getAppointmentDurationMin(apt: Appointment): number {
  if (typeof apt.holdMin === "number" && apt.holdMin > 0) return apt.holdMin;
  if (apt.cartSnapshot?.totalDuration) return apt.cartSnapshot.totalDuration;
  if (apt.service?.durationMin) return apt.service.durationMin;
  const diff = (new Date(apt.endAt).getTime() - new Date(apt.startAt).getTime()) / 60000;
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff) : 60;
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 排序和分頁狀態
  const [sortField, setSortField] = useState<string>('startAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // ✅ 預設為升序
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // 篩選狀態
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('all');
  const [status, setStatus] = useState('all');
  
  // 詳情模態框狀態
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [lastDeepLinkOpenId, setLastDeepLinkOpenId] = useState<string | null>(null);
  const [highlightAppointmentId, setHighlightAppointmentId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleStartAt, setRescheduleStartAt] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [rescheduleHoldMin, setRescheduleHoldMin] = useState<number>(150);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [noShowReason, setNoShowReason] = useState<string>("");

  const [confirmScheduleModalOpen, setConfirmScheduleModalOpen] = useState(false);
  const [confirmStartAt, setConfirmStartAt] = useState<string>("");
  const [confirmHoldMin, setConfirmHoldMin] = useState<number>(150);
  const [confirmReason, setConfirmReason] = useState<string>("");

  // 新增預約模態框狀態
  const [createAppointmentModal, setCreateAppointmentModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false,
  });

  // 選項資料狀態
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [services, setServices] = useState<Array<Record<string, unknown>>>([]);
  const [artists, setArtists] = useState<Array<Record<string, unknown>>>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (search) params.append('search', search);
      if (branchId && branchId !== 'all') params.append('branchId', branchId);
      if (status && status !== 'all') params.append('status', status);
      if (currentPage) params.append('page', currentPage.toString());
      if (itemsPerPage) params.append('limit', itemsPerPage.toString());
      
      const url = `/admin/appointments${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await getJsonWithAuth(url) as Appointment[];
      setAppointments(data);
      setTotalItems(data.length);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入預約資料失敗");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, search, branchId, status, currentPage, itemsPerPage]);

  // 載入選項資料
  const fetchOptionsData = useCallback(async () => {
    try {
      const [usersData, servicesData, artistsData, branchesData] = await Promise.all([
        getJsonWithAuth('/admin/members') as Promise<Array<Record<string, unknown>>>,
        getJsonWithAuth('/admin/services') as Promise<Array<Record<string, unknown>>>,
        getJsonWithAuth('/admin/artists') as Promise<Array<Record<string, unknown>>>,
        getJsonWithAuth('/branches') as Promise<Array<Record<string, unknown>>>,
      ]);

      setUsers(usersData);
      setServices(servicesData);
      setArtists(artistsData);
      
      // 按名稱去重：只保留每個名稱的第一個分店（通常是最新的）
      const uniqueByName = branchesData.reduce((acc, branch) => {
        const name = branch.name as string;
        if (!acc.some(b => (b.name as string) === name)) {
          acc.push(branch);
        }
        return acc;
      }, [] as Array<Record<string, unknown>>);
      
      const uniqueBranches = sortBranchesByName(getUniqueBranches(uniqueByName)) as Branch[];
      setBranches(uniqueBranches);
    } catch (err) {
      console.error('載入選項資料失敗:', err);
    }
  }, []);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || !hasAdminAccess(userRole)) {
      router.replace('/profile');
      return;
    }

    fetchAppointments();
    fetchOptionsData(); // ✅ 問題1：調用 fetchOptionsData 以載入分店選項
  }, [router, fetchAppointments, fetchOptionsData]);

  // Deep-link support (定位高亮，不自動展開): /admin/appointments?highlightId=<id>
  // Back-compat: 若有人仍帶 openId，也只做定位高亮。
  const clearFocusIdFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("openId") && !params.has("highlightId")) return;
    params.delete("openId");
    params.delete("highlightId");
    const next = `/admin/appointments${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(next);
  }, [router, searchParams]);

  useEffect(() => {
    const focusId = searchParams.get("highlightId") || searchParams.get("openId");
    if (!focusId) return;
    if (lastDeepLinkOpenId === focusId && highlightAppointmentId === focusId) return;

    setLastDeepLinkOpenId(focusId);
    setHighlightAppointmentId(focusId);

    // 不自動展開詳情：只做定位高亮，3 秒後清除並清理 URL
    const t = window.setTimeout(() => {
      setHighlightAppointmentId((cur) => (cur === focusId ? null : cur));
      clearFocusIdFromUrl();
    }, 3000);

    return () => window.clearTimeout(t);
  }, [searchParams, lastDeepLinkOpenId, highlightAppointmentId, clearFocusIdFromUrl]);

  // After list rendered, auto-scroll highlighted row into view.
  useEffect(() => {
    if (!highlightAppointmentId) return;
    const el = document.getElementById(`appt-row-${highlightAppointmentId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [appointments, highlightAppointmentId]);

  // 點擊查看/定位後，高光約 3 秒後淡出（不控制詳情彈窗）
  useEffect(() => {
    if (!highlightAppointmentId) return;
    const t = window.setTimeout(() => setHighlightAppointmentId(null), 3000);
    return () => window.clearTimeout(t);
  }, [highlightAppointmentId]);

  // 當篩選條件改變時重新載入資料
  useEffect(() => {
    fetchAppointments();
  }, [search, branchId, status, fetchAppointments]);

  const handleSortFieldChange = (field: string) => {
    setSortField(field);
  };

  const handleSortOrderToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // 篩選處理函數
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // 重置到第一頁
  };

  const handleBranchChange = (value: string) => {
    setBranchId(value);
    setCurrentPage(1); // 重置到第一頁
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setCurrentPage(1); // 重置到第一頁
  };

  // 分頁處理函數
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // 重置到第一頁
  };

  // 分頁計算函數
  const getTotalPages = () => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const getPageNumbers = () => {
    const totalPages = getTotalPages();
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  // 預約詳情處理
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailModalOpen(true);
    // 使用者主動查看時，高光也切換到該筆（約 3 秒後淡出）
    setHighlightAppointmentId(appointment.id);
  };

  const handleCloseDetailModal = () => {
    setSelectedAppointment(null);
    setIsDetailModalOpen(false);
    clearFocusIdFromUrl();
  };

  const openRescheduleModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleStartAt(toLocalDateTimeInputValue(appointment.startAt));
    setRescheduleReason("");
    setRescheduleHoldMin(getAppointmentDurationMin(appointment));
    setRescheduleModalOpen(true);
  };

  const openCancelModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const openNoShowModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNoShowReason("");
    setNoShowModalOpen(true);
  };

  const openConfirmScheduleModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    // If startAt is only a date placeholder (intent), still show as datetime-local at 00:00
    setConfirmStartAt(toLocalDateTimeInputValue(appointment.startAt));
    setConfirmHoldMin(getAppointmentDurationMin(appointment));
    setConfirmReason("");
    setConfirmScheduleModalOpen(true);
  };

  // 新增預約相關函數
  const handleOpenCreateAppointmentModal = () => {
    setCreateAppointmentModal({
      isOpen: true,
    });
  };

  const handleCloseCreateAppointmentModal = () => {
    setCreateAppointmentModal({
      isOpen: false,
    });
  };



  // 更新預約狀態
  const handleUpdateStatus = async (appointment: Appointment, newStatus: string) => {
    try {
      // Cancel must go through policy endpoint (24h rule + optional reason)
      if (newStatus === 'CANCELED') {
        openCancelModal(appointment);
        return;
      }
      // Use POST to avoid PATCH routing inconsistencies on some deployments; backend supports both.
      await postJsonWithAuth(`/admin/appointments/${appointment.id}/status`, {
        status: newStatus,
      });
      
      setSuccessMessage(`預約狀態已更新為：${getStatusText(newStatus)}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // ✅ 關閉詳情視窗
      handleCloseDetailModal();
      
      // 重新載入資料
      fetchAppointments();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新預約狀態失敗");
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    try {
      const startAt = new Date(rescheduleStartAt);
      if (Number.isNaN(startAt.getTime())) {
        setError("開始時間格式不正確");
        return;
      }
      if (!Number.isFinite(rescheduleHoldMin) || rescheduleHoldMin <= 0) {
        setError("保留時間必須 > 0（分鐘）");
        return;
      }
      if (rescheduleHoldMin > 24 * 60) {
        setError("保留時間不可超過 24 小時");
        return;
      }
      const endAt = new Date(startAt.getTime() + rescheduleHoldMin * 60000);

      await postJsonWithAuth(`/admin/appointments/${selectedAppointment.id}/reschedule`, {
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        holdMin: rescheduleHoldMin,
        reason: rescheduleReason || undefined,
      });

      setSuccessMessage("已送出改期");
      setTimeout(() => setSuccessMessage(null), 3000);
      setRescheduleModalOpen(false);
      handleCloseDetailModal();
      fetchAppointments();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "改期失敗");
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      await postJsonWithAuth(`/admin/appointments/${selectedAppointment.id}/cancel`, {
        reason: cancelReason || undefined,
      });

      setSuccessMessage("預約已取消");
      setTimeout(() => setSuccessMessage(null), 3000);
      setCancelModalOpen(false);
      handleCloseDetailModal();
      fetchAppointments();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "取消失敗");
    }
  };

  const handleNoShow = async () => {
    if (!selectedAppointment) return;
    try {
      await postJsonWithAuth(`/admin/appointments/${selectedAppointment.id}/no-show`, {
        reason: noShowReason || undefined,
      });

      setSuccessMessage("已標記未到場");
      setTimeout(() => setSuccessMessage(null), 3000);
      setNoShowModalOpen(false);
      handleCloseDetailModal();
      fetchAppointments();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "標記未到場失敗");
    }
  };

  const handleConfirmSchedule = async () => {
    if (!selectedAppointment) return;
    try {
      const startAt = new Date(confirmStartAt);
      if (Number.isNaN(startAt.getTime())) {
        setError("開始時間格式不正確");
        return;
      }
      if (!Number.isFinite(confirmHoldMin) || confirmHoldMin <= 0) {
        setError("保留時間必須 > 0（分鐘）");
        return;
      }
      if (confirmHoldMin > 24 * 60) {
        setError("保留時間不可超過 24 小時");
        return;
      }

      await postJsonWithAuth(`/admin/appointments/${selectedAppointment.id}/confirm-schedule`, {
        startAt: startAt.toISOString(),
        holdMin: confirmHoldMin,
        reason: confirmReason || undefined,
      });

      setSuccessMessage("已排定正式時間並確認預約");
      setTimeout(() => setSuccessMessage(null), 3000);
      setConfirmScheduleModalOpen(false);
      handleCloseDetailModal();
      fetchAppointments();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "排定正式時間失敗");
    }
  };

  // 刪除預約
  const handleDelete = async (appointmentId: string) => {
    if (!confirm('確定要刪除這個預約嗎？此操作無法復原。')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/admin/appointments/${appointmentId}`);
      setSuccessMessage('預約已成功刪除');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // 重新載入資料
      fetchAppointments();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除預約失敗");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'INTENT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'IN_PROGRESS':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-muted-light dark:text-text-muted-dark">載入預約資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 bg-white dark:bg-[var(--bg)] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-text-primary-dark page-title">
              <Calendar className="mr-3 h-8 w-8" />
              管理預約
            </h1>
            <p className="mt-2 text-gray-600 dark:text-text-muted-dark page-subtitle">
              管理系統中的所有預約記錄
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleOpenCreateAppointmentModal}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>新增預約</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex w-full items-center justify-center space-x-2 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>回上一頁</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總預約數</CardTitle>
            <Calendar className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">意向</CardTitle>
            <div className="h-4 w-4 rounded-full bg-gray-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'INTENT').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待確認</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'PENDING').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已確認</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'CONFIRMED').length}
            </div>
          </CardContent>
        </Card>
        {/* ✅ 問題2：添加「進行中」統計 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <AppointmentsToolbar
        sortField={sortField}
        sortOrder={sortOrder}
        itemsPerPage={itemsPerPage}
        search={search}
        branchId={branchId}
        status={status}
        branches={branches}
        onSortFieldChange={handleSortFieldChange}
        onSortOrderToggle={handleSortOrderToggle}
        onItemsPerPageChange={handleItemsPerPageChange}
        onSearchChange={handleSearchChange}
        onBranchChange={handleBranchChange}
        onStatusChange={handleStatusChange}
      />

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-text-muted-light mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark mb-2">沒有找到預約</h3>
          <p className="text-text-muted-light dark:text-text-muted-dark">目前沒有任何預約記錄</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
            <AppointmentsTable
            appointments={appointments}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
              highlightId={highlightAppointmentId}
          />

          {/* Mobile/Tablet Cards */}
            <AppointmentsCards
            appointments={appointments}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
              highlightId={highlightAppointmentId}
          />
        </>
      )}

      {/* Pagination */}
      {totalItems > itemsPerPage && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            顯示第 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} 項，共 {totalItems} 項
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              上一頁
            </Button>
            {getPageNumbers().map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === getTotalPages()}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      <Dialog open={createAppointmentModal.isOpen} onOpenChange={handleCloseCreateAppointmentModal}>
        <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增預約</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            onCancel={handleCloseCreateAppointmentModal}
            onSubmitSuccess={() => {
              handleCloseCreateAppointmentModal();
              fetchAppointments();
            }}
            title="新增預約"
            description="為客戶創建新的預約"
            data-testid="modal-appointment-form"
          />
        </DialogContent>
      </Dialog>

      {/* Appointment Detail Modal */}
      <Dialog
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) {
            setSelectedAppointment(null);
            clearFocusIdFromUrl();
          }
        }}
      >
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>預約詳情</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              {/* 基本資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark">基本資訊</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">預約ID:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.id}</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">狀態:</span>
                    <Badge className={`ml-2 text-xs ${getStatusBadgeClass(selectedAppointment.status)}`}>
                      {getStatusText(selectedAppointment.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 時間資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark">時間資訊</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">開始時間:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedAppointment.startAt)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">結束時間:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedAppointment.endAt)}</span>
                  </div>
                      <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">服務時長:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service?.durationMin || 'N/A'} 分鐘</span>
                        </div>
                        </div>
                      </div>

              {/* 客戶資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark">客戶資訊</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">姓名:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.user?.name || '未設定'}</span>
                  </div>
                        <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">手機號碼:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.user?.phone || 'N/A'}</span>
                          </div>
                          </div>
                        </div>

              {/* 服務資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark">服務資訊</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">服務項目:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service?.name || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">服務價格:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service?.price ? formatCurrency(selectedAppointment.service.price) : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">刺青師:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.artist?.name || '未分配'}</span>
                  </div>
                  <div>
                    <span className="text-text-muted-light dark:text-text-muted-dark">分店:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.branch?.name || '未分配'}</span>
                  </div>
                        </div>
                      </div>

              {/* 備註 */}
              {selectedAppointment.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-text-primary-light dark:text-text-primary-dark">備註</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-900 bg-gray-50 dark:bg-gray-200 p-3 rounded-lg">
                    {selectedAppointment.notes}
                  </p>
                      </div>
              )}

              {/* 操作按鈕 */}
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const apptId = selectedAppointment.id;
                    const existingBillId = selectedAppointment.bill?.id ?? null;
                    handleCloseDetailModal();

                    try {
                      if (existingBillId) {
                        router.push(`/admin/billing?highlightId=${encodeURIComponent(existingBillId)}`);
                        return;
                      }

                      const ensured = await postJsonWithAuth<{ id: string }>(
                        `/admin/billing/appointments/ensure`,
                        { appointmentId: apptId },
                      );
                      router.push(`/admin/billing?highlightId=${encodeURIComponent(ensured.id)}`);
                    } catch (err) {
                      const apiErr = err as ApiError;
                      setError(apiErr.message || "建立帳務失敗");
                    }
                  }}
                  className="w-full"
                >
                  前往帳務管理
                </Button>

                {/* V2 操作：改期 / 取消 / No-show */}
                <div className="grid grid-cols-1 gap-2">
                  {selectedAppointment.status === 'INTENT' && (
                    <Button
                      variant="outline"
                      onClick={() => openConfirmScheduleModal(selectedAppointment)}
                      className="w-full"
                    >
                      排定正式時間
                    </Button>
                  )}
                  {selectedAppointment.status !== 'COMPLETED' && selectedAppointment.status !== 'CANCELED' && selectedAppointment.status !== 'NO_SHOW' && (
                    <Button
                      variant="outline"
                      onClick={() => openRescheduleModal(selectedAppointment)}
                      className="w-full"
                    >
                      改期
                    </Button>
                  )}

                  {selectedAppointment.status !== 'COMPLETED' && selectedAppointment.status !== 'CANCELED' && (
                    <Button
                      variant="destructive"
                      onClick={() => openCancelModal(selectedAppointment)}
                      className="w-full"
                    >
                      取消預約
                    </Button>
                  )}

                  {selectedAppointment.status !== 'COMPLETED' && selectedAppointment.status !== 'CANCELED' && selectedAppointment.status !== 'NO_SHOW' && (
                    <Button
                      variant="outline"
                      onClick={() => openNoShowModal(selectedAppointment)}
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      標記未到場
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseDetailModal}
                    className="flex-1 dialog-close-btn"
                  >
                    關閉
                  </Button>
                {selectedAppointment.status === 'PENDING' && (
                          <>
                            <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'CONFIRMED')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      確認預約
                            </Button>
                          </>
                        )}
                {selectedAppointment.status === 'CONFIRMED' && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'IN_PROGRESS')}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      開始進行
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'COMPLETED')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      標記完成
                    </Button>
                  </>
                )}
                {selectedAppointment.status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'COMPLETED')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      標記完成
                    </Button>
                        <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'CONFIRMED')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      回到已確認
                        </Button>
                  </>
                )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>改期</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                保留時間（分鐘）：{rescheduleHoldMin}（預設 120 + buffer 30）
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleHoldMin((v) => Math.max(1, v - 60))}
                >
                  -60
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleHoldMin((v) => Math.max(1, v - 30))}
                >
                  -30
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleHoldMin((v) => Math.max(1, v - 15))}
                >
                  -15
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleHoldMin((v) => v + 15)}
                >
                  +15
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleHoldMin((v) => v + 30)}
                >
                  +30
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRescheduleHoldMin((v) => v + 60)}
                >
                  +60
                </Button>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-700">自訂保留時間（分鐘）</div>
                <Input
                  type="number"
                  min={1}
                  max={24 * 60}
                  value={rescheduleHoldMin}
                  onChange={(e) => setRescheduleHoldMin(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-700">新開始時間</div>
                <Input
                  type="datetime-local"
                  value={rescheduleStartAt}
                  onChange={(e) => setRescheduleStartAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-700">原因（選填）</div>
                <Textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="例如：客戶臨時有事／刺青師改期"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setRescheduleModalOpen(false)}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handleReschedule}>
                  確認改期
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>取消預約</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              取消需提前 24 小時（系統會自動檢查）。
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-700">原因（選填）</div>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="例如：客戶取消／改到其他日期"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelModalOpen(false)}>
                返回
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancelAppointment}>
                確認取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No-show Modal */}
      <Dialog open={noShowModalOpen} onOpenChange={setNoShowModalOpen}>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>標記未到場</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm text-gray-700">原因（選填）</div>
              <Textarea
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                placeholder="例如：未聯絡／遲到超過 30 分鐘"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setNoShowModalOpen(false)}>
                返回
              </Button>
              <Button className="flex-1 border-orange-300 bg-orange-600 hover:bg-orange-700" onClick={handleNoShow}>
                確認標記
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Schedule Modal (INTENT -> CONFIRMED) */}
      <Dialog open={confirmScheduleModalOpen} onOpenChange={setConfirmScheduleModalOpen}>
        <DialogContent className="max-w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>排定正式時間</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                保留時間（分鐘）：{confirmHoldMin}（預設 120 + buffer 30）
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setConfirmHoldMin((v) => Math.max(1, v - 60))}>
                  -60
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmHoldMin((v) => Math.max(1, v - 30))}>
                  -30
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmHoldMin((v) => Math.max(1, v - 15))}>
                  -15
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmHoldMin((v) => v + 15)}>
                  +15
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmHoldMin((v) => v + 30)}>
                  +30
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmHoldMin((v) => v + 60)}>
                  +60
                </Button>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-700">自訂保留時間（分鐘）</div>
                <Input
                  type="number"
                  min={1}
                  max={24 * 60}
                  value={confirmHoldMin}
                  onChange={(e) => setConfirmHoldMin(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-700">正式開始時間</div>
                <Input
                  type="datetime-local"
                  value={confirmStartAt}
                  onChange={(e) => setConfirmStartAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-700">原因（選填）</div>
                <Textarea
                  value={confirmReason}
                  onChange={(e) => setConfirmReason(e.target.value)}
                  placeholder="例如：與客戶確認後排定"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmScheduleModalOpen(false)}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handleConfirmSchedule}>
                  確認排定
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}