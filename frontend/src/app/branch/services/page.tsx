"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId } from "@/lib/api";

export default function BranchServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    const branchId = getUserBranchId();

    if (!token || role !== 'BRANCH_MANAGER') {
      router.replace('/profile');
      return;
    }

    setUserBranchId(branchId);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-text-muted-light dark:text-text-muted-dark">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
        分店服務項目管理
      </h1>
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
        這是分店服務項目管理頁面。您的分店 ID 是: {userBranchId}
      </p>
      {/* 這裡可以添加服務項目管理功能 */}
    </div>
  );
}
