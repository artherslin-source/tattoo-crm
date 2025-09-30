"use client";

import { useState, useEffect } from "react";
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

interface SimpleCalendarViewProps {
  appointments: Appointment[];
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function SimpleCalendarView({ 
  appointments, 
  onDateRangeChange, 
  onAppointmentClick 
}: SimpleCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // 當日期或視圖變更時，觸發資料載入
  useEffect(() => {
    console.log('useEffect triggered:', { currentDate, view });
    
    try {
      let startDate: Date;
      let endDate: Date;

      if (view === 'month') {
        // 月檢視：包含完整的月份日曆（包括上個月和下個月的部分日期）
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // 計算月曆的開始日期（包含上個月的部分日期）
        const startOfCalendar = new Date(firstDay);
        startOfCalendar.setDate(firstDay.getDate() - firstDay.getDay());
        startOfCalendar.setHours(0, 0, 0, 0);
        startDate = startOfCalendar;
        
        // 計算月曆的結束日期（包含下個月的部分日期）
        const endOfCalendar = new Date(lastDay);
        endOfCalendar.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
        endOfCalendar.setHours(23, 59, 59, 999);
        endDate = endOfCalendar;
      } else {
        const dayOfWeek = currentDate.getDay();
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        endDate = endOfWeek;
      }

      console.log('Date range:', { startDate, endDate });
      
      const timeoutId = setTimeout(() => {
        onDateRangeChange(startDate.toISOString(), endDate.toISOString());
      }, 100);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error in useEffect date calculation:', error);
    }
  }, [currentDate, view]);

  // 導航函數
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setDate(currentDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else {
      newDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // 獲取狀態文字和顏色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { text: '已完成', color: 'bg-green-100 text-green-800' };
      case 'IN_PROGRESS':
        return { text: '進行中', color: 'bg-blue-100 text-blue-800' };
      case 'CONFIRMED':
        return { text: '已確認', color: 'bg-yellow-100 text-yellow-800' };
      case 'PENDING':
        return { text: '待確認', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 格式化時間
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '/');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '--/--/--';
    }
  };

  // 獲取月份名稱
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // 獲取週的日期範圍
  const getWeekRange = (date: Date) => {
    const dayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()} - ${endOfWeek.getMonth() + 1}/${endOfWeek.getDate()}`;
  };

  // 獲取當天的預約
  const getAppointmentsForDate = (date: Date) => {
    // 使用本地日期格式，避免時區問題
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startAt);
      const aptYear = aptDate.getFullYear();
      const aptMonth = String(aptDate.getMonth() + 1).padStart(2, '0');
      const aptDay = String(aptDate.getDate()).padStart(2, '0');
      const aptDateStr = `${aptYear}-${aptMonth}-${aptDay}`;
      
      return aptDateStr === dateStr;
    });
    
    // 調試信息
    if (dayAppointments.length > 0) {
      console.log(`日期 ${dateStr} 有 ${dayAppointments.length} 個行程:`, dayAppointments.map(apt => ({
        id: apt.id,
        user: apt.user.name,
        time: apt.startAt,
        status: apt.status
      })));
    }
    
    return dayAppointments;
  };

  // 獲取週的預約
  const getAppointmentsForWeek = (date: Date) => {
    const dayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.startAt);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    });
  };

  // 獲取月份日曆範圍的預約（包括跨月的行程）
  const getAppointmentsForMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // 計算月曆的開始日期（包含上個月的部分日期）
    const startOfCalendar = new Date(firstDay);
    startOfCalendar.setDate(firstDay.getDate() - firstDay.getDay());
    startOfCalendar.setHours(0, 0, 0, 0);
    
    // 計算月曆的結束日期（包含下個月的部分日期）
    const endOfCalendar = new Date(lastDay);
    endOfCalendar.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    endOfCalendar.setHours(23, 59, 59, 999);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.startAt);
      return aptDate >= startOfCalendar && aptDate <= endOfCalendar;
    });
  };

  // 處理預約點擊
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    onAppointmentClick(appointment);
  };

  // 渲染月份視圖
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    const monthAppointments = getAppointmentsForMonth(currentDate);
    
    // 調試信息
    console.log(`月檢視 ${year}/${month + 1}:`, {
      totalAppointments: appointments.length,
      monthAppointments: monthAppointments.length,
      appointments: appointments.map(apt => ({
        id: apt.id,
        user: apt.user.name,
        date: apt.startAt,
        status: apt.status
      }))
    });
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* 星期標題 */}
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600 bg-gray-50">
            {day}
          </div>
        ))}
        
        {/* 日期格子 */}
        {days.map((day, index) => {
          const dayAppointments = getAppointmentsForDate(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={index}
              className={`min-h-[100px] p-1 border border-gray-200 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              } ${isToday ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </div>
              
              {/* 預約列表 */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(apt => {
                  const statusInfo = getStatusInfo(apt.status);
                  return (
                    <div
                      key={apt.id}
                      className={`text-xs p-1 rounded cursor-pointer hover:bg-gray-100 ${statusInfo.color}`}
                      onClick={() => handleAppointmentClick(apt)}
                    >
                      <div className="font-medium truncate">{apt.user.name}</div>
                      <div className="text-xs opacity-75">{formatTime(apt.startAt)}</div>
                    </div>
                  );
                })}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayAppointments.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染週視圖
  const renderWeekView = () => {
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    
    const weekAppointments = getAppointmentsForWeek(currentDate);
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* 星期標題 */}
        {weekDays.map((day, index) => {
          const dayName = ['日', '一', '二', '三', '四', '五', '六'][index];
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div key={index} className="text-center">
              <div className={`p-2 font-semibold ${isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-600'}`}>
                {dayName}
              </div>
              <div className={`p-2 text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
        
        {/* 預約內容 */}
        {weekDays.map((day, index) => {
          const dayAppointments = getAppointmentsForDate(day);
          
          return (
            <div key={index} className="min-h-[200px] p-2 border border-gray-200">
              <div className="space-y-2">
                {dayAppointments.map(apt => {
                  const statusInfo = getStatusInfo(apt.status);
                  return (
                    <div
                      key={apt.id}
                      className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${statusInfo.color}`}
                      onClick={() => handleAppointmentClick(apt)}
                    >
                      <div className="font-medium text-sm">{apt.user.name}</div>
                      <div className="text-xs opacity-75">{formatTime(apt.startAt)}</div>
                      <div className="text-xs opacity-75">{apt.service.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 日曆控制欄 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                今日
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('month')}
              >
                月檢視
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('week')}
              >
                週檢視
              </Button>
            </div>
          </div>
          
          <CardTitle className="text-center text-xl">
            {view === 'month' ? getMonthName(currentDate) : `週 ${getWeekRange(currentDate)}`}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {view === 'month' ? renderMonthView() : renderWeekView()}
        </CardContent>
      </Card>

      {/* 預約詳情對話框 */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              預約詳情
            </DialogTitle>
            <DialogDescription>
              查看預約的詳細資訊
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6">
              {/* 客戶資訊 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  客戶資訊
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">姓名：</span>
                      <span>{selectedAppointment.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">電話：</span>
                      <span>{selectedAppointment.user.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email：</span>
                      <span>{selectedAppointment.user.email}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">分店：</span>
                      <span>{selectedAppointment.branch.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">時間：</span>
                      <span>{formatDate(selectedAppointment.startAt)} {formatTime(selectedAppointment.startAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">價格：</span>
                      <span>NT$ {selectedAppointment.service.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 服務資訊 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">服務資訊</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">服務項目：</span>
                    <span>{selectedAppointment.service.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">服務描述：</span>
                    <span>{selectedAppointment.service.description}</span>
                  </div>
                  <div>
                    <span className="font-medium">預估時長：</span>
                    <span>{selectedAppointment.service.durationMin} 分鐘</span>
                  </div>
                </div>
              </div>

              {/* 狀態 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">預約狀態</h3>
                <div className="flex items-center gap-2">
                  {selectedAppointment.status === 'COMPLETED' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {selectedAppointment.status === 'IN_PROGRESS' && <Play className="h-4 w-4 text-blue-600" />}
                  {selectedAppointment.status === 'CONFIRMED' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {selectedAppointment.status === 'PENDING' && <Pause className="h-4 w-4 text-gray-600" />}
                  <Badge className={getStatusInfo(selectedAppointment.status).color}>
                    {getStatusInfo(selectedAppointment.status).text}
                  </Badge>
                </div>
              </div>

              {/* 備註 */}
              {selectedAppointment.notes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">備註</h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{selectedAppointment.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
