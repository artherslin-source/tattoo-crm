"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getApiBase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";
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
  photoUrl?: string;
  branchId: string;
  user: {
    id: string;
    name: string;
  };
}

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    branchId: '',
    notes: ''
  });
  
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoggedIn(false);
    } else {
      fetch(`${getApiBase()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => setLoggedIn(r.ok))
        .catch(() => setLoggedIn(false));
    }
  }, []);

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const [servicesRes, artistsRes, branchesRes] = await Promise.all([
          fetch(`${apiBase}/services`),
          fetch(`${apiBase}/artists`),
          fetch(`${apiBase}/branches/public`)
        ]);

        const [servicesData, artistsData, branchesData] = await Promise.all([
          servicesRes.json(),
          artistsRes.json(),
          branchesRes.json()
        ]);

        setServices(servicesData);
        setArtists(artistsData);
        setBranches(branchesData);
      } catch (error) {
        console.error('載入資料失敗:', error);
        setMessage({ type: 'error', text: '載入資料失敗，請重新整理頁面' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 處理表單變更
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除之前的訊息
    if (message) {
      setMessage(null);
    }
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      // 驗證必填欄位
      if (!formData.name || !formData.email || !formData.branchId) {
        setMessage({ type: 'error', text: '請填寫所有必填欄位' });
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        branchId: formData.branchId,
        notes: formData.notes || undefined
      };

      const res = await postJSON('/public/contacts', payload);

      if (!res.ok) {
        const errorMessage = typeof res.data === 'string' ? res.data : (res.data as { message?: string })?.message || '提交失敗';
        setMessage({ type: 'error', text: errorMessage });
        return;
      }

      // 成功
      setMessage({ 
        type: 'success', 
        text: '✅ 聯絡資訊已提交！我們將盡快與您聯繫' 
      });
      
      // 重置表單
      setFormData({
        name: '',
        email: '',
        phone: '',
        branchId: '',
        notes: ''
      });
    } catch (error) {
      console.error('提交錯誤:', error);
      setMessage({ type: 'error', text: '提交失敗，請檢查網路連線' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Banner Background */}
      <div className="relative h-screen overflow-hidden">
        <Image
          src="/images/tattoo-artist-banner.jpg"
          alt="Professional tattoo artist at work"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Navigation */}
        <nav className="relative z-10 flex justify-between items-center p-6">
          <div className="text-white text-2xl font-bold">
            Tattoo CRM
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              回上一頁
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              專業刺青
              <br />
              <span className="text-yellow-400">藝術管理</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              現代化的刺青工作室管理系統，讓您的藝術事業更加專業高效
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {!loggedIn ? (
                <>
                  <a
                    href="/login"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    立即登入
                  </a>
                  <a
                    href="/register"
                    className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105"
                  >
                    註冊帳號
                  </a>
                  <Link
                    href="/appointments/public"
                    className="border-2 border-white/50 text-white/90 hover:bg-white/10 font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300"
                  >
                    預約刺青
                  </Link>
                </>
              ) : (
                <a
                  href="/profile"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  前往管理後台
                </a>
              )}
            </div>

            {/* Scroll down indicator */}
            <div className="animate-bounce">
              <Button 
                variant="ghost"
                size="lg"
                className="text-white hover:text-yellow-400"
                onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 服務介紹區塊 */}
      <section id="services-section" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">我們的服務</h2>
            <p className="text-lg text-gray-600">多種刺青風格，滿足您的不同需求</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-gray-500">服務圖片</span>
                  </div>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <CardDescription>{service.description || '專業刺青服務'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-primary">
                      NT$ {service.price.toLocaleString()}
                    </span>
                    <Badge variant="secondary">
                      {service.durationMin} 分鐘
                    </Badge>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    了解更多
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 刺青師介紹區塊 - 保留原有功能 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">刺青師團隊</h2>
            <p className="text-lg text-gray-600">經驗豐富的專業刺青師，為您提供最優質的服務</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {artists.map((artist) => (
              <Card key={artist.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-full h-48 rounded-lg mb-4 overflow-hidden">
                    {artist.photoUrl ? (
                      <img 
                        src={artist.photoUrl} 
                        alt={artist.displayName}
                        className={`w-full h-full object-cover ${
                          artist.displayName === "林承葉" ? "object-[center_30%]" : "object-center"
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {artist.displayName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-gray-600 text-sm">專業刺青師</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{artist.displayName}</CardTitle>
                  <CardDescription>{artist.speciality}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{artist.bio}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {artist.styles.map((style) => (
                      <Badge key={style} variant="outline">{style}</Badge>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    聯絡我們
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 預約表單區塊 */}
      <section id="booking-form" className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">聯絡我們</h2>
            <p className="text-lg text-gray-600">填寫以下資訊，我們將盡快與您聯繫</p>
          </div>

          <Card>
            <CardContent className="pt-8 pb-8 px-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 基本資訊 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">姓名 *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="請輸入您的姓名"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="請輸入您的Email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">聯絡電話</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="請輸入您的聯絡電話"
                  />
                </div>

                {/* 分店選擇 */}
                <div>
                  <Label htmlFor="branch">指定分店 *</Label>
                  <Select value={formData.branchId} onValueChange={(value) => handleInputChange('branchId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇分店" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 備註 */}
                <div>
                  <Label htmlFor="notes">備註需求</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="請描述您的需求或特殊要求..."
                    rows={4}
                  />
                </div>

                {/* 訊息顯示 */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                    message.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                    'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {message.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
                      {message.type === 'warning' && <AlertTriangle className="h-5 w-5 mr-2" />}
                      {message.type === 'error' && <AlertTriangle className="h-5 w-5 mr-2" />}
                      <span className="whitespace-pre-line">{message.text}</span>
                    </div>
                  </div>
                )}

                {/* 提交按鈕 */}
                <Button 
                  type="submit" 
                  className="w-full py-3 text-lg"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '送出聯絡資訊'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Tattoo CRM. 專業刺青工作室管理系統</p>
        </div>
      </footer>
    </div>
  );
}
