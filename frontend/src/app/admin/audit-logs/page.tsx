"use client";

import { useEffect, useMemo, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuditLogItem = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorName?: string | null;
  actorRole: string | null;
  branchId: string | null;
  branchName?: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  diff: any;
  metadata: any;
  targetUserId?: string | null;
  targetName?: string | null;
};

type AuditLogResponse = { items: AuditLogItem[]; nextCursor: string | null };

type ArtistRow = {
  id: string;
  user?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  branch?: { id: string; name?: string | null } | null;
};

type BranchRow = { id: string; name?: string | null };

function fmt(dt: string) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString("zh-TW");
}

function shortId(id?: string | null, len = 6) {
  const s = (id || "").trim();
  if (!s) return "";
  if (s.length <= len * 2 + 1) return s;
  return `${s.slice(0, len)}…${s.slice(-len)}`;
}

function safeName(parts: Array<string | null | undefined>) {
  for (const p of parts) {
    const s = (p || "").trim();
    if (s) return s;
  }
  return "";
}

function artistOptionLabel(a: ArtistRow): string {
  const who = safeName([a.user?.name, a.user?.phone, a.user?.email]) || shortId(a.user?.id) || "—";
  const branch = (a.branch?.name || "").trim();
  return branch ? `${who}（${branch}）` : who;
}

function toIsoMaybe(local: string): string {
  const s = (local || "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function roleLabel(role?: string | null) {
  const s = (role || "").toUpperCase();
  const map: Record<string, string> = {
    BOSS: "BOSS",
    ARTIST: "刺青師",
  };
  return map[s] || role || "";
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    ARTIST_PROFILE_UPDATE: "更新個人資料",
    PORTFOLIO_CREATE: "新增作品",
    PORTFOLIO_UPDATE: "更新作品",
    PORTFOLIO_DELETE: "刪除作品",
    CHANGE_PASSWORD: "修改密碼",
    ADMIN_ARTIST_UPDATE: "後台更新刺青師資料",

    EXPORT_SERVICES_CSV: "匯出服務 CSV",
    EXPORT_BILLING_XLSX: "匯出帳務報表",
    BACKUP_EXPORT_START: "開始匯出備份",
    BACKUP_EXPORT_DOWNLOAD: "下載備份檔",

    // Artist backoffice (write actions)
    MEMBER_CREATE: "會員：新增",
    MEMBER_TOPUP: "會員：儲值",
    MEMBER_SPEND: "會員：扣款",
    MEMBER_UPDATE: "會員：更新資料",
    MEMBER_SET_PRIMARY_ARTIST: "會員：指派主刺青師",
    MEMBER_RESET_PASSWORD: "會員：重設密碼",
    MEMBER_DELETE: "會員：刪除",

    CONTACT_CREATE: "聯絡單：新增",
    CONTACT_UPDATE: "聯絡單：更新",
    CONTACT_CONVERT_TO_APPOINTMENT: "聯絡單：轉成預約",
    CONTACT_DELETE: "聯絡單：刪除",

    APPOINTMENT_CREATE: "預約：建立",
    APPOINTMENT_UPDATE: "預約：更新",
    APPOINTMENT_UPDATE_STATUS: "預約：更改狀態",
    APPOINTMENT_RESCHEDULE: "預約：改期",
    APPOINTMENT_CANCEL: "預約：取消",
    APPOINTMENT_NO_SHOW: "預約：未到",
    APPOINTMENT_DELETE: "預約：刪除",

    BILL_CREATE: "帳務：建立帳單",
    BILL_UPDATE: "帳務：更新帳單",
    BILL_RECORD_PAYMENT: "帳務：記錄付款",
    BILL_REFUND_TO_STORED_VALUE: "帳務：退款到儲值",
    BILL_DELETE: "帳務：刪除帳單",
    BILL_REBUILD: "帳務：重建帳單",
    BILL_RECOMPUTE_ALLOCATIONS: "帳務：重算拆帳",
  };
  return map[action] || action;
}

function bossSummary(it: AuditLogItem): string {
  const action = (it.action || "").trim();
  const diffObj = it.diff && typeof it.diff === "object" ? it.diff : null;
  const diffKeys = diffObj ? Object.keys(diffObj) : [];

  if (action === "ARTIST_PROFILE_UPDATE") {
    const hasPhoto = diffKeys.some((k) => k.toLowerCase().includes("photourl"));
    if (hasPhoto) return "更新個人資料：更換大頭照";
    const hasBio = diffKeys.some((k) => k.toLowerCase().includes("bio"));
    if (hasBio) return "更新個人資料：修改自我介紹";
    return "更新個人資料";
  }

  if (action === "PORTFOLIO_CREATE") return "作品：新增";
  if (action === "PORTFOLIO_UPDATE") return "作品：更新";
  if (action === "PORTFOLIO_DELETE") return "作品：刪除";

  if (action === "CHANGE_PASSWORD") return "修改密碼";

  if (action.startsWith("MEMBER_")) return actionLabel(action);
  if (action.startsWith("CONTACT_")) return actionLabel(action);
  if (action.startsWith("APPOINTMENT_")) return actionLabel(action);
  if (action.startsWith("BILL_")) return actionLabel(action);

  if (action.startsWith("EXPORT_")) return actionLabel(action);
  if (action.startsWith("BACKUP_")) return actionLabel(action);

  return actionLabel(action);
}

