"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId, getJsonWithAuth, ApiError } from "@/lib/api";
import BranchSelector from "@/components/BranchSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ShoppingCart, DollarSign, UserCheck, Palette, Settings, MessageSquare } from "lucide-react";

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

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    async function fetchDashboardData() {
      try {
        // 調用統計 API 獲取數據
        const dashboardData = await getJsonWithAuth<{
          users?: { total: number };
          services?: { total: number };
          appointments?: { total: number; today: number };
          revenue?: { total: number; monthly: number };
        }>('/admin/stats');

        setStats({
          totalUsers: dashboardData.users?.total || 0,
          totalServices: dashboardData.services?.total || 0,
          totalAppointments: dashboardData.appointments?.total || 0,
          todayAppointments: dashboardData.appointments?.today || 0,
          totalRevenue: dashboardData.revenue?.total || 0,
          monthlyRevenue: dashboardData.revenue?.monthly || 0,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        // 如果 API 失敗，保持預設值
        setStats({
          totalUsers: 0,
          totalServices: 0,
          totalAppointments: 0,
          todayAppointments: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [router]);

  // 當選擇的分店改變時，重新載入數據
  useEffect(() => {
    if (selectedBranchId) {
      // 重新載入數據的邏輯
      console.log('Branch changed to:', selectedBranchId);
    }
  }, [selectedBranchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {getUserRole() === 'BOSS' ? '總管理後台' : '分店管理後台'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              歡迎回到管理後台，這裡是您的控制中心
            </p>
          </div>
          {getUserRole() === 'BOSS' && (
            <div className="mt-2">
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
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayAppointments}</div>
              <p className="text-xs text-muted-foreground">
                今日新增的預約
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總會員數</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                已註冊的會員總數
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總預約數</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground">
                系統中的所有預約
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總營收</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">NT$ {(stats.totalRevenue || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                所有已完成訂單的總營收
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
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