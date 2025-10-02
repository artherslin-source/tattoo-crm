"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth, patchJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell,
  BellRing,
  Calendar,
  User,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Info,
  Clock
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'APPOINTMENT' | 'MESSAGE' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  data?: {
    appointmentId?: string;
    appointmentStatus?: string;
    customerName?: string;
    serviceName?: string;
    appointmentTime?: string;
  };
}

export default function ArtistNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth<Notification[]>('/artist/notifications');
      setNotifications(data);
    } catch (err) {
      setError('載入通知失敗');
      console.error('Notifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      await patchJsonWithAuth(`/artist/notifications/${notificationId}/read`, {});
      
      // 更新本地狀態
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (err) {
      console.error('Mark as read error:', err);
      alert('標記已讀失敗');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notif => 
          patchJsonWithAuth(`/artist/notifications/${notif.id}/read`, {})
        )
      );
      
      // 更新本地狀態
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (err) {
      console.error('Mark all as read error:', err);
      alert('標記全部已讀失敗');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '剛剛';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} 小時前`;
    } else if (diffInHours < 48) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'MESSAGE':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'SYSTEM':
        return <BellRing className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return 'border-l-blue-500 bg-blue-50';
      case 'MESSAGE':
        return 'border-l-green-500 bg-green-50';
      case 'SYSTEM':
        return 'border-l-purple-500 bg-purple-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return '預約通知';
      case 'MESSAGE':
        return '訊息通知';
      case 'SYSTEM':
        return '系統通知';
      default:
        return '通知';
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
        return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">載入中...</p>
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
          <Button onClick={fetchNotifications} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">通知中心</h1>
          <p className="text-gray-600 mt-2">
            您有 {unreadCount} 則未讀通知
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="mt-4 sm:mt-0"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            全部標記為已讀
          </Button>
        )}
      </div>

      {/* 通知列表 */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有通知</h3>
            <p className="text-gray-500">您目前沒有任何通知</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`border-l-4 ${getNotificationColor(notification.type)} ${
                !notification.isRead ? 'ring-2 ring-blue-200' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getTypeText(notification.type)}
                        </Badge>
                        {!notification.isRead && (
                          <Badge className="bg-blue-600 text-white text-xs">
                            未讀
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3">
                      {notification.message}
                    </p>

                    {/* 預約相關資訊 */}
                    {notification.type === 'APPOINTMENT' && notification.data && (
                      <div className="bg-white rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {notification.data.customerName && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">
                                顧客：{notification.data.customerName}
                              </span>
                            </div>
                          )}
                          {notification.data.serviceName && (
                            <div className="flex items-center space-x-2">
                              <Info className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">
                                服務：{notification.data.serviceName}
                              </span>
                            </div>
                          )}
                          {notification.data.appointmentTime && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">
                                時間：{new Date(notification.data.appointmentTime).toLocaleString('zh-TW')}
                              </span>
                            </div>
                          )}
                          {notification.data.appointmentStatus && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">狀態：</span>
                              <Badge className={getStatusColor(notification.data.appointmentStatus)}>
                                {getStatusText(notification.data.appointmentStatus)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {formatDateTime(notification.createdAt)}
                      </span>
                      
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsRead(notification.id)}
                          disabled={markingAsRead === notification.id}
                        >
                          {markingAsRead === notification.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          標記已讀
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
