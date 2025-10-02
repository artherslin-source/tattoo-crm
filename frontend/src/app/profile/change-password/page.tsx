"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, postJsonWithAuth, clearTokens, ApiError } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 前端驗證
    if (newPassword !== confirmPassword) {
      setError("新密碼與確認密碼不一致");
      return;
    }

    if (newPassword.length < 8) {
      setError("新密碼長度至少需要8個字元");
      return;
    }

    setLoading(true);

    try {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      await postJsonWithAuth("/auth/change-password", {
        oldPassword,
        newPassword,
      });

      setSuccess("密碼修改成功！即將跳轉到登入頁面...");
      
      // 清除 token 並跳轉到登入頁面
      setTimeout(() => {
        clearTokens();
        router.push("/login");
      }, 2000);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "修改密碼失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-2xl mb-6 flex justify-end">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          回上一頁
        </button>
      </div>
      <h1 className="text-4xl font-bold mb-8 text-center">修改密碼</h1>
      
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded" role="alert">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded" role="alert">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              舊密碼
            </label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              新密碼
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              minLength={8}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              密碼長度至少需要8個字元
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              確認新密碼
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              minLength={8}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-100 font-medium py-2.5 rounded-lg shadow-sm transition-colors"
            >
              返回個人資料
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? "修改中..." : "修改密碼"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
