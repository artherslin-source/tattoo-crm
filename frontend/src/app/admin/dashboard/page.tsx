"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId, getJsonWithAuth } from "@/lib/api";
import BranchSelector from "@/components/BranchSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingCart, DollarSign, UserCheck, Settings, MessageSquare } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalServices: number;
  totalAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalServices: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });

  const fetchDashboardData = useCallback(async (): Promise<DashboardStats> => {
    try {
      // 構建查詢參數
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branchId', selectedBranchId);
      }
      const url = `/admin/stats${params.toString() ? `?${params.toString()}` : ''}`;
      
      const dashboardData = await getJsonWithAuth<{
        users?: { total: number };
        services?: { total: number };
        appointments?: { total: number; today: number };
        revenue?: { total: number; monthly: number };
      }>(url);

      return {
        totalUsers: dashboardData.users?.total || 0,
        totalServices: dashboardData.services?.total || 0,
        totalAppointments: dashboardData.appointments?.total || 0,
        todayAppointments: dashboardData.appointments?.today || 0,
        totalRevenue: dashboardData.revenue?.total || 0,
        monthlyRevenue: dashboardData.revenue?.monthly || 0,
      };
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      return {
        totalUsers: 0,
        totalServices: 0,
        totalAppointments: 0,
        todayAppointments: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
      };
    }
  }, [selectedBranchId]);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();

    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    // 設置預設分店
    if (!selectedBranchId) {
      if (userRole === 'BOSS') {
        setSelectedBranchId('all');
      } else if (userRole === 'BRANCH_MANAGER') {
        const userBranchId = getUserBranchId();
        if (userBranchId) {
          setSelectedBranchId(userBranchId);
        }
      }
    }

    let isActive = true;
    let hasInitialLoad = false;

    const loadDashboard = async () => {
      if (!isActive) {
        return;
      }

      const latestStats = await fetchDashboardData();

      if (!isActive) {
        return;
      }

      setStats(latestStats);

      if (!hasInitialLoad) {
        setLoading(false);
        hasInitialLoad = true;
      }
    };

    setLoading(true);
    loadDashboard();

    const intervalId = setInterval(loadDashboard, 10000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [router, fetchDashboardData, selectedBranchId]);

  // 當選擇的分店改變時，重新載入數據
  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    let isActive = true;

    const refreshStats = async () => {
      const latestStats = await fetchDashboardData();
      if (!isActive) {
        return;
      }
      setStats(latestStats);
    };

    refreshStats();

    return () => {
      isActive = false;
    };
  }, [selectedBranchId, fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-on-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-on-dark-muted">載入中...</p>
        </div>
      </div>
    );
  }

  const role = getUserRole();
  const quickActions = [
    {
      title: "管理服務項目",
      description: "管理刺青服務和價格",
      icon: Settings,
      href: "/admin/services",
      color: "bg-red-500"
    },
    {
      title: "管理刺青師",
      description: "管理刺青師資料",
      icon: UserCheck,
      href: "/admin/artists",
      color: "bg-green-500"
    },
    {
      title: "管理會員",
      description: "查看和管理所有會員資訊",
      icon: Users,
      href: "/admin/members",
      color: "bg-blue-500"
    },
    {
      title: "管理聯絡通知",
      description: "查看和處理客戶聯絡訊息",
      icon: MessageSquare,
      href: "/admin/contacts",
      color: "bg-indigo-500"
    },
    {
      title: "管理預約",
      description: "查看和管理所有預約",
      icon: Calendar,
      href: "/admin/appointments",
      color: "bg-purple-500"
    },
    {
      title: "管理訂單",
      description: "處理客戶訂單和付款",
      icon: ShoppingCart,
      href: "/admin/orders",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-dark">
            {role === 'BOSS' ? '管理後台' : '分店管理後台'}
          </h1>
          <p className="mt-2 text-on-dark-muted">
            歡迎回到管理後台，這裡是您的控制中心
          </p>
          {role === 'BOSS' && (
            <div className="mt-4 relative">
              <BranchSelector
                selectedBranchId={selectedBranchId}
                onBranchChange={setSelectedBranchId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日預約數</CardTitle>
            <Calendar className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-gray-700">
              今日新增的預約
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總會員數</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-700">
              已註冊的會員總數
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總預約數</CardTitle>
            <Calendar className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            <p className="text-xs text-gray-700">
              系統中的所有預約
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總營收</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">NT$ {(stats.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-700">
              所有已完成訂單的總營收
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
          <h2 className="text-2xl font-bold text-on-dark mb-6">
            快捷功能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Card 
                  key={action.title} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(action.href)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

    </div>
  );
}