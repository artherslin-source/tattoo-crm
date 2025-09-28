"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getApiBase, clearTokens } from "@/lib/api";

type Me = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role?: string;
  branchId?: string | null;
  createdAt?: string; // registeredAt source (if backend provides)
  lastLogin?: string | null;
  isActive?: boolean; // status source (if backend provides)
  status?: string; // alternative status name if backend provides
  avatar?: string | null;
  member?: {
    totalSpent: number;
    balance: number;
    membershipLevel?: string;
  } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchMe() {
      try {
        const res = await fetch(`${getApiBase()}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }
        const data = (await res.json()) as Me;
        setMe(data);
      } catch (e) {
        setError("取得使用者資訊失敗");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!me) return null;

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  const registeredAt = me.createdAt ? new Date(me.createdAt).toLocaleString() : "N/A";
  const lastLogin = me.lastLogin ? new Date(me.lastLogin).toLocaleString() : "N/A";
  const role = me.role || "N/A";
  const status = typeof me.status === "string" ? me.status : (me.isActive === true ? "Active" : me.isActive === false ? "Inactive" : "Unknown");
  
  // 格式化金額
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "NT$ 0";
    return `NT$ ${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">個人資料</h1>
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-4 mb-6">
          {me.avatar ? (
            <img src={me.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center text-xl font-semibold text-gray-600">
              {me.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div>
            <div className="text-2xl font-semibold">{me.name}</div>
            <div className="text-gray-600 dark:text-gray-300">{me.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">註冊日期</div>
            <div className="font-medium">{registeredAt}</div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">最後登入</div>
            <div className="font-medium">{lastLogin}</div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">角色</div>
            <div className="font-medium">{role}</div>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">狀態</div>
            <div className="font-medium">{status}</div>
          </div>
        </div>

        {/* 財務資訊區塊 */}
        {me.member && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">財務資訊</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">累計消費金額</div>
                <div className="font-bold text-blue-900 dark:text-blue-100 text-lg">{formatCurrency(me.member.totalSpent)}</div>
              </div>
              <div className="rounded-lg border border-orange-200 dark:border-orange-800 p-4 bg-orange-50 dark:bg-orange-900/20">
                <div className="text-xs uppercase tracking-wide text-orange-600 dark:text-orange-400 mb-1">會員等級</div>
                <div className="font-bold text-orange-900 dark:text-orange-100 text-lg">{me.member.membershipLevel || '未設定'}</div>
              </div>
              <div className="rounded-lg border border-purple-200 dark:border-purple-800 p-4 bg-purple-50 dark:bg-purple-900/20">
                <div className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-1">儲值餘額</div>
                <div className="font-bold text-purple-900 dark:text-purple-100 text-lg">{formatCurrency(me.member.balance)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/profile/edit")}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-100 font-medium py-2.5 rounded-lg shadow-sm transition-colors"
          >
            編輯個人資料
          </button>
          <button
            onClick={() => router.push("/profile/change-password")}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-100 font-medium py-2.5 rounded-lg shadow-sm transition-colors"
          >
            修改密碼
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors"
          >
            登出
          </button>
        </div>
      </div>
    </div>
  );
}


