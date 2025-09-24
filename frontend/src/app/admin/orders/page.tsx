"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth('/admin/orders');
      setOrders(data.orders || []);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入訂單資料失敗");
    } finally {
      setLoading(false);
    }
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總訂單數</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待付款</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(order => order.status === 'PENDING').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已付款</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(order => order.status === 'PAID').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總營收</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              NT$ {orders
                .filter(order => order.status === 'PAID' || order.status === 'COMPLETED')
                .reduce((sum, order) => sum + order.totalAmount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
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
                      <div className="flex space-x-2">
                        {order.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'PAID')}
                              className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>標記已付款</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>取消訂單</span>
                            </Button>
                          </>
                        )}
                        {order.status === 'PAID' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>標記完成</span>
                          </Button>
                        )}
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
        </CardContent>
      </Card>
    </div>
  );
}
