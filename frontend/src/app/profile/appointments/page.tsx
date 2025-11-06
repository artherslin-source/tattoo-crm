"use client";

import { useEffect, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
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
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  IN_PROGRESS: "進行中",
  COMPLETED: "已完成",
  CANCELED: "已取消",
};

export default function ProfileAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      console.log("📅 開始獲取我的預約記錄...");
      const data = await getJsonWithAuth("/appointments/my");
      console.log("✅ 預約記錄獲取成功:", data);
      console.log("📊 預約數量:", Array.isArray(data) ? data.length : 0);
      setAppointments((data as Appointment[]) || []);
    } catch (error) {
      console.error("❌ 獲取預約失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const now = new Date();
    const startAt = new Date(apt.startAt);

    if (filter === "upcoming") return startAt >= now;
    if (filter === "past") return startAt < now;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">我的預約</h2>
        <p className="text-gray-600">查看您的刺青預約記錄</p>
      </div>

      {/* 筛选按钮 */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          全部
        </Button>
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("upcoming")}
        >
          未來預約
        </Button>
        <Button
          variant={filter === "past" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("past")}
        >
          過去預約
        </Button>
      </div>

      {/* 预约列表 */}
      {filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === "upcoming" ? "沒有未來預約" : filter === "past" ? "沒有過去預約" : "尚無預約記錄"}
            </h3>
            <p className="text-gray-600">
              開始選購刺青服務，建立您的預約
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const color = appointment.cartSnapshot?.items[0]?.selectedVariants.color as string | undefined;
            
            return (
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
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            購物車預約（{appointment.cartSnapshot.items.length} 個服務）
                          </div>
                        ) : (
                          appointment.service?.name || "未指定服務"
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
                        {new Date(appointment.startAt).toLocaleString("zh-TW", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
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

                  {/* 購物車服務列表 */}
                  {appointment.cartSnapshot && appointment.cartSnapshot.items.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">服務項目：</h4>
                      <div className="space-y-2">
                        {appointment.cartSnapshot.items.map((item, idx) => {
                          const itemColor = item.selectedVariants.color as string | undefined;
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div>
                                <span className="font-medium">{item.serviceName}</span>
                                {itemColor && (
                                  <span className="text-gray-600 ml-2">({itemColor})</span>
                                )}
                              </div>
                              <span className="font-semibold text-blue-600">
                                NT$ {item.finalPrice.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t mt-3 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-gray-900">總計</span>
                        <span className="text-lg font-bold text-blue-600">
                          NT$ {appointment.cartSnapshot.totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 單一服務 */}
                  {appointment.service && !appointment.cartSnapshot && (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">預估時長:</span>
                        <span className="text-sm font-medium">{appointment.service.durationMin} 分鐘</span>
                      </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}

