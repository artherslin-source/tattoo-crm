"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page is deprecated. Redirect to /admin/dashboard
export default function ArtistDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-text-muted-light">正在跳轉...</p>
      </div>
    </div>
  );
}
