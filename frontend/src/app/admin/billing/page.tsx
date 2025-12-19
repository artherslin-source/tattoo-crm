"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getJsonWithAuth, postJsonWithAuth, patchJsonWithAuth, ApiError } from "@/lib/api";
import { hasAdminAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type BillStatus = "OPEN" | "SETTLED" | "VOID";

interface BillSummary {
  paidTotal: number;
  dueTotal: number;
}

interface BillRow {
  id: string;
  appointmentId: string;
  status: BillStatus;
  billTotal: number;
  discountTotal: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  };
  customer: { id: string; name: string | null; phone: string | null };
  artist: { id: string; name: string | null } | null;
  branch: { id: string; name: string };
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

const paymentMethods = [
  { value: "CASH", label: "現金" },
  { value: "CARD", label: "刷卡" },
  { value: "TRANSFER", label: "匯款" },
  { value: "STORED_VALUE", label: "儲值扣款" },
  { value: "OTHER", label: "其他" },
];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BillRow[]>([]);
  const [userRole, setUserRole] = useState<string>("");

  const [selected, setSelected] = useState<BillDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payNotes, setPayNotes] = useState("");

  const [discountTotal, setDiscountTotal] = useState<string>("");

  // Split rules (BOSS only)
  const [splitRules, setSplitRules] = useState<SplitRule[]>([]);
  const [ruleArtistId, setRuleArtistId] = useState("");
  const [ruleBranchId, setRuleBranchId] = useState("");
  const [ruleArtistRatePct, setRuleArtistRatePct] = useState("70");

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJsonWithAuth<BillRow[]>("/admin/billing/appointments");
      setRows(data);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "載入帳務清單失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDetail = useCallback(async (appointmentId: string) => {
    try {
      setError(null);
      const data = await getJsonWithAuth<BillDetail>(`/admin/billing/appointments/${appointmentId}`);
      setSelected(data);
      setDiscountTotal(String(data.discountTotal ?? 0));
      setDetailOpen(true);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "載入帳務明細失敗");
    }
  }, []);

  const onRecordPayment = useCallback(async () => {
    if (!selected) return;
    const amount = parseInt(payAmount, 10);
    if (!Number.isFinite(amount) || amount === 0) {
      setError("請輸入正確的收款金額（不可為 0）");
      return;
    }
    try {
      setError(null);
      await postJsonWithAuth(`/admin/billing/appointments/${selected.appointmentId}/payments`, {
        amount,
        method: payMethod,
        notes: payNotes || undefined,
      });
      setPayAmount("");
      setPayNotes("");
      await openDetail(selected.appointmentId);
      await fetchBills();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "收款失敗");
    }
  }, [selected, payAmount, payMethod, payNotes, openDetail, fetchBills]);

  const onUpdateDiscount = useCallback(async () => {
    if (!selected) return;
    const d = parseInt(discountTotal, 10);
    if (!Number.isFinite(d) || d < 0) {
      setError("折扣必須是大於等於 0 的整數");
      return;
    }
    try {
      setError(null);
      await patchJsonWithAuth(`/admin/billing/appointments/${selected.appointmentId}`, { discountTotal: d });
      await openDetail(selected.appointmentId);
      await fetchBills();
    } catch (e) {
      const apiErr = e as ApiError;
      setError(apiErr.message || "更新折扣失敗");
    }
  }, [selected, discountTotal, openDetail, fetchBills]);

  useEffect(() => {
    const role = (typeof window !== "undefined" && localStorage.getItem("userRole")) || "";
    setUserRole(role);
    if (!hasAdminAccess(role)) {
      router.push("/login");
      return;
    }
    fetchBills();
  }, [router, fetchBills]);

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
      setError("請輸入 artistId（User.id）");
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
      await postJsonWithAuth("/admin/billing/split-rules", {
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">帳務管理（預約為帳）</h1>
          <p className="text-sm text-muted-foreground">以預約為主體，記錄多次收款與拆帳</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/orders")}>
          回到訂單（舊）
        </Button>
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
          <Button variant="outline" onClick={fetchBills} disabled={loading}>
            {loading ? "載入中..." : "重新整理"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">預約時間</th>
                  <th className="py-2 pr-3">會員</th>
                  <th className="py-2 pr-3">刺青師</th>
                  <th className="py-2 pr-3">分店</th>
                  <th className="py-2 pr-3">應收</th>
                  <th className="py-2 pr-3">已收</th>
                  <th className="py-2 pr-3">未收</th>
                  <th className="py-2 pr-3">狀態</th>
                  <th className="py-2 pr-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 pr-3">{new Date(r.appointment.startAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">{r.customer?.name || r.customer?.phone || "-"}</td>
                    <td className="py-2 pr-3">{r.artist?.name || "-"}</td>
                    <td className="py-2 pr-3">{r.branch?.name || "-"}</td>
                    <td className="py-2 pr-3">${formatMoney(r.billTotal)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.paidTotal || 0)}</td>
                    <td className="py-2 pr-3">${formatMoney(r.summary?.dueTotal || 0)}</td>
                    <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                    <td className="py-2 pr-3">
                      <Button size="sm" variant="outline" onClick={() => openDetail(r.appointmentId)}>
                        查看
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-muted-foreground">
                      目前沒有帳務資料（請先在預約完成後建立帳務）
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
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

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <label className="text-xs text-muted-foreground">折扣</label>
                  <Input value={discountTotal} onChange={(e) => setDiscountTotal(e.target.value)} />
                </div>
                <Button variant="outline" onClick={onUpdateDiscount}>
                  更新折扣
                </Button>
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
                  <Button onClick={onRecordPayment}>送出</Button>
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
                            <td className="py-2 px-3">{p.method}</td>
                            <td className="py-2 px-3">${formatMoney(p.amount)}</td>
                            <td className="py-2 px-3">
                              ${formatMoney(a)} / ${formatMoney(s)}
                            </td>
                          </tr>
                        );
                      })}
                      {selected.payments.length === 0 && (
                        <tr>
                          <td className="py-4 px-3 text-muted-foreground" colSpan={4}>
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
              新增一筆規則（branchId 留空表示全域）。比例以「刺青師%」輸入，店家% 會自動補成 100%。
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-72">
                <label className="text-xs text-muted-foreground">artistId（User.id）</label>
                <Input value={ruleArtistId} onChange={(e) => setRuleArtistId(e.target.value)} placeholder="cm..." />
              </div>
              <div className="w-72">
                <label className="text-xs text-muted-foreground">branchId（可選）</label>
                <Input value={ruleBranchId} onChange={(e) => setRuleBranchId(e.target.value)} placeholder="cm... 或留空" />
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


