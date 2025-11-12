"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Hero } from "@/components/home/Hero";
import { Accordion } from "@/components/home/Accordion";
import { HorizontalScroller } from "@/components/home/HorizontalScroller";
import { ServiceCard } from "@/components/home/ServiceCard";
import { StickyCTA } from "@/components/home/StickyCTA";
import { PortfolioDialog } from "@/components/home/PortfolioDialog";
import { VariantSelector } from "@/components/service/VariantSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { postJSON, getAccessToken, getApiBase, getImageUrl } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
import { smartApiCall } from "@/lib/api-fallback";
import type { Branch as BranchType } from "@/types/branch";
import { debugApiUrls, findWorkingApiUrl } from "@/lib/api-debug";
import { addToCart, getCart } from "@/lib/cart-api";
import { CheckCircle, AlertTriangle, ArrowRight, ShoppingCart as ShoppingCartIcon } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
  durationMin: number;
  description?: string;
  category?: string | null;
  imageUrl?: string | null;
  hasVariants?: boolean;
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

type Branch = BranchType;

type ServiceItem = {
  id: string;
  title: string;
  thumb?: string;
  href?: string;
  tag?: string;
  price?: number;
  durationMin?: number;
};

type Category = {
  id: string;
  title: string;
  items: ServiceItem[];
};

const CATEGORY_LABELS: Record<string, string> = {
  Arm: "手臂圖騰",
  Leg: "腿部藝術",
  Back: "背部大片",
  Torso: "軀幹設計",
  Other: "客製化設計",
};

const CATEGORY_IMAGES: Record<string, string> = {
  Arm: "/images/categories/arm.svg",
  Leg: "/images/categories/leg.svg",
  Back: "/images/categories/back.svg",
  Torso: "/images/categories/torso.svg",
  Other: "/images/categories/other.svg",
};

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "category-arm",
    title: CATEGORY_LABELS.Arm,
    items: [
      {
        id: "arm-1",
        title: "上下手臂全肢",
        thumb: "https://placehold.co/640x400?text=Tattoo+Arm",
        tag: CATEGORY_LABELS.Arm,
        price: 45000,
        durationMin: 480,
      },
      {
        id: "arm-2",
        title: "上手臂",
        thumb: "https://placehold.co/640x400?text=Upper+Arm",
        tag: CATEGORY_LABELS.Arm,
        price: 28000,
        durationMin: 300,
      },
      {
        id: "arm-3",
        title: "前手臂",
        thumb: "https://placehold.co/640x400?text=Forearm",
        tag: CATEGORY_LABELS.Arm,
        price: 18000,
        durationMin: 200,
      },
    ],
  },
  {
    id: "category-leg",
    title: CATEGORY_LABELS.Leg,
    items: [
      {
        id: "leg-1",
        title: "大腿包覆",
        thumb: CATEGORY_IMAGES.Leg,
        tag: CATEGORY_LABELS.Leg,
        price: 32000,
        durationMin: 360,
      },
      {
        id: "leg-2",
        title: "小腿黑灰",
        thumb: CATEGORY_IMAGES.Leg,
        tag: CATEGORY_LABELS.Leg,
        price: 21000,
        durationMin: 260,
      },
    ],
  },
  {
    id: "category-other",
    title: CATEGORY_LABELS.Other,
    items: [
      {
        id: "other-1",
        title: "極細線條客製",
        thumb: CATEGORY_IMAGES.Other,
        tag: CATEGORY_LABELS.Other,
        price: 8500,
        durationMin: 120,
      },
      {
        id: "other-2",
        title: "文字設計",
        thumb: CATEGORY_IMAGES.Other,
        tag: CATEGORY_LABELS.Other,
        price: 6000,
        durationMin: 90,
      },
    ],
  },
];

const SERVICE_DISPLAY_ORDER = [
  "半胛圖",
  "排胛圖",
  "大腿表面",
  "大腿全包",
  "小腿表面",
  "小腿全包",
  "前手臂",
  "上手臂",
  "大小腿包全肢",
  "上下手臂全肢",
  "單胸到包全手",
  "大背後圖",
  "背後左或右圖",
  "大背到大腿圖",
  "雙胸到腹肚圖",
  "雙前胸口圖",
  "單胸圖",
  "腹肚圖",
  "單胸腹肚圖",
  "圖騰小圖案",
] as const;

