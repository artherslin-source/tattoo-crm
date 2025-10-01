"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, ArrowLeft, CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Package, AlertCircle } from "lucide-react";

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
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 分頁相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // ✅ 統計相關狀態
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      // 使用 admin/orders API，包含排序和分頁參數
      const params = new URLSearchParams();
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
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
  }, [sortField, sortOrder, currentPage, itemsPerPage]);

  // ✅ 新增：抓取統計資料的方法
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const data = await getJsonWithAuth('/admin/orders/summary');
      setSummary(data);
    } catch (err) {
      const apiErr = err as ApiError;
      console.error('載入統計資料失敗:', apiErr.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

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

  const handleSortFieldChange = (field: string) => {
    setSortField(field);
  };

  const handleSortOrderToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
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
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新訂單狀態失敗");
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

      {/* 排序控制介面 */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">排序設定：</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">排序依據：</span>
            <Select value={sortField} onValueChange={handleSortFieldChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/85">
                <SelectItem value="customerName">客戶姓名</SelectItem>
                <SelectItem value="customerEmail">客戶Email</SelectItem>
                <SelectItem value="branch">分店</SelectItem>
                <SelectItem value="totalAmount">訂單金額</SelectItem>
                <SelectItem value="status">訂單狀態</SelectItem>
                <SelectItem value="createdAt">建立時間</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">排序順序：</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSortOrderToggle}
              className="flex items-center space-x-1"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="h-3 w-3" />
                  <span>升序</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3" />
                  <span>降序</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">訂單 ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">客戶</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">分店</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">金額</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">狀態</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">建立時間</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">操作</th>
                </tr>
              </thead>
            <tbody>
              {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm text-gray-900 dark:text-white">
                        {order.id.slice(-8)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {order.member.name || '未設定'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {order.member.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.branch.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        NT$ {order.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{getStatusText(order.status)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {new Date(order.createdAt).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        {/* 標記已付款 - 只有待付款狀態可以操作 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'PAID')}
                          disabled={order.status === 'PAID' || order.status === 'COMPLETED' || order.status === 'CANCELLED'}
                          className="flex items-center space-x-1 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>標記已付款</span>
                        </Button>
                        
                        {/* 標記完成 - 只有已付款狀態可以操作 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          disabled={order.status !== 'PAID'}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>標記完成</span>
                        </Button>
                        
                        {/* 取消訂單 - 只有待付款和已付款狀態可以操作 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>取消訂單</span>
                        </Button>
                        
                        {/* 重新開啟 - 只有已取消狀態可以操作 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'PENDING')}
                          disabled={order.status !== 'CANCELLED'}
                          className="flex items-center space-x-1 text-yellow-600 hover:text-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Clock className="h-3 w-3" />
                          <span>重新開啟</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
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
    </div>
  );
}
