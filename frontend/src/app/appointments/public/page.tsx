"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { postJSON, ApiError } from "@/lib/api";

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

export default function PublicAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    artistId: '',
    serviceId: '',
    startAt: '',
    endAt: '',
    notes: ''
  });

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, artistsRes] = await Promise.all([
          fetch('http://localhost:4000/services'),
          fetch('http://localhost:4000/artists')
        ]);

        const [servicesData, artistsData] = await Promise.all([
          servicesRes.json(),
          artistsRes.json()
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

  // 處理表單變更
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除之前的錯誤訊息
    if (error) {
      setError(null);
    }
  };

  // 處理服務選擇變更
  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service && formData.startAt) {
      const startDate = new Date(formData.startAt);
      const endDate = new Date(startDate.getTime() + service.durationMin * 60000);
      setFormData(prev => ({
        ...prev,
        serviceId,
        endAt: endDate.toISOString().slice(0, 16)
      }));
    } else {
      setFormData(prev => ({ ...prev, serviceId }));
    }
  };

  // 處理開始時間變更
  const handleStartTimeChange = (startAt: string) => {
    if (formData.serviceId && startAt) {
      const service = services.find(s => s.id === formData.serviceId);
      if (service) {
        const startDate = new Date(startAt);
        const endDate = new Date(startDate.getTime() + service.durationMin * 60000);
        setFormData(prev => ({
          ...prev,
          startAt,
          endAt: endDate.toISOString().slice(0, 16)
        }));
      } else {
        setFormData(prev => ({ ...prev, startAt }));
      }
    } else {
      setFormData(prev => ({ ...prev, startAt }));
    }
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 驗證必填欄位
      if (!formData.name || !formData.email || !formData.artistId || !formData.serviceId || !formData.startAt || !formData.endAt) {
        setError('請填寫所有必填欄位');
        return;
      }

      // 驗證時間
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
        notes: formData.notes || undefined
      };

      const res = await postJSON('/appointments/public', payload);

      if (!res.ok) {
        const errorMessage = typeof res.data === 'string' ? res.data : (res.data as { message?: string })?.message || '預約失敗';
        setError(errorMessage);
        return;
      }

      // 成功
      setSuccess(true);
      
      // 重置表單
      setFormData({
        name: '',
        email: '',
        phone: '',
        artistId: '',
        serviceId: '',
        startAt: '',
        endAt: '',
        notes: ''
      });
    } catch (error) {
      console.error('提交錯誤:', error);
      setError('預約失敗，請檢查網路連線');
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">立即預約</h1>
          <p className="text-lg text-gray-600">填寫以下資訊完成預約</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="請輸入您的姓名"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="請輸入您的Email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                聯絡電話
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="請輸入您的聯絡電話"
              />
            </div>

            {/* 刺青師選擇 */}
            <div>
              <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-2">
                選擇刺青師 *
              </label>
              <select
                id="artist"
                value={formData.artistId}
                onChange={(e) => handleInputChange('artistId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">請選擇刺青師</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.user.id}>
                    {artist.displayName} - {artist.speciality}
                  </option>
                ))}
              </select>
            </div>

            {/* 服務選擇 */}
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                選擇服務 *
              </label>
              <select
                id="service"
                value={formData.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

            {/* 時間選擇 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startAt" className="block text-sm font-medium text-gray-700 mb-2">
                  開始時間 *
                </label>
                <input
                  id="startAt"
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="endAt" className="block text-sm font-medium text-gray-700 mb-2">
                  結束時間 *
                </label>
                <input
                  id="endAt"
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => handleInputChange('endAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                備註需求
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="請描述您的需求或特殊要求..."
                rows={4}
              />
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {submitting ? '提交中...' : '送出預約'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
