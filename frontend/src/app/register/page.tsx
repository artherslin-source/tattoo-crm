"use client";
import Link from "next/link";
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
      const resp = await postJSON<{ accessToken: string; refreshToken?: string }>(
        "/auth/register", 
        { email, password, name }
      );
      
      if (!resp.ok) {
        throw new Error((resp.data as { message?: string })?.message || 'Registration failed');
      }
      
      const authData = resp.data as { accessToken: string; refreshToken?: string };
      
      // 儲存 tokens
      saveTokens(
        authData.accessToken,
        authData.refreshToken || '',
        '', // role 將在下面獲取
        ''  // branchId 將在下面獲取
      );
      
      // 獲取用戶資訊並儲存 role
      try {
        const userData = await getJsonWithAuth<{ role: string; branchId?: string }>('/users/me');
        // 更新 role 和 branchId
        saveTokens(
          authData.accessToken,
          authData.refreshToken || '',
          userData.role,
          userData.branchId || ''
        );
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
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-bg-logo" aria-hidden="true">
        <svg viewBox="0 0 800 800">
          <defs>
            <radialGradient id="inkGlow2" cx="50%" cy="50%" r="60%">
              <stop offset="0%"  stopColor="#93C5FD" stopOpacity="0.8"/>
              <stop offset="55%" stopColor="#C084FC" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#111827" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="steelBlue2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#93C5FD"/>
              <stop offset="50%" stopColor="#A78BFA"/>
              <stop offset="100%" stopColor="#60A5FA"/>
            </linearGradient>
          </defs>
          <circle cx="400" cy="400" r="260" fill="url(#inkGlow2)" opacity=".55"/>
          <path
            d="M380,140 C570,150 700,270 700,400 C700,540 560,680 390,670 C220,660 120,540 120,420 C120,300 250,200 380,140"
            fill="none"
            stroke="url(#steelBlue2)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".9"
          />
        </svg>
      </div>

      <div className="auth-card" role="dialog" aria-labelledby="registerTitle">
        <div className="auth-logo login-logo">🌀 雕川紋身 CRM</div>
        <h2 id="registerTitle" className="auth-subtitle">建立您的後台帳號</h2>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg p-3" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="姓名"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="姓名"
          />
          <input
            type="email"
            placeholder="Email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <input
            type="password"
            placeholder="密碼"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            aria-label="密碼"
          />
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <Link href="/login" className="auth-link">已有帳號？返回登入</Link>
      </div>
    </div>
  );
}


