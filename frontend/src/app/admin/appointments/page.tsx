"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar } from "lucide-react";
import AppointmentsToolbar from "@/components/admin/AppointmentsToolbar";
import AppointmentsTable from "@/components/admin/AppointmentsTable";
import AppointmentsCards from "@/components/admin/AppointmentsCards";

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
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 排序和分頁狀態
  const [sortField, setSortField] = useState<string>('startAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchAppointments();
  }, [router, fetchAppointments]);

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

  // 更新預約狀態
  const handleUpdateStatus = async (appointment: Appointment, newStatus: string) => {
    try {
      await patchJsonWithAuth(`/admin/appointments/${appointment.id}/status`, {
        status: newStatus
      });
      
      setSuccessMessage(`預約狀態已更新為：${getStatusText(newStatus)}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
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
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CANCELED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
          <p className="text-gray-600 dark:text-gray-400">載入預約資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            回上一頁
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">管理預約</h1>
            <p className="text-gray-600 dark:text-gray-400">管理所有預約記錄</p>
          </div>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* 成功訊息 */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總預約數</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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

      {/* 工具欄 */}
      <AppointmentsToolbar
        sortField={sortField}
        sortOrder={sortOrder}
        itemsPerPage={itemsPerPage}
        search={search}
        branchId={branchId}
        status={status}
        onSortFieldChange={handleSortFieldChange}
        onSortOrderToggle={handleSortOrderToggle}
        onItemsPerPageChange={handleItemsPerPageChange}
        onSearchChange={handleSearchChange}
        onBranchChange={handleBranchChange}
        onStatusChange={handleStatusChange}
      />

      {/* 預約列表 */}
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">沒有找到預約</h3>
          <p className="text-gray-500 dark:text-gray-400">目前沒有任何預約記錄</p>
        </div>
      ) : (
        <>
          {/* 桌面版表格 */}
          <AppointmentsTable
            appointments={appointments}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />

          {/* 平板和手機版卡片 */}
          <AppointmentsCards
            appointments={appointments}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* 分頁控制 */}
      {totalItems > itemsPerPage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
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

      {/* 預約詳情模態框 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>預約詳情</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              {/* 基本資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">基本資訊</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">預約ID:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">狀態:</span>
                    <Badge className={`ml-2 text-xs ${getStatusBadgeClass(selectedAppointment.status)}`}>
                      {getStatusText(selectedAppointment.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 時間資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">時間資訊</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">開始時間:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedAppointment.startAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">結束時間:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedAppointment.endAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">服務時長:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service?.durationMin || 'N/A'} 分鐘</span>
                  </div>
                </div>
              </div>

              {/* 客戶資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">客戶資訊</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">姓名:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.user?.name || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.user?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 服務資訊 */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">服務資訊</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">服務項目:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service?.name || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">服務價格:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.service?.price ? formatCurrency(selectedAppointment.service.price) : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">刺青師:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.artist?.name || '未分配'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">分店:</span>
                    <span className="ml-2 font-medium">{selectedAppointment.branch?.name || '未分配'}</span>
                  </div>
                </div>
              </div>

              {/* 備註 */}
              {selectedAppointment.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">備註</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleCloseDetailModal}
                  className="flex-1"
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}