function prettyValue(v: unknown) {
  if (v === null) return "null";
  if (v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function diffLines(diff: any): Array<{ field: string; from: unknown; to: unknown }> {
  if (!diff || typeof diff !== "object") return [];
  const lines: Array<{ field: string; from: unknown; to: unknown }> = [];
  for (const [k, v] of Object.entries(diff)) {
    if (v && typeof v === "object" && "from" in (v as any) && "to" in (v as any)) {
      lines.push({ field: k, from: (v as any).from, to: (v as any).to });
      continue;
    }
    if (Array.isArray(v) && v.length >= 2) {
      lines.push({ field: k, from: v[0], to: v[1] });
      continue;
    }
  }
  return lines;
}

function entityTypeLabel(t?: string | null) {
  const s = (t || "").toUpperCase();
  const map: Record<string, string> = {
    ARTIST: "刺青師",
    USER: "使用者",
    MEMBER: "會員",
    CONTACT: "聯絡單",
    APPOINTMENT: "預約",
    PORTFOLIO_ITEM: "作品",
    BILLING: "帳務",
    BACKUP: "備份",
  };
  return map[s] || t || "";
}

function fieldLabel(field: string) {
  const map: Record<string, string> = {
    "artist.photoUrl": "大頭照",
    "artist.bio": "自我介紹",
    "appointment.status": "預約狀態",
    "appointment.startAt": "預約開始時間",
    "appointment.endAt": "預約結束時間",
    "appointment.notes": "預約備註",
    "contact.status": "聯絡單狀態",
    "contact.ownerArtistId": "負責刺青師",
    "contact.notes": "聯絡備註",
    "member.balance": "儲值餘額",
    "member.totalSpent": "累計消費",
    "member.membershipLevel": "會員等級",
    "user.name": "姓名",
    "user.phone": "手機",
    "user.email": "Email",
    "user.primaryArtistId": "主刺青師",
    "user.status": "帳號狀態",
    "user.role": "角色",
    "bill.status": "帳單狀態",
    "bill.discountTotal": "折扣金額",
    "bill.voidReason": "作廢原因",
  };
  return map[field] || field;
}

function displayTarget(it: AuditLogItem) {
  const name = (it.targetName || "").trim();
  const id = it.targetUserId ? shortId(it.targetUserId) : it.entityId ? shortId(it.entityId) : "";
  const type = entityTypeLabel(it.entityType);
  if (name) return `${name}${type ? `（${type}${id ? `／${id}` : ""}）` : ""}`;
  if (type && id) return `${type}（${id}）`;
  if (type) return type;
  return id || "—";
}

export default function AdminAuditLogsPage() {
  const [artistUserId, setArtistUserId] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");
  const [includeBoss, setIncludeBoss] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    // Default view: only ARTIST. Toggle can include BOSS (and only BOSS).
    params.set("roles", includeBoss ? "ARTIST,BOSS" : "ARTIST");
    if (artistUserId !== "all") params.set("artistUserId", artistUserId);
    if (branchId !== "all") params.set("branchId", branchId);
    const fromIso = toIsoMaybe(fromLocal);
    const toIso = toIsoMaybe(toLocal);
    if (fromIso) params.set("from", fromIso);
    if (toIso) params.set("to", toIso);
    params.set("limit", "50");
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }, [includeBoss, artistUserId, branchId, fromLocal, toLocal, cursor]);

  async function load(reset: boolean) {
    setLoading(true);
    setError(null);
    try {
      const qs = reset ? queryString.replace(/(^|&)cursor=[^&]*/g, "").replace(/^&/, "") : queryString;
      const data = await getJsonWithAuth<AuditLogResponse>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
      if (reset) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (e: any) {
      setError(e?.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 預設時間：近 7 天（到現在）
  useEffect(() => {
    if (fromLocal.trim() || toLocal.trim()) return;
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    setFromLocal(toDatetimeLocalValue(from));
    setToLocal(toDatetimeLocalValue(now));
  }, [fromLocal, toLocal]);

  useEffect(() => {
    async function loadArtistsAndBranches() {
      try {
        const [artistRows, branchRows] = await Promise.all([
          getJsonWithAuth<ArtistRow[]>("/admin/artists"),
          getJsonWithAuth<BranchRow[]>("/branches/accessible").catch(() =>
            getJsonWithAuth<BranchRow[]>("/admin/artists/branches"),
          ),
        ]);
        setArtists(Array.isArray(artistRows) ? artistRows : []);
        setBranches(Array.isArray(branchRows) ? branchRows : []);
      } catch (e) {
        // 不阻止頁面使用：下拉選單可以顯示「全部」即可
        console.error("Failed to load artists/branches", e);
      }
    }
    void loadArtistsAndBranches();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧾 操作歷史（刺青師後台）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>刺青師</Label>
              <Select value={artistUserId} onValueChange={setArtistUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部刺青師" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">全部刺青師</SelectItem>
                  {artists
                    .filter((a) => !!a?.user?.id)
                    .map((a) => (
                      <SelectItem key={a.user!.id} value={a.user!.id}>
                        {artistOptionLabel(a)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>分店</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="全部分店" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">全部分店</SelectItem>
                  {branches
                    .filter((b) => !!b?.id)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {(b.name || "").trim() || shortId(b.id) || "—"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>開始時間</Label>
              <Input type="datetime-local" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>結束時間</Label>
              <Input type="datetime-local" value={toLocal} onChange={(e) => setToLocal(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 select-none">
              <input type="checkbox" checked={includeBoss} onChange={(e) => setIncludeBoss(e.target.checked)} />
              包含 BOSS
            </label>
            <Button
              onClick={() => {
                setCursor(null);
                void load(true);
              }}
              disabled={loading}
            >
              {loading ? "載入中…" : "查詢"}
            </Button>
            {hasMore && (
              <Button variant="outline" onClick={() => void load(false)} disabled={loading}>
                {loading ? "載入中…" : "載入更多"}
              </Button>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>紀錄列表</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-gray-500">目前沒有資料</div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const whoName = (it.actorName || "").trim() || shortId(it.actorUserId);
                const whoRole = roleLabel(it.actorRole);
                const branch = (it.branchName || "").trim() || shortId(it.branchId);
                const whoParts = [whoName].filter(Boolean);
                const whoSub = [whoRole].filter(Boolean);
                const who = whoSub.length ? `${whoParts.join("")}（${whoSub.join(" / ")}）` : whoParts.join("");
                const summary = bossSummary(it);
                const lines = diffLines(it.diff);
                const target = displayTarget(it);

                return (
                  <div key={it.id} className="rounded-lg border p-3 space-y-2">
                    <div className="text-sm text-gray-800">
                      <span className="font-mono">{fmt(it.createdAt)}</span>
                      <span>｜</span>
                      <span>{branch || "-"}</span>
                      <span>｜</span>
                      <span className="font-semibold">{who || "-"}</span>
                      <span>｜</span>
                      <span className="font-semibold">{summary || actionLabel(it.action)}</span>
                    </div>

                    <details className="text-sm">
                      <summary className="cursor-pointer select-none text-gray-700">查看詳細</summary>

                      <div className="mt-2 space-y-3 rounded bg-gray-50 p-3">
                        <div className="text-gray-800">
                          <div className="text-xs text-gray-500">摘要</div>
                          <div className="font-semibold">{summary || actionLabel(it.action)}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-gray-800">
                          <div>
                            <div className="text-xs text-gray-500">時間</div>
                            <div className="font-mono">{fmt(it.createdAt)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">分店</div>
                            <div>{branch || "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">操作者</div>
                            <div>{who || "—"}</div>
                          </div>
                        </div>

                        <div className="text-gray-800">
                          <div className="text-xs text-gray-500">操作對象</div>
                          <div>{target}</div>
                        </div>

                        <div className="text-gray-800">
                          <div className="text-xs text-gray-500">變更內容</div>
                          {lines.length === 0 ? (
                            <div className="text-gray-600">（此操作沒有可顯示的變更欄位）</div>
                          ) : (
                            <div className="space-y-1">
                              {lines.map((l) => (
                                <div key={l.field} className="flex flex-col md:flex-row md:gap-2">
                                  <div className="font-semibold md:w-56 break-words">{fieldLabel(l.field)}</div>
                                  <div className="text-gray-600 break-words">
                                    {prettyValue(l.from)} {" → "} {prettyValue(l.to)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <details className="text-xs">
                          <summary className="cursor-pointer select-none text-gray-600">進階資訊（IP / 裝置）</summary>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
                            <div>
                              <div className="text-xs text-gray-500">IP</div>
                              <div className="font-mono break-all">{it.ip || "—"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">裝置</div>
                              <div className="font-mono break-all">{it.userAgent || "—"}</div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

