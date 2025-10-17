"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId, getJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calendar, ShoppingCart, DollarSign, UserCheck, Palette, Settings, Building2 } from "lucide-react";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";

interface DashboardStats {
  totalUsers: number;
  totalServices: number;
  totalAppointments: number;
  todayAppointments: number;
  monthlyRevenue: number;
}

interface Branch {
  id: string;
  name: string;
  [key: string]: unknown;
}

export default function BranchDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalServices: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
  });

  // 載入分店列表（僅 BOSS 角色）
  useEffect(() => {
    const role = getUserRole();
    const token = getAccessToken();
    
    if (!token || (role !== 'BOSS' && role !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    setUserRole(role);

    // 如果是 BOSS，載入所有分店列表
    if (role === 'BOSS') {
      const fetchBranches = async () => {
        try {
          const branchesData = await getJsonWithAuth('/branches') as Array<Record<string, unknown>>;
          
          // 按名稱去重：只保留每個名稱的第一個分店
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
          console.error('載入分店列表失敗:', err);
        }
      };
      fetchBranches();
    } else {
      // 如果是 BRANCH_MANAGER，設置為當前分店
      const userBranchId = getUserBranchId();
      if (userBranchId) {
        setSelectedBranchId(userBranchId);
      }
    }
  }, [router]);

  // 載入統計數據
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // 確定要查詢的分店 ID
        let targetBranchId: string | null = null;
        if (userRole === 'BOSS') {
          targetBranchId = selectedBranchId === 'all' ? null : selectedBranchId;
        } else {
          targetBranchId = getUserBranchId();
        }
        
        // 獲取分店資訊（如果選擇了特定分店）
        if (targetBranchId) {
          try {
            const branchData = await getJsonWithAuth<Branch>(`/branches/${targetBranchId}`);
            setBranchInfo(branchData);
          } catch (err) {
            console.error('Failed to fetch branch info:', err);
          }
        } else {
          setBranchInfo(null); // 全部分店時清空單一分店資訊
        }

        // 這裡可以調用多個 API 來獲取統計數據
        const [dashboardData, appointmentsData] = await Promise.all([
          getJsonWithAuth<{
            users?: { total: number };
            services?: { total: number };
            appointments?: { total: number; today: number };
            revenue?: { total: number; monthly: number };
          }>('/admin/stats'),
          getJsonWithAuth<{ startAt: string }[]>('/appointments/all').catch(() => [])
        ]);

        setStats({
          totalUsers: dashboardData.users?.total || 0,
          totalServices: dashboardData.services?.total || 0,
          totalAppointments: appointmentsData.length || 0,
          todayAppointments: appointmentsData.filter((apt: { startAt: string }) => {
            const today = new Date().toDateString();
            return new Date(apt.startAt).toDateString() === today;
          }).length,
          monthlyRevenue: 0, // 暫時設為 0，後續可以從訂單 API 計算
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userRole) {
      fetchDashboardData();
    }
  }, [userRole, selectedBranchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-muted-light dark:text-text-muted-dark">載入中...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "管理服務項目",
      description: "管理分店刺青服務和價格",
      icon: Settings,
      href: "/branch/services",
      color: "bg-red-500"
    },
    {
      title: "管理刺青師",
      description: "管理分店刺青師資料",
      icon: UserCheck,
      href: "/branch/artists",
      color: "bg-green-500"
    },
    {
      title: "管理會員",
      description: "查看和管理分店會員資訊",
      icon: Users,
      href: "/branch/members",
      color: "bg-blue-500"
    },
    {
      title: "管理預約",
      description: "查看和管理分店預約",
      icon: Calendar,
      href: "/branch/appointments",
      color: "bg-purple-500"
    },
    {
      title: "管理訂單",
      description: "處理分店客戶訂單和付款",
      icon: ShoppingCart,
      href: "/branch/orders",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">
                分店管理後台
              </h1>
            </div>
            {branchInfo && (
              <div className="mb-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Building2 className="h-4 w-4 mr-1" />
                  {branchInfo.name}
                </span>
              </div>
            )}
            <p className="text-text-muted-light dark:text-text-muted-dark">
              歡迎回到分店管理後台，這裡是您的控制中心
            </p>
          </div>
          
          {/* ✅ 問題3：BOSS 角色顯示分店選擇器 */}
          {userRole === 'BOSS' && branches.length > 0 && (
            <div className="ml-4">
              <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                選擇分店
              </label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-48 bg-white dark:bg-gray-800">
                  <SelectValue placeholder="選擇分店" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-800/95">
                  <SelectItem value="all">全部分店</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <CardTitle className="text-sm font-medium">分店會員數</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                分店已註冊的會員總數
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">分店預約數</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground">
                分店的所有預約
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">分店營收</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">NT$ {stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                分店本月總營收
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-6">
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

        {/* Back Button */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <span>←</span>
            <span>回上一頁</span>
          </Button>
        </div>
    </div>
  );
}
