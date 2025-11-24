"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
import type { Branch } from "@/types/branch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Plus, ShoppingCart } from "lucide-react";
import AppointmentsToolbar from "@/components/admin/AppointmentsToolbar";
import AppointmentsTable from "@/components/admin/AppointmentsTable";
import AppointmentsCards from "@/components/admin/AppointmentsCards";
import AppointmentForm from "@/components/appointments/AppointmentForm";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  notes: string | null;
  createdAt: string;
  orderId: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
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
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
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
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchAppointments();
    fetchOptionsData(); // ✅ 問題1：調用 fetchOptionsData 以載入分店選項
  }, [router, fetchAppointments, fetchOptionsData]);

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
  };

  const handleCloseDetailModal = () => {
    setSelectedAppointment(null);
    setIsDetailModalOpen(false);
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
      await patchJsonWithAuth(`/admin/appointments/${appointment.id}/status`, {
        status: newStatus
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
      default:
        return 'bg-gray-100 text-text-primary-light dark:bg-gray-900 dark:text-text-secondary-dark';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
          />

          {/* Mobile/Tablet Cards */}
          <AppointmentsCards
            appointments={appointments}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
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
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
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
                {/* ✅ 問題1：添加跳轉到訂單的按鈕 */}
                {selectedAppointment.orderId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleCloseDetailModal();
                      router.push(`/admin/orders?orderId=${selectedAppointment.orderId}`);
                    }}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    查看關聯訂單
                  </Button>
                )}
                
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
                            <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'CANCELED')}
                      variant="destructive"
                      className="flex-1"
                    >
                      取消預約
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
                          <Button
                      onClick={() => handleUpdateStatus(selectedAppointment, 'CANCELED')}
                      variant="destructive"
                      className="flex-1"
                    >
                      取消預約
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
    </div>
  );
}