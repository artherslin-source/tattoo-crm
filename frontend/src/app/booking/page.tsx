"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Phone, Mail, Instagram, MessageCircle, CheckCircle, AlertTriangle } from "lucide-react";
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

export default function BookingPage() {
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

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, artistsRes, branchesRes] = await Promise.all([
          fetch('http://localhost:4000/services'),
          fetch('http://localhost:4000/artists'),
          fetch('http://localhost:4000/branches/public')
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
        // 409 衝突、400 驗證錯誤、或其他
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero 區塊 */}
      <section className="relative bg-gradient-to-r from-gray-900 to-gray-700 text-white">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              用刺青，留下專屬的故事
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              專業刺青師團隊，為您打造獨一無二的藝術作品
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
              onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              聯絡我們
            </Button>
          </div>
        </div>
      </section>

      {/* 服務介紹區塊 */}
      <section className="py-16 bg-white">
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

      {/* 刺青師介紹區塊 */}
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
          <div className="text-center mb-12 pt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 mt-8">聯絡我們</h2>
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
                    <SelectTrigger className="!bg-white/90">
                      <SelectValue placeholder="請選擇分店" />
                    </SelectTrigger>
                    <SelectContent className="!bg-white/90 backdrop-blur-sm">
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

      {/* 常見問題區塊 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 pt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">常見問題</h2>
            <p className="text-lg text-gray-600">解答您對預約流程的疑問</p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-8 pb-8 px-8">
                <h3 className="text-lg font-semibold mb-2">Q: 預約後多久會收到確認？</h3>
                <p className="text-gray-600">A: 一般 24 小時內會有工作人員聯繫確認您的預約時間。</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-8 pb-8 px-8">
                <h3 className="text-lg font-semibold mb-2">Q: 如何取消或更改預約？</h3>
                <p className="text-gray-600">A: 請於 48 小時前透過電話或 Line 聯繫我們，我們將協助您調整預約時間。</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-8 pb-8 px-8">
                <h3 className="text-lg font-semibold mb-2">Q: 是否需要先支付訂金？</h3>
                <p className="text-gray-600">A: 部分大型作品需要支付訂金，將由工作人員在確認預約時通知您。</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-8 pb-8 px-8">
                <h3 className="text-lg font-semibold mb-2">Q: 刺青前需要注意什麼？</h3>
                <p className="text-gray-600">A: 建議刺青前保持充足睡眠，避免飲酒，並穿著寬鬆衣物方便作業。</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 聯絡資訊區塊 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 pt-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">聯絡我們</h2>
            <p className="text-lg text-gray-600">歡迎隨時與我們聯繫</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* 聯絡資訊 */}
            <div className="space-y-8">
              {branches.map((branch) => (
                <Card key={branch.id}>
                  <CardContent className="pt-8 pb-8 px-8">
                    <h3 className="text-xl font-semibold mb-4">{branch.name}</h3>
                    
                    <div className="space-y-4">
                      {branch.address && (
                        <div className="flex items-center">
                          <MapPin className="h-5 w-5 text-primary mr-3" />
                          <span>{branch.address}</span>
                        </div>
                      )}
                      
                      {branch.phone && (
                        <div className="flex items-center">
                          <Phone className="h-5 w-5 text-primary mr-3" />
                          <span>{branch.phone}</span>
                        </div>
                      )}
                      
                      {branch.email && (
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-primary mr-3" />
                          <span>{branch.email}</span>
                        </div>
                      )}
                      
                      {branch.businessHours && (
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-primary mr-3" />
                          <span>
                            {typeof branch.businessHours === 'string' 
                              ? branch.businessHours 
                              : '週一至週五 09:00-18:00，週六 10:00-16:00，週日休息'
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 社群媒體 */}
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-semibold mb-3">關注我們</h4>
                      <div className="flex space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <MessageCircle className="h-8 w-8 text-gray-500" />
                        </div>
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Instagram className="h-8 w-8 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 地圖 */}
            <div>
              <Card>
                <CardContent className="pt-8 pb-8 px-8">
                  <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Google Map 嵌入位置</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 彫川紋身. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
