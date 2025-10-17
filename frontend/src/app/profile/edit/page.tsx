"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, patchJsonWithAuth, getApiBase, ApiError } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  branchId: string | null;
  createdAt: string;
  lastLogin: string | null;
  status: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function fetchUser() {
      try {
        const res = await fetch(`${getApiBase()}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed: ${res.status}`);
        }
        const data = (await res.json()) as User;
        setUser(data);
        setName(data.name);
        setPhone(data.phone || "");
        setAvatarUrl(""); // 暫時不顯示現有頭像 URL
      } catch (e) {
        setError("取得使用者資訊失敗");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const updateData: { name?: string; phone?: string | null; avatarUrl?: string } = {};
      if (name !== user?.name) updateData.name = name;
      if (phone !== (user?.phone || "")) updateData.phone = phone || null;
      if (avatarUrl.trim()) updateData.avatarUrl = avatarUrl.trim();

      await patchJsonWithAuth("/users/me", updateData);
      setSuccess("個人資料更新成功！");
      
      // 2秒後跳轉到 profile 頁面
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted-light">載入中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">無法載入使用者資料</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-2xl mb-6 flex justify-end">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          回上一頁
        </button>
      </div>
      <h1 className="text-4xl font-bold mb-8 text-center">編輯個人資料</h1>
      
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
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              姓名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              電話
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
            />
          </div>

          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
              頭像 URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-text-primary-dark"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-text-primary-light dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-text-primary-dark font-medium py-2.5 rounded-lg shadow-sm transition-colors"
            >
              返回個人資料
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
