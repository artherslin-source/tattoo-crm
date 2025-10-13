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

  const handleReservationClick = () => {
    if (pathname === "/home") {
      document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/home#booking-form");
    }
  };

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/home')}
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              彫川紋身
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* 預約按鈕 - 所有人都可以看到 */}
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
                {/* 管理後台按鈕 - BOSS 和 BRANCH_MANAGER 才顯示 */}
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

                {/* 刺青師專用按鈕 */}
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

                {/* 我的預約按鈕 - MEMBER 才顯示 */}
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

                {/* 個人資料按鈕 */}
                <button
                  onClick={() => router.push('/profile')}
                  className={`${responsiveButtonBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  個人資料
                </button>

                {/* 登出按鈕 */}
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
                {/* 未登入時顯示登入和註冊按鈕 */}
                <button
                  onClick={() => router.push('/login')}
                  className={`${responsiveButtonBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700`}
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
      </div>
    </header>
  );
}
