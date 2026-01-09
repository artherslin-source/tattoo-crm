"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postJsonWithAuth, getJsonWithAuth, ApiError, getAccessToken } from "@/lib/api";
import { getUniqueBranches, sortBranchesByName } from "@/lib/branch-utils";
import { formatMembershipLevel } from "@/lib/membership";
import { usePhoneConflicts } from "@/hooks/usePhoneConflicts";
import { normalizePhoneDigits } from "@/lib/phone";

// 規格欄位名稱中文對照
const VARIANT_LABEL_MAP: Record<string, string> = {
  side: '左右半邊',
  color: '顏色',
  design_fee: '設計費',
  custom_addon: '加購',
  size: '尺寸',
  position: '部位',
  style: '風格',
  complexity: '複雜度',
};

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
  userId: string;
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

type ServiceVariant = {
  id: string;
  type: string;
  name: string;
  priceModifier: number;
  sortOrder: number;
  isRequired?: boolean;
  metadata?: any;
};

type GroupedVariants = Record<string, ServiceVariant[]>;

type ContactDetail = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  branch?: { id: string; name: string } | null;
  ownerArtistId?: string | null;
  preferredArtistId?: string | null;
  cartSnapshot?: {
    items: Array<{
      serviceId: string;
      serviceName: string;
      selectedVariants: Record<string, string>;
      basePrice: number;
      finalPrice: number;
      estimatedDuration: number;
      notes?: string;
      referenceImages?: string[];
    }>;
    totalPrice: number;
    totalDuration: number;
    preferredDate?: string;
  } | null;
  cartTotalPrice?: number | null;
  ownerArtist?: { id: string; branchId?: string | null; branch?: { id: string; name: string } | null } | null;
};

type MemberSearchRow = {
  id: string; // Member.id
  membershipLevel?: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email?: string | null;
    branch?: { id: string; name: string } | null;
  };
};

