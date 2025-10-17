"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAccessToken, getJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";

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

export default function AppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchAppointment() {
      try {
        const data = await getJsonWithAuth<Appointment>(`/appointments/${appointmentId}`);
        setAppointment(data);
      } catch (e) {
        const apiErr = e as ApiError;
        if (apiErr.status === 401) {
          router.replace("/login");
          return;
        } else if (apiErr.status === 404) {
          setError("預約不存在");
        } else {
          setError("取得預約詳情失敗");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAppointment();
  }, [router, appointmentId]);

  const handleCancel = async () => {
    if (!appointment) return;

    const confirmed = window.confirm("確定要取消這個預約嗎？");
    if (!confirmed) return;

    setCanceling(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      await patchJsonWithAuth("/appointments/" + appointmentId, { status: "CANCELED" });
      setSuccess("預約已取消");
      
      // 更新本地狀態
      setAppointment({
        ...appointment,
        status: "CANCELED",
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "取消預約失敗");
    } finally {
      setCanceling(false);
    }
  };

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

  const canCancel = appointment && (appointment.status === "PENDING" || appointment.status === "CONFIRMED");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted-light">載入中...</div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => router.push("/appointments/my")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors"
          >
            返回預約列表
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted-light">預約不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-center">預約詳情</h1>
          <button
            onClick={() => router.push("/appointments/my")}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors"
          >
            返回列表
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark">
              {appointment.service?.name || "未知服務"}
            </h2>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full border ${statusColors[appointment.status]}`}
            >
              {statusLabels[appointment.status]}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  開始時間
                </label>
                <div className="text-lg text-text-primary-light dark:text-text-primary-dark">
                  {formatDateTime(appointment.startAt)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  結束時間
                </label>
                <div className="text-lg text-text-primary-light dark:text-text-primary-dark">
                  {formatDateTime(appointment.endAt)}
                </div>
              </div>
            </div>

            {appointment.service && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                    服務價格
                  </label>
                  <div className="text-lg text-text-primary-light dark:text-text-primary-dark">
                    ${appointment.service.price}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                    服務時長
                  </label>
                  <div className="text-lg text-text-primary-light dark:text-text-primary-dark">
                    {appointment.service.durationMin} 分鐘
                  </div>
                </div>
              </div>
            )}

            {appointment.artist && (
              <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  指定刺青師
                </label>
                <div className="text-lg text-text-primary-light dark:text-text-primary-dark">
                  {appointment.artist.name}
                </div>
              </div>
            )}

            {appointment.notes && (
              <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  備註
                </label>
                <div className="text-text-primary-light dark:text-text-primary-dark bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {appointment.notes}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  建立時間
                </label>
                <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  {formatDateTime(appointment.createdAt)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  最後更新
                </label>
                <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  {formatDateTime(appointment.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          {canCancel && (
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {canceling ? "取消中..." : "取消預約"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
