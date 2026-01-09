"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, patchJsonWithAuth, postJsonWithAuth } from "@/lib/api";
import { isBossRole } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function downloadEncryptedFile(path: string, filenameFallback: string, password: string) {
  const token = getAccessToken();
  if (!token) throw new Error("未登入");

  const res = await fetch(`/api${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "下載失敗");
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename="([^"]+)"/i.exec(cd);
  const filename = match?.[1] || filenameFallback;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

type ExportJobStatus = "queued" | "running" | "ready" | "failed";
type ExportJobResp = {
  jobId: string;
  status: ExportJobStatus;
  filename: string | null;
  error: string | null;
  download: { dlToken: string; expiresAt: number | null } | null;
};

export default function AdminSystemBackupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [secretsPassword, setSecretsPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState("系統維護中");
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  const refreshMaintenance = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use auth wrapper so expired access token can be refreshed automatically.
      const data = await getJsonWithAuth<{ enabled?: boolean; reason?: string }>(`/admin/maintenance`);
      setMaintenanceEnabled(!!data.enabled);
      if (data.reason) setMaintenanceReason(data.reason);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    if (!token || !isBossRole(role)) {
      router.replace("/profile");
      return;
    }
    setReady(true);
    void refreshMaintenance();
  }, [router]);

  if (!ready) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">備份 / 還原（BOSS）</h1>
        <p className="text-sm text-muted-foreground">
          備份包含 DB(Postgres) + uploads(/app/uploads)。還原會覆蓋現有 DB + uploads，並重啟後端服務。
        </p>
      </div>

      {message ? (
        <div className="text-sm text-green-700 border border-green-200 bg-green-50 rounded-md p-3">{message}</div>
      ) : null}
      {error ? <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle>下載加密備份檔（DB + uploads）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="輸入備份密碼（請妥善保存）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            disabled={!password || !!busy}
            onClick={async () => {
              setBusy("export");
              setError(null);
              setMessage(null);
              try {
                // Start async job first; for large files, avoid fetch().blob() which is memory-heavy and unreliable.
                const started = await postJsonWithAuth<{ jobId: string }>(`/admin/backup/export`, { password });
                setExportJobId(started.jobId);
                setMessage("備份產生中…（檔案大時可能需要數分鐘）");

                const startedAt = Date.now();
                const timeoutMs = 60 * 60 * 1000; // 1h

                while (Date.now() - startedAt < timeoutMs) {
                  const st = await getJsonWithAuth<ExportJobResp>(`/admin/backup/export/${started.jobId}`);
                  if (st.status === "failed") throw new Error(st.error || "備份產生失敗");
                  if (st.status === "ready" && st.download?.dlToken) {
                    const dl = `/api/admin/backup/export/${started.jobId}/download?dlToken=${encodeURIComponent(
                      st.download.dlToken
                    )}`;
                    window.location.assign(dl);
                    setMessage("已開始下載備份檔。");
                    return;
                  }
                  await new Promise((r) => window.setTimeout(r, 2500));
                }

                throw new Error("備份產生逾時，請稍後再試");
              } catch (e) {
                setError(e instanceof Error ? e.message : "下載失敗");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "export" ? "產生中..." : "下載備份檔"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>維護模式（BOSS 一鍵啟動/關閉）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            啟動後：除健康檢查與還原端點外，其它 API 會回 503，前端會顯示「系統維護中」畫面。
          </div>
          <Input
            placeholder="維護訊息（選填）"
            value={maintenanceReason}
            onChange={(e) => setMaintenanceReason(e.target.value)}
            disabled={!!busy}
          />
          <div className="flex gap-2">
            <Button
              disabled={!!busy || maintenanceEnabled}
              onClick={async () => {
                setBusy("maintenance-on");
                setError(null);
                setMessage(null);
                try {
                  const token = getAccessToken();
                  if (!token) throw new Error("未登入");
                  await patchJsonWithAuth(`/admin/maintenance`, { enabled: true, reason: maintenanceReason || "系統維護中" });
                  setMaintenanceEnabled(true);
                  setMessage("已啟動維護模式。");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "啟動失敗");
                } finally {
                  setBusy(null);
                }
              }}
            >
              啟動維護模式
            </Button>
            <Button
              variant="outline"
              disabled={!!busy || !maintenanceEnabled}
              onClick={async () => {
                setBusy("maintenance-off");
                setError(null);
                setMessage(null);
                try {
                  const token = getAccessToken();
                  if (!token) throw new Error("未登入");
                  await patchJsonWithAuth(`/admin/maintenance`, { enabled: false });
                  setMaintenanceEnabled(false);
                  setMessage("已關閉維護模式。");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "關閉失敗");
                } finally {
                  setBusy(null);
                }
              }}
            >
              關閉維護模式
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">目前狀態：{maintenanceEnabled ? "維護中" : "正常"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>下載加密 Secrets 檔（跨平台搬遷用）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="輸入加密密碼（建議與備份密碼相同）"
            value={secretsPassword}
            onChange={(e) => setSecretsPassword(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={!secretsPassword || !!busy}
            onClick={async () => {
              setBusy("secrets");
              setError(null);
              setMessage(null);
              try {
                await downloadEncryptedFile("/admin/backup/export-secrets", "tattoo-crm-secrets.env.enc", secretsPassword);
                setMessage("已開始下載 secrets 檔。");
              } catch (e) {
                setError(e instanceof Error ? e.message : "下載失敗");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "secrets" ? "產生中..." : "下載 secrets 檔"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>還原（由工程團隊協助）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            此環境不提供自助還原。若需還原，請聯絡工程團隊並提供：
          </div>
          <ul className="text-sm text-muted-foreground list-disc pl-5">
            <li>備份檔（<code>.zip.enc</code>）</li>
            <li>解密密碼</li>
            <li>（跨平台搬遷時）secrets 檔（<code>.env.enc</code>）</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


