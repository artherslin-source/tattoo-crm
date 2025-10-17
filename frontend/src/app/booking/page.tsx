"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到 /home
    router.replace("/home");
  }, [router]);

  // 顯示載入中，直到重定向完成
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-text-muted-light">正在跳轉到首頁...</p>
      </div>
    </div>
  );
}