type MembersSearchResponse = {
  data: MemberSearchRow[];
  total: number;
  page: number;
  pageSize: number;
};

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
  availabilityRefreshKey?: number;
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
  'data-testid': dataTestId,
  availabilityRefreshKey,
}: AppointmentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAccessToken();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conflictAppointmentId, setConflictAppointmentId] = useState<string | null>(null);
  
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

  const contactIdParam = useMemo(() => {
    const from = (fromContact?.contactId as string | undefined) || "";
    return from || searchParams.get("contactId") || "";
  }, [fromContact, searchParams]);

  const [lockedByOwner, setLockedByOwner] = useState(false);
  const [lockedOwnerArtistId, setLockedOwnerArtistId] = useState<string>("");
  const [cartSnapshot, setCartSnapshot] = useState<ContactDetail['cartSnapshot'] | null>(null);

  // Manual appointment pricing (no cartSnapshot): variants + quote by selectedVariants
  const [serviceVariants, setServiceVariants] = useState<GroupedVariants>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});
  const [quote, setQuote] = useState<{
    basePrice: number;
    finalPrice: number;
    itemFinalPrice?: number;
    addonTotal?: number;
    estimatedDuration?: number;
  } | null>(null);

  const [formData, setFormData] = useState<AppointmentFormData>({
    userId: "",
    name: fromContact?.name ?? searchParams.get("name") ?? "",
    email: fromContact?.email ?? searchParams.get("email") ?? "",
    phone: fromContact?.phone ?? searchParams.get("phone") ?? "",
    notes: fromContact?.notes ?? searchParams.get("notes") ?? "",
    branchId: fromContact?.branchId ?? searchParams.get("branchId") ?? "",
    contactId: contactIdParam || "",
    serviceId: "",
    artistId: "",
    startAt: "",
    endAt: "",
  });

  const selectedService = useMemo(() => {
    if (!formData.serviceId) return null;
    return services.find((s) => s.id === formData.serviceId) || null;
  }, [services, formData.serviceId]);

  const { result: phoneConflicts } = usePhoneConflicts(formData.phone);

  // Existing member picker (optional)
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberResults, setMemberResults] = useState<MemberSearchRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchRow | null>(null);

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

  // Fetch variants when service changes (manual creation only; contact conversion uses cartSnapshot)
  useEffect(() => {
    const run = async () => {
      if (!formData.serviceId) {
        setServiceVariants({});
        setSelectedVariants({});
        setQuote(null);
        return;
      }
      if (cartSnapshot && cartSnapshot.items?.length) return;

      try {
        const res = await fetch(`/api/services/${formData.serviceId}/variants`, { cache: "no-store" });
        if (!res.ok) {
          setServiceVariants({});
          setSelectedVariants({});
          setQuote(null);
          return;
        }
        const data = (await res.json()) as GroupedVariants;
        setServiceVariants(data || {});
        setSelectedVariants({});
        setQuote(null);
      } catch (e) {
        console.warn("Failed to fetch service variants:", e);
        setServiceVariants({});
        setSelectedVariants({});
        setQuote(null);
      }
    };
    run();
  }, [formData.serviceId, cartSnapshot]);

  // Quote price for manual creation when selectedVariants changes
  useEffect(() => {
    const run = async () => {
      if (!formData.serviceId) return;
      if (cartSnapshot && cartSnapshot.items?.length) return;

      try {
        const resp = await postJsonWithAuth<{
          basePrice: number;
          finalPrice: number;
          itemFinalPrice?: number;
          addonTotal?: number;
          estimatedDuration?: number;
        }>(`/admin/services/${formData.serviceId}/quote`, { selectedVariants });
        setQuote(resp);
      } catch (e) {
        console.warn("Quote failed:", e);
        setQuote(null);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.serviceId, JSON.stringify(selectedVariants), cartSnapshot]);

  // If coming from a Contact, fetch the latest contact detail and apply ownerArtist lock rules.
  useEffect(() => {
    const run = async () => {
      if (!canFetch) return;
      if (!contactIdParam) return;

      try {
        const c = await getJsonWithAuth<ContactDetail>(`/admin/contacts/${contactIdParam}`);

        // 保存購物車快照
        setCartSnapshot(c.cartSnapshot || null);

        // Always keep contactId so backend can link appointment -> contact.
        setFormData((prev) => ({
          ...prev,
          contactId: c.id,
          name: (c.name ?? prev.name) as string,
          email: (c.email ?? prev.email) as string,
          phone: (c.phone ?? prev.phone) as string,
          notes: (c.notes ?? prev.notes) as string,
          // 從購物車快照預填第一個服務
          serviceId: c.cartSnapshot?.items?.[0]?.serviceId || prev.serviceId,
          // Keep branchId as-is for now; if ownerArtist exists we'll override to owner's branch once we can resolve it.
        }));

        // 預填預約日期（從購物車快照）
        if (c.cartSnapshot?.preferredDate) {
          setAppointmentDate(c.cartSnapshot.preferredDate);
        }

        // 優先使用 ownerArtistId，其次 preferredArtistId
        if (c.ownerArtistId) {
          setLockedOwnerArtistId(c.ownerArtistId);

          const ownerBranchId =
            (c.ownerArtist?.branchId as string | null | undefined) ||
            c.ownerArtist?.branch?.id ||
            "";

          setLockedByOwner(true);
          setFormData((prev) => ({
            ...prev,
            artistId: c.ownerArtistId as string,
            branchId: ownerBranchId || prev.branchId,
          }));
        } else if (c.preferredArtistId) {
          // 客戶在結帳時選擇的刺青師
          setFormData((prev) => ({
            ...prev,
            artistId: c.preferredArtistId as string,
          }));
        }
      } catch (e) {
        // Non-blocking: user can still book manually; but show a helpful message.
        console.warn("Failed to fetch contact detail:", e);
      }
    };
    run();
  }, [canFetch, contactIdParam]);

  // Resolve branchId from artists list if we only have ownerArtistId.
  useEffect(() => {
    if (!lockedByOwner) return;
    if (!lockedOwnerArtistId) return;
    if (!artists.length) return;

    const owner = artists.find((a) => a.user.id === lockedOwnerArtistId);
    if (!owner?.branchId) return;

    setFormData((prev) => {
      if (prev.artistId !== lockedOwnerArtistId) return prev;
      if (prev.branchId === owner.branchId) return prev;
      return { ...prev, branchId: owner.branchId };
    });
  }, [artists, lockedByOwner, lockedOwnerArtistId]);

  // Search members (phone/name) for existing member booking
  useEffect(() => {
    if (!canFetch) return;
    if (selectedMember) return; // already selected, avoid background search noise
    const q = memberSearch.trim();
    if (!q) {
      setMemberResults([]);
      setMemberSearching(false);
      return;
    }

    const t = setTimeout(async () => {
      setMemberSearching(true);
      try {
        const params = new URLSearchParams();
        params.set("search", q);
        params.set("role", "MEMBER");
        params.set("page", "1");
        params.set("pageSize", "10");
        const res = await getJsonWithAuth<MembersSearchResponse>(`/admin/members?${params.toString()}`);
        setMemberResults(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error("Member search failed:", e);
        setMemberResults([]);
      } finally {
        setMemberSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [canFetch, memberSearch, selectedMember]);

  const selectMember = (m: MemberSearchRow) => {
    setSelectedMember(m);
    setMemberSearch("");
    setMemberResults([]);
    setFormData((prev) => ({
      ...prev,
      userId: m.user.id,
      name: m.user.name ?? prev.name,
      phone: m.user.phone ?? prev.phone,
      email: (m.user.email ?? "") || prev.email,
      branchId: prev.artistId ? prev.branchId : (m.user.branch?.id ?? prev.branchId),
    }));
  };

  const clearSelectedMember = () => {
    setSelectedMember(null);
    setFormData((prev) => ({ ...prev, userId: "" }));
  };

  // 處理輸入變更
  const handleInputChange = (field: string, value: string) => {
    if (lockedByOwner && field === "artistId") return;
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

  const handleVariantChange = (key: string, raw: any) => {
    setSelectedVariants((prev) => {
      const next = { ...prev };
      const isNumberField = key === "design_fee" || key === "custom_addon";
      if (isNumberField) {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
          delete next[key];
        } else {
          next[key] = Math.round(n);
        }
      } else {
        const v = typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
        if (!v) {
          delete next[key];
        } else {
          next[key] = v;
        }
      }
      return next;
    });
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
  }, [
    canFetch,
    formData.branchId,
    formData.artistId,
    appointmentDate,
    formData.serviceId,
    durationMin,
    timeSlot,
    availabilityRefreshKey,
  ]);

  // Derive startAt/endAt (datetime-local strings) from date + slot + duration
  useEffect(() => {
    if (!appointmentDate || !timeSlot) return;
    const startLocal = `${appointmentDate}T${timeSlot}`;
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + durationMin * 60000);
    // Allow cross-day endAt (e.g. 23:00 -> 02:00)
    const endLocal = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}T${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    setFormData((prev) => ({ ...prev, startAt: startLocal, endAt: endLocal }));
  }, [appointmentDate, timeSlot, durationMin]);

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setConflictAppointmentId(null);

    try {
      // 驗證必填欄位
      if (!formData.name || !formData.phone || !formData.serviceId || !formData.artistId || !formData.branchId || !appointmentDate || !timeSlot) {
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
      const endTime = new Date(startTime.getTime() + holdMin * 60000);

      const payload = {
        userId: formData.userId || undefined,
        name: formData.name,
        email: formData.email?.trim() ? formData.email.trim() : undefined,
        phone: formData.phone,
        serviceId: formData.serviceId,
        artistId: formData.artistId,
        branchId: formData.branchId,
        startAt: startTime.toISOString(),
        endAt: endTime.toISOString(),
        holdMin,
        notes: formData.notes || undefined,
        contactId: formData.contactId || undefined,
        selectedVariants: cartSnapshot && cartSnapshot.items?.length ? undefined : selectedVariants,
      };

      const created = await postJsonWithAuth<{ id: string }>("/admin/appointments", payload);
      
      setSuccess("預約創建成功！");
      
      // 2秒後執行成功回調或跳轉
      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess();
        } else {
          // 若由聯絡轉換（有 contactId），建立成功後留在頁面（不自動跳轉）
          if (payload.contactId && created?.id) {
            router.push(`/admin/contacts?highlightId=${encodeURIComponent(payload.contactId)}`);
            return;
          }
          router.push("/admin/appointments");
        }
      }, 2000);
      
    } catch (err) {
      console.error('Create appointment error:', err);
      const apiErr = err as ApiError;
      // Duplicate conversion guard (409) – offer deep-link jump to the existing appointment.
      const getExistingAppointmentId = (data: unknown): string | undefined => {
        if (!data || typeof data !== "object") return undefined;
        const val = (data as Record<string, unknown>)["existingAppointmentId"];
        return typeof val === "string" && val ? val : undefined;
      };
      const maybeId = apiErr.status === 409 ? getExistingAppointmentId(apiErr.data) : undefined;
      if (apiErr.status === 409 && typeof maybeId === "string" && maybeId) {
        setConflictAppointmentId(maybeId);
        setError(apiErr.message || "此聯絡已轉換為預約");
      } else {
        setError(apiErr.message || "創建預約失敗");
      }
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
            {/* Existing member (optional) */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text-secondary-light">選擇既有會員（可選）</div>
                  <div className="text-xs text-text-muted-light">可用手機號碼或姓名搜尋，選取後會自動帶入資料</div>
                </div>
                {selectedMember && (
                  <button
                    type="button"
                    onClick={clearSelectedMember}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    取消選擇
                  </button>
                )}
              </div>

              {!selectedMember ? (
                <div className="mt-3">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="輸入手機號碼或姓名..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {memberSearching && (
                    <div className="mt-2 text-xs text-text-muted-light">搜尋中...</div>
                  )}
                  {!!memberResults.length && (
                    <div className="mt-2 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white">
                      {memberResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectMember(m)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="text-sm text-gray-900">
                            {m.user.name || "（未命名）"} ・ {m.user.phone || "（無手機）"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {m.user.branch?.name ? `分店：${m.user.branch.name}` : "分店：未設定"}
                            {m.membershipLevel ? ` ・ 等級：${formatMembershipLevel(m.membershipLevel)}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                  <div className="text-sm text-gray-900">
                    已選擇：{selectedMember.user.name || "（未命名）"} ・ {selectedMember.user.phone || "（無手機）"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedMember.user.branch?.name ? `分店：${selectedMember.user.branch.name}` : "分店：未設定"}
                    {selectedMember.membershipLevel ? ` ・ 等級：${formatMembershipLevel(selectedMember.membershipLevel)}` : ""}
                  </div>
                </div>
              )}
            </div>

            {/* 購物車內容顯示 */}
            {cartSnapshot && cartSnapshot.items && cartSnapshot.items.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  購物車內容 ({cartSnapshot.items.length} 項)
                </label>
                <div className="border rounded-md divide-y">
                  {cartSnapshot.items.map((item, index) => (
                    <div key={index} className="p-3 space-y-2 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.serviceName}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {Object.entries(item.selectedVariants || {})
                              .filter(([_, value]) => value)
                              .map(([key, value]) => {
                                const label = VARIANT_LABEL_MAP[key] || key;
                                return `${label}: ${value}`;
                              })
                              .join(' / ')}
                          </div>
                          {item.notes && (
                            <div className="text-sm text-gray-500 mt-1">備註: {item.notes}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-blue-600">
                            NT$ {item.finalPrice.toLocaleString()}
                          </div>
                          {item.basePrice !== item.finalPrice && (
                            <div className="text-xs text-gray-500 line-through">
                              NT$ {item.basePrice.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-blue-50 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">總計</span>
                    <span className="text-lg font-bold text-blue-600">
                      NT$ {cartSnapshot.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  ℹ️ 此為客戶結帳時的購物車內容，預約完成後將依此建立帳單
                </p>
              </div>
            )}

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
                  電子郵件
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-secondary-light mb-2">
                聯絡電話 *
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', normalizePhoneDigits(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {phoneConflicts?.messageCode === "USER_EXISTS" ? (
                <p className="mt-1 text-xs text-yellow-700">{phoneConflicts.message}</p>
              ) : phoneConflicts?.messageCode === "CONTACT_EXISTS" ? (
                <p className="mt-1 text-xs text-gray-600">{phoneConflicts.message}</p>
              ) : null}
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    lockedByOwner ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                  disabled={lockedByOwner}
                  required
                >
                  <option value="">請選擇刺青師</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.user.id}>
                      {artist.displayName || artist.user.name} ({artist.branch?.name || '無分店'})
                    </option>
                  ))}
                </select>
                {lockedByOwner && (
                  <p className="text-sm text-text-muted-light mt-1">
                    此聯絡已指派刺青師，預約刺青師已鎖定
                  </p>
                )}
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
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 規格（後台手動新增預約用；若由聯絡轉換則以 cartSnapshot 為準） */}
            {!cartSnapshot?.items?.length && formData.serviceId ? (
              <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-gray-900">服務規格（試算計價）</div>
                  <div className="text-xs text-gray-600">
                    選擇規格後會依「前台購物車同一套規則」試算；建立預約時會寫入購物車快照，後續帳務沿用既有流程。
                  </div>
                </div>

                {/* Quote preview */}
                <div className="flex flex-col gap-2 rounded-md bg-white px-3 py-2 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">基礎價</div>
                    <div className="text-sm font-semibold text-gray-900">
                      NT$ {Number(selectedService?.price || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">試算金額</div>
                    <div className="text-sm font-semibold text-blue-700">
                      NT$ {Number(quote?.finalPrice || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Variant fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["size", "color", "position", "side", "style", "complexity"] as const).map((key) => {
                    const list = (serviceVariants[key] || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                    if (!list.length) return null;
                    const label = VARIANT_LABEL_MAP[key] || key;
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                        <select
                          value={String(selectedVariants[key] ?? "")}
                          onChange={(e) => handleVariantChange(key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">（不選）</option>
                          {list.map((v) => (
                            <option key={v.id} value={v.name}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {serviceVariants.design_fee?.length ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {VARIANT_LABEL_MAP.design_fee || "design_fee"}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={100}
                        value={String(selectedVariants.design_fee ?? "")}
                        onChange={(e) => handleVariantChange("design_fee", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  ) : null}

                  {serviceVariants.custom_addon?.length ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {VARIANT_LABEL_MAP.custom_addon || "custom_addon"}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={100}
                        value={String(selectedVariants.custom_addon ?? "")}
                        onChange={(e) => handleVariantChange("custom_addon", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* 排程保留時間（可自由加減） */}
            <div>
              <label className="block text-sm font-medium text-text-secondary-light mb-2">
                保留時間（分鐘）
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={String(holdMin)}
                  onChange={(e) => setHoldMin(Number(e.target.value))}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (i + 1) * 30).map((min) => (
                    <option key={min} value={String(min)}>
                      {min}{min === 150 ? "（預設）" : ""}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-text-muted-light">預設 150（120 + buffer 30）</span>
              </div>
              <p className="text-xs text-text-muted-light mt-2">
                系統會用「保留時間」計算結束時間並避免撞單；可支援跨夜（例如 23:00→02:00）。
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
                <div>{error}</div>
                {conflictAppointmentId && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/appointments?highlightId=${encodeURIComponent(conflictAppointmentId)}`)
                      }
                      className="text-sm text-blue-700 hover:text-blue-900 underline"
                    >
                      前往該預約
                    </button>
                  </div>
                )}
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
