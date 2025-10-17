"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, postJsonWithAuth, getJsonWithAuth, ApiError } from "@/lib/api";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  // Form data
  const [serviceId, setServiceId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchServices() {
      try {
        const data = await getJsonWithAuth<Service[]>("/services");
        setServices(data);
      } catch (e) {
        const apiErr = e as ApiError;
        if (apiErr.status === 401) {
          router.replace("/login");
          return;
        }
        setError("取得服務列表失敗");
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      if (!serviceId || !startAt || !endAt) {
        setError("請填寫所有必填欄位");
        return;
      }

      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      if (endDate <= startDate) {
        setError("結束時間必須晚於開始時間");
        return;
      }

      await postJsonWithAuth("/appointments", {
        serviceId,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        notes: notes.trim() || undefined,
      });

      // 成功後導向我的預約列表
      router.push("/appointments/my");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        router.replace("/login");
        return;
      }
      setError(apiErr.message || "建立預約失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
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
      <h1 className="text-4xl font-bold mb-8 text-center">新增預約</h1>

      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="serviceId" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              選擇服務 *
            </label>
            <select
              id="serviceId"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
              required
            >
              <option value="">請選擇服務</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price} ({service.durationMin}分鐘)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="startAt" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              開始時間 *
            </label>
            <input
              id="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
              required
            />
          </div>

          <div>
            <label htmlFor="endAt" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              結束時間 *
            </label>
            <input
              id="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
              required
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              備註
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="請輸入備註（選填）"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/appointments/my")}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-text-primary-light dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-text-primary-dark font-medium py-2.5 rounded-lg shadow-sm transition-colors"
            >
              返回預約列表
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? "建立中..." : "建立預約"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
