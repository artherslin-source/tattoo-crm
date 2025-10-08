"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Instagram,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { postJSON } from "@/lib/api";

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
  /** ✅ 新增圖片欄位 */
  photoUrl?: string;
  branchId: string;
  /** ✅ user 改為可選，避免後端沒傳時報錯 */
  user?: {
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
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    branchId: "",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, artistsRes, branchesRes] = await Promise.all([
          fetch("https://tattoo-crm-production-413f.up.railway.app/services"),
          fetch("https://tattoo-crm-production-413f.up.railway.app/artists"),
          fetch("https://tattoo-crm-production-413f.up.railway.app/branches/public"),
        ]);

        const [servicesData, artistsData, branchesData] = await Promise.all([
          servicesRes.json(),
          artistsRes.json(),
          branchesRes.json(),
        ]);

        setServices(servicesData);
        setArtists(artistsData);
        setBranches(branchesData);
      } catch (error) {
        console.error("資料載入失敗:", error);
        setMessage({
          type: "error",
          text: "資料載入失敗，請稍後再試。",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (message) setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!formData.name || !formData.email || !formData.branchId) {
        setMessage({ type: "error", text: "請填寫所有必填欄位" });
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        branchId: formData.branchId,
        notes: formData.notes || undefined,
      };

      const res = await postJSON("/public/contacts", payload);

      // 如果 postJSON 成功執行到這裡，說明請求成功
      setMessage({
        type: "success",
        text: "✅ 已成功提交，我們將盡快與您聯繫！",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        branchId: "",
        notes: "",
      });
    } catch (error) {
      console.error("提交失敗:", error);
      setMessage({ type: "error", text: "提交失敗，請稍後再試。" });
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
      {/* ---------------- Hero 區塊 ---------------- */}
      <section className="relative bg-gradient-to-r from-gray-900 to-gray-700 text-white">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            刺青，是靈魂的記號
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            每一筆線條，都承載著故事與信念。
          </p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
            onClick={() =>
              document
                .getElementById("booking-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            立即預約
          </Button>
        </div>
      </section>

      {/* ---------------- 服務介紹 ---------------- */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">服務項目</h2>
            <p className="text-gray-600">從細緻線條到整體設計，我們一手包辦。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>
                    時長 {service.durationMin} 分鐘
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">
                    {service.description || "專業刺青設計服務"}
                  </p>
                  <Badge variant="secondary" className="text-lg">
                    NT$ {service.price.toLocaleString()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 刺青師介紹 ---------------- */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              刺青師團隊
            </h2>
            <p className="text-lg text-gray-600">
              我們的每位刺青師都擁有獨特的風格與專長。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {artists.map((artist) => (
              <Card key={artist.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-full h-48 rounded-lg mb-4 overflow-hidden">
                    {artist.photoUrl ? (
                      <img
                        src={artist.photoUrl}
                        alt={artist.displayName}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-orange-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {artist.displayName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-gray-600 text-sm">刺青師</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-xl">{artist.displayName}</CardTitle>
                  <CardDescription>
                    {artist.user?.name ?? artist.speciality ?? "刺青師"}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 分店資訊 ---------------- */}
      <section className="py-16 bg-white" id="branches">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">分店資訊</h2>
            <p className="text-gray-600">
              選擇離您最近的分店，我們誠摯為您服務。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {branches.map((branch) => (
              <Card key={branch.id} className="hover:shadow-lg transition">
                <CardHeader>
                  <CardTitle>{branch.name}</CardTitle>
                  <CardDescription>
                    <MapPin className="inline-block w-4 h-4 mr-2" />
                    {branch.address || "地址待更新"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>
                    <Phone className="inline-block w-4 h-4 mr-2" />
                    {branch.phone || "尚無電話"}
                  </p>
                  <p>
                    <Mail className="inline-block w-4 h-4 mr-2" />
                    {branch.email || "尚無信箱"}
                  </p>
                  <p>
                    <Clock className="inline-block w-4 h-4 mr-2" />
                    {branch.businessHours || "營業時間待更新"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 預約表單 ---------------- */}
      <section className="py-20 bg-gray-50" id="booking-form">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">預約與諮詢</h2>
          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">電話</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="branchId">分店</Label>
                  <select
                    id="branchId"
                    className="w-full border rounded-md p-2"
                    value={formData.branchId}
                    onChange={(e) =>
                      handleInputChange("branchId", e.target.value)
                    }
                    required
                  >
                    <option value="">請選擇分店</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes">備註</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "提交中..." : "送出"}
                </Button>
              </form>
              {message && (
                <div
                  className={`mt-6 flex items-center justify-center space-x-2 text-sm ${
                    message.type === "success"
                      ? "text-green-600"
                      : message.type === "error"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : message.type === "error" ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
