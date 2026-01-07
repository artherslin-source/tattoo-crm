"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccessToken, getJsonWithAuth, postJsonWithAuth, putJsonWithAuth, deleteJsonWithAuth, ApiError } from "@/lib/api";
import { hasAdminAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/Money";
import { buildBillItemBreakdown } from "@/lib/billing-breakdown";

type BillStatus = "OPEN" | "SETTLED" | "VOID";
type BillSortField = "createdAt" | "billTotal" | "paidTotal" | "dueTotal";
type BillSortOrder = "asc" | "desc";

function isBillSortField(v: string): v is BillSortField {
  return v === "createdAt" || v === "billTotal" || v === "paidTotal" || v === "dueTotal";
}

function isBillSortOrder(v: string): v is BillSortOrder {
  return v === "asc" || v === "desc";
}

interface BillSummary {
  paidTotal: number;
  dueTotal: number;
  cashPaidTotal?: number;
  storedValuePaidTotal?: number;
  artistAmount?: number;
  shopAmount?: number;
}

interface BillRow {
  id: string;
  appointmentId: string | null;
  billType: string;
  status: BillStatus;
  billTotal: number;
  discountTotal: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  customerNameSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  appointment?: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  } | null;
  customer: { id: string; name: string | null; phone: string | null } | null;
  artist: { id: string; name: string | null } | null;
  branch: { id: string; name: string };
  createdBy?: { id: string; name: string | null } | null;
  summary: BillSummary;
}

interface BillDetail extends BillRow {
  items: Array<{
    id: string;
    nameSnapshot: string;
    basePriceSnapshot: number;
    finalPriceSnapshot: number;
    variantsSnapshot: unknown;
    notes: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    notes: string | null;
    recordedBy?: { id: string; name: string | null } | null;
    allocations: Array<{ target: "ARTIST" | "SHOP"; amount: number }>;
  }>;
}

interface SplitRule {
  id: string;
  artistId: string;
  branchId: string | null;
  artistRateBps: number;
  shopRateBps: number;
  effectiveFrom: string;
  artist?: { id: string; name: string | null } | null;
  branch?: { id: string; name: string } | null;
}

interface SplitRuleVersion extends SplitRule {
  createdBy?: { id: string; name: string | null } | null;
}

type MeResponse = {
  id: string;
  name: string | null;
  role: string | null;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
};

type AdminArtistApiRow = {
  id?: string;
  name?: string | null;
  user?: { id?: string; name?: string | null } | null;
  branch?: { id?: string; name?: string | null } | null;
};

const paymentMethods = [
  { value: "CASH", label: "現金" },
  { value: "CARD", label: "刷卡" },
  { value: "TRANSFER", label: "匯款" },
  { value: "STORED_VALUE", label: "儲值扣款" },
  { value: "OTHER", label: "其他" },
];

const BILLING_UI_VERSION = "2026-01-07-native-selects";

