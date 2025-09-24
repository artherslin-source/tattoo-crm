"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, deleteJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ArrowLeft, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
    durationMin: number;
  } | null;
  artist: {
    id: string;
    name: string;
  } | null;
}

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/profile');
      return;
    }

    fetchAppointments();
  }, [router]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth('/admin/appointments');
      setAppointments(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "載入預約資料失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await patchJsonWithAuth(`/admin/appointments/${appointmentId}/status`, { status: newStatus });
      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId ? { ...appointment, status: newStatus as any } : appointment
      ));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新預約狀態失敗");
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('確定要刪除這個預約嗎？此操作無法復原。')) {
      return;
    }

    try {
      await deleteJsonWithAuth(`/admin/appointments/${appointmentId}`);
      setAppointments(appointments.filter(appointment => appointment.id !== appointmentId));
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "刪除預約失敗");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CANCELED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '待確認';
      case 'CONFIRMED':
        return '已確認';
      case 'COMPLETED':
        return '已完成';
      case 'CANCELED':
        return '已取消';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELED':
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
          <p className="text-gray-600 dark:text-gray-400">載入預約資料中...</p>
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
              <Calendar className="mr-3 h-8 w-8" />
              管理預約
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              管理系統中的所有客戶預約
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
            <CardTitle className="text-sm font-medium">總預約數</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待確認</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(appointment => appointment.status === 'PENDING').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已確認</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(appointment => appointment.status === 'CONFIRMED').length}
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
              {appointments.filter(appointment => appointment.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>預約列表</CardTitle>
          <CardDescription>
            管理系統中的所有客戶預約
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">客戶</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">服務項目</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">刺青師</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">預約時間</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">狀態</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">操作</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {appointment.user.name || '未設定'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {appointment.user.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {appointment.service ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {appointment.service.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            NT$ {appointment.service.price.toLocaleString()} · {appointment.service.durationMin} 分鐘
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">未指定服務</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {appointment.artist ? (
                        <div className="font-medium text-gray-900 dark:text-white">
                          {appointment.artist.name}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">未指定刺青師</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900 dark:text-white">
                        {new Date(appointment.startAt).toLocaleDateString('zh-TW')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(appointment.startAt).toLocaleTimeString('zh-TW', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} - {new Date(appointment.endAt).toLocaleTimeString('zh-TW', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1">{getStatusText(appointment.status)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        {appointment.status === 'PENDING' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(appointment.id, 'CONFIRMED')}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>確認</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(appointment.id, 'CANCELED')}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>取消</span>
                            </Button>
                          </>
                        )}
                        {appointment.status === 'CONFIRMED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(appointment.id, 'COMPLETED')}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>完成</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>刪除</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {appointments.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              目前沒有預約資料
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}