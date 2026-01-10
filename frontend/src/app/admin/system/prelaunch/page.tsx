"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getJsonWithAuth, postJsonWithAuth } from "@/lib/api";
import { isBossRole } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DryRunResp = {
  done?: boolean;
  planned?: {
    artistPhones?: Array<{ name: string; phone: string | null }>;
    wipeCounts?: Record<string, number>;
    zhu?: any;
  };
  artistMatches?: Record<string, any[]>;
  requires?: { env?: { NODE_ENV?: string; PRELAUNCH_RESET_SECRET?: boolean } };
};

type ZhuFixResp = {
  accounts?: any;
  linkExists?: boolean;
  access?: any;
  moveCounts?: Record<string, number>;
};

export default function AdminSystemPrelaunchPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [dryRun, setDryRun] = useState<DryRunResp | null>(null);
  const [zhuFix, setZhuFix] = useState<ZhuFixResp | null>(null);
  const [secret, setSecret] = useState("");
  const [confirm, setConfirm] = useState("");
  const [zhuConfirm, setZhuConfirm] = useState("");

  const canApply = useMemo(() => {
    if (!secret) return false;
    if (confirm !== "RESET") return false;
    if (dryRun?.done) return false;
    return true;
  }, [secret, confirm, dryRun?.done]);

  const refresh = async () => {
    setBusy("dry");
    setError(null);
    try {
      const data = await getJsonWithAuth<DryRunResp>(`/admin/system/prelaunch-reset/dry-run`);
      setDryRun(data);
      const z = await getJsonWithAuth<ZhuFixResp>(`/admin/system/prelaunch-reset/zhu-fix/dry-run`);
      setZhuFix(z);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取 dry-run 失敗");
    } finally {
      setBusy(null);
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
    void refresh();
  }, [router]);

  if (!ready) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">交付前重置（BOSS）</h1>
        <p className="text-sm text-muted-foreground">
          這個操作會更新刺青師登入手機/密碼，並清空會員/聯絡/預約/帳務/通知資料。執行後不可重複。
        </p>
      </div>

      {message ? (
        <div className="text-sm text-green-700 border border-green-200 bg-green-50 rounded-md p-3">{message}</div>
      ) : null}
      {error ? <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">{error}</div> : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Dry-run 預覽</CardTitle>
          <Button variant="outline" disabled={!!busy} onClick={refresh}>
            {busy === "dry" ? "載入中..." : "重新整理"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-md border px-3 py-2">
              狀態：{dryRun?.done ? <span className="text-red-600 font-semibold">已執行（不可重複）</span> : <span className="text-green-700 font-semibold">尚未執行</span>}
            </div>
            <div className="rounded-md border px-3 py-2">
              NODE_ENV：<span className="font-mono">{dryRun?.requires?.env?.NODE_ENV ?? "-"}</span>
            </div>
            <div className="rounded-md border px-3 py-2">
              PRELAUNCH_RESET_SECRET：{dryRun?.requires?.env?.PRELAUNCH_RESET_SECRET ? "已設定" : "未設定"}
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">將更新的刺青師手機（密碼統一 12345678）</div>
            <ul className="list-disc pl-5 space-y-1">
              {(dryRun?.planned?.artistPhones ?? []).map((a) => (
                <li key={a.name}>
                  {a.name}：<span className="font-mono">{a.phone ?? "-"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-semibold mb-2">將清空的資料筆數（預覽）</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(dryRun?.planned?.wipeCounts ?? {}).map(([k, v]) => (
                <div key={k} className="rounded-md border px-3 py-2 flex items-center justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">朱川進狀態（預覽）</div>
            <pre className="text-xs bg-muted/30 border rounded-md p-3 overflow-auto max-h-48">
              {JSON.stringify(dryRun?.planned?.zhu ?? null, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>朱川進修復（可重複）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="text-sm text-muted-foreground">
            用於「東港登入 + 三重保留身分」：建立 link、移除（已合併停用）字樣、並依 branchId 把既有資料歸回三重身分。
          </div>
          <pre className="text-xs bg-muted/30 border rounded-md p-3 overflow-auto max-h-64">
            {JSON.stringify(zhuFix ?? null, null, 2)}
          </pre>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder='輸入 "FIX_ZHU" 以確認'
              value={zhuConfirm}
              onChange={(e) => setZhuConfirm(e.target.value)}
              disabled={!!busy}
            />
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={async () => {
                setBusy("zhu-dry");
                setError(null);
                try {
                  const z = await getJsonWithAuth<ZhuFixResp>(`/admin/system/prelaunch-reset/zhu-fix/dry-run`);
                  setZhuFix(z);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "讀取 Zhu dry-run 失敗");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "zhu-dry" ? "載入中..." : "重新整理（Zhu）"}
            </Button>
          </div>
          <Button
            variant="destructive"
            disabled={!!busy || !secret || zhuConfirm !== "FIX_ZHU"}
            onClick={async () => {
              setBusy("zhu-apply");
              setError(null);
              setMessage(null);
              try {
                await postJsonWithAuth(`/admin/system/prelaunch-reset/zhu-fix/apply`, {
                  confirm: "FIX_ZHU",
                  secret,
                });
                setMessage("朱川進修復已套用完成。請重新登入朱川進驗證分店切換與資料歸屬。");
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "朱川進修復失敗");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "zhu-apply" ? "修復中..." : "套用朱川進修復"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>執行（危險）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md p-3">
            這會在 production 直接修改資料庫。請先確認上方 dry-run 預覽正確。
          </div>
          <Input
            placeholder="輸入 PRELAUNCH_RESET_SECRET"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            disabled={!!busy || !!dryRun?.done}
          />
          <Input
            placeholder='輸入 "RESET" 以確認'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!!busy || !!dryRun?.done}
          />
          <Button
            variant="destructive"
            disabled={!!busy || !canApply}
            onClick={async () => {
              setBusy("apply");
              setError(null);
              setMessage(null);
              try {
                const resp = await postJsonWithAuth<{ ok: boolean; summary?: unknown }>(
                  `/admin/system/prelaunch-reset/apply`,
                  { confirm: "RESET", secret }
                );
                setMessage("已執行完成。請重新登入刺青師帳號驗證。");
                // refresh dry-run state
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "執行失敗");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "apply" ? "執行中..." : "執行重置"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


