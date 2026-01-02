"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAccessToken, getUserRole, getUserBranchId, clearTokens } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const responsiveButtonBase =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 sm:px-4 sm:py-2 sm:text-sm";

  useEffect(() => {
    const token = getAccessToken();
    const role = getUserRole();
    const branchId = getUserBranchId();
    setIsLoggedIn(!!token);
    setUserRole(role);
    setUserBranchId(branchId);
  }, [pathname]); // 當路由改變時重新檢查

  useEffect(() => {
    setMobileActionsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearTokens();
    setIsLoggedIn(false);
    setUserRole(null);
    setUserBranchId(null);
    router.push('/login');
  };

  const handleAdminClick = () => {
    if (userRole === 'BOSS') {
      router.push('/admin/dashboard');
    } else if (userRole === 'BRANCH_MANAGER') {
      router.push('/branch/dashboard');
    }
  };

  // 如果是登入或註冊頁面，不顯示導航列
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  // 如果是刺青師後台頁面，不顯示導航列（避免與 ArtistLayout 側欄重疊）
  if (pathname.startsWith('/artist')) {
    return null;
  }

  const handleReservationClick = () => {
    if (pathname === "/home") {
      document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/home#booking-form");
    }
  };

  const mobileActionBase =
    "group flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0";

  const toggleMobileActions = () => setMobileActionsOpen((prev) => !prev);

  const handleMobileNavigation = (callback: () => void) => () => {
    setMobileActionsOpen(false);
    callback();
  };

  const handleMobileLogout = () => {
    setMobileActionsOpen(false);
    handleLogout();
  };

  return (
    <header className="border-b border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Desktop layout */}
        <div className="hidden h-16 items-center justify-between sm:flex">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/home')}
              className="brand-logo text-xl font-bold text-text-primary-light transition-colors hover:text-blue-600 dark:text-text-primary-dark dark:hover:text-blue-400"
            >
              彫川紋身
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={handleReservationClick}
              className={`${responsiveButtonBase} border border-transparent bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              立即預約
            </button>

            {isLoggedIn ? (
              <>
                {(userRole === 'BOSS' || userRole === 'BRANCH_MANAGER') && (
                  <button
                    onClick={handleAdminClick}
                    className={`${responsiveButtonBase} border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {userRole === 'BOSS' ? '管理後台' : '分店管理'}
                  </button>
                )}

                {userRole === 'ARTIST' && (
                  <button
                    onClick={() => router.push('/artist/dashboard')}
                    className={`${responsiveButtonBase} border border-transparent bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                    </svg>
                    刺青師後台
                  </button>
                )}

                {userRole === 'MEMBER' && (
                  <button
                    onClick={() => router.push('/appointments')}
                    className={`${responsiveButtonBase} border border-transparent bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    我的預約
                  </button>
                )}

                <button
                  onClick={() => router.push('/profile')}
                  className={`${responsiveButtonBase} border border-gray-300 bg-white text-text-secondary-light hover:bg-gray-50 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-text-secondary-dark dark:hover:bg-neutral-700`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  個人資料
                </button>

                <button
                  onClick={handleLogout}
                  className={`${responsiveButtonBase} border border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  登出
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className={`${responsiveButtonBase} border border-gray-300 bg-white text-text-secondary-light hover:bg-gray-50 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-text-secondary-dark dark:hover:bg-neutral-700`}
                >
                  登入
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className={`${responsiveButtonBase} border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`}
                >
                  註冊
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="py-3 sm:hidden">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4 py-4 text-white shadow-lg transition-all dark:from-neutral-900 dark:via-neutral-900 dark:to-black">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => router.push('/home')}
                  className="brand-logo text-left text-xl font-semibold tracking-wide text-white"
                >
                  彫川紋身
                </button>
                <p
                  className={`mt-1 text-xs text-white/70 transition-all duration-300 ${
                    mobileActionsOpen ? 'opacity-100' : 'opacity-80'
                  }`}
                >
                  精緻刺青體驗，專屬您的客製化旅程
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMobileActionsOpen(false);
                    handleReservationClick();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/60 bg-orange-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  預約
                </button>
                <button
                  onClick={toggleMobileActions}
                  aria-expanded={mobileActionsOpen}
                  aria-controls="mobile-quick-actions"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span className="sr-only">快速操作選單</span>
                  {mobileActionsOpen ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div
              id="mobile-quick-actions"
              className={`mt-3 overflow-hidden transition-all duration-300 ease-out ${
                mobileActionsOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="grid grid-cols-2 gap-3 pt-1">
                {isLoggedIn ? (
                  <>
                    {(userRole === 'BOSS' || userRole === 'BRANCH_MANAGER') && (
                      <button
                        type="button"
                        onClick={handleMobileNavigation(handleAdminClick)}
                        className={`${mobileActionBase} border-white/20 bg-white/10 text-white focus-visible:ring-white/60`}
                      >
                        <span className="flex flex-col text-sm font-medium">
                          {userRole === 'BOSS' ? '管理後台' : '分店管理'}
                          <span className="mt-1 text-xs text-white/60">掌控營運狀態</span>
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:bg-white/25">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </button>
                    )}

                    {userRole === 'ARTIST' && (
                      <button
                        type="button"
                        onClick={handleMobileNavigation(() => router.push('/artist/dashboard'))}
                        className={`${mobileActionBase} border-white/20 bg-white/10 text-white focus-visible:ring-white/60`}
                      >
                        <span className="flex flex-col text-sm font-medium">
                          刺青師後台
                          <span className="mt-1 text-xs text-white/60">管理預約與作品</span>
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:bg-white/25">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                          </svg>
                        </span>
                      </button>
                    )}

                    {userRole === 'MEMBER' && (
                      <button
                        type="button"
                        onClick={handleMobileNavigation(() => router.push('/appointments'))}
                        className={`${mobileActionBase} border-white/20 bg-white/10 text-white focus-visible:ring-white/60`}
                      >
                        <span className="flex flex-col text-sm font-medium">
                          我的預約
                          <span className="mt-1 text-xs text-white/60">查看時程安排</span>
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:bg-white/25">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleMobileNavigation(() => router.push('/profile'))}
                      className={`${mobileActionBase} border-white/20 bg-white/10 text-white focus-visible:ring-white/60`}
                    >
                      <span className="flex flex-col text-sm font-medium">
                        個人資料
                        <span className="mt-1 text-xs text-white/60">更新聯絡資訊</span>
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:bg-white/25">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMobileLogout}
                      className={`${mobileActionBase} border-red-400/40 bg-red-500/10 text-red-100 focus-visible:ring-red-300`}
                    >
                      <span className="flex flex-col text-sm font-medium">
                        安全登出
                        <span className="mt-1 text-xs text-red-200/80">結束本次管理</span>
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-400/20 text-red-100 transition group-hover:bg-red-400/30">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleMobileNavigation(() => router.push('/login'))}
                      className={`${mobileActionBase} border-white/20 bg-white/10 text-white focus-visible:ring-white/60`}
                    >
                      <span className="flex flex-col text-sm font-medium">
                        會員登入
                        <span className="mt-1 text-xs text-white/60">快速預約與管理</span>
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition group-hover:bg-white/25">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMobileNavigation(() => router.push('/register'))}
                      className={`${mobileActionBase} border-blue-400/40 bg-blue-500/20 text-white focus-visible:ring-blue-300`}
                    >
                      <span className="flex flex-col text-sm font-medium">
                        立即加入
                        <span className="mt-1 text-xs text-white/70">成為專屬會員</span>
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/30 text-white transition group-hover:bg-blue-400/40">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
