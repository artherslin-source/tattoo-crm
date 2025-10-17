"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserRole, getAccessToken } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      router.replace('/');
    } else {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-text-muted-light dark:text-text-muted-dark">載入中...</p>
      </div>
    </div>
  );
}