const SERVICE_ORDER_MAP: Record<string, number> = SERVICE_DISPLAY_ORDER.reduce(
  (acc, title, index) => {
    acc[title] = index;
    return acc;
  },
  {} as Record<string, number>
);

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  
  // 購物車狀態
  const [cartItemCount, setCartItemCount] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    branchId: "",
    notes: "",
  });

  const scrollToBookingForm = () => {
    document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" });
  };

  // 處理點擊加入購物車
  const handleAddToCartClick = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setSelectedService(service);
      setVariantSelectorOpen(true);
    }
  };

  // 處理加入購物車
  const handleAddToCart = async (
    selectedVariants: {
      size: string;
      color: string;
      position?: string;
      design_fee?: number;
      style?: string;
      complexity?: string;
    },
    notes: string
  ) => {
    if (!selectedService) return;

    try {
      const cart = await addToCart({
        serviceId: selectedService.id,
        selectedVariants,
        notes,
      });

      setCartItemCount(cart.items?.length || 0);
      setMessage({ type: "success", text: "✅ 已加入購物車！" });
      
      // 3秒後清除訊息
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("加入購物車失敗:", error);
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "加入購物車失敗" 
      });
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoggedIn(false);
      return;
    }

    fetch(`${getApiBase()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setLoggedIn(response.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 使用修正的 API Base URL 檢測
        const apiBase = getApiBase();
        console.log("使用 API Base URL:", apiBase);
        
        // 直接使用 fetch 呼叫後端 API
        const [servicesResponse, artistsResponse, branchesResponse] = await Promise.all([
          fetch(`${apiBase}/services`, { cache: 'no-store' }),
          fetch(`${apiBase}/artists`, { cache: 'no-store' }),
          fetch(`${apiBase}/branches/public`, { cache: 'no-store' }),
        ]);

        const [servicesData, artistsData, branchesData] = await Promise.all([
          servicesResponse.ok ? servicesResponse.json() : [],
          artistsResponse.ok ? artistsResponse.json() : [],
          branchesResponse.ok ? branchesResponse.json() : [],
        ]);

        console.log("API 回應:", { services: servicesData.length, artists: artistsData.length, branches: branchesData.length });

        setServices(servicesData);
        setArtists(artistsData);
        const uniqueBranches = sortBranchesByName(getUniqueBranches(branchesData));
        setBranches(uniqueBranches as Branch[]);
        
        // 如果沒有資料，顯示錯誤訊息
        if (artistsData.length === 0) {
          setMessage({ type: "error", text: "無法載入刺青師資料，請稍後再試" });
        }
      } catch (error) {
        console.error("載入資料失敗:", error);
        setMessage({ type: "error", text: "載入資料失敗，已展示範例內容" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 獲取購物車數量
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const cart = await getCart();
        setCartItemCount(cart.items?.length || 0);
      } catch (error) {
        console.error("獲取購物車失敗:", error);
      }
    };

    fetchCartCount();
  }, []);

  // 過濾重複的朱川進，只保留第一個（通常是東港店）
  const uniqueArtists = useMemo(() => {
    if (!artists.length) return [];
    const seenNames = new Set<string>();
    const filtered: Artist[] = [];
    
    for (const artist of artists) {
      if (artist.displayName === '朱川進') {
        // 只保留第一個朱川進
        if (!seenNames.has('朱川進')) {
          seenNames.add('朱川進');
          filtered.push(artist);
        }
      } else {
        filtered.push(artist);
      }
    }
    
    return filtered;
  }, [artists]);

  const serviceItems: ServiceItem[] = useMemo(() => {
    const sortItems = (items: ServiceItem[]) => {
      return [...items].sort((a, b) => {
        const orderA = SERVICE_ORDER_MAP[a.title] ?? Number.MAX_SAFE_INTEGER;
        const orderB = SERVICE_ORDER_MAP[b.title] ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.title.localeCompare(b.title, "zh-Hant");
      });
    };

    if (!services.length) {
      const fallbackItems = FALLBACK_CATEGORIES.flatMap((category) => category.items);
      return sortItems(fallbackItems);
    }

    const items = services.map((service) => {
      const imageUrl = service.imageUrl ? getImageUrl(service.imageUrl) : null;
      const fallbackThumb =
        service.category && service.category in CATEGORY_IMAGES
          ? CATEGORY_IMAGES[service.category as keyof typeof CATEGORY_IMAGES]
          : CATEGORY_IMAGES.Other;
      const thumb = imageUrl && imageUrl.trim() !== "" ? imageUrl : fallbackThumb;

      return {
        id: service.id,
        title: service.name,
        thumb,
        price: service.price,
        durationMin: service.durationMin,
        href: `/booking?serviceId=${service.id}`,
      };
    });

    return sortItems(items);
  }, [services]);

  const quickNavItems = useMemo(
    () => [
      { id: "services", title: "服務項目" },
      { id: "artists", title: "刺青師團隊" },
      { id: "booking-form", title: "預約諮詢" },
    ],
    []
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (message) {
      setMessage(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

      if (!res.ok) {
        const errorMessage =
          typeof res.data === "string"
            ? res.data
            : (res.data as { message?: string })?.message || "提交失敗";
        setMessage({ type: "error", text: errorMessage });
        return;
      }

      setMessage({ type: "success", text: "✅ 聯絡資訊已提交！我們將盡快與您聯繫" });
      setFormData({ name: "", email: "", phone: "", branchId: "", notes: "" });
    } catch (error) {
      console.error("提交錯誤:", error);
      setMessage({ type: "error", text: "提交失敗，請檢查網路連線" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0D0D0D] text-neutral-100 pb-24 sm:pb-16">
      <Hero loggedIn={loggedIn} />

      {/* 購物車浮動按鈕 */}
      {cartItemCount > 0 && (
        <div className="fixed top-20 right-6 z-40">
          <Button
            onClick={() => window.location.href = '/cart'}
            className="relative rounded-full bg-yellow-500 hover:bg-yellow-600 text-black h-14 w-14 shadow-xl p-0"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white p-0 flex items-center justify-center text-xs">
              {cartItemCount}
            </Badge>
          </Button>
        </div>
      )}

      {/* 桌機版固定浮動側邊欄 */}
      <aside className="hidden lg:fixed lg:left-6 lg:top-32 lg:z-30 lg:block lg:w-48 lg:rounded-2xl lg:border lg:border-white/10 lg:bg-black/40 lg:p-4 lg:backdrop-blur-lg lg:shadow-lg">
        <nav aria-label="快速導覽" className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">快速導覽</p>
          <ul className="space-y-1 text-sm">
            {quickNavItems.map((category) => (
              <li key={category.id}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(`#${category.id}`)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-neutral-400 transition-colors duration-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80"
                >
                  <span>{category.title}</span>
                  <span aria-hidden>↘</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="relative z-10 -mt-12 space-y-16 pb-12 sm:-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:ml-[15rem] lg:px-8">
          <section className="space-y-16">
              <section id="services" className="space-y-6 scroll-mt-24">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold text-white sm:text-4xl">刺青分類</h2>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-300 sm:text-base">
                      按照部位與風格挑選靈感，手機以橫向滑動瀏覽、平板為兩欄網格，桌機則同步顯示完整清單。
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="hidden items-center gap-2 text-yellow-300 hover:bg-white hover:text-text-muted-light lg:inline-flex"
                    onClick={scrollToBookingForm}
                  >
                    快速預約
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                {loading && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-neutral-300">
                    正在載入最新服務項目，以下為範例參考內容。
                  </div>
                )}

                <div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {serviceItems.map((item) => (
                      <ServiceCard
                        key={item.id}
                        item={item}
                        variant="compact"
                        onAddToCart={handleAddToCartClick}
                      />
                    ))}
                  </div>

                  {!serviceItems.length && (
                    <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-center text-neutral-300">
                      目前暫無服務項目，敬請期待。
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-center lg:hidden">
                  <Button size="lg" className="w-full max-w-sm bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}>
                    查看更多方案
                  </Button>
                </div>
              </section>

              <section id="artists" className="space-y-6 scroll-mt-24">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold text-white sm:text-4xl">刺青師團隊</h2>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-300 sm:text-base">
                      每位設計師都有獨特風格與擅長領域，預約前歡迎先瀏覽作品集並與我們聯絡安排諮詢。
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {uniqueArtists.slice(0, 6).map((artist) => (
                    <Card 
                      key={artist.id} 
                      className="border-white/10 bg-white/5 text-white"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <CardHeader>
                        <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900">
                          {artist.photoUrl ? (
                            <Image src={artist.photoUrl} alt={artist.displayName} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white/70">
                              {artist.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <CardTitle className="text-xl text-white">{artist.displayName}</CardTitle>
                        <CardDescription className="text-sm text-neutral-300">{artist.speciality}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm text-neutral-200">
                        <p>{artist.bio}</p>
                        <div className="flex flex-wrap gap-2">
                          {(artist.styles || []).map((style) => (
                            <Badge key={style} variant="secondary" className="bg-white/10 text-white">
                              {style}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                            onClick={() => {
                              // 傳入 userId 給作品集對話框使用（覆寫 id 為 user.id）
                              setSelectedArtist({ ...artist, id: artist.user.id } as unknown as Artist);
                              setPortfolioDialogOpen(true);
                            }}
                          >
                            查看作品集
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                            onClick={scrollToBookingForm}
                          >
                            立即預約
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {!uniqueArtists.length && (
                    <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-neutral-300">
                      正在載入刺青師資訊，敬請稍候。
                    </div>
                  )}
                </div>
              </section>

              <section id="booking-form" className="space-y-6 scroll-mt-24">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold text-white sm:text-4xl">預約諮詢</h2>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-300 sm:text-base">
                      留下聯絡方式與想法，我們的客服專員將於 24 小時內回覆並安排適合的設計師。
                    </p>
                  </div>
                </div>

                <Card className="border-white/10 bg-white/5 text-white">
                  <CardContent className="space-y-6 pt-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="name">姓名 *</Label>
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(event) => handleInputChange("name", event.target.value)}
                            placeholder="請輸入您的姓名"
                            className="bg-white/10 text-white placeholder:text-text-muted-light focus:ring-1 focus:ring-yellow-400/50"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(event) => handleInputChange("email", event.target.value)}
                            placeholder="請輸入您的 Email"
                            className="bg-white/10 text-white placeholder:text-text-muted-light focus:ring-1 focus:ring-yellow-400/50"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">聯絡電話</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(event) => handleInputChange("phone", event.target.value)}
                            placeholder="請輸入您的聯絡電話"
                            className="bg-white/10 text-white placeholder:text-text-muted-light focus:ring-1 focus:ring-yellow-400/50"
                          />
                        </div>
                        <div>
                          <Label htmlFor="branch">指定分店 *</Label>
                          <Select value={formData.branchId} onValueChange={(value) => handleInputChange("branchId", value)}>
                            <SelectTrigger className="bg-white/10 text-white placeholder:text-text-muted-light">
                              <SelectValue placeholder="請選擇分店" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200">
                              {branches.length ? (
                                branches.map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id} className="text-text-primary-light hover:bg-gray-100">
                                    {branch.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="placeholder" disabled className="text-text-muted-light">
                                  目前尚無分店資料
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">備註需求</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(event) => handleInputChange("notes", event.target.value)}
                          placeholder="請描述您的刺青想法、尺寸或預期預算..."
                          className="bg-white/10 text-white placeholder:text-text-muted-light"
                          rows={4}
                        />
                      </div>

                      {message && (
                        <div
                          className={`flex items-start gap-2 rounded-lg border p-4 text-sm ${
                            message.type === "success"
                              ? "border-green-400/40 bg-green-400/10 text-green-200"
                              : message.type === "warning"
                              ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-200"
                              : "border-red-400/40 bg-red-400/10 text-red-200"
                          }`}
                        >
                          {message.type === "success" && <CheckCircle className="mt-0.5 h-5 w-5" />}
                          {message.type !== "success" && <AlertTriangle className="mt-0.5 h-5 w-5" />}
                          <span className="whitespace-pre-line">{message.text}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-yellow-400 text-black hover:bg-yellow-300"
                        disabled={submitting}
                      >
                        {submitting ? "提交中..." : "送出聯絡資訊"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </section>
            </section>
          </div>
        </main>

      <section className="hidden border-t border-white/10 bg-[#080808] py-12 sm:block">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
          <h3 className="text-3xl font-semibold text-white">準備好迎接下一個刺青靈感了嗎？</h3>
          <p className="text-base text-neutral-300">
            線上填寫需求、選擇設計師與分店，我們會在最短時間協助安排專屬檔期。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}>
              立即預約
            </Button>
            <Button variant="outline" size="lg" className="border-white/30 text-text-muted-light hover:bg-white/10 hover:text-white" onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}>
              留下聯絡資訊
            </Button>
          </div>
        </div>
      </section>

      {/* 作品集對話框 */}
      <PortfolioDialog
        artist={selectedArtist}
        open={portfolioDialogOpen}
        onClose={() => {
          setPortfolioDialogOpen(false);
          setSelectedArtist(null);
        }}
      />

      {/* 規格選擇器 */}
      {variantSelectorOpen && selectedService && (
        <VariantSelector
          service={selectedService}
          onClose={() => {
            setVariantSelectorOpen(false);
            setSelectedService(null);
          }}
          onAddToCart={handleAddToCart}
        />
      )}

      <footer className="border-t border-white/10 bg-black py-10 text-center text-sm text-neutral-400">
        <div className="mx-auto max-w-6xl px-6">
          <p>© 2025 Tattoo CRM. 專業刺青工作室管理系統</p>
        </div>
      </footer>

      <StickyCTA onClick={scrollToBookingForm} label="立即預約" />
    </div>
  );
}
