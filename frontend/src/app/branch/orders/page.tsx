"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId, getJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowLeft, CheckCircle, XCircle, Clock, Building2 } from "lucide-react";

interface Order {
  id: string;
  totalAmount: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'COMPLETED';
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

interface Branch {
  id: string;
  name: string;
  [key: string]: unknown;
}

export default function BranchOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    const branchId = getUserBranchId();

    if (!token || role !== 'BRANCH_MANAGER') {
      router.replace('/profile');
      return;
    }

    setUserBranchId(branchId);
    
    // 獲取分店資訊
    if (branchId) {
      getJsonWithAuth<{ id: string; name: string; address: string }>(`/branches/${branchId}`)
        .then(setBranchInfo)
        .catch(err => console.error('Failed to fetch branch info:', err));
    }
    
    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<{ orders: Order[] }>('/branch/orders');
      setOrders(data.orders || []);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入訂單資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'PENDING_PAYMENT':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return '待結帳';
      case 'INSTALLMENT_ACTIVE':
        return '分期中';
      case 'PARTIALLY_PAID':
        return '部分付款';
      case 'PAID':
        return '已付款';
      case 'PAID_COMPLETE':
        return '分期完成';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              分店訂單管理
            </h1>
            {branchInfo && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Building2 className="h-4 w-4 mr-1" />
                  {branchInfo.name}
                </span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>返回</span>
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid gap-6">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暫無訂單
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                目前沒有訂單記錄
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5" />
                    <span>訂單 #{order.id.slice(-8)}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className="text-sm font-medium">
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>
                <CardDescription>
                  建立時間: {new Date(order.createdAt).toLocaleString('zh-TW')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      會員資訊
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.member.name || '未設定姓名'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {order.member.email}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      分店
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.branch.name}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      金額
                    </h4>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      NT$ {order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
