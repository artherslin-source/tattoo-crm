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

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormData>;
  fromContact?: Record<string, string>;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  'data-testid'?: string;
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
        const uniqueBranches = sortBranchesByName(getUniqueBranches(branchesData));
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

    // 時間同步
    if (field === 'startAt') {
      const startTime = new Date(value);
      let endTime;
      
      if (formData.serviceId) {
        const service = services.find(s => s.id === formData.serviceId);
        if (service) {
          endTime = new Date(startTime.getTime() + service.durationMin * 60000);
        } else {
          endTime = new Date(startTime.getTime() + 60 * 60000);
        }
      } else {
        endTime = new Date(startTime.getTime() + 60 * 60000);
      }
      
      setFormData(prev => ({
        ...prev,
        startAt: value,
        endAt: endTime.toISOString().slice(0, 16)
      }));
    }
  };

  // 檢查時間衝突
  const checkTimeConflict = async (artistId: string, startAt: string, endAt: string) => {
    try {
      interface AppointmentConflict {
        id: string;
        artistId: string;
        startAt: string;
        endAt: string;
        status: string;
      }
      
      const appointments = await getJsonWithAuth<AppointmentConflict[]>("/admin/appointments");
      const startTime = new Date(startAt);
      const endTime = new Date(endAt);
      
      const conflict = appointments.find(apt => {
        if (apt.artistId !== artistId) return false;
        if (apt.status === 'CANCELED') return false;
        
        const aptStart = new Date(apt.startAt);
        const aptEnd = new Date(apt.endAt);
        
        return (startTime < aptEnd && endTime > aptStart);
      });
      
      return conflict;
    } catch (err) {
      console.error('Failed to check time conflict:', err);
      return null;
    }
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // 驗證必填欄位
      if (!formData.name || !formData.email || !formData.serviceId || !formData.artistId || !formData.branchId || !formData.startAt || !formData.endAt) {
        setError("請填寫所有必填欄位");
        return;
      }

      // 驗證時間
      const startTime = new Date(formData.startAt);
      const endTime = new Date(formData.endAt);
      if (startTime >= endTime) {
        setError("結束時間必須晚於開始時間");
        return;
      }

      // 檢查時間衝突
      const conflict = await checkTimeConflict(formData.artistId, formData.startAt, formData.endAt);
      if (conflict) {
        setError("刺青師的時間已經有預約了");
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        serviceId: formData.serviceId,
        artistId: formData.artistId,
        branchId: formData.branchId,
        startAt: startTime.toISOString(),
        endAt: endTime.toISOString(),
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
          <p className="text-gray-600">載入中...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-2">{description}</p>
        </div>

        {/* 表單 */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid={dataTestId}>
            {/* 客戶資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="artistId" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-2">
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
                  <p className="text-sm text-gray-500 mt-1">
                    分店已根據選擇的刺青師自動設定
                  </p>
                )}
              </div>
            </div>

            {/* 服務 */}
            <div>
              <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 mb-2">
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

            {/* 時間 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startAt" className="block text-sm font-medium text-gray-700 mb-2">
                  開始時間 *
                </label>
                <input
                  type="datetime-local"
                  id="startAt"
                  value={formData.startAt}
                  onChange={(e) => handleInputChange('startAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="endAt" className="block text-sm font-medium text-gray-700 mb-2">
                  結束時間 *
                </label>
                <input
                  type="datetime-local"
                  id="endAt"
                  value={formData.endAt}
                  onChange={(e) => handleInputChange('endAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