function nowDatetimeLocalValue() {
  // datetime-local wants local time; this converts Date.now() to local ISO-ish without timezone.
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function NativeSelect(props: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { value, onChange, options, placeholder, disabled, className } = props;
  return (
    <select
      className={
        className ??
        "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function formatPayMethod(method: string) {
  return paymentMethods.find((m) => m.value === method)?.label || method;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("zh-TW").format(n);
}

function statusBadge(status: BillStatus) {
  switch (status) {
    case "OPEN":
      return <Badge variant="secondary">未結清</Badge>;
    case "SETTLED":
      return <Badge className="bg-green-600 text-white">已結清</Badge>;
    case "VOID":
      return <Badge variant="destructive">作廢</Badge>;
  }
}

export default function AdminBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightStorageKey = "ui.admin.billing.highlightId";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BillRow[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [me, setMe] = useState<MeResponse | null>(null);

  // Filters / sorting
  const [viewMode, setViewMode] = useState<"CONSUMPTION" | "ALL">("CONSUMPTION");
  const [filterBranchId, setFilterBranchId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBillType, setFilterBillType] = useState<string>("all");
  const [filterArtistId, setFilterArtistId] = useState<string>("all");
  const [filterCustomerSearch, setFilterCustomerSearch] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [minBillTotal, setMinBillTotal] = useState<string>("");
  const [maxBillTotal, setMaxBillTotal] = useState<string>("");
  const [minPaidTotal, setMinPaidTotal] = useState<string>("");
  const [maxPaidTotal, setMaxPaidTotal] = useState<string>("");
  const [minDueTotal, setMinDueTotal] = useState<string>("");
  const [maxDueTotal, setMaxDueTotal] = useState<string>("");
  const [sortField, setSortField] = useState<BillSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<BillSortOrder>("desc");

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [artists, setArtists] = useState<Array<{ id: string; name: string | null; branchName: string | null }>>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selected, setSelected] = useState<BillDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [highlightBillId, setHighlightBillId] = useState<string | null>(null);
  const [lastDeepLinkBillId, setLastDeepLinkBillId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newBranchId, setNewBranchId] = useState("");
  const [newBillType, setNewBillType] = useState("WALK_IN");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newArtistId, setNewArtistId] = useState("");
  const [newItems, setNewItems] = useState<Array<{ name: string; amount: string }>>([{ name: "刺青服務", amount: "" }]);

  // BOSS: full edit / hard delete
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    branchId: string;
    artistId: string; // empty means null
    customerId: string; // empty means null
    customerNameSnapshot: string;
    customerPhoneSnapshot: string;
    billType: string;
    status: BillStatus;
    voidReason: string;
    discountTotal: string; // keep as string for input
    recomputeAllocations: boolean;
    items: Array<{
      id?: string;
      nameSnapshot: string;
      basePriceSnapshot: string;
      finalPriceSnapshot: string;
      notes: string;
      sortOrder: number;
    }>;
    payments: Array<{
      id?: string;
      amount: string;
      method: string;
      paidAtLocal: string;
      notes: string;
      artistAmount: string;
      shopAmount: string;
    }>;
  } | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payNotes, setPayNotes] = useState("");
  const payAmountTrimmed = payAmount.trim();
  const isPayAmountValid =
    /^-?\d+$/.test(payAmountTrimmed) &&
    Number.isFinite(parseInt(payAmountTrimmed, 10)) &&
    parseInt(payAmountTrimmed, 10) !== 0;

  // Split rules (BOSS only)
  const [splitRules, setSplitRules] = useState<SplitRule[]>([]);
  const [splitRuleVersions, setSplitRuleVersions] = useState<SplitRuleVersion[]>([]);
  const [ruleArtistId, setRuleArtistId] = useState("");
  const [ruleBranchId, setRuleBranchId] = useState("");
  const [ruleArtistRatePct, setRuleArtistRatePct] = useState("50");
  const [ruleEffectiveFromLocal, setRuleEffectiveFromLocal] = useState(nowDatetimeLocalValue());
  const [availableArtists, setAvailableArtists] = useState<Array<{ userId: string; displayName: string; branchId: string; branchName: string | null }>>([]);
  const [editingRules, setEditingRules] = useState<Record<string, string>>({});
  const [editingRuleEffectiveLocal, setEditingRuleEffectiveLocal] = useState<Record<string, string>>({});
  const [openHistoryByArtistId, setOpenHistoryByArtistId] = useState<Record<string, boolean>>({});
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [recomputeFromDate, setRecomputeFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      // View mode: when not pinning to a specific billType, we can exclude stored-value topups to avoid inflating consumption totals.
      if (viewMode && filterBillType === "all") params.set("view", viewMode);
      if (filterBranchId && filterBranchId !== "all") params.set("branchId", filterBranchId);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      if (filterBillType && filterBillType !== "all") params.set("billType", filterBillType);
      if (filterArtistId && filterArtistId !== "all") params.set("artistId", filterArtistId);
      if (filterCustomerSearch.trim()) params.set("customerSearch", filterCustomerSearch.trim());
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);
      if (minBillTotal) params.set("minBillTotal", minBillTotal);
      if (maxBillTotal) params.set("maxBillTotal", maxBillTotal);
      if (minPaidTotal) params.set("minPaidTotal", minPaidTotal);
      if (maxPaidTotal) params.set("maxPaidTotal", maxPaidTotal);
      if (minDueTotal) params.set("minDueTotal", minDueTotal);
      if (maxDueTotal) params.set("maxDueTotal", maxDueTotal);
      if (sortField) params.set("sortField", sortField);
      if (sortOrder) params.set("sortOrder", sortOrder);

      const url = `/admin/billing/bills${params.toString() ? `?${params.toString()}` : ""}`;
      const data = await getJsonWithAuth<BillRow[]>(url);
      setRows(data);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "載入帳務清單失敗");
    } finally {
      setLoading(false);
    }
  }, [
    viewMode,
    filterBranchId,
    filterStatus,
    filterBillType,
    filterArtistId,
    filterCustomerSearch,
    filterStartDate,
    filterEndDate,
    minBillTotal,
    maxBillTotal,
    minPaidTotal,
    maxPaidTotal,
    minDueTotal,
    maxDueTotal,
    sortField,
    sortOrder,
  ]);

  const openDetail = useCallback(async (billId: string) => {
    try {
      setError(null);
      const data = await getJsonWithAuth<BillDetail>(`/admin/billing/bills/${billId}`);
      setSelected(data);
      setDetailOpen(true);
      // 使用者主動查看時，高光也切換到該筆
      setHighlightBillId(billId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(highlightStorageKey, billId);
      }
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "載入帳務明細失敗");
    }
  }, []);

  const openEdit = useCallback(
    async (billId: string) => {
      if (userRole.toUpperCase() !== "BOSS") return;
      try {
        setError(null);
        setEditLoading(true);
        const data = await getJsonWithAuth<BillDetail>(`/admin/billing/bills/${billId}`);
        setEditBillId(billId);
        setEditDraft({
          branchId: data.branch?.id || "",
          artistId: data.artist?.id || "",
          customerId: data.customer?.id || "",
          customerNameSnapshot: data.customerNameSnapshot || "",
          customerPhoneSnapshot: data.customerPhoneSnapshot || "",
          billType: data.billType || "WALK_IN",
          status: data.status,
          voidReason: "",
          discountTotal: String(data.discountTotal ?? 0),
          recomputeAllocations: false,
          items: (data.items || []).map((it, idx) => ({
            id: it.id,
            nameSnapshot: it.nameSnapshot,
            basePriceSnapshot: String(it.basePriceSnapshot ?? 0),
            finalPriceSnapshot: String(it.finalPriceSnapshot ?? 0),
            notes: it.notes || "",
            sortOrder: idx,
          })),
          payments: (data.payments || []).map((p) => {
            const a = p.allocations.find((x) => x.target === "ARTIST")?.amount ?? 0;
            const s = p.allocations.find((x) => x.target === "SHOP")?.amount ?? 0;
            const dt = new Date(p.paidAt);
            const pad = (n: number) => String(n).padStart(2, "0");
            const paidAtLocal = Number.isNaN(dt.getTime())
              ? ""
              : `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
            return {
              id: p.id,
              amount: String(p.amount),
              method: p.method || "CASH",
              paidAtLocal,
              notes: p.notes || "",
              artistAmount: String(a),
              shopAmount: String(s),
            };
          }),
        });
        setEditOpen(true);
      } catch (e) {
        const apiErr = e as ApiError;
        setError(apiErr.message || "載入帳務資料（編輯）失敗");
      } finally {
        setEditLoading(false);
      }
    },
    [userRole],
  );

  const onSaveEdit = useCallback(async () => {
    if (userRole.toUpperCase() !== "BOSS") return;
    if (!editBillId || !editDraft) return;
    try {
      setError(null);
      setEditLoading(true);

      const toIntOrZero = (v: string) => {
        const n = parseInt(String(v || "0"), 10);
        return Number.isFinite(n) ? n : 0;
      };

      const payload = {
        bill: {
          branchId: editDraft.branchId || undefined,
          artistId: editDraft.artistId.trim() ? editDraft.artistId.trim() : null,
          customerId: editDraft.customerId.trim() ? editDraft.customerId.trim() : null,
          billType: editDraft.billType,
          customerNameSnapshot: editDraft.customerNameSnapshot.trim() ? editDraft.customerNameSnapshot.trim() : null,
          customerPhoneSnapshot: editDraft.customerPhoneSnapshot.trim() ? editDraft.customerPhoneSnapshot.trim() : null,
          discountTotal: toIntOrZero(editDraft.discountTotal),
          status: editDraft.status,
          voidReason: editDraft.status === "VOID" ? (editDraft.voidReason.trim() || "BOSS 作廢") : null,
        },
        items: editDraft.items.map((it, idx) => ({
          id: it.id,
          nameSnapshot: it.nameSnapshot,
          basePriceSnapshot: toIntOrZero(it.basePriceSnapshot),
          finalPriceSnapshot: toIntOrZero(it.finalPriceSnapshot),
          notes: it.notes.trim() ? it.notes.trim() : null,
          sortOrder: idx,
        })),
        payments: editDraft.payments.map((p) => ({
          id: p.id,
          amount: toIntOrZero(p.amount),
          method: p.method,
          paidAt: p.paidAtLocal ? new Date(p.paidAtLocal).toISOString() : undefined,
          notes: p.notes.trim() ? p.notes.trim() : null,
          allocations: { artistAmount: toIntOrZero(p.artistAmount), shopAmount: toIntOrZero(p.shopAmount) },
        })),
        recomputeAllocations: editDraft.recomputeAllocations,
      };

      await putJsonWithAuth(`/admin/billing/bills/${editBillId}/full`, payload);
      setEditOpen(false);
      setEditBillId(null);
      setEditDraft(null);
      await fetchBills();
      if (selected?.id === editBillId) {
        await openDetail(editBillId);
      }
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "儲存帳務變更失敗");
    } finally {
      setEditLoading(false);
    }
  }, [userRole, editBillId, editDraft, fetchBills, selected, openDetail]);

  const openDelete = useCallback((billId: string) => {
    if (userRole.toUpperCase() !== "BOSS") return;
    setDeleteBillId(billId);
    setDeleteReason("");
    setDeleteConfirm("");
    setDeleteOpen(true);
  }, [userRole]);

  const onConfirmDelete = useCallback(async () => {
    if (userRole.toUpperCase() !== "BOSS") return;
    if (!deleteBillId) return;
    const okConfirm = deleteConfirm.trim() === "DELETE" || deleteConfirm.trim() === deleteBillId;
    if (!okConfirm) {
      setError("請輸入 DELETE 或帳單 ID 以確認刪除");
      return;
    }
    if (!deleteReason.trim()) {
      setError("請輸入刪除原因");
      return;
    }
    try {
      setError(null);
      setEditLoading(true);
      await deleteJsonWithAuth(`/admin/billing/bills/${deleteBillId}`, { reason: deleteReason.trim() });
      setDeleteOpen(false);
      setDeleteBillId(null);
      await fetchBills();
      if (selected?.id === deleteBillId) {
        setDetailOpen(false);
        setSelected(null);
      }
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "刪除帳單失敗");
    } finally {
      setEditLoading(false);
    }
  }, [userRole, deleteBillId, deleteConfirm, deleteReason, fetchBills, selected]);

  const clearFocusIdFromUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("openId") && !params.has("highlightId")) return;
    params.delete("openId");
    params.delete("highlightId");
    const next = `/admin/billing${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(next);
  }, [router, searchParams]);

  // Deep-link support (定位高亮，不自動展開): /admin/billing?highlightId=<id>
  // Back-compat: 若有人仍帶 openId，也只做定位高亮。
  useEffect(() => {
    const urlId = searchParams.get("highlightId") || searchParams.get("openId");
    const storedId =
      typeof window !== "undefined" ? window.localStorage.getItem(highlightStorageKey) : null;
    const focusId = urlId || storedId;
    if (!focusId) return;
    if (focusId === lastDeepLinkBillId && highlightBillId === focusId) return;

    setLastDeepLinkBillId(focusId);
    setHighlightBillId(focusId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(highlightStorageKey, focusId);
    }

    (async () => {
      try {
        await fetchBills();
      } catch (e) {
        const apiErr = e as ApiError;
        setError(apiErr.message || "載入帳務清單失敗");
      }
    })();

    // Hybrid：跳轉帶入後立刻清掉 URL（高光仍持續存在）
    if (urlId) clearFocusIdFromUrl();
  }, [searchParams, lastDeepLinkBillId, highlightBillId, fetchBills, clearFocusIdFromUrl]);

  // After rows rendered, auto-scroll highlighted row into view.
  useEffect(() => {
    if (!highlightBillId) return;
    const el = document.getElementById(`bill-row-${highlightBillId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [rows, highlightBillId]);

  const onRecordPayment = useCallback(async () => {
    if (!selected) return;
    if (!isPayAmountValid) {
      setError("請輸入正確的收款金額（不可為空或 0；可為負數代表退款）");
      return;
    }
    const amount = parseInt(payAmountTrimmed, 10);
    try {
      setError(null);
      await postJsonWithAuth(`/admin/billing/bills/${selected.id}/payments`, {
        amount,
        method: payMethod,
        notes: payNotes || undefined,
      });
      setPayAmount("");
      setPayNotes("");
      // 留在視窗內並更新歷史紀錄
      await openDetail(selected.id);
      await fetchBills();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "收款失敗");
    }
  }, [selected, isPayAmountValid, payAmountTrimmed, payMethod, payNotes, openDetail, fetchBills]);

  useEffect(() => {
    const role = (typeof window !== "undefined" && localStorage.getItem("userRole")) || "";
    setUserRole(role);
    if (!hasAdminAccess(role)) {
      router.push("/login");
      return;
    }
    fetchBills();
  }, [router, fetchBills]);

  useEffect(() => {
    // For ARTIST autofill in manual-bill dialog.
    const role = userRole.toUpperCase();
    if (role !== "ARTIST") return;
    (async () => {
      try {
        const data = await getJsonWithAuth<MeResponse>("/auth/me");
        setMe(data);
      } catch (e) {
        // Don't block the page; manual bill still works (backend enforces actor scope).
        console.warn("Failed to load /auth/me", e);
      }
    })();
  }, [userRole]);

  useEffect(() => {
    if (!createOpen) return;
    const role = userRole.toUpperCase();
    if (role !== "ARTIST") return;
    if (!me?.id) return;
    if (me.branchId) setNewBranchId(me.branchId);
    setNewArtistId(me.id);
  }, [createOpen, userRole, me]);

  const lockedBranchLabel = useMemo(() => {
    if (userRole.toUpperCase() !== "ARTIST") return null;
    const branch =
      branches.find((b) => b.id === newBranchId) ||
      (me?.branchId ? { id: me.branchId, name: me.branch?.name || me.branchId } : null);
    return branch?.name || null;
  }, [userRole, branches, newBranchId, me]);

  const lockedArtistLabel = useMemo(() => {
    if (userRole.toUpperCase() !== "ARTIST") return null;
    const artist = artists.find((a) => a.id === newArtistId);
    return artist?.name || me?.name || null;
  }, [userRole, artists, newArtistId, me]);

  useEffect(() => {
    // load branches/artists for filter dropdowns
    const run = async () => {
      try {
        const [branchesData, artistsData] = await Promise.all([
          getJsonWithAuth<Array<{ id: string; name: string }>>("/branches"),
          getJsonWithAuth<AdminArtistApiRow[]>("/admin/artists"),
        ]);
        setBranches((branchesData || []).map((b) => ({ id: b.id, name: b.name })));
        
        const mappedArtists = (artistsData || [])
          .map((a) => ({
            id: a.user?.id ?? a.id ?? "",
            name: a.name ?? a.user?.name ?? null,
            branchName: a.branch?.name ?? null,
          }))
          .filter((a) => !!a.id);
        
        setArtists(mappedArtists);
        
        // 同時設置 availableArtists 供拆賬規則下拉選單使用
        setAvailableArtists(
          (artistsData || [])
            .filter((a) => a.user?.id && a.branch?.id)
            .map((a) => ({
              userId: a.user!.id!,
              displayName: a.name || a.user!.name || a.user!.id!,
              branchId: a.branch!.id!,
              branchName: a.branch!.name || null,
            }))
        );
      } catch (e) {
        console.warn("Failed to load branches/artists for billing filters", e);
      }
    };
    run();
  }, []);

  const fetchSplitRules = useCallback(async () => {
    try {
      const data = await getJsonWithAuth<SplitRule[]>("/admin/billing/split-rules");
      setSplitRules(data);
    } catch (e) {
      // don't hard fail the page
      console.warn("Failed to fetch split rules", e);
    }
  }, []);

  const fetchSplitRuleVersions = useCallback(async () => {
    try {
      const data = await getJsonWithAuth<SplitRuleVersion[]>("/admin/billing/split-rules/versions");
      setSplitRuleVersions(data);
    } catch (e) {
      console.warn("Failed to fetch split rule versions", e);
    }
  }, []);

  useEffect(() => {
    // Only BOSS manages split rules
    if (userRole && userRole.toUpperCase() === "BOSS") {
      fetchSplitRules();
      fetchSplitRuleVersions();
    }
  }, [userRole, fetchSplitRules, fetchSplitRuleVersions]);

  // Initialize editing rules when splitRules change
  useEffect(() => {
    const initial: Record<string, string> = {};
    const initialEffective: Record<string, string> = {};
    splitRules.forEach(r => {
      initial[r.id] = String(Math.round((r.artistRateBps || 0) / 100));
      if (!initialEffective[r.artistId]) initialEffective[r.artistId] = nowDatetimeLocalValue();
    });
    setEditingRules(initial);
    setEditingRuleEffectiveLocal((prev) => ({ ...initialEffective, ...prev }));
  }, [splitRules]);

  const versionsByArtistId = useMemo(() => {
    const map: Record<string, SplitRuleVersion[]> = {};
    for (const v of splitRuleVersions) {
      (map[v.artistId] ||= []).push(v);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    }
    return map;
  }, [splitRuleVersions]);

  const onUpsertSplitRule = useCallback(async () => {
    if (userRole.toUpperCase() !== "BOSS") return;
    if (!ruleArtistId.trim()) {
      setError("請選擇刺青師");
      return;
    }
    const pct = parseFloat(ruleArtistRatePct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("拆帳比例請輸入 0~100 的數字（刺青師%）");
      return;
    }
    const bps = Math.round(pct * 100);
    try {
      setError(null);
      await postJsonWithAuth("/admin/billing/split-rules/versions", {
        artistId: ruleArtistId.trim(),
        branchId: ruleBranchId.trim() ? ruleBranchId.trim() : null,
        artistRateBps: bps,
        effectiveFrom: ruleEffectiveFromLocal ? new Date(ruleEffectiveFromLocal).toISOString() : undefined,
      });
      setRuleArtistId("");
      setRuleBranchId("");
      setRuleArtistRatePct("50");
      setRuleEffectiveFromLocal(nowDatetimeLocalValue());
      await fetchSplitRules();
      await fetchSplitRuleVersions();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "更新拆帳規則失敗");
    }
  }, [userRole, ruleArtistId, ruleBranchId, ruleArtistRatePct, ruleEffectiveFromLocal, fetchSplitRules, fetchSplitRuleVersions]);

  const onDeleteSplitRule = useCallback(async (artistId: string, artistName: string) => {
    if (userRole.toUpperCase() !== "BOSS") return;
    if (!confirm(`確定要刪除「${artistName}」的所有拆帳規則版本？\n\n刪除後，新付款會預設全給店家（歷史付款拆帳不會被回改）。`)) {
      return;
    }
    try {
      setError(null);
      await deleteJsonWithAuth(`/admin/billing/split-rules/${artistId}`);
      await fetchSplitRules();
      await fetchSplitRuleVersions();
      alert(`已刪除「${artistName}」的所有拆帳規則版本。`);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "刪除拆帳規則失敗");
    }
  }, [userRole, fetchSplitRules, fetchSplitRuleVersions]);

  const onRecomputeAllocations = useCallback(async () => {
    if (userRole.toUpperCase() !== "BOSS") return;
    if (!recomputeFromDate) {
      setError("請選擇重算起始日期");
      return;
    }
    if (!confirm(`確定要重算拆帳？\n\n只會重算 paidAt >= ${recomputeFromDate} 的付款（避免朔及既往）。`)) {
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const result = await postJsonWithAuth<{
        total: number;
        recomputed: number;
        skipped: number;
        errors: number;
      }>("/admin/billing/payments/recompute-allocations", {
        fromPaidAt: new Date(`${recomputeFromDate}T00:00`).toISOString(),
      });
      alert(`重算完成！\n總計：${result.total}\n成功：${result.recomputed}\n跳過：${result.skipped}\n錯誤：${result.errors}`);
      await fetchBills();
      if (selected) {
        await openDetail(selected.id);
      }
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "重算拆帳失敗");
    } finally {
      setLoading(false);
    }
  }, [userRole, recomputeFromDate, fetchBills, selected, openDetail]);

  const onSyncBillsFromCart = useCallback(async () => {
    if (userRole.toUpperCase() !== "BOSS") return;
    if (!confirm("確定要同步「應收金額=購物車總額」嗎？\n\n此操作會批次重建所有不一致的帳單（已收不變、未收會跟著調整）。")) {
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const result = await postJsonWithAuth<{
        total: number;
        rebuilt: number;
        skipped: number;
        errors: number;
        rebuiltBillIds?: string[];
      }>("/admin/billing/bills/rebuild-batch", {});
      alert(`同步完成！\n掃描：${result.total}\n已更新：${result.rebuilt}\n跳過：${result.skipped}\n錯誤：${result.errors}`);
      await fetchBills();
      if (selected) {
        await openDetail(selected.id);
      }
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "同步購物車金額失敗");
    } finally {
      setLoading(false);
    }
  }, [userRole, fetchBills, selected, openDetail]);

  const onExportBillsXlsx = useCallback(async () => {
    if (userRole.toUpperCase() !== "BOSS") return;
    try {
      setError(null);
      setExporting(true);

      const params = new URLSearchParams();
      if (viewMode && filterBillType === "all") params.set("view", viewMode);
      if (filterBranchId && filterBranchId !== "all") params.set("branchId", filterBranchId);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      if (filterBillType && filterBillType !== "all") params.set("billType", filterBillType);
      if (filterArtistId && filterArtistId !== "all") params.set("artistId", filterArtistId);
      if (filterCustomerSearch.trim()) params.set("customerSearch", filterCustomerSearch.trim());
      if (filterStartDate) params.set("startDate", filterStartDate);
      if (filterEndDate) params.set("endDate", filterEndDate);
      if (minBillTotal) params.set("minBillTotal", minBillTotal);
      if (maxBillTotal) params.set("maxBillTotal", maxBillTotal);
      if (minPaidTotal) params.set("minPaidTotal", minPaidTotal);
      if (maxPaidTotal) params.set("maxPaidTotal", maxPaidTotal);
      if (minDueTotal) params.set("minDueTotal", minDueTotal);
      if (maxDueTotal) params.set("maxDueTotal", maxDueTotal);
      if (sortField) params.set("sortField", sortField);
      if (sortOrder) params.set("sortOrder", sortOrder);

      const url = `/api/admin/billing/bills/export.xlsx${params.toString() ? `?${params.toString()}` : ""}`;
      const token = getAccessToken();
      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(text || `下載失敗 (${res.status})`, res.status);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const match = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match?.[1] || "billing.xlsx";

      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Delay revocation to avoid occasional truncated downloads on some browsers
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "下載 Excel 失敗");
    } finally {
      setExporting(false);
    }
  }, [
    userRole,
    viewMode,
    filterBillType,
    filterBranchId,
    filterStatus,
    filterArtistId,
    filterCustomerSearch,
    filterStartDate,
    filterEndDate,
    minBillTotal,
    maxBillTotal,
    minPaidTotal,
    maxPaidTotal,
    minDueTotal,
    maxDueTotal,
    sortField,
    sortOrder,
  ]);

  const totals = useMemo(() => {
    const billTotal = rows.reduce((s, r) => s + r.billTotal, 0);
    const paidTotal = rows.reduce((s, r) => s + (r.summary?.paidTotal || 0), 0);
    const cashPaidTotal = rows.reduce(
      (s, r) => s + (r.summary?.cashPaidTotal ?? r.summary?.paidTotal ?? 0),
      0,
    );
    const storedValuePaidTotal = rows.reduce((s, r) => s + (r.summary?.storedValuePaidTotal || 0), 0);
    return { billTotal, paidTotal, cashPaidTotal, storedValuePaidTotal, dueTotal: billTotal - paidTotal };
  }, [rows]);

  const sortLabel = useMemo(() => {
    const fieldLabel =
      sortField === "createdAt"
        ? "帳單建立時間"
        : sortField === "billTotal"
          ? "應收"
          : sortField === "paidTotal"
            ? "已收"
            : "未收";
    const orderLabel = sortOrder === "desc" ? "新→舊/大→小" : "舊→新/小→大";
    return `${fieldLabel}（${orderLabel}）`;
  }, [sortField, sortOrder]);

  const dateRangeLabel = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return "不限";
    if (filterStartDate && !filterEndDate) return `${filterStartDate} 起`;
    if (!filterStartDate && filterEndDate) return `至 ${filterEndDate}`;
    return `${filterStartDate} ~ ${filterEndDate}`;
  }, [filterStartDate, filterEndDate]);

  const onCreateManualBill = useCallback(async () => {
    const branchId = newBranchId.trim();
    if (!branchId) {
      setError("請選擇分店");
      return;
    }
    const items = newItems
      .map((it, idx) => {
        const nameSnapshot = it.name.trim();
        const amt = parseInt(it.amount, 10);
        if (!nameSnapshot) return null;
        if (!Number.isFinite(amt) || amt < 0) return null;
        return {
          nameSnapshot,
          basePriceSnapshot: amt,
          finalPriceSnapshot: amt,
          sortOrder: idx,
        };
      })
      .filter(Boolean) as Array<{
      nameSnapshot: string;
      basePriceSnapshot: number;
      finalPriceSnapshot: number;
      sortOrder: number;
    }>;

    if (items.length === 0) {
      setError("請至少輸入 1 個有效的明細項目（名稱與金額）");
      return;
    }

    try {
      setError(null);
      await postJsonWithAuth("/admin/billing/bills", {
        branchId,
        billType: newBillType,
        customerNameSnapshot: newCustomerName.trim() ? newCustomerName.trim() : null,
        customerPhoneSnapshot: newCustomerPhone.trim() ? newCustomerPhone.trim() : null,
        artistId: newArtistId.trim() ? newArtistId.trim() : null,
        items,
      });
      setCreateOpen(false);
      setNewBranchId("");
      setNewBillType("WALK_IN");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewArtistId("");
      setNewItems([{ name: "刺青服務", amount: "" }]);
      await fetchBills();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "建立帳單失敗");
    }
  }, [newBranchId, newBillType, newCustomerName, newCustomerPhone, newArtistId, newItems, fetchBills]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">帳務管理</h1>
          <p className="text-sm text-muted-foreground">以帳務為唯一口徑（可含預約帳、非預約帳）</p>
        </div>
        <div className="flex gap-2">
          {hasAdminAccess(userRole) && (
            <Button onClick={() => setCreateOpen(true)}>新增非預約帳單</Button>
          )}
          {userRole.toUpperCase() === "BOSS" && (
            <Button variant="outline" onClick={onSyncBillsFromCart} disabled={loading}>
              同步購物車金額（回填不一致）
            </Button>
          )}
          {userRole.toUpperCase() === "BOSS" && (
            <Button variant="outline" onClick={onExportBillsXlsx} disabled={loading || exporting}>
              {exporting ? "下載中..." : "下載 Excel"}
            </Button>
          )}
          <Button variant="outline" onClick={fetchBills} disabled={loading}>
            {loading ? "載入中..." : "重新整理"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>總應收</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${formatMoney(totals.billTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>總實收（現金）</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${formatMoney(totals.cashPaidTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>儲值扣款</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${formatMoney(totals.storedValuePaidTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>未收</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${formatMoney(totals.dueTotal)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>帳務清單</CardTitle>
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex flex-wrap items-end gap-2">
              <div className="w-[160px]">
                <div className="text-[11px] text-muted-foreground mb-1">分店</div>
                <NativeSelect
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filterBranchId}
                  onChange={setFilterBranchId}
                  options={[
                    { value: "all", label: "全部分店" },
                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              </div>

              <div className="w-[120px]">
                <div className="text-[11px] text-muted-foreground mb-1">狀態</div>
                <NativeSelect
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={[
                    { value: "all", label: "全部狀態" },
                    { value: "OPEN", label: "未結清" },
                    { value: "SETTLED", label: "已結清" },
                    { value: "VOID", label: "作廢" },
                  ]}
                />
              </div>

              <div className="w-[180px]">
                <div className="text-[11px] text-muted-foreground mb-1">刺青師</div>
                <NativeSelect
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filterArtistId}
                  onChange={setFilterArtistId}
                  options={[
                    { value: "all", label: "全部刺青師" },
                    ...artists.map((a) => ({
                      value: a.id,
                      label: `${a.name || a.id}（${a.branchName || "無分店"}）`,
                    })),
                  ]}
                />
              </div>

              <div className="w-[140px]">
                <div className="text-[11px] text-muted-foreground mb-1">起始</div>
                <Input className="h-9" type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              </div>
              <div className="w-[140px]">
                <div className="text-[11px] text-muted-foreground mb-1">結束</div>
                <Input className="h-9" type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
              </div>

              <div className="w-[160px]">
                <div className="text-[11px] text-muted-foreground mb-1">排序</div>
                <NativeSelect
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sortField}
                  onChange={(v) => setSortField(isBillSortField(v) ? v : "createdAt")}
                  options={[
                    { value: "createdAt", label: "帳單建立時間" },
                    { value: "billTotal", label: "應收金額" },
                    { value: "paidTotal", label: "已收金額" },
                    { value: "dueTotal", label: "未收金額" },
                  ]}
                />
              </div>

              <div className="w-[150px]">
                <div className="text-[11px] text-muted-foreground mb-1">方向</div>
                <NativeSelect
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={sortOrder}
                  onChange={(v) => setSortOrder(isBillSortOrder(v) ? v : "desc")}
                  options={[
                    { value: "desc", label: "新→舊 / 大→小" },
                    { value: "asc", label: "舊→新 / 小→大" },
                  ]}
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setFilterOpen(true)}
              title={`分店：${filterBranchId === "all" ? "全部" : branches.find((b) => b.id === filterBranchId)?.name || filterBranchId}｜狀態：${filterStatus === "all" ? "全部" : filterStatus}｜刺青師：${filterArtistId === "all" ? "全部" : artists.find((a) => a.id === filterArtistId)?.name || filterArtistId}｜日期：${dateRangeLabel}｜排序：${sortLabel}`}
            >
              更多篩選
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">帳單建立時間</th>
                  <th className="py-2 pr-3">會員</th>
                  <th className="py-2 pr-3">刺青師</th>
                  <th className="py-2 pr-3">分店</th>
                  <th className="py-2 pr-3">應收</th>
                  <th className="py-2 pr-3">現金實收</th>
                  <th className="py-2 pr-3">儲值扣款</th>
                  <th className="py-2 pr-3">未收</th>
                  <th className="py-2 pr-3">店家</th>
                  <th className="py-2 pr-3">刺青師</th>
                  <th className="py-2 pr-3">狀態</th>
                  <th className="py-2 pr-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    id={`bill-row-${r.id}`}
                    className={`border-b hover:bg-muted/40 ${
                      highlightBillId === r.id ? "bg-amber-100/60 transition-colors" : ""
                    }`}
                    onClick={() => {
                      setHighlightBillId(r.id);
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(highlightStorageKey, r.id);
                      }
                    }}
                  >
                    <td className="py-2 pr-3">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      {r.customer?.name ||
                        r.customer?.phone ||
                        r.customerNameSnapshot ||
                        r.customerPhoneSnapshot ||
                        "-"}
                    </td>
                    <td className="py-2 pr-3">{r.artist?.name || "-"}</td>
                    <td className="py-2 pr-3">{r.branch?.name || "-"}</td>
                    <td className="py-2 pr-3">${formatMoney(r.billTotal)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.cashPaidTotal ?? r.summary?.paidTotal ?? 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.storedValuePaidTotal || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.dueTotal || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.shopAmount || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.artistAmount || 0)}</td>
                    <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(r.id);
                          }}
                        >
                          查看
                        </Button>
                        {userRole.toUpperCase() === "BOSS" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={editLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(r.id);
                              }}
                            >
                              編輯
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={editLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDelete(r.id);
                              }}
                            >
                              刪除
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-muted-foreground">
                      目前沒有帳務資料（請先在預約完成後建立帳務）
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>篩選 / 排序（更多）</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">視角</div>
              <NativeSelect
                value={viewMode}
                onChange={(v) => setViewMode(v === "ALL" ? "ALL" : "CONSUMPTION")}
                options={[
                  { value: "CONSUMPTION", label: "消費（不含儲值）" },
                  { value: "ALL", label: "全部（含儲值）" },
                ]}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">帳單類型</div>
              <NativeSelect
                value={filterBillType}
                onChange={setFilterBillType}
                options={[
                  { value: "all", label: "全部類型" },
                  { value: "APPOINTMENT", label: "預約" },
                  { value: "WALK_IN", label: "現場" },
                  { value: "PRODUCT", label: "商品" },
                  { value: "STORED_VALUE_TOPUP", label: "儲值" },
                  { value: "OTHER", label: "其他" },
                ]}
              />
            </div>

            <div className="md:col-span-3">
              <div className="text-xs text-muted-foreground mb-1">會員搜尋（姓名/手機）</div>
              <Input
                value={filterCustomerSearch}
                onChange={(e) => setFilterCustomerSearch(e.target.value)}
                placeholder="輸入姓名或手機..."
              />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">應收（最小）</div>
              <Input inputMode="numeric" value={minBillTotal} onChange={(e) => setMinBillTotal(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">應收（最大）</div>
              <Input inputMode="numeric" value={maxBillTotal} onChange={(e) => setMaxBillTotal(e.target.value)} placeholder="999999" />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">已收（最小）</div>
              <Input inputMode="numeric" value={minPaidTotal} onChange={(e) => setMinPaidTotal(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">已收（最大）</div>
              <Input inputMode="numeric" value={maxPaidTotal} onChange={(e) => setMaxPaidTotal(e.target.value)} placeholder="999999" />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">未收（最小）</div>
              <Input inputMode="numeric" value={minDueTotal} onChange={(e) => setMinDueTotal(e.target.value)} placeholder="0" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">未收（最大）</div>
              <Input inputMode="numeric" value={maxDueTotal} onChange={(e) => setMaxDueTotal(e.target.value)} placeholder="999999" />
            </div>

            <div className="md:col-span-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterBranchId("all");
                  setFilterStatus("all");
                  setFilterBillType("all");
                  setFilterArtistId("all");
                  setFilterCustomerSearch("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setMinBillTotal("");
                  setMaxBillTotal("");
                  setMinPaidTotal("");
                  setMaxPaidTotal("");
                  setMinDueTotal("");
                  setMaxDueTotal("");
                  setSortField("createdAt");
                  setSortOrder("desc");
                }}
              >
                清除條件
              </Button>
              <Button
                onClick={async () => {
                  await fetchBills();
                  setFilterOpen(false);
                }}
                disabled={loading}
              >
                套用篩選
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增非預約帳單</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">分店</label>
                <NativeSelect
                  value={newBranchId}
                  onChange={setNewBranchId}
                  disabled={userRole.toUpperCase() === "ARTIST"}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  placeholder={userRole.toUpperCase() === "ARTIST" ? lockedBranchLabel || "已帶入" : "請選擇分店"}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">類型</label>
                <NativeSelect
                  value={newBillType}
                  onChange={setNewBillType}
                  options={[
                    { value: "WALK_IN", label: "現場（WALK_IN）" },
                    { value: "OTHER", label: "其他（OTHER）" },
                  ]}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">客戶姓名（可空）</label>
                <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="王小明" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">客戶手機（可空）</label>
                <Input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="0912345678" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">刺青師（可空）</label>
                <NativeSelect
                  value={newArtistId || "none"}
                  onChange={(v) => setNewArtistId(v === "none" ? "" : v)}
                  disabled={userRole.toUpperCase() === "ARTIST"}
                  options={[
                    { value: "none", label: "不指定" },
                    ...artists.map((a) => ({ value: a.id, label: `${a.name || a.id}（${a.branchName || "無分店"}）` })),
                  ]}
                  placeholder={userRole.toUpperCase() === "ARTIST" ? lockedArtistLabel || "已帶入" : "不指定"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">明細</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewItems((prev) => [...prev, { name: "", amount: "" }])}
                >
                  + 新增項目
                </Button>
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 px-3">項目名稱</th>
                      <th className="py-2 px-3 w-40">金額</th>
                      <th className="py-2 px-3 w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newItems.map((it, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 px-3">
                          <Input
                            value={it.name}
                            onChange={(e) =>
                              setNewItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))
                            }
                            placeholder="刺青服務"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            value={it.amount}
                            onChange={(e) =>
                              setNewItems((prev) => prev.map((p, i) => (i === idx ? { ...p, amount: e.target.value } : p)))
                            }
                            placeholder="30000"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewItems((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={newItems.length <= 1}
                          >
                            移除
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button onClick={onCreateManualBill}>建立</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BOSS: hard delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>刪除帳單（硬刪）</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-red-600">
              ⚠️ 這是硬刪：會刪除帳單/付款/拆帳/明細，並自動回滾會員儲值與消費紀錄。請務必確認。
            </div>
            <div>
              <label className="text-xs text-muted-foreground">刪除原因（必填）</label>
              <Input value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="請輸入原因..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">確認文字（輸入 DELETE 或帳單 ID）</label>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={onConfirmDelete} disabled={editLoading}>
                {editLoading ? "刪除中..." : "確認刪除"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* BOSS: full edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditBillId(null);
            setEditDraft(null);
          }
        }}
      >
        <DialogContent
          disableTransform
          className="left-[10vw] top-[10vh] w-[80vw] h-[80vh] max-w-none max-h-none overflow-y-auto sm:left-[5vw] sm:top-[5vh] sm:w-[90vw] sm:h-[90vh]"
        >
          <DialogHeader>
              <DialogTitle>編輯帳單（BOSS）</DialogTitle>
              <div className="text-[11px] text-muted-foreground">UI版本：{BILLING_UI_VERSION}</div>
          </DialogHeader>

          {!editDraft ? (
            <div className="text-sm text-muted-foreground">載入中...</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">分店</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editDraft.branchId}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, branchId: e.target.value } : d))}
                  >
                    <option value="" disabled>
                      請選擇分店
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">刺青師（可空）</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editDraft.artistId || "none"}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, artistId: e.target.value === "none" ? "" : e.target.value } : d,
                      )
                    }
                  >
                    <option value="none">不指定</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {(a.name || a.id) + `（${a.branchName || "無分店"}）`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">會員（可空）</label>
                  <Input
                    value={editDraft.customerId}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, customerId: e.target.value } : d))}
                    placeholder="輸入會員 ID（可空）"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">客戶姓名快照（可空）</label>
                  <Input
                    value={editDraft.customerNameSnapshot}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, customerNameSnapshot: e.target.value } : d))}
                    placeholder="王小明"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">客戶手機快照（可空）</label>
                  <Input
                    value={editDraft.customerPhoneSnapshot}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, customerPhoneSnapshot: e.target.value } : d))}
                    placeholder="0912345678"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">帳單類型</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editDraft.billType}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, billType: e.target.value } : d))}
                  >
                    <option value="APPOINTMENT">預約</option>
                    <option value="WALK_IN">現場</option>
                    <option value="PRODUCT">商品</option>
                    <option value="STORED_VALUE_TOPUP">儲值</option>
                    <option value="OTHER">其他</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">折扣（會影響應收）</label>
                  <Input
                    inputMode="numeric"
                    value={editDraft.discountTotal}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, discountTotal: e.target.value } : d))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">狀態</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editDraft.status}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, status: e.target.value as BillStatus } : d))}
                  >
                    <option value="OPEN">未結清</option>
                    <option value="SETTLED">已結清</option>
                    <option value="VOID">作廢</option>
                  </select>
                </div>

                {editDraft.status === "VOID" ? (
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground">作廢原因（建議填）</label>
                    <Input
                      value={editDraft.voidReason}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, voidReason: e.target.value } : d))}
                      placeholder="作廢原因..."
                    />
                  </div>
                ) : null}

                <div className="md:col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editDraft.recomputeAllocations}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, recomputeAllocations: e.target.checked } : d))}
                  />
                  <span className="text-sm text-muted-foreground">儲存時依規則重算拆帳（非儲值付款）</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">明細 items</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              items: [
                                ...d.items,
                                {
                                  nameSnapshot: "",
                                  basePriceSnapshot: "0",
                                  finalPriceSnapshot: "0",
                                  notes: "",
                                  sortOrder: d.items.length,
                                },
                              ],
                            }
                          : d,
                      )
                    }
                  >
                    + 新增項目
                  </Button>
                </div>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-[920px] w-full text-sm">
                    <thead>
                      <tr className="text-left border-b bg-gray-50">
                        <th className="py-2 px-3">名稱</th>
                        <th className="py-2 px-3 w-32">原價</th>
                        <th className="py-2 px-3 w-32">成交</th>
                        <th className="py-2 px-3">備註</th>
                        <th className="py-2 px-3 w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editDraft.items.map((it, idx) => (
                        <tr key={it.id || `new-${idx}`} className="border-b">
                          <td className="py-2 px-3">
                            <Input
                              value={it.nameSnapshot}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        items: d.items.map((x, i) => (i === idx ? { ...x, nameSnapshot: e.target.value } : x)),
                                      }
                                    : d,
                                )
                              }
                              placeholder="項目名稱"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              inputMode="numeric"
                              value={it.basePriceSnapshot}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        items: d.items.map((x, i) => (i === idx ? { ...x, basePriceSnapshot: e.target.value } : x)),
                                      }
                                    : d,
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              inputMode="numeric"
                              value={it.finalPriceSnapshot}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        items: d.items.map((x, i) => (i === idx ? { ...x, finalPriceSnapshot: e.target.value } : x)),
                                      }
                                    : d,
                                )
                              }
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              value={it.notes}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d ? { ...d, items: d.items.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)) } : d,
                                )
                              }
                              placeholder="可空"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditDraft((d) => (d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d))
                              }
                              disabled={editDraft.items.length <= 1}
                            >
                              移除
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {editDraft.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 px-3 text-center text-muted-foreground">
                            無明細
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">付款 payments</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              payments: [
                                ...d.payments,
                                {
                                  amount: "0",
                                  method: "CASH",
                                  paidAtLocal: "",
                                  notes: "",
                                  artistAmount: "0",
                                  shopAmount: "0",
                                },
                              ],
                            }
                          : d,
                      )
                    }
                  >
                    + 新增付款
                  </Button>
                </div>
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-[980px] w-full text-sm">
                    <thead>
                      <tr className="text-left border-b bg-gray-50">
                        <th className="py-2 px-3 w-44">方式</th>
                        <th className="py-2 px-3 w-40">金額</th>
                        <th className="py-2 px-3 w-64">時間</th>
                        <th className="py-2 px-3">備註</th>
                        <th className="py-2 px-3 w-56">拆帳（店/師）</th>
                        <th className="py-2 px-3 w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editDraft.payments.map((p, idx) => {
                        const isStored = String(p.method).toUpperCase() === "STORED_VALUE";
                        return (
                          <tr key={p.id || `pnew-${idx}`} className="border-b">
                            <td className="py-2 px-3">
                              {/* Use native select here to avoid Radix portal/popover positioning issues inside Dialog+table (esp. mobile/iPad). */}
                              <select
                                className="h-10 min-w-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={p.method}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d
                                      ? {
                                          ...d,
                                          payments: d.payments.map((x, i) => (i === idx ? { ...x, method: e.target.value } : x)),
                                        }
                                      : d,
                                  )
                                }
                              >
                                {paymentMethods.map((m) => (
                                  <option key={m.value} value={m.value}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                inputMode="numeric"
                                className="min-w-[120px]"
                                value={p.amount}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, payments: d.payments.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)) } : d,
                                  )
                                }
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="datetime-local"
                                className="min-w-[220px]"
                                value={p.paidAtLocal}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d
                                      ? { ...d, payments: d.payments.map((x, i) => (i === idx ? { ...x, paidAtLocal: e.target.value } : x)) }
                                      : d,
                                  )
                                }
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                value={p.notes}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, payments: d.payments.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)) } : d,
                                  )
                                }
                                placeholder="可空"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex gap-2 items-center">
                                <Input
                                  inputMode="numeric"
                                  className="w-24"
                                  value={isStored ? "0" : p.shopAmount}
                                  disabled={isStored}
                                  onChange={(e) =>
                                    setEditDraft((d) =>
                                      d ? { ...d, payments: d.payments.map((x, i) => (i === idx ? { ...x, shopAmount: e.target.value } : x)) } : d,
                                    )
                                  }
                                />
                                <span className="text-xs text-muted-foreground">/</span>
                                <Input
                                  inputMode="numeric"
                                  className="w-24"
                                  value={isStored ? "0" : p.artistAmount}
                                  disabled={isStored}
                                  onChange={(e) =>
                                    setEditDraft((d) =>
                                      d
                                        ? { ...d, payments: d.payments.map((x, i) => (i === idx ? { ...x, artistAmount: e.target.value } : x)) }
                                        : d,
                                    )
                                  }
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditDraft((d) => (d ? { ...d, payments: d.payments.filter((_, i) => i !== idx) } : d))
                                }
                              >
                                移除
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {editDraft.payments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-4 px-3 text-center text-muted-foreground">
                            尚無付款
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
                  取消
                </Button>
                <Button onClick={onSaveEdit} disabled={editLoading}>
                  {editLoading ? "儲存中..." : "儲存"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            if (selected?.id) {
              setHighlightBillId(selected.id);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(highlightStorageKey, selected.id);
              }
            }
            setSelected(null);
            clearFocusIdFromUrl();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>帳務明細</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardHeader>
                    <CardTitle>應收</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">${formatMoney(selected.billTotal)}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>已收</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">${formatMoney(selected.summary.paidTotal)}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>未收</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    ${formatMoney(selected.summary.dueTotal)}
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="font-medium mb-2">服務明細</div>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 px-3">項目</th>
                        <th className="py-2 px-3">原價</th>
                        <th className="py-2 px-3">成交</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((it) => (
                        <tr key={it.id} className="border-b">
                          <td className="py-2 px-3">{it.nameSnapshot}</td>
                          <td className="py-2 px-3">${formatMoney(it.basePriceSnapshot)}</td>
                          <td className="py-2 px-3">${formatMoney(it.finalPriceSnapshot)}</td>
                        </tr>
                      ))}
                      {selected.items.length === 0 && (
                        <tr>
                          <td className="py-4 px-3 text-muted-foreground" colSpan={3}>
                            無明細
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="font-medium mb-2">購物車拆分明細</div>
                {selected.items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">無可用的購物車明細（items 為空）。</div>
                ) : (
                  <div className="space-y-3">
                    {selected.items.map((it) => {
                      const bd = buildBillItemBreakdown({
                        nameSnapshot: it.nameSnapshot,
                        finalPriceSnapshot: it.finalPriceSnapshot,
                        variantsSnapshot: it.variantsSnapshot,
                      });
                      const colorLabel = `顏色-${bd.color || "未設定"}`;
                      return (
                        <div key={`breakdown-${it.id}`} className="rounded-md border border-gray-200 bg-white p-3">
                          <div className="space-y-2">
                            {/* 1) 服務名稱：不顯示金額 */}
                            <div className="font-medium text-gray-900">{bd.serviceName}</div>

                            {/* 2) 顏色-XX：顯示服務價（不含附加） */}
                            <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
                              <div className="text-xs text-gray-600">{colorLabel}</div>
                              <div className="text-xs font-medium text-gray-900">
                                <Money amount={bd.servicePrice} className="w-full" amountClassName="tabular-nums text-right" />
                              </div>
                            </div>

                            {/* 3) 加購：顯示金額（若存在） */}
                            {bd.customAddon > 0 ? (
                              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
                                <div className="text-xs text-gray-600">加購</div>
                                <div className="text-xs font-medium text-gray-900">
                                  <Money amount={bd.customAddon} className="w-full" amountClassName="tabular-nums text-right" />
                                </div>
                              </div>
                            ) : null}

                            {/* 設計費：只有存在才顯示 */}
                            {bd.designFee > 0 ? (
                              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
                                <div className="text-xs text-gray-600">設計費</div>
                                <div className="text-xs font-medium text-gray-900">
                                  <Money amount={bd.designFee} className="w-full" amountClassName="tabular-nums text-right" />
                                </div>
                              </div>
                            ) : null}

                            {/* 其他附加：可擴充（不包含設計費/加購/顏色等） */}
                            {bd.addons
                              .filter((a) => a.key !== "custom_addon" && a.key !== "design_fee")
                              .map((a) => (
                                <div key={`${it.id}-${a.key}`} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
                                  <div className="text-xs text-gray-600">{a.label}</div>
                                  <div className="text-xs font-medium text-gray-900">
                                    <Money amount={a.amount} className="w-full" amountClassName="tabular-nums text-right" />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-sm font-medium text-gray-900">購物車總額</div>
                      <div className="text-sm font-semibold text-gray-900">
                        <Money amount={selected.billTotal} className="w-full" amountClassName="tabular-nums text-right" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="font-medium mb-2">新增收款 / 退款（負數）</div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground">金額</label>
                    <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="5000" />
                  </div>
                  <div className="w-44">
                    <label className="text-xs text-muted-foreground">方式</label>
                    <NativeSelect
                      value={payMethod}
                      onChange={setPayMethod}
                      options={paymentMethods}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground">備註</label>
                    <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="交易碼/說明" />
                  </div>
                  <Button onClick={onRecordPayment} disabled={!isPayAmountValid}>
                    送出
                  </Button>
                </div>
              </div>

              <div>
                <div className="font-medium mb-2">付款紀錄</div>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 px-3">時間</th>
                        <th className="py-2 px-3">方式</th>
                        <th className="py-2 px-3">金額</th>
                        <th className="py-2 px-3">收款人</th>
                        <th className="py-2 px-3">拆帳（店家/刺青師）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.payments.map((p) => {
                        const a = p.allocations.find((x) => x.target === "ARTIST")?.amount ?? 0;
                        const s = p.allocations.find((x) => x.target === "SHOP")?.amount ?? 0;
                        return (
                          <tr key={p.id} className="border-b">
                            <td className="py-2 px-3">{new Date(p.paidAt).toLocaleString()}</td>
                            <td className="py-2 px-3">{formatPayMethod(p.method)}</td>
                            <td className="py-2 px-3">${formatMoney(p.amount)}</td>
                            <td className="py-2 px-3">
                              {p.recordedBy?.name || "（歷史匯入/未知）"}
                            </td>
                            <td className="py-2 px-3">
                              ${formatMoney(s)} / ${formatMoney(a)}
                            </td>
                          </tr>
                        );
                      })}
                      {selected.payments.length === 0 && (
                        <tr>
                          <td className="py-4 px-3 text-muted-foreground" colSpan={5}>
                            尚無付款
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {userRole.toUpperCase() === "BOSS" && (
        <Card>
          <CardHeader>
            <CardTitle>拆帳比例設定（BOSS）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              規則採「版本化」：每次儲存會新增一個版本（不朔及既往），付款拆帳以每筆 payment 的 paidAt 套用當時最新版本。
            </div>

            {/* 已有規則的刺青師：列表直接編輯 */}
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50">
                    <th className="py-2 px-3">刺青師</th>
                    <th className="py-2 px-3 w-56">新版本生效時間</th>
                    <th className="py-2 px-3">店家%</th>
                    <th className="py-2 px-3">刺青師%</th>
                    <th className="py-2 px-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {splitRules.map((r) => {
                    const rawEditingPct = editingRules[r.id];
                    const editingPct = rawEditingPct !== undefined ? rawEditingPct : String(Math.round((r.artistRateBps || 0) / 100));
                    const editingPctNum = parseFloat(editingPct || "0");
                    const shopPct = Number.isFinite(editingPctNum) && editingPct.trim() !== "" ? 100 - editingPctNum : null;
                    
                    // 從 artists state 查找分店名
                    const artistInfo = artists.find(a => a.id === r.artistId);
                    const branchLabel = artistInfo?.branchName || "無分店";
                    
                    const handleSave = async () => {
                      if (!editingPct || editingPct.trim() === "") {
                        setError("請輸入刺青師%");
                        return;
                      }
                      const pct = parseFloat(editingPct);
                      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                        setError("拆帳比例請輸入 0~100 的數字");
                        return;
                      }
                      const bps = Math.round(pct * 100);
                      try {
                        setSavingRuleId(r.id);
                        setError(null);
                        await postJsonWithAuth("/admin/billing/split-rules/versions", {
                          artistId: r.artistId,
                          branchId: r.branchId,
                          artistRateBps: bps,
                          effectiveFrom: editingRuleEffectiveLocal[r.artistId]
                            ? new Date(editingRuleEffectiveLocal[r.artistId]).toISOString()
                            : undefined,
                        });
                        await fetchSplitRules();
                        await fetchSplitRuleVersions();
                      } catch (e) {
                        const apiErr = e as ApiError;
                        setError(apiErr.message || "更新拆帳規則失敗");
                      } finally {
                        setSavingRuleId(null);
                      }
                    };

                    return (
                      <>
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">
                            {r.artist?.name || r.artistId}（{branchLabel}）
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="datetime-local"
                              className="w-56"
                              value={editingRuleEffectiveLocal[r.artistId] || ""}
                              onChange={(e) =>
                                setEditingRuleEffectiveLocal((prev) => ({ ...prev, [r.artistId]: e.target.value }))
                              }
                            />
                          </td>
                          <td className="py-2 px-3">{shopPct !== null ? `${shopPct.toFixed(0)}%` : "—"}</td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="w-20"
                              value={editingPct}
                              onChange={(e) => setEditingRules((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            />
                          </td>
                          <td className="py-2 px-3 space-x-2">
                            <Button size="sm" onClick={handleSave} disabled={savingRuleId === r.id}>
                              {savingRuleId === r.id ? "儲存中..." : "新增版本"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setOpenHistoryByArtistId((prev) => ({ ...prev, [r.artistId]: !prev[r.artistId] }))
                              }
                              disabled={savingRuleId === r.id}
                            >
                              {openHistoryByArtistId[r.artistId] ? "收合歷史" : "看歷史"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteSplitRule(r.artistId, r.artist?.name || r.artistId)}
                              disabled={savingRuleId === r.id}
                            >
                              刪除
                            </Button>
                          </td>
                        </tr>
                        {openHistoryByArtistId[r.artistId] && (
                          <tr className="border-b bg-gray-50/40">
                            <td colSpan={5} className="py-2 px-3">
                              <div className="text-xs text-muted-foreground mb-2">版本歷史（最新在前，最多顯示 10 筆）</div>
                              <div className="space-y-1">
                                {(versionsByArtistId[r.artistId] || []).slice(0, 10).map((v) => (
                                  <div key={v.id} className="flex flex-wrap gap-3 text-sm">
                                    <div className="min-w-[220px]">{new Date(v.effectiveFrom).toLocaleString()}</div>
                                    <div className="min-w-[120px]">刺青師 {Math.round((v.artistRateBps || 0) / 100)}%</div>
                                    <div className="min-w-[120px]">店家 {Math.round((v.shopRateBps || 0) / 100)}%</div>
                                    <div className="text-muted-foreground">
                                      建立者：{v.createdBy?.name || "（未知/歷史）"}
                                    </div>
                                  </div>
                                ))}
                                {(versionsByArtistId[r.artistId] || []).length === 0 && (
                                  <div className="text-sm text-muted-foreground">尚無版本歷史</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {splitRules.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 px-3 text-center text-muted-foreground">
                        尚未設定任何拆帳規則（無規則版本時：預設全給店家）
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 新增區：只顯示尚未有規則的刺青師 */}
            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-medium">新增刺青師規則</div>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-72">
                  <label className="text-xs text-muted-foreground">刺青師（尚未有規則）</label>
                  <NativeSelect
                    value={ruleArtistId}
                    onChange={(value) => {
                      setRuleArtistId(value);
                      const selectedArtist = availableArtists.find((a) => a.userId === value);
                      if (selectedArtist) setRuleBranchId(selectedArtist.branchId);
                    }}
                    placeholder="請選擇刺青師"
                    options={availableArtists
                      .filter((artist) => !splitRules.some((rule) => rule.artistId === artist.userId))
                      .map((artist) => ({
                        value: artist.userId,
                        label: `${artist.displayName}（${artist.branchName || "無分店"}）`,
                      }))}
                  />
                </div>
                <div className="w-72">
                  <label className="text-xs text-muted-foreground">分店（自動）</label>
                  <Input 
                    value={availableArtists.find(a => a.userId === ruleArtistId)?.branchName || ''} 
                    readOnly 
                    disabled
                    className="bg-gray-100"
                    placeholder="選擇刺青師後自動帶出" 
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-muted-foreground">刺青師%</label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    value={ruleArtistRatePct} 
                    onChange={(e) => setRuleArtistRatePct(e.target.value)} 
                  />
                </div>
                <div className="w-56">
                  <label className="text-xs text-muted-foreground">生效時間</label>
                  <Input
                    type="datetime-local"
                    value={ruleEffectiveFromLocal}
                    onChange={(e) => setRuleEffectiveFromLocal(e.target.value)}
                  />
                </div>
                <Button onClick={onUpsertSplitRule}>新增版本</Button>
              </div>
            </div>

            {/* 重算拆帳按鈕 */}
            <div className="border-t pt-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-56">
                  <label className="text-xs text-muted-foreground">重算起始日（paidAt >=）</label>
                  <Input type="date" value={recomputeFromDate} onChange={(e) => setRecomputeFromDate(e.target.value)} />
                </div>
                <Button variant="outline" onClick={onRecomputeAllocations} disabled={loading}>
                  重算拆帳（依日期範圍）
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                ⚠️ 只會重算選定日期之後的付款（避免朔及既往）。
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


