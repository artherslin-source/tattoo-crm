"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getJsonWithAuth, postJsonWithAuth, ApiError } from "@/lib/api";
import { hasAdminAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  const [ruleArtistId, setRuleArtistId] = useState("");
  const [ruleBranchId, setRuleBranchId] = useState("");
  const [ruleArtistRatePct, setRuleArtistRatePct] = useState("70");
  const [availableArtists, setAvailableArtists] = useState<Array<{ userId: string; displayName: string; branchId: string }>>([]);

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
    // load branches/artists for filter dropdowns
    const run = async () => {
      try {
        const [branchesData, artistsData] = await Promise.all([
          getJsonWithAuth<Array<{ id: string; name: string }>>("/api/branches"),
          getJsonWithAuth<AdminArtistApiRow[]>("/api/admin/artists"),
        ]);
        setBranches((branchesData || []).map((b) => ({ id: b.id, name: b.name })));
        
        const mappedArtists = (artistsData || [])
          .map((a) => ({
            id: a.id ?? a.user?.id ?? "",
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

  useEffect(() => {
    // Only BOSS manages split rules
    if (userRole && userRole.toUpperCase() === "BOSS") {
      fetchSplitRules();
    }
  }, [userRole, fetchSplitRules]);

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
      await postJsonWithAuth("/api/admin/billing/split-rules", {
        artistId: ruleArtistId.trim(),
        branchId: ruleBranchId.trim() ? ruleBranchId.trim() : null,
        artistRateBps: bps,
      });
      setRuleArtistId("");
      setRuleBranchId("");
      setRuleArtistRatePct("70");
      await fetchSplitRules();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "更新拆帳規則失敗");
    }
  }, [userRole, ruleArtistId, ruleBranchId, ruleArtistRatePct, fetchSplitRules]);

  const totals = useMemo(() => {
    const billTotal = rows.reduce((s, r) => s + r.billTotal, 0);
    const paidTotal = rows.reduce((s, r) => s + (r.summary?.paidTotal || 0), 0);
    return { billTotal, paidTotal, dueTotal: billTotal - paidTotal };
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
      setError("請輸入 branchId（分店 ID）");
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
          {userRole.toUpperCase() === "BOSS" && (
            <Button onClick={() => setCreateOpen(true)}>新增非預約帳單</Button>
          )}
          <Button variant="outline" onClick={fetchBills} disabled={loading}>
            {loading ? "載入中..." : "重新整理"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>總應收</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${formatMoney(totals.billTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>總實收</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${formatMoney(totals.paidTotal)}</CardContent>
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
                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全部分店" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分店</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[120px]">
                <div className="text-[11px] text-muted-foreground mb-1">狀態</div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全部狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部狀態</SelectItem>
                    <SelectItem value="OPEN">未結清</SelectItem>
                    <SelectItem value="SETTLED">已結清</SelectItem>
                    <SelectItem value="VOID">作廢</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <div className="text-[11px] text-muted-foreground mb-1">刺青師</div>
                <Select value={filterArtistId} onValueChange={setFilterArtistId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="全部刺青師" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部刺青師</SelectItem>
                    {artists.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {(a.name || a.id) + `（${a.branchName || "未分店"}）`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select value={sortField} onValueChange={(v) => setSortField(isBillSortField(v) ? v : "createdAt")}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="createdAt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">帳單建立時間</SelectItem>
                    <SelectItem value="billTotal">應收金額</SelectItem>
                    <SelectItem value="paidTotal">已收金額</SelectItem>
                    <SelectItem value="dueTotal">未收金額</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[150px]">
                <div className="text-[11px] text-muted-foreground mb-1">方向</div>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(isBillSortOrder(v) ? v : "desc")}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="desc" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">新→舊 / 大→小</SelectItem>
                    <SelectItem value="asc">舊→新 / 小→大</SelectItem>
                  </SelectContent>
                </Select>
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
                  <th className="py-2 pr-3">已收</th>
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
                    <td className="py-2 pr-3">${formatMoney(r.summary?.paidTotal || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.dueTotal || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.shopAmount || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.artistAmount || 0)}</td>
                    <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                    <td className="py-2 pr-3">
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
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-muted-foreground">
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
              <Select value={viewMode} onValueChange={(v) => setViewMode(v === "ALL" ? "ALL" : "CONSUMPTION")}>
                <SelectTrigger>
                  <SelectValue placeholder="消費（不含儲值）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSUMPTION">消費（不含儲值）</SelectItem>
                  <SelectItem value="ALL">全部（含儲值）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">帳單類型</div>
              <Select value={filterBillType} onValueChange={setFilterBillType}>
                <SelectTrigger>
                  <SelectValue placeholder="全部類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類型</SelectItem>
                  <SelectItem value="APPOINTMENT">預約</SelectItem>
                  <SelectItem value="WALK_IN">現場</SelectItem>
                  <SelectItem value="PRODUCT">商品</SelectItem>
                  <SelectItem value="STORED_VALUE_TOPUP">儲值</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
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
                <label className="text-xs text-muted-foreground">分店 ID（branchId）</label>
                <Input value={newBranchId} onChange={(e) => setNewBranchId(e.target.value)} placeholder="cmhec2wnk0001ogb6s1jmvvdc" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">類型</label>
                <Select value={newBillType} onValueChange={setNewBillType}>
                  <SelectTrigger>
                    <SelectValue placeholder="WALK_IN" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WALK_IN">現場（WALK_IN）</SelectItem>
                    <SelectItem value="OTHER">其他（OTHER）</SelectItem>
                  </SelectContent>
                </Select>
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
                <label className="text-xs text-muted-foreground">刺青師 User.id（可空）</label>
                <Input value={newArtistId} onChange={(e) => setNewArtistId(e.target.value)} placeholder="cmhec2wp8001oogb6a5nyp47n" />
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
                <div className="font-medium mb-2">新增收款 / 退款（負數）</div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="w-40">
                    <label className="text-xs text-muted-foreground">金額</label>
                    <Input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="5000" />
                  </div>
                  <div className="w-44">
                    <label className="text-xs text-muted-foreground">方式</label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="付款方式" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        <th className="py-2 px-3">拆帳（刺青師/店家）</th>
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
                              ${formatMoney(a)} / ${formatMoney(s)}
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
              新增一筆規則（branchId 會自動帶出）。比例以「刺青師%」輸入，店家% 會自動補成 100%。
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-72">
                <label className="text-xs text-muted-foreground">刺青師</label>
                <Select 
                  value={ruleArtistId} 
                  onValueChange={(value) => {
                    setRuleArtistId(value);
                    // 自動填充 branchId
                    const selectedArtist = availableArtists.find(a => a.userId === value);
                    if (selectedArtist) {
                      setRuleBranchId(selectedArtist.branchId);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇刺青師" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableArtists.map((artist) => (
                      <SelectItem key={artist.userId} value={artist.userId}>
                        {artist.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-72">
                <label className="text-xs text-muted-foreground">分店（自動）</label>
                <Input 
                  value={ruleBranchId} 
                  readOnly 
                  disabled
                  className="bg-gray-100"
                  placeholder="選擇刺青師後自動帶出" 
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-muted-foreground">刺青師%</label>
                <Input value={ruleArtistRatePct} onChange={(e) => setRuleArtistRatePct(e.target.value)} />
              </div>
              <Button onClick={onUpsertSplitRule}>新增規則</Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-3">刺青師</th>
                    <th className="py-2 px-3">分店</th>
                    <th className="py-2 px-3">比例（刺青師/店家）</th>
                    <th className="py-2 px-3">生效時間</th>
                  </tr>
                </thead>
                <tbody>
                  {splitRules.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-3">{r.artist?.name || r.artistId}</td>
                      <td className="py-2 px-3">{r.branch?.name || (r.branchId ? r.branchId : "全域")}</td>
                      <td className="py-2 px-3">
                        {Math.round((r.artistRateBps || 0) / 100)}% / {Math.round((r.shopRateBps || 0) / 100)}%
                      </td>
                      <td className="py-2 px-3">{new Date(r.effectiveFrom).toLocaleString()}</td>
                    </tr>
                  ))}
                  {splitRules.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 px-3 text-muted-foreground">
                        尚未設定任何拆帳規則（預設 70/30）
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


