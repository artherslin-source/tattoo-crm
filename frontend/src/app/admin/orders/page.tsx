"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingCart, ArrowLeft, CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Package, AlertCircle } from "lucide-react";
import OrdersToolbar from "@/components/admin/OrdersToolbar";
import OrdersTable from "@/components/admin/OrdersTable";
import OrdersCards from "@/components/admin/OrdersCards";

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

interface OrdersSummary {
  totalCount: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 分頁相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // 篩選相關狀態
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('all');
  const [status, setStatus] = useState('all');

  // ✅ 統計相關狀態
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // 訂單詳情模態框狀態
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // 使用 admin/orders API，包含排序、分頁和篩選參數
      const params = new URLSearchParams();
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (search) params.append('search', search);
      if (branchId && branchId !== 'all') params.append('branchId', branchId);
      if (status && status !== 'all') params.append('status', status);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const url = `/admin/orders${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await getJsonWithAuth(url);
      setOrders(data.orders || []);
      setTotalItems(data.pagination?.total || 0);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入訂單資料失敗");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, search, branchId, status, currentPage, itemsPerPage]);

  // ✅ 新增：抓取統計資料的方法
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      
      // 檢查是否有有效的 token
      const token = getAccessToken();
      if (!token) {
        console.log('未登入，跳過統計資料載入');
        return;
      }
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (branchId && branchId !== 'all') params.append('branchId', branchId);
      if (status && status !== 'all') params.append('status', status);
      
      const url = `/admin/orders/summary${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await getJsonWithAuth(url);
      setSummary(data);
    } catch (err) {
      const apiErr = err as ApiError;
      // 如果是未授權錯誤，不顯示錯誤訊息，因為可能是 token 過期
      if (apiErr.message !== 'Unauthorized') {
        console.error('載入統計資料失敗:', apiErr.message);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, [search, branchId, status]);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchOrders();
    fetchSummary(); // ✅ 同時載入統計資料
  }, [router, fetchOrders, fetchSummary]);

  // 當排序或分頁參數改變時重新載入資料
  useEffect(() => {
    if (sortField && sortOrder) {
      fetchOrders();
    }
  }, [sortField, sortOrder, currentPage, itemsPerPage, fetchOrders]);

  // 當篩選條件改變時重新載入資料和統計
  useEffect(() => {
    fetchOrders();
    fetchSummary();
  }, [search, branchId, status, fetchOrders, fetchSummary]);

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

  // 處理查看訂單詳情
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // 關閉詳情模態框
  const handleCloseDetailModal = () => {
    setSelectedOrder(null);
    setIsDetailModalOpen(false);
  };

  // 分頁計算函數
  const getTotalPages = () => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // 重置到第一頁
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await patchJsonWithAuth(`/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));
      
      // 顯示成功訊息
      const statusText = getStatusText(newStatus);
      setSuccessMessage(`訂單狀態已更新為：${statusText}`);
      setError(null);
      
      // 3秒後自動清除成功訊息
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新訂單狀態失敗");
      setSuccessMessage(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'PAID':
        return <CheckCircle className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">載入訂單資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <ShoppingCart className="mr-3 h-8 w-8" />
              管理訂單
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理系統中的所有客戶訂單
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>回上一頁</span>
          </Button>
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

      {/* ✅ 統計卡片 —— 直接吃 summary，不要再自行用當前頁面資料去算 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總訂單數</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '—' : (summary?.totalCount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待處理</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '—' : (summary?.pendingCount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '—' : (summary?.completedCount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總營收</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '—' : `NT$ ${(summary?.totalRevenue ?? 0).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具列 */}
      <OrdersToolbar
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

      {/* 分頁控制欄 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">每頁顯示：</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          共 {totalItems} 個訂單，第 {currentPage} / {getTotalPages()} 頁
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>訂單列表</CardTitle>
          <CardDescription>
            管理系統中的所有客戶訂單
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 桌機版表格 */}
          <OrdersTable
            orders={orders}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
          />

          {/* 平板和手機版卡片 */}
          <OrdersCards
            orders={orders}
            onViewDetails={handleViewDetails}
            onUpdateStatus={handleUpdateStatus}
          />
          
          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              目前沒有訂單資料
            </div>
          )}
          
          {/* 分頁導航 */}
          {getTotalPages() > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一頁
              </Button>
              
              {/* 頁碼按鈕 */}
              {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => {
                // 只顯示當前頁前後2頁的頁碼
                if (page === 1 || page === getTotalPages() || 
                    (page >= currentPage - 2 && page <= currentPage + 2)) {
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={page === currentPage ? "bg-blue-600 text-white" : ""}
                    >
                      {page}
                    </Button>
                  );
                } else if (page === currentPage - 3 || page === currentPage + 3) {
                  return <span key={page} className="text-gray-500">...</span>;
                }
                return null;
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === getTotalPages()}
              >
                下一頁
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 訂單詳情模態框 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>訂單詳情</DialogTitle>
            <DialogDescription>
              查看訂單的詳細資訊
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* 基本資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">訂單ID</label>
                  <p className="text-lg font-mono">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">訂單狀態</label>
                  <div className="mt-1">
                    <Badge className={`rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">訂單金額</label>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">建立時間</label>
                  <p className="text-sm">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {/* 客戶資訊 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">客戶資訊</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">客戶姓名</label>
                    <p className="text-sm">{selectedOrder.member.name || '未設定'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">客戶Email</label>
                    <p className="text-sm">{selectedOrder.member.email}</p>
                  </div>
                </div>
              </div>

              {/* 分店資訊 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">分店資訊</h3>
                <div>
                  <label className="text-sm font-medium text-gray-500">所屬分店</label>
                  <p className="text-sm">{selectedOrder.branch?.name || '未分配'}</p>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="border-t pt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCloseDetailModal}>
                  關閉
                </Button>
                {selectedOrder.status === 'PENDING' && (
                  <Button 
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'PAID');
                      handleCloseDetailModal();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    標記為已付款
                  </Button>
                )}
                {selectedOrder.status === 'PAID' && (
                  <Button 
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'COMPLETED');
                      handleCloseDetailModal();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    標記為已完成
                  </Button>
                )}
                {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PAID') && (
                  <Button 
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'CANCELLED');
                      handleCloseDetailModal();
                    }}
                    variant="destructive"
                  >
                    取消訂單
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
