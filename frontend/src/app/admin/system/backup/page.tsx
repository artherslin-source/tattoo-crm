"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, patchJsonWithAuth } from "@/lib/api";
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

export default function AdminSystemBackupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [secretsPassword, setSecretsPassword] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [restorePassword2, setRestorePassword2] = useState("");
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState("系統維護中");

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

  const canRestore = useMemo(() => {
    if (!restoreFile) return false;
    if (restoreConfirm !== "RESTORE") return false;
    if (!restorePassword || restorePassword.length < 1) return false;
    if (restorePassword !== restorePassword2) return false;
    return true;
  }, [restoreFile, restoreConfirm, restorePassword, restorePassword2]);

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
                await downloadEncryptedFile("/admin/backup/export", "tattoo-crm-backup.zip.enc", password);
                setMessage("已開始下載備份檔。");
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
          <CardTitle>上傳備份檔並還原（危險）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md p-3">
            還原會「清空並覆蓋」現有 DB + uploads，建議先公告維護時間。完成後後端會自動重啟。
          </div>

          <Input
            type="file"
            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            accept=".enc,.bin,.zip,.zip.enc"
          />
          <Input
            placeholder='輸入 "RESTORE" 以確認'
            value={restoreConfirm}
            onChange={(e) => setRestoreConfirm(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              type="password"
              placeholder="輸入備份密碼"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="再次輸入備份密碼"
              value={restorePassword2}
              onChange={(e) => setRestorePassword2(e.target.value)}
            />
          </div>
          <Button
            variant="destructive"
            disabled={!canRestore || !!busy}
            onClick={async () => {
              if (!restoreFile) return;
              setBusy("restore");
              setError(null);
              setMessage(null);
              try {
                const token = getAccessToken();
                if (!token) throw new Error("未登入");

                const fd = new FormData();
                fd.append("file", restoreFile);
                fd.append("password", restorePassword);
                fd.append("confirm", "RESTORE");

                const res = await fetch(`/api/admin/backup/restore`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  body: fd,
                });
                if (!res.ok) {
                  const text = await res.text().catch(() => "");
                  throw new Error(text || "還原請求失敗");
                }
                setMessage("已開始還原。後端完成後會自動重啟，請稍後重新整理。");
              } catch (e) {
                setError(e instanceof Error ? e.message : "還原失敗");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "restore" ? "啟動中..." : "開始還原（會重啟）"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


