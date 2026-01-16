"use client";

import { useEffect, useMemo, useState } from "react";
import { getJsonWithAuth } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

function roleLabel(role?: string | null) {
  const s = (role || "").toUpperCase();
  const map: Record<string, string> = {
    BOSS: "BOSS",
    ADMIN: "管理員",
    ARTIST: "刺青師",
    USER: "使用者",
  };
  return map[s] || role || "";
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    UPDATE_ME: "更新個人資料",
    ARTIST_CREATE: "新增刺青師",
    ARTIST_UPDATE: "更新刺青師",
    ARTIST_PORTFOLIO_ADD: "新增作品",
    ARTIST_PORTFOLIO_UPDATE: "更新作品",
    ARTIST_PORTFOLIO_DELETE: "刪除作品",

    ADMIN_SERVICE_SET_ACTIVE: "調整服務啟用狀態",
    ADMIN_SERVICE_EXPORT_CSV: "匯出服務 CSV",
    ADMIN_BILL_EXPORT_XLSX: "匯出帳單 XLSX",
    ADMIN_BILL_CREATE_MANUAL: "建立手動帳單",

    BACKUP_EXPORT_START: "開始匯出備份",
    BACKUP_DOWNLOAD: "下載備份檔",
  };
  return map[action] || action;
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

export default function AdminAuditLogsPage() {
  const [artistUserId, setArtistUserId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (artistUserId.trim()) params.set("artistUserId", artistUserId.trim());
    if (action.trim()) params.set("action", action.trim());
    if (from.trim()) params.set("from", from.trim());
    if (to.trim()) params.set("to", to.trim());
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "50");
    if (cursor) params.set("cursor", cursor);
    return params.toString();
  }, [artistUserId, action, from, to, q, cursor]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧾 操作歷史（刺青師帳號）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>刺青師 userId</Label>
              <Input value={artistUserId} onChange={(e) => setArtistUserId(e.target.value)} placeholder="可留空" />
            </div>
            <div className="space-y-2">
              <Label>事件 action</Label>
              <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="例：ARTIST_PROFILE_UPDATE" />
            </div>
            <div className="space-y-2">
              <Label>開始時間 from</Label>
              <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01-01 或 ISO" />
            </div>
            <div className="space-y-2">
              <Label>結束時間 to</Label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-01-31 或 ISO" />
            </div>
            <div className="space-y-2">
              <Label>關鍵字 q</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="action/entityId/actorUserId…" />
            </div>
          </div>

          <div className="flex gap-2">
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
                const whoSub = [whoRole, branch].filter(Boolean);
                const who = whoSub.length ? `${whoParts.join("")}（${whoSub.join(" / ")}）` : whoParts.join("");

                const what = actionLabel(it.action);

                const targetName = (it.targetName || "").trim();
                const targetId = it.targetUserId ? shortId(it.targetUserId) : "";
                const target =
                  targetName ? `${targetName}${targetId ? `（${targetId}）` : ""}` : targetId || (it.entityId ? shortId(it.entityId) : "");

                const lines = diffLines(it.diff);

                return (
                  <div key={it.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono">{fmt(it.createdAt)}</span>
                      <span className="font-semibold">{who || "-"}</span>
                      <span className="text-gray-500">·</span>
                      <span className="font-semibold">{what}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-700">目標：{target || it.entityType || "-"}</span>

                      <span className="px-2 py-0.5 rounded bg-gray-100">{it.action}</span>
                      {it.branchName || it.branchId ? (
                        <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">分店：{branch}</span>
                      ) : null}
                      {it.entityType ? <span className="px-2 py-0.5 rounded bg-gray-50">實體：{it.entityType}</span> : null}
                      <span className="px-2 py-0.5 rounded bg-gray-50">ID：{shortId(it.id)}</span>
                    </div>

                    {lines.length ? (
                      <div className="text-xs text-gray-700 space-y-1">
                        {lines.map((l) => (
                          <div key={l.field} className="flex flex-col md:flex-row md:gap-2">
                            <div className="font-semibold md:w-56 break-words">{l.field}</div>
                            <div className="text-gray-600 break-words">
                              {prettyValue(l.from)} {" → "} {prettyValue(l.to)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <details className="text-xs">
                      <summary className="cursor-pointer select-none text-gray-700">查看詳細（原始 diff / metadata）</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-50 rounded p-2 overflow-auto">
                        {JSON.stringify({ diff: it.diff, metadata: it.metadata, ip: it.ip, userAgent: it.userAgent }, null, 2)}
                      </pre>
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

