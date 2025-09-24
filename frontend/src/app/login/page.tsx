"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson, saveTokens, getJsonWithAuth, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await postJson<{ email: string; password: string }, { accessToken: string; refreshToken?: string }>(
        "/auth/login",
        { email, password }
      );
      
      // 儲存 tokens
      saveTokens(resp);
      
      // 獲取用戶資訊並儲存 role 和 branchId
      try {
        const userData = await getJsonWithAuth('/users/me');
        saveTokens({ role: userData.role, branchId: userData.branchId });
      } catch (userErr) {
        console.error('Failed to fetch user data:', userErr);
      }
      
      router.push("/profile");
    } catch (err) {
      const apiErr = err as ApiError;
      console.error(apiErr);
      setError("登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">登入</h1>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}


