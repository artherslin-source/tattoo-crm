"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Phone, 
  MapPin, 
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from "lucide-react";

// 設定 moment 為本地化
const localizer = momentLocalizer(moment);

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

interface CalendarViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export default function CalendarView({ 
  appointments, 
  onAppointmentClick, 
  onDateRangeChange 
}: CalendarViewProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // 轉換預約資料為日曆事件格式
  const events = useMemo(() => {
    return appointments.map((appointment) => ({
      id: appointment.id,
      title: `${appointment.user.name} - ${appointment.service.name}`,
      start: new Date(appointment.startAt),
      end: new Date(appointment.endAt),
      resource: appointment,
    }));
  }, [appointments]);

  // 根據狀態獲取事件樣式
  const eventStyleGetter = (event: any) => {
    const appointment = event.resource as Appointment;
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    switch (appointment.status) {
      case 'COMPLETED':
        backgroundColor = '#10b981';
        borderColor = '#10b981';
        break;
      case 'IN_PROGRESS':
        backgroundColor = '#f59e0b';
        borderColor = '#f59e0b';
        break;
      case 'CONFIRMED':
        backgroundColor = '#3b82f6';
        borderColor = '#3b82f6';
        break;
      case 'CANCELLED':
        backgroundColor = '#ef4444';
        borderColor = '#ef4444';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        borderRadius: '4px',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  };

  // 處理事件點擊
  const handleSelectEvent = (event: any) => {
    const appointment = event.resource as Appointment;
    setSelectedAppointment(appointment);
    onAppointmentClick(appointment);
  };

  // 處理視圖變更
  const handleViewChange = (newView: any) => {
    setView(newView);
  };

  // 處理日期變更
  const handleNavigate = (newDate: Date) => {
    console.log('Calendar navigation:', { newDate, currentView: view });
    setDate(newDate);
  };

  // 當日期或視圖變更時，觸發資料載入
  useEffect(() => {
    console.log('useEffect triggered:', { date, view });
    
    // 根據視圖計算日期範圍
    let startDate: Date;
    let endDate: Date;

    if (view === Views.MONTH) {
      startDate = moment(date).startOf('month').toDate();
      endDate = moment(date).endOf('month').toDate();
    } else if (view === Views.WEEK) {
      startDate = moment(date).startOf('week').toDate();
      endDate = moment(date).endOf('week').toDate();
    } else {
      startDate = moment(date).startOf('day').toDate();
      endDate = moment(date).endOf('day').toDate();
    }

    console.log('Date range:', { startDate, endDate });
    
    // 使用 setTimeout 來避免在組件初始化時立即觸發
    const timeoutId = setTimeout(() => {
      onDateRangeChange(startDate.toISOString(), endDate.toISOString());
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [date, view]); // 移除 onDateRangeChange 依賴以避免無限循環

  // 獲取狀態文字和顏色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { text: '已完成', color: 'bg-green-100 text-green-800' };
      case 'IN_PROGRESS':
        return { text: '進行中', color: 'bg-yellow-100 text-yellow-800' };
      case 'CONFIRMED':
        return { text: '已確認', color: 'bg-blue-100 text-blue-800' };
      case 'CANCELLED':
        return { text: '已取消', color: 'bg-red-100 text-red-800' };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 格式化時間
  const formatTime = (dateString: string) => {
    return moment(dateString).format('HH:mm');
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return moment(dateString).format('YYYY/MM/DD');
  };

  return (
    <div className="space-y-6">
      {/* 日曆控制欄 */}
          <Card>
            <CardHeader>
              <CardTitle>行程日曆</CardTitle>
            </CardHeader>
        <CardContent>
          {/* 日曆組件 */}
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              views={[Views.MONTH, Views.WEEK]}
              date={date}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              showMultiDayTimes
              step={60}
              popup
              messages={{
                next: '下一個',
                previous: '上一個',
                today: '今天',
                month: '月',
                week: '週',
                day: '日',
                agenda: '議程',
                date: '日期',
                time: '時間',
                event: '事件',
                noEventsInRange: '此範圍內沒有行程',
                showMore: (total: number) => `+${total} 更多`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 狀態圖例 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">狀態說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">已完成</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">進行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">已確認</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">已取消</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 預約詳細資訊對話框 */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>預約詳情</span>
            </DialogTitle>
            <DialogDescription>
              查看預約的詳細資訊
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="py-4">
              <div className="space-y-4">
                {/* 狀態 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">狀態：</span>
                  <Badge className={getStatusInfo(selectedAppointment.status).color}>
                    {getStatusInfo(selectedAppointment.status).text}
                  </Badge>
                </div>

                {/* 時間 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">時間：</span>
                  <span className="text-sm font-medium">
                    {formatDate(selectedAppointment.startAt)} {formatTime(selectedAppointment.startAt)} - {formatTime(selectedAppointment.endAt)}
                  </span>
                </div>

                {/* 顧客資訊 */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-gray-900">顧客資訊</h4>
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedAppointment.user.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{selectedAppointment.user.phone}</span>
                  </div>
                </div>

                {/* 服務資訊 */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-gray-900">服務資訊</h4>
                  <p className="font-medium">{selectedAppointment.service.name}</p>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      時長：{selectedAppointment.service.durationMin} 分鐘
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      價格：NT$ {selectedAppointment.service.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 分店資訊 */}
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{selectedAppointment.branch.name}</span>
                </div>

                {/* 備註 */}
                {selectedAppointment.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">備註</h4>
                    <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedAppointment(null)}
            >
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
