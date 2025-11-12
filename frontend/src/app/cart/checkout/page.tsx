"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, User, Phone, Mail, MapPin, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCart, checkout, type Cart } from "@/lib/cart-api";
import { getApiBase } from "@/lib/api";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
}

interface Artist {
  id: string;
  displayName: string;
  branchId: string;
  speciality?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    branchId: "",
    artistId: "",
    preferredDate: "",
    preferredTimeSlot: "10:00",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    specialRequests: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cartData, branchesData, artistsData] = await Promise.all([
          getCart(),
          fetch(`${getApiBase()}/branches/public`).then((res) => res.json()),
          fetch(`${getApiBase()}/artists`).then((res) => res.json()),
        ]);

        setCart(cartData);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setArtists(
          Array.isArray(artistsData)
            ? artistsData
                .filter((artist: Artist) => artist && artist.branchId)
                .map((artist: Artist) => ({
                  id: artist.id,
                  displayName: artist.displayName,
                  branchId: artist.branchId,
                  speciality: artist.speciality,
                }))
            : []
        );

        // 如果購物車是空的，返回首頁
        if (!cartData || cartData.items.length === 0) {
          alert("購物車是空的");
          router.push("/");
        }
      } catch (error) {
        console.error("載入數據失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const artistsByBranch = useMemo(() => {
    const map = new Map<string, Artist[]>();
    artists.forEach((artist) => {
      if (!artist.branchId) {
        return;
      }
      if (!map.has(artist.branchId)) {
        map.set(artist.branchId, []);
      }
      map.get(artist.branchId)?.push(artist);
    });

    map.forEach((list, key) => {
      map.set(
        key,
        [...list].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, "zh-Hant")
        )
      );
    });

    return map;
  }, [artists]);

  const availableArtists = useMemo(() => {
    if (!formData.branchId) return [];
    return artistsByBranch.get(formData.branchId) ?? [];
  }, [artistsByBranch, formData.branchId]);

  const handleBranchChange = (branchId: string) => {
    setFormData((prev) => ({
      ...prev,
      branchId,
      artistId: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.branchId || !formData.preferredDate || !formData.customerName || !formData.customerPhone) {
      alert("請填寫所有必填欄位");
      return;
    }

    if (availableArtists.length > 0 && !formData.artistId) {
      alert("請選擇刺青師");
      return;
    }

    setSubmitting(true);
    try {
      const result = await checkout({
        branchId: formData.branchId,
        artistId: formData.artistId || undefined,
        preferredDate: formData.preferredDate,
        preferredTimeSlot: formData.preferredTimeSlot,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        specialRequests: formData.specialRequests,
      });

      // 成功後跳轉到成功頁面
      router.push(`/cart/success?appointmentId=${result.appointmentId}&orderId=${result.orderId}`);
    } catch (error) {
      console.error("結帳失敗:", error);
      alert(error instanceof Error ? error.message : "結帳失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">結帳</h1>
          <p className="text-sm text-gray-500 mt-1">填寫預約資訊</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 表單 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>預約資訊</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 選擇分店 */}
                  <div>
                    <Label htmlFor="branch" className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      選擇分店 <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.branchId}
                      onValueChange={handleBranchChange}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="請選擇分店" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} - {branch.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 選擇刺青師 */}
                  <div>
                    <Label className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      指定刺青師
                      {availableArtists.length > 0 && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>
                    <Select
                      value={formData.artistId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, artistId: value }))
                      }
                      disabled={!formData.branchId || availableArtists.length === 0}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue
                          placeholder={
                            !formData.branchId
                              ? "請先選擇分店"
                              : availableArtists.length
                              ? "請選擇刺青師"
                              : "此分店暫無刺青師"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableArtists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.displayName}
                            {artist.speciality ? `｜${artist.speciality}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.branchId && availableArtists.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        此分店暫無刺青師，客服將於預約後協助安排。
                      </p>
                    )}
                  </div>

                  {/* 預約日期和時間 */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        預約日期 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredDate: e.target.value })
                        }
                        min={new Date().toISOString().split("T")[0]}
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="time" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        預約時間 <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.preferredTimeSlot}
                        onValueChange={(value) =>
                          setFormData({ ...formData, preferredTimeSlot: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10:00">10:00</SelectItem>
                          <SelectItem value="11:00">11:00</SelectItem>
                          <SelectItem value="12:00">12:00</SelectItem>
                          <SelectItem value="13:00">13:00</SelectItem>
                          <SelectItem value="14:00">14:00</SelectItem>
                          <SelectItem value="15:00">15:00</SelectItem>
                          <SelectItem value="16:00">16:00</SelectItem>
                          <SelectItem value="17:00">17:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 聯絡資訊 */}
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      姓名 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      placeholder="請輸入您的姓名"
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      電話 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, customerPhone: e.target.value })
                      }
                      placeholder="0912345678"
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, customerEmail: e.target.value })
                      }
                      placeholder="your@email.com"
                      className="mt-2"
                    />
                  </div>

                  {/* 特殊需求 */}
                  <div>
                    <Label htmlFor="requests">特殊需求或備註</Label>
                    <Textarea
                      id="requests"
                      value={formData.specialRequests}
                      onChange={(e) =>
                        setFormData({ ...formData, specialRequests: e.target.value })
                      }
                      placeholder="有任何特殊需求請告訴我們..."
                      rows={4}
                      className="mt-2 resize-none"
                    />
                  </div>

                  {/* 提交按鈕 */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                        處理中...
                      </>
                    ) : (
                      "確認預約"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* 購物車摘要 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">購物車摘要</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="text-sm border-b pb-3 last:border-0">
                      <div className="font-medium text-gray-900">{item.serviceName}</div>
                      <div className="text-gray-500 mt-1">
                        {item.selectedVariants.size} / {item.selectedVariants.color}
                      </div>
                      <div className="text-blue-600 font-medium mt-1">
                        NT$ {item.finalPrice.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>總計</span>
                      <span className="text-xl text-blue-600">
                        NT$ {cart.totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      預估時長：{cart.totalDuration} 分鐘
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

