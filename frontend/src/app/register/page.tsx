"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON, saveTokens, getJsonWithAuth, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await postJSON<
        { email: string; password: string; name: string },
        { accessToken: string; refreshToken?: string }
      >("/auth/register", { email, password, name });
      
      // 儲存 tokens
      saveTokens(resp);
      
      // 獲取用戶資訊並儲存 role
      try {
        const userData = await getJsonWithAuth<{ role: string }>('/users/me');
        saveTokens({ role: userData.role });
      } catch (userErr) {
        console.error('Failed to fetch user data:', userErr);
      }
      
      router.push("/profile");
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr);
      setError("註冊失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">註冊</h1>
        {error && (
          <div className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm">Email</label>
            <input
              id="email"
              type="email"
              className="border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm">Password</label>
            <input
              id="password"
              type="password"
              className="border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm">名稱</label>
            <input
              id="name"
              type="text"
              className="border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
          >
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>
        
        {/* 返回首頁按鈕 - 位於註冊按鈕下方中央 */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => router.push('/booking')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            返回首頁
          </button>
        </div>
      </div>
    </div>
  );
}


