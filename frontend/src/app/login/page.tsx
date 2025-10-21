"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON, saveTokens, getJsonWithAuth, ApiError, checkBackendHealth } from "@/lib/api";

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
      // 首先檢查後端服務狀態
      const isBackendHealthy = await checkBackendHealth();
      if (!isBackendHealthy) {
        setError("後端服務暫時無法使用，請稍後再試或聯繫管理員");
        setLoading(false);
        return;
      }
      
      const resp = await postJSON(
        "/auth/login",
        { email, password }
      );
      
      if (!resp.ok) {
        throw new Error((resp.data as { message?: string })?.message || 'Login failed');
      }
      
      const authData = resp.data as { accessToken: string; refreshToken?: string };
      
      // 儲存 tokens
      saveTokens(
        authData.accessToken, 
        authData.refreshToken || '', 
        '', // role 將在下面獲取
        ''  // branchId 將在下面獲取
      );
      
      // 獲取用戶資訊並儲存 role 和 branchId
      try {
        const userData = await getJsonWithAuth<{ role: string; branchId: string }>('/users/me');
        // 更新 role 和 branchId
        if (typeof window !== 'undefined') {
          localStorage.setItem('userRole', userData.role || '');
          localStorage.setItem('userBranchId', userData.branchId || '');
        }
      } catch (userErr) {
        console.error('Failed to fetch user data:', userErr);
        // 即使獲取用戶資訊失敗，也允許登入繼續
      }
      
      // 登入後統一跳轉到首頁
      router.push("/home");
    } catch (err) {
      console.error('Login error:', err);
      const apiErr = err as ApiError;
      setError(apiErr.message || "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* 背景柔光 */}
      <div className="auth-bg-glow" />

      {/* 品牌 LOGO 背景層 */}
      <div className="auth-bg-logo" aria-hidden="true">
        <img 
          src="/images/logo/diaochan-tattoo-logo.png" 
          alt="貂蟬 TATTOO" 
          className="w-full max-w-md opacity-20"
        />
      </div>

      {/* 品牌 SVG 筆刷光暈層 */}
      <div className="auth-bg-svg" aria-hidden="true">
        <svg viewBox="0 0 800 800" role="img">
          <defs>
            {/* 放射性漸層 */}
            <radialGradient id="inkGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%"  stopColor="#60A5FA" stopOpacity="0.85"/>
              <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#111827" stopOpacity="0"/>
            </radialGradient>
            {/* 金屬藍紫描邊漸層 */}
            <linearGradient id="steelBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#93C5FD"/>
              <stop offset="50%" stopColor="#A78BFA"/>
              <stop offset="100%" stopColor="#60A5FA"/>
            </linearGradient>
            {/* 金色高光 */}
            <linearGradient id="goldEdge" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#FDE68A"/>
              <stop offset="100%" stopColor="#F59E0B"/>
            </linearGradient>
          </defs>

          {/* 柔光暈底（提升品牌氛圍） */}
          <circle cx="400" cy="400" r="280" fill="url(#inkGlow)" opacity=".55"/>

          {/* 外層「筆刷環」：不規則手繪感路徑 */}
          <path
            d="M400,120 C580,120 720,260 720,400 C720,540 580,680 400,680 C220,680 100,560 100,420 C100,260 230,180 360,160"
            fill="none"
            stroke="url(#steelBlue)"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".9"
          />

          {/* 內層脈動線：模擬細針走位 */}
          <path
            className="pulse"
            d="M420,180 C560,200 660,300 660,400 C660,510 560,620 420,620 C280,620 200,520 200,420 C200,300 300,220 420,180"
            fill="none"
            stroke="url(#goldEdge)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 玻璃卡片 */}
      <div className="auth-card" role="dialog" aria-labelledby="authTitle">
        <div className="auth-logo login-logo">🌀 雕川紋身 CRM</div>
        <h2 id="authTitle" className="auth-subtitle">登入管理後台</h2>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-500/20 border border-red-500/30 rounded-lg p-3" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
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
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <Link href="/home" className="auth-link">← 返回首頁</Link>
        <Link href="/register" className="auth-link">尚未註冊？建立帳號</Link>
      </div>
    </div>
  );
}


