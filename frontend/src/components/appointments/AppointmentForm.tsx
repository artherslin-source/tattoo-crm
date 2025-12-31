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

type ContactDetail = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  branch?: { id: string; name: string } | null;
  ownerArtistId?: string | null;
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

  // If coming from a Contact, fetch the latest contact detail and apply ownerArtist lock rules.
  useEffect(() => {
    const run = async () => {
      if (!canFetch) return;
      if (!contactIdParam) return;

      try {
        const c = await getJsonWithAuth<ContactDetail>(`/admin/contacts/${contactIdParam}`);

        // Always keep contactId so backend can link appointment -> contact.
        setFormData((prev) => ({
          ...prev,
          contactId: c.id,
          name: (c.name ?? prev.name) as string,
          email: (c.email ?? prev.email) as string,
          phone: (c.phone ?? prev.phone) as string,
          notes: (c.notes ?? prev.notes) as string,
          // Keep branchId as-is for now; if ownerArtist exists we'll override to owner's branch once we can resolve it.
        }));

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
      const endTimeRaw = new Date(startTime.getTime() + holdMin * 60000);
      const dayEnd = new Date(startTime);
      dayEnd.setHours(23, 59, 0, 0);
      const endTime = endTimeRaw > dayEnd ? dayEnd : endTimeRaw;

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
      };

      await postJsonWithAuth("/admin/appointments", payload);
      
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
      // Duplicate conversion guard (409) – offer deep-link jump to the existing appointment.
      const maybeId =
        apiErr.status === 409 && apiErr.data && typeof apiErr.data === "object"
          ? (apiErr.data as any).existingAppointmentId
          : undefined;
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
                            {m.membershipLevel ? ` ・ 等級：${m.membershipLevel}` : ""}
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
                    {selectedMember.membershipLevel ? ` ・ 等級：${selectedMember.membershipLevel}` : ""}
                  </div>
                </div>
              )}
            </div>

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
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
                    {service.name} - NT$ {service.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

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
                <div>{error}</div>
                {conflictAppointmentId && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/appointments?openId=${encodeURIComponent(conflictAppointmentId)}`)}
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
