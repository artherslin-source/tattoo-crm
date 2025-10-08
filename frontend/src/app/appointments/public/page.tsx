'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/api';

interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description?: string;
}

interface Artist {
  id: string;
  displayName: string;
  bio: string;
  styles: string[];
  speciality: string;
  portfolioUrl?: string;
  branchId: string;
  user: {
    id: string;
    name: string;
  };
}

// ✅ Railway/Next.js 安全取得 API URL
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export default function PublicAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    artistId: '',
    serviceId: '',
    startAt: '',
    endAt: '',
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, artistsRes] = await Promise.all([
          fetch(`${API_BASE}/services`),
          fetch(`${API_BASE}/artists`),
        ]);

        const [servicesData, artistsData] = await Promise.all([
          servicesRes.json(),
          artistsRes.json(),
        ]);

        setServices(servicesData);
        setArtists(artistsData);
      } catch (error) {
        console.error('載入資料失敗:', error);
        setError('載入資料失敗，請重新整理頁面');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service && formData.startAt) {
      const startDate = new Date(formData.startAt);
      const endDate = new Date(startDate.getTime() + service.durationMin * 60000);
      setFormData((prev) => ({
        ...prev,
        serviceId,
        endAt: endDate.toISOString().slice(0, 16),
      }));
    } else {
      setFormData((prev) => ({ ...prev, serviceId }));
    }
  };

  const handleStartTimeChange = (startAt: string) => {
    if (formData.serviceId && startAt) {
      const service = services.find((s) => s.id === formData.serviceId);
      if (service) {
        const startDate = new Date(startAt);
        const endDate = new Date(startDate.getTime() + service.durationMin * 60000);
        setFormData((prev) => ({
          ...prev,
          startAt,
          endAt: endDate.toISOString().slice(0, 16),
        }));
      } else {
        setFormData((prev) => ({ ...prev, startAt }));
      }
    } else {
      setFormData((prev) => ({ ...prev, startAt }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (
        !formData.name ||
        !formData.email ||
        !formData.artistId ||
        !formData.serviceId ||
        !formData.startAt ||
        !formData.endAt
      ) {
        setError('請填寫所有必填欄位');
        return;
      }

      const startDate = new Date(formData.startAt);
      const endDate = new Date(formData.endAt);

      if (endDate <= startDate) {
        setError('結束時間必須晚於開始時間');
        return;
      }

      if (startDate <= new Date()) {
        setError('預約時間必須是未來時間');
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        artistId: formData.artistId,
        serviceId: formData.serviceId,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        notes: formData.notes || undefined,
      };

      const res = await postJSON('/appointments/public', payload);

      // 如果 postJSON 成功執行到這裡，說明請求成功

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        artistId: '',
        serviceId: '',
        startAt: '',
        endAt: '',
        notes: '',
      });
    } catch (error) {
      console.error('提交錯誤:', error);
      setError('預約失敗，請檢查網路連線');
    } finally {
      setSubmitting(false);
    }
  };

  // === 以下為 UI ===

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">預約成功！</h2>
          <p className="text-gray-600 mb-6">
            您的預約已提交成功，我們將在 24 小時內與您聯繫確認預約時間。
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              再次預約
            </button>
            <button
              onClick={() => router.push('/booking')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">線上預約</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選擇刺青師 *</label>
              <select
                value={formData.artistId}
                onChange={(e) => handleInputChange('artistId', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">請選擇刺青師</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">服務項目 *</label>
              <select
                value={formData.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">請選擇服務項目</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.durationMin}分鐘）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始時間 *</label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">結束時間 *</label>
              <input
                type="datetime-local"
                value={formData.endAt}
                readOnly
                className="w-full border-gray-300 rounded-md bg-gray-100 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg shadow-sm transition-colors disabled:bg-orange-300"
          >
            {submitting ? '送出中...' : '送出預約'}
          </button>
        </form>
      </div>
    </div>
  );
}
