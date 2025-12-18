"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postJsonWithAuth, getJsonWithAuth, ApiError, getAccessToken } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
}

interface Artist {
  id: string;
  displayName: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

interface Branch {
  id: string;
  name: string;
  address: string;
  [key: string]: unknown;
}

interface AppointmentFormData {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  artistId: string;
  branchId: string;
  startAt: string;
  endAt: string;
  notes: string;
  contactId: string;
}

type AppointmentFormInitialData = Partial<AppointmentFormData> & {
  holdMin?: number;
};

interface AppointmentFormProps {
  initialData?: AppointmentFormInitialData;
  fromContact?: Record<string, string>;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  'data-testid'?: string;
}

interface AvailabilityResponse {
  slots: string[];
}

function useAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // 僅在 client 端執行
    setToken(getAccessToken());
  }, []);
  return token;
}

export default function AppointmentForm({
  initialData = {},
  fromContact,
  onSubmitSuccess,
  onCancel,
  title = "創建新預約",
  description = "為客戶創建新的預約",
  'data-testid': dataTestId
}: AppointmentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAccessToken();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [holdMin, setHoldMin] = useState<number>(() => {
    // Default: 120 + buffer(30) = 150
    const seed = Number(initialData?.holdMin);
    if (Number.isFinite(seed) && seed > 0) return seed;
    return 150;
  });

  const canFetch = useMemo(() => !!token, [token]);

  const [formData, setFormData] = useState<AppointmentFormData>({
    name: fromContact?.name ?? searchParams.get("name") ?? "",
    email: fromContact?.email ?? searchParams.get("email") ?? "",
    phone: fromContact?.phone ?? searchParams.get("phone") ?? "",
    notes: fromContact?.notes ?? searchParams.get("notes") ?? "",
    branchId: fromContact?.branchId ?? searchParams.get("branchId") ?? "",
    contactId: "", // 前端不再處理 contactId，由後端統一生成
    serviceId: "",
    artistId: "",
    startAt: "",
    endAt: "",
  });

  const [appointmentDate, setAppointmentDate] = useState<string>(() => {
    const seed = initialData.startAt || "";
    if (!seed) return "";
    const d = new Date(seed);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState<string>(() => {
    const seed = initialData.startAt || "";
    if (!seed) return "";
    const d = new Date(seed);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  // 載入數據
  useEffect(() => {
    if (!canFetch) return;        // 等 token 準備好

    async function fetchData() {
      setLoading(true);
      try {
        const [servicesData, artistsData, branchesData] = await Promise.all([
          getJsonWithAuth<Service[]>("/services"),
          getJsonWithAuth<Artist[]>("/admin/artists"),
          getJsonWithAuth<Branch[]>("/branches"),
        ]);

        setServices(servicesData);
        setArtists(artistsData);
        const uniqueBranches = sortBranchesByName(getUniqueBranches<Branch>(branchesData));
        setBranches(uniqueBranches);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError("載入數據失敗");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [canFetch]);

  // 處理輸入變更
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // 刺青師與分店連動
    if (field === 'artistId') {
      const artist = artists.find(a => a.user.id === value);
      if (artist && artist.branchId) {
        setFormData(prev => ({
          ...prev,
          artistId: value,
          branchId: artist.branchId
        }));
      }
    }
  };

  // Scheduling uses holdMin (store-wide default 150; admin can adjust)
  const durationMin = useMemo(() => holdMin, [holdMin]);

  // Fetch available slots from backend policy endpoint (single source of truth)
  useEffect(() => {
    const run = async () => {
      if (!canFetch) return;
      if (!formData.branchId || !formData.artistId || !appointmentDate || !formData.serviceId) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("branchId", formData.branchId);
        params.set("artistId", formData.artistId);
        params.set("date", appointmentDate);
        params.set("durationMin", String(durationMin));
        params.set("stepMin", "30");

        const data = await getJsonWithAuth<AvailabilityResponse>(`/public/appointments/availability?${params.toString()}`);
        const slots = Array.isArray(data?.slots) ? data.slots : [];
        setAvailableSlots(slots);

        if (slots.length) {
          if (!timeSlot || !slots.includes(timeSlot)) {
            setTimeSlot(slots[0]);
          }
        } else {
          setTimeSlot("");
        }
      } catch (err) {
        console.error("Failed to fetch availability:", err);
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    run();
  }, [canFetch, formData.branchId, formData.artistId, appointmentDate, formData.serviceId, durationMin, timeSlot]);

  // Derive startAt/endAt (datetime-local strings) from date + slot + duration
  useEffect(() => {
    if (!appointmentDate || !timeSlot) return;
    const startLocal = `${appointmentDate}T${timeSlot}`;
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + durationMin * 60000);
    // No cross-day lock: clamp to 23:59
    const dayEnd = new Date(start);
    dayEnd.setHours(23, 59, 0, 0);
    const clampedEnd = end > dayEnd ? dayEnd : end;
    const endLocal = `${clampedEnd.getFullYear()}-${String(clampedEnd.getMonth() + 1).padStart(2, "0")}-${String(clampedEnd.getDate()).padStart(2, "0")}T${String(clampedEnd.getHours()).padStart(2, "0")}:${String(clampedEnd.getMinutes()).padStart(2, "0")}`;
    setFormData((prev) => ({ ...prev, startAt: startLocal, endAt: endLocal }));
  }, [appointmentDate, timeSlot, durationMin]);

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // 驗證必填欄位
      if (!formData.name || !formData.email || !formData.serviceId || !formData.artistId || !formData.branchId || !appointmentDate || !timeSlot) {
        setError("請填寫所有必填欄位");
        return;
      }

      if (availableSlots.length && !availableSlots.includes(timeSlot)) {
        setError("所選時段已不可用，請重新選擇");
        return;
      }

      const startLocal = `${appointmentDate}T${timeSlot}`;
      const startTime = new Date(startLocal);
      if (Number.isNaN(startTime.getTime())) {
        setError("開始時間格式不正確");
        return;
      }
      if (!Number.isFinite(holdMin) || holdMin <= 0) {
        setError("保留時間必須 > 0（分鐘）");
        return;
      }
      if (holdMin > 24 * 60) {
        setError("保留時間不可超過 24 小時");
        return;
      }
      const endTimeRaw = new Date(startTime.getTime() + holdMin * 60000);
      const dayEnd = new Date(startTime);
      dayEnd.setHours(23, 59, 0, 0);
      const endTime = endTimeRaw > dayEnd ? dayEnd : endTimeRaw;

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        serviceId: formData.serviceId,
        artistId: formData.artistId,
        branchId: formData.branchId,
        startAt: startTime.toISOString(),
        endAt: endTime.toISOString(),
        holdMin,
        notes: formData.notes || undefined,
      };

      await postJsonWithAuth("/appointments", payload);
      
      setSuccess("預約創建成功！");
      
      // 3秒後執行成功回調或跳轉
      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess();
        } else {
          router.push("/admin/appointments");
        }
      }, 2000);
      
    } catch (err) {
      console.error('Create appointment error:', err);
      const apiErr = err as ApiError;
      setError(apiErr.message || "創建預約失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-muted-light">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <button
            onClick={onCancel || (() => router.back())}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h1 className="text-3xl font-bold text-text-primary-light">{title}</h1>
          <p className="text-text-muted-light mt-2">{description}</p>
        </div>

        {/* 表單 */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid={dataTestId}>
            {/* 客戶資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text-secondary-light mb-2">
                  客戶姓名 *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary-light mb-2">
                  電子郵件 *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-secondary-light mb-2">
                聯絡電話
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 刺青師和分店 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="artistId" className="block text-sm font-medium text-text-secondary-light mb-2">
                  刺青師 *
                </label>
                <select
                  id="artistId"
                  value={formData.artistId}
                  onChange={(e) => handleInputChange('artistId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇刺青師</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.user.id}>
                      {artist.displayName || artist.user.name} ({artist.branch?.name || '無分店'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="branchId" className="block text-sm font-medium text-text-secondary-light mb-2">
                  分店 *
                </label>
                <select
                  id="branchId"
                  value={formData.branchId}
                  onChange={(e) => handleInputChange('branchId', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formData.artistId ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  disabled={!!formData.artistId}
                  required
                >
                  <option value="">請選擇分店</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {formData.artistId && (
                  <p className="text-sm text-text-muted-light mt-1">
                    分店已根據選擇的刺青師自動設定
                  </p>
                )}
              </div>
            </div>

            {/* 服務 */}
            <div>
              <label htmlFor="serviceId" className="block text-sm font-medium text-text-secondary-light mb-2">
                服務 *
              </label>
              <select
                id="serviceId"
                value={formData.serviceId}
                onChange={(e) => handleInputChange('serviceId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">請選擇服務</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - NT$ {service.price.toLocaleString()} ({service.durationMin}分鐘)
                  </option>
                ))}
              </select>
            </div>

            {/* 排程保留時間（可自由加減） */}
            <div>
              <label className="block text-sm font-medium text-text-secondary-light mb-2">
                保留時間（分鐘）
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setHoldMin((v) => Math.max(1, v - 60))}
                >
                  -60
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setHoldMin((v) => Math.max(1, v - 30))}
                >
                  -30
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setHoldMin((v) => Math.max(1, v - 15))}
                >
                  -15
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setHoldMin((v) => v + 15)}
                >
                  +15
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setHoldMin((v) => v + 30)}
                >
                  +30
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => setHoldMin((v) => v + 60)}
                >
                  +60
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={24 * 60}
                    value={holdMin}
                    onChange={(e) => setHoldMin(Number(e.target.value))}
                    className="w-28 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-text-muted-light">預設 150（120 + buffer 30）</span>
                </div>
              </div>
              <p className="text-xs text-text-muted-light mt-2">
                系統會用「保留時間」計算結束時間並避免撞單；若跨日會自動截斷到 23:59。
              </p>
            </div>

            {/* 時間 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="appointmentDate" className="block text-sm font-medium text-text-secondary-light mb-2">
                  預約日期 *
                </label>
                <input
                  type="date"
                  id="appointmentDate"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.artistId || !formData.serviceId}
                  required
                />
                {!formData.artistId || !formData.serviceId ? (
                  <p className="text-sm text-text-muted-light mt-1">請先選擇刺青師與服務</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="timeSlot" className="block text-sm font-medium text-text-secondary-light mb-2">
                  預約時段 *
                </label>
                <select
                  id="timeSlot"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!appointmentDate || slotsLoading || availableSlots.length === 0}
                  required
                >
                  <option value="">{slotsLoading ? "載入可用時段中..." : "請選擇時段"}</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
                {appointmentDate && !slotsLoading && availableSlots.length === 0 ? (
                  <p className="text-sm text-text-muted-light mt-1">此日期暫無可用時段，請更換日期</p>
                ) : null}
              </div>
            </div>

            {/* 顯示計算後的時間（只讀，避免手動輸入造成不一致） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary-light mb-2">
                  開始時間（自動）
                </label>
                <input
                  type="datetime-local"
                  value={formData.startAt}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary-light mb-2">
                  結束時間（自動）
                </label>
                <input
                  type="datetime-local"
                  value={formData.endAt}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                />
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-text-secondary-light mb-2">
                備註
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="請輸入備註..."
              />
            </div>

            {/* 錯誤和成功訊息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* 提交按鈕 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onCancel || (() => router.back())}
                className="px-6 py-2 border border-gray-300 rounded-md text-text-secondary-light hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '創建中...' : '創建預約'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
