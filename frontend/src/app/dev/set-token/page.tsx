"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens, getUserRole, getUserBranchId } from "@/lib/api";

export default function DevSetTokenPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<string>("設定中…");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      setStatus("Not available.");
      return;
    }
    const accessToken = sp.get("accessToken") || "";
    const refreshToken = sp.get("refreshToken") || "";
    if (!accessToken) {
      setStatus("缺少 accessToken");
      return;
    }

    saveTokens(accessToken, refreshToken);
    // Ensure role/branchId are populated (fallback decode from JWT)
    const role = getUserRole() || "";
    const branchId = getUserBranchId() || "";
    try {
      if (typeof window !== "undefined") {
        if (role) localStorage.setItem("userRole", role);
        if (branchId) localStorage.setItem("userBranchId", branchId);
      }
    } catch {}

    setStatus("✅ Token 已設定，跳轉中…");
    const next = sp.get("next") || "/home";
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <div className="text-sm text-gray-600">{status}</div>
    </div>
  );
}

