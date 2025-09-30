"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth, patchJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarView from "@/components/CalendarView";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  List,
  CalendarDays
} from "lucide-react";

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
    email: string;
  };
  service: {
    id: string;
    name: string;
    description: string;
    durationMin: number;
    price: number;
  };
  branch: {
    id: string;
    name: string;
  };
}

export default function ArtistAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [updating, setUpdating] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    appointment: Appointment | null;
    action: string;
  }>({
    isOpen: false,
    appointment: null,
    action: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, [period]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getJsonWithAuth(`/artist/appointments?period=${period}`);
      setAppointments(data);
    } catch (err) {
      setError('載入行程失敗');
      console.error('Appointments fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentsByRange = async (startDate: string, endDate: string) => {
    try {
      console.log('Fetching appointments for range:', { startDate, endDate });
      const data = await getJsonWithAuth(`/artist/appointments/range?startDate=${startDate}&endDate=${endDate}`);
      console.log('Fetched appointments:', data);
      setAppointments(data);
    } catch (err) {
      setError('載入行程失敗');
      console.error('Appointments range fetch error:', err);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    // 如果是完成服務，先顯示確認框
    if (status === 'COMPLETED') {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment) {
        setConfirmDialog({
          isOpen: true,
          appointment,
          action: status,
        });
        return;
      }
    }
    
    // 其他狀態直接更新
    await performStatusUpdate(appointmentId, status);
  };

  const performStatusUpdate = async (appointmentId: string, status: string) => {
    try {
      setUpdating(appointmentId);
      await patchJsonWithAuth(`/artist/appointments/${appointmentId}/status`, { status });
      
      // 更新本地狀態
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status }
            : apt
        )
      );
    } catch (err) {
      console.error('Update status error:', err);
      alert('更新狀態失敗');
    } finally {
      setUpdating(null);
    }
  };

  const handleConfirmComplete = async () => {
    if (confirmDialog.appointment) {
      await performStatusUpdate(confirmDialog.appointment.id, confirmDialog.action);
      setConfirmDialog({ isOpen: false, appointment: null, action: '' });
    }
  };

  const handleCancelComplete = () => {
    setConfirmDialog({ isOpen: false, appointment: null, action: '' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
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

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'PENDING':
        return [
          { label: '確認預約', value: 'CONFIRMED', icon: CheckCircle, color: 'bg-blue-600 hover:bg-blue-700' }
        ];
      case 'CONFIRMED':
        return [
          { label: '開始服務', value: 'IN_PROGRESS', icon: Play, color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'IN_PROGRESS':
        return [
          { label: '完成服務', value: 'COMPLETED', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' }
        ];
      default:
        return [];
    }
  };

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
          <Button onClick={fetchAppointments} className="mt-4">
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和篩選 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的行程</h1>
          <p className="text-gray-600 mt-3">管理您的預約和服務安排</p>
        </div>
        
        <div className="mt-6 sm:mt-0 flex gap-4">
          <Select value={period} onValueChange={(value: 'today' | 'week' | 'month') => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本週</SelectItem>
              <SelectItem value="month">本月</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 檢視模式切換 */}
      <Tabs value={viewMode} onValueChange={(value: 'list' | 'calendar') => setViewMode(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            清單檢視
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            日曆檢視
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">

      {/* 行程列表 */}
      {appointments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-lg font-medium text-gray-900 mb-3">沒有預約</h3>
            <p className="text-gray-500">
              {period === 'today' ? '今日' : period === 'week' ? '本週' : '本月'}沒有預約安排
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader className="pt-6 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatDate(appointment.startAt)}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {getStatusText(appointment.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">

                    {/* 顧客資訊 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">顧客資訊</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>{appointment.user.name}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{appointment.user.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">服務資訊</h3>
                        <div className="space-y-2">
                          <p className="font-medium">{appointment.service.name}</p>
                          <p className="text-sm text-gray-600">
                            時長：{appointment.service.durationMin} 分鐘
                          </p>
                          <p className="text-sm text-gray-600">
                            價格：NT$ {appointment.service.price.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 分店資訊 */}
                    <div className="flex items-center space-x-3 mb-6">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{appointment.branch.name}</span>
                    </div>

                    {/* 備註 */}
                    {appointment.notes && (
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">備註</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                          {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex flex-col space-y-3 mt-6 lg:mt-0 lg:ml-8">
                    {getStatusActions(appointment.status).map((action) => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.value}
                          className={`${action.color} text-white px-6 py-2`}
                          onClick={() => updateAppointmentStatus(appointment.id, action.value)}
                          disabled={updating === appointment.id}
                        >
                          {updating === appointment.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Icon className="mr-2 h-4 w-4" />
                          )}
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView 
            appointments={appointments}
            onAppointmentClick={(appointment) => {
              // 點擊日曆事件時顯示詳細資訊
              console.log('Calendar appointment clicked:', appointment);
            }}
            onDateRangeChange={fetchAppointmentsByRange}
          />
        </TabsContent>
      </Tabs>

      {/* 完成服務確認框 */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={handleCancelComplete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>確認完成服務</span>
            </DialogTitle>
            <DialogDescription>
              您確認要將此服務標記為完成嗎？
            </DialogDescription>
          </DialogHeader>
          
          {confirmDialog.appointment && (
            <div className="py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">顧客：</span>
                  <span className="text-sm font-medium">{confirmDialog.appointment.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">服務：</span>
                  <span className="text-sm font-medium">{confirmDialog.appointment.service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">時間：</span>
                  <span className="text-sm font-medium">
                    {formatTime(confirmDialog.appointment.startAt)} - {formatTime(confirmDialog.appointment.endAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">金額：</span>
                  <span className="text-sm font-medium text-green-600">
                    NT$ {confirmDialog.appointment.service.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleCancelComplete}
              disabled={updating === confirmDialog.appointment?.id}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmComplete}
              disabled={updating === confirmDialog.appointment?.id}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating === confirmDialog.appointment?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  處理中...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  確認完成
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
