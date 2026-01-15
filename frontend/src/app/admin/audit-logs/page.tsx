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
  actorRole: string | null;
  branchId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  diff: any;
  metadata: any;
};

type AuditLogResponse = { items: AuditLogItem[]; nextCursor: string | null };

function fmt(dt: string) {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString("zh-TW");
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
              {items.map((it) => (
                <div key={it.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono">{fmt(it.createdAt)}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100">{it.action}</span>
                    {it.actorRole && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">{it.actorRole}</span>}
                    {it.branchId && <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">{it.branchId}</span>}
                    {it.entityType && <span className="px-2 py-0.5 rounded bg-gray-50">{it.entityType}</span>}
                    {it.entityId && <span className="font-mono text-xs text-gray-600">{it.entityId}</span>}
                  </div>
                  <div className="text-xs text-gray-600">
                    actorUserId: <span className="font-mono">{it.actorUserId || "-"}</span>{" "}
                    {it.ip ? (
                      <>
                        | ip: <span className="font-mono">{it.ip}</span>
                      </>
                    ) : null}
                  </div>
                  {(it.diff || it.metadata) && (
                    <details className="text-xs">
                      <summary className="cursor-pointer select-none text-gray-700">查看詳細（diff / metadata）</summary>
                      <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-50 rounded p-2 overflow-auto">
                        {JSON.stringify({ diff: it.diff, metadata: it.metadata }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

