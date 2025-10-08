"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getApiBase } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoggedIn(false);
      return;
    }
    fetch(`${getApiBase()}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Banner Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/tattoo-artist-banner.jpg"
          alt="Professional tattoo artist at work"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6">
        <div className="text-white text-2xl font-bold">
          Tattoo CRM
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            回上一頁
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Hero Text */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            專業刺青
            <br />
            <span className="text-yellow-400">藝術管理</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            現代化的刺青工作室管理系統，讓您的藝術事業更加專業高效
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!loggedIn ? (
              <>
                <a
                  href="/login"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  立即登入
                </a>
                <a
                  href="/register"
                  className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105"
                >
                  註冊帳號
                </a>
                <a
                  href="/booking"
                  className="border-2 border-white/50 text-white/90 hover:bg-white/10 font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300"
                >
                  預約刺青
                </a>
              </>
            ) : (
              <a
                href="/profile"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                前往管理後台
              </a>
            )}
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">預約管理</h3>
              <p className="text-white/80">智能預約系統，輕鬆管理客戶預約時程</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-4">👨‍🎨</div>
              <h3 className="text-xl font-semibold mb-2">刺青師管理</h3>
              <p className="text-white/80">管理刺青師資料、作品集與工作排程</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">財務管理</h3>
              <p className="text-white/80">完整的訂單、付款與分期管理系統</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-white/70">
        <p>&copy; 2025 Tattoo CRM. 專業刺青工作室管理系統</p>
      </footer>
    </div>
  );
}
