"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page is deprecated. Redirect to /admin/dashboard
export default function ArtistDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-text-muted-light">正在跳轉...</p>
      </div>
    </div>
  );
}

/* Original implementation below - moved to /admin/dashboard (artist view) */
/*
import { useEffect, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  User, 
  Bell, 
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Eye,
  DollarSign,
  Timer
} from "lucide-react";
import Link from "next/link";

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

interface DashboardData {
  todayAppointments: Appointment[];
  notifications: Notification[];
  stats: {
    todayAppointmentsCount: number;
    unreadNotificationsCount: number;
  };
}

function ArtistDashboardOld() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<DashboardData>('/artist/dashboard');
      setDashboardData(data);
    } catch (err) {
      setError('載入資料失敗');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-text-muted-light">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">
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
            <div className="text-2xl font-bold">{dashboardData?.stats.todayAppointmentsCount || 0}</div>
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
            <div className="text-2xl font-bold">{dashboardData?.stats.unreadNotificationsCount || 0}</div>
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
            <Link href="/artist/appointments">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                查看全部
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboardData?.todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-text-muted-light mx-auto mb-4" />
                <p className="text-text-muted-light">今日沒有預約</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData?.todayAppointments.map((appointment) => (
                  <Link 
                    key={appointment.id}
                    href={`/artist/appointments?appointmentId=${appointment.id}`}
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
            <Link href="/artist/notifications">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                查看全部
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboardData?.notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-text-muted-light mx-auto mb-4" />
                <p className="text-text-muted-light">暫無通知</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData?.notifications.map((notification) => (
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
*/
