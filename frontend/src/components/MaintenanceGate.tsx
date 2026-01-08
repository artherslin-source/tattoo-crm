"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type MaintenanceState = {
  enabled: boolean;
  maintenance?: boolean;
};

export default function MaintenanceGate() {
  const router = useRouter();
  const pathname = usePathname();
  const lastRedirectAt = useRef(0);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const res = await fetch("/api/public/maintenance", { method: "GET", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as MaintenanceState | null;
        if (!alive || !data) return;

        const isEnabled = !!data.enabled || (res.status === 503 && (data as any)?.maintenance === true);

        if (isEnabled) {
          // Avoid redirect loops and excessive replaces.
          const now = Date.now();
          if (pathname === "/maintenance") return;
          if (now - lastRedirectAt.current < 1500) return;
          lastRedirectAt.current = now;
          router.replace("/maintenance");
        } else {
          // If maintenance ended and we're on maintenance page, return to home.
          if (pathname === "/maintenance") {
            router.replace("/home");
          }
        }
      } catch {
        // ignore
      }
    };

    check();
    const t = window.setInterval(check, 8000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [router, pathname]);

  return null;
}


