"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId, getJsonWithAuth } from "@/lib/api";
import { hasAdminAccess, normalizeAccessRole } from "@/lib/access";
import BranchSelector from "@/components/BranchSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  Settings, 
  MessageSquare, 
  Clock,
  User,
  Bell,
  Phone,
  Timer,
  Eye,
  AlertCircle,
  type LucideIcon 
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  totalServices: number;
  totalAppointments: number;
  todayAppointments: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes?: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    durationMin: number;
    price: number;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface ArtistDashboardData {
  todayAppointments: Appointment[];
  notifications: Notification[];
  stats: {
    todayAppointmentsCount: number;
    unreadNotificationsCount: number;
  };
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
  const [artistDashboardData, setArtistDashboardData] = useState<ArtistDashboardData | null>(null);
  const [artistError, setArtistError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (): Promise<DashboardStats> => {
    try {
      // /admin/stats is now BOSS-only; ARTIST dashboard uses workbench UI without these stats.
      const rawRole = getUserRole();
      const normalized = normalizeAccessRole(rawRole);
      console.log('[Dashboard] User role:', { rawRole, normalized });
      
      if (normalized !== 'BOSS') {
        console.log('[Dashboard] Not BOSS, returning zero stats');
        return {
          totalUsers: 0,
          totalServices: 0,
          totalAppointments: 0,
          todayAppointments: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
        };
      }

      // 構建查詢參數
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branchId', selectedBranchId);
      }
      const url = `/admin/stats${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('[Dashboard] Fetching stats from:', url);
      
      const dashboardData = await getJsonWithAuth<{
        users?: { total: number };
        services?: { total: number };
        appointments?: { total: number; today: number };
        revenue?: { total: number; monthly: number };
      }>(url);
      
      console.log('[Dashboard] Stats received:', dashboardData);

      return {
        totalUsers: dashboardData.users?.total || 0,
        totalServices: dashboardData.services?.total || 0,
        totalAppointments: dashboardData.appointments?.total || 0,
        todayAppointments: dashboardData.appointments?.today || 0,
        totalRevenue: dashboardData.revenue?.total || 0,
        monthlyRevenue: dashboardData.revenue?.monthly || 0,
      };
    } catch (err) {
      console.error('[Dashboard] Failed to fetch dashboard data:', err);
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

    if (!token || !hasAdminAccess(userRole)) {
      router.replace('/profile');
      return;
    }

    // 設置預設分店
    if (!selectedBranchId) {
      if (normalizeAccessRole(userRole) === 'BOSS') {
        setSelectedBranchId('all');
      } else {
        const bid = getUserBranchId();
        if (bid) setSelectedBranchId(bid);
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

  // Fetch artist dashboard data
  useEffect(() => {
    const userRole = getUserRole();
    const normalized = normalizeAccessRole(userRole);
    
    if (normalized === 'ARTIST') {
      const fetchArtistDashboard = async () => {
        try {
          setLoading(true);
          const data = await getJsonWithAuth<ArtistDashboardData>('/artist/dashboard');
          setArtistDashboardData(data);
          setArtistError(null);
        } catch (err) {
          setArtistError('載入資料失敗');
          console.error('Artist dashboard fetch error:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchArtistDashboard();
    }
  }, []);

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
  const normalizedRole = normalizeAccessRole(role);
  const isBoss = normalizedRole === 'BOSS';
  const isArtist = normalizedRole === 'ARTIST';

  // Helper functions for artist dashboard
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilAppointment = (startAt: string) => {
    const now = new Date();
    const appointmentTime = new Date(startAt);
    const diffMs = appointmentTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return '已過期';
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}小時${diffMinutes}分鐘後`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分鐘後`;
    } else {
      return '即將開始';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-text-primary-light';
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

  type QuickAction = {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
  };

  const quickActions: QuickAction[] = isBoss
    ? [
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
          title: "帳務管理",
          description: "收款、拆帳、查帳（唯一口徑）",
          icon: DollarSign,
          href: "/admin/billing",
          color: "bg-orange-500"
        }
      ]
    : [
        {
          title: "我的會員",
          description: "管理屬於我的會員",
          icon: Users,
          href: "/admin/members",
          color: "bg-blue-500"
        },
        {
          title: "我的聯絡",
          description: "處理指派給我的聯絡",
          icon: MessageSquare,
          href: "/admin/contacts",
          color: "bg-indigo-500"
        },
        {
          title: "我的預約",
          description: "管理我的預約排程",
          icon: Calendar,
          href: "/admin/appointments",
          color: "bg-purple-500"
        },
        {
          title: "我的帳務",
          description: "查看我的帳務與收款",
          icon: DollarSign,
          href: "/admin/billing",
          color: "bg-orange-500"
        }
      ];

  // Artist dashboard UI
  if (isArtist) {
    if (artistError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{artistError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              重新載入
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary-light">刺青師工作台</h1>
          <p className="text-text-muted-light mt-2">歡迎回來！以下是您今日的工作概覽</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日預約</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{artistDashboardData?.stats.todayAppointmentsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                個預約待處理
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">未讀通知</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{artistDashboardData?.stats.unreadNotificationsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                條新通知
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 今日行程 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  今日行程
                </CardTitle>
                <CardDescription>
                  您今日的預約安排
                </CardDescription>
              </div>
              <Link href="/admin/appointments">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  查看全部
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {artistDashboardData?.todayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-text-muted-light mx-auto mb-4" />
                  <p className="text-text-muted-light">今日沒有預約</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {artistDashboardData?.todayAppointments.map((appointment) => (
                    <Link 
                      key={appointment.id}
                      href={`/admin/appointments?appointmentId=${appointment.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 text-text-muted-light" />
                            <span className="font-medium">
                              {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                            </span>
                            <Badge className={getStatusColor(appointment.status)}>
                              {getStatusText(appointment.status)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="h-4 w-4 text-text-muted-light" />
                            <span className="font-medium">{appointment.user.name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-1">
                            <Phone className="h-4 w-4 text-text-muted-light" />
                            <span className="text-sm text-text-muted-light">{appointment.user.phone}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">
                              {formatPrice(appointment.service.price)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-1">
                            <Timer className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-blue-600">
                              {getTimeUntilAppointment(appointment.startAt)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-text-muted-light">
                            服務項目：{appointment.service.name} ({appointment.service.durationMin}分鐘)
                          </p>
                          
                          {appointment.notes && (
                            <p className="text-sm text-text-muted-light mt-1">
                              備註：{appointment.notes}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <Eye className="h-5 w-5 text-text-muted-light" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最新通知 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  最新通知
                </CardTitle>
                <CardDescription>
                  重要訊息和更新
                </CardDescription>
              </div>
              <Link href="/admin/notifications">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  查看全部
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {artistDashboardData?.notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-text-muted-light mx-auto mb-4" />
                  <p className="text-text-muted-light">暫無通知</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {artistDashboardData?.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg ${
                        !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-text-primary-light">{notification.title}</h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-text-muted-light mb-2">{notification.message}</p>
                          <p className="text-xs text-text-muted-light">
                            {new Date(notification.createdAt).toLocaleString('zh-TW')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Boss dashboard UI
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 bg-white dark:bg-[var(--bg)] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="mb-6 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-on-dark dashboard-title">
            管理後台
          </h1>
          <p className="mt-2 text-gray-600 dark:text-on-dark-muted dashboard-subtitle">
            歡迎回到管理後台，這裡是您的控制中心
          </p>
          {isBoss && (
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
            <CardTitle className="text-sm font-medium">累計總營收</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">NT$ {(stats.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-700">
              歷史累計所有已付款訂單
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-on-dark mb-6 page-title">
            快捷功能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Card 
                  key={action.title} 
                  className="hover:shadow-lg transition-shadow cursor-pointer quick-card"
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