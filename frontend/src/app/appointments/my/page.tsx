"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getJsonWithAuth, ApiError } from "@/lib/api";

interface Appointment {
  id: string;
  userId: string;
  artistId: string | null;
  serviceId: string | null;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELED";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  artist: {
    id: string;
    name: string;
    email: string;
  } | null;
  service: {
    id: string;
    name: string;
    price: number;
    durationMin: number;
  } | null;
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELED: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  CANCELED: "已取消",
};

export default function MyAppointmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchAppointments() {
      try {
        const data = await getJsonWithAuth<Appointment[]>("/appointments/my");
        setAppointments(data);
      } catch (e) {
        const apiErr = e as ApiError;
        if (apiErr.status === 401) {
          router.replace("/login");
          return;
        }
        setError("取得預約列表失敗");
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, [router]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted-light">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-center">我的預約</h1>
          <button
            onClick={() => router.push("/appointments/new")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors"
          >
            新增預約
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8 text-center">
            <div className="text-text-muted-light text-lg mb-4">目前沒有預約記錄</div>
            <button
              onClick={() => router.push("/appointments/new")}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
            >
              立即預約
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => router.push(`/appointments/${appointment.id}`)}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
                    {appointment.service?.name || "未知服務"}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[appointment.status]}`}
                  >
                    {statusLabels[appointment.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-text-muted-light dark:text-text-secondary-dark">
                  <div className="flex items-center">
                    <span className="font-medium">時間：</span>
                    <span>{formatDateTime(appointment.startAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">結束：</span>
                    <span>{formatDateTime(appointment.endAt)}</span>
                  </div>
                  {appointment.service && (
                    <div className="flex items-center">
                      <span className="font-medium">價格：</span>
                      <span>${appointment.service.price}</span>
                    </div>
                  )}
                  {appointment.artist && (
                    <div className="flex items-center">
                      <span className="font-medium">刺青師：</span>
                      <span>{appointment.artist.name}</span>
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-medium">備註：</span>
                      <p className="mt-1 text-text-muted-light dark:text-text-muted-dark">{appointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-text-muted-light dark:text-text-muted-dark">
                    建立時間：{formatDateTime(appointment.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
