"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId } from "@/lib/api";

export default function BranchArtistsPage() {
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
          <p className="text-gray-600 dark:text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        分店刺青師管理
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        這是分店刺青師管理頁面。您的分店 ID 是: {userBranchId}
      </p>
      {/* 這裡可以添加刺青師管理功能 */}
    </div>
  );
}
