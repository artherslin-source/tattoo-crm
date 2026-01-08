"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type MaintenanceState = {
  enabled: boolean;
  message: string;
  since: string | null;
};

export default function MaintenancePage() {
  const router = useRouter();
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = async () => {
    try {
      setChecking(true);
      const res = await fetch("/api/public/maintenance", { method: "GET", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as MaintenanceState | null;
      if (data) setState(data);
      if (data && !data.enabled) {
        router.replace("/home");
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 5000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-xl border bg-white p-8 shadow-sm text-center space-y-4">
        <div className="text-2xl font-bold">系統維護中</div>
        <div className="text-sm text-gray-600">
          {state?.message || "系統正在維護，請稍後再試。"}
        </div>
        {state?.since ? <div className="text-xs text-gray-500">開始時間：{new Date(state.since).toLocaleString()}</div> : null}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" onClick={refresh} disabled={checking}>
            {checking ? "檢查中..." : "重新檢查"}
          </Button>
          <Button onClick={() => router.replace("/home")}>回首頁</Button>
        </div>
      </div>
    </div>
  );
}


