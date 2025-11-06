"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJsonWithAuth, getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Home, Package } from "lucide-react";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
  createdAt: string;
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
  branch: {
    id: string;
    name: string;
  };
  cartSnapshot?: {
    items: Array<{
      serviceId: string;
      serviceName: string;
      selectedVariants: Record<string, unknown>;
      basePrice: number;
      finalPrice: number;
      estimatedDuration: number;
      notes?: string;
    }>;
    totalPrice: number;
    totalDuration: number;
  };
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELED: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  PENDING: '待確認',
  CONFIRMED: '已確認',
  IN_PROGRESS: '進行中',
  COMPLETED: '已完成',
  CANCELED: '已取消',
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 檢查是否登入
    const token = getAccessToken();
    if (!token) {
      router.push('/login?redirect=/appointments');
      return;
    }

    // 獲取我的預約
    const fetchAppointments = async () => {
      try {
        const data = await getJsonWithAuth('/appointments/my');
        setAppointments(data || []);
      } catch (err) {
        console.error('獲取預約失敗:', err);
        setError('無法載入預約資訊');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">我的預約</h1>
              <p className="mt-2 text-gray-600">
                查看您的刺青預約記錄
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              返回首頁
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                尚無預約記錄
              </h3>
              <p className="text-gray-600 mb-6">
                開始選購刺青服務，建立您的第一個預約
              </p>
              <Button onClick={() => router.push('/')}>
                瀏覽服務
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[appointment.status]}>
                          {statusLabels[appointment.status]}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">
                        {appointment.cartSnapshot ? (
                          <div>
                            <span className="flex items-center gap-2">
                              <Package className="h-5 w-5" />
                              購物車預約（{appointment.cartSnapshot.items.length} 個服務）
                            </span>
                          </div>
                        ) : (
                          appointment.service?.name || '未指定服務'
                        )}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 時間資訊 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">預約時間:</span>
                      <span className="font-medium">
                        {new Date(appointment.startAt).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">分店:</span>
                      <span className="font-medium">{appointment.branch.name}</span>
                    </div>
                  </div>

                  {appointment.artist && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">刺青師:</span>
                      <span className="font-medium">{appointment.artist.name}</span>
                    </div>
                  )}

                  {/* 購物車快照服務列表 */}
                  {appointment.cartSnapshot && appointment.cartSnapshot.items.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">服務項目：</h4>
                      <div className="space-y-2">
                        {appointment.cartSnapshot.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">{item.serviceName}</span>
                              {item.selectedVariants.color && (
                                <span className="text-gray-600 ml-2">
                                  ({String(item.selectedVariants.color)})
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-blue-600">
                              NT$ {item.finalPrice.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-gray-900">總計</span>
                        <span className="text-lg font-bold text-blue-600">
                          NT$ {appointment.cartSnapshot.totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 單一服務價格 */}
                  {appointment.service && !appointment.cartSnapshot && (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <span className="text-sm text-gray-600">服務價格:</span>
                      <span className="text-lg font-bold text-blue-600">
                        NT$ {appointment.service.price.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* 備註 */}
                  {appointment.notes && (
                    <div className="text-sm">
                      <span className="text-gray-600">備註: </span>
                      <span className="text-gray-900">{appointment.notes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

