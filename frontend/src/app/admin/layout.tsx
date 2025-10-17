"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAccessToken, getUserRole, clearTokens } from "@/lib/api";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  ShoppingCart, 
  Settings, 
  Calendar,
  MessageSquare,
  LogOut,
  Menu,
  X
} from "lucide-react";

const navigationItems = [
  {
    name: "儀表板",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "管理服務項目",
    href: "/admin/services",
    icon: Settings,
  },
  {
    name: "管理刺青師",
    href: "/admin/artists",
    icon: UserCheck,
  },
  {
    name: "管理會員",
    href: "/admin/members",
    icon: Users,
  },
  {
    name: "管理聯絡通知",
    href: "/admin/contacts",
    icon: MessageSquare,
  },
  {
    name: "管理預約",
    href: "/admin/appointments",
    icon: Calendar,
  },
  {
    name: "管理訂單",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // 初始化 token 和 role
  useEffect(() => {
    const currentToken = getAccessToken();
    const currentRole = getUserRole();
    
    console.log('Admin layout check:', { token: currentToken ? 'Present' : 'Missing', userRole: currentRole });
    
    setToken(currentToken);
    setUserRole(currentRole);
  }, []); // 初始化只執行一次

  // 監聽 token 變化，執行權限驗證
  useEffect(() => {
    if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
      // 不跳轉，讓頁面顯示錯誤信息
      setLoading(false);
      return;
    }
    
    setLoading(false);
  }, [token, userRole]); // 依賴固定的 state

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-on-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-on-dark-muted">驗證管理員權限中...</p>
        </div>
      </div>
    );
  }

  // 如果沒有 token 或權限不足，顯示錯誤頁面
  if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-on-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-on-dark mb-2">
            {!token ? '需要登入' : '權限不足'}
          </h2>
          <p className="text-on-dark-muted mb-6">
            {!token
              ? '請先登入以訪問管理員功能'
              : '您沒有訪問管理員功能的權限'
            }
          </p>
          <div className="space-x-4">
            {!token && (
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                前往登入
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 border border-[var(--line-light)] bg-[var(--paper)] text-on-light rounded-md hover:bg-[color-mix(in_srgb,var(--paper)_85%,#fff)]"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] text-on-dark">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 背景遮罩：黑色、透明度90% */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 transition-opacity duration-[900ms] ease-in-out" 
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* 側邊選單：從左側滑入、寬度佔螢幕的2/3、全屏高、純白色、右側陰影 */}
          <div
            className={`fixed inset-y-0 left-0 w-2/3 bg-[var(--paper)] text-on-light shadow-2xl transform transition-transform duration-[900ms] ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* 關閉按鈕：在選單內部的右上角 */}
            <div className="absolute top-4 right-4">
              <button
                type="button"
                className="flex items-center justify-center h-10 w-10 rounded-full text-on-light-subtle hover:text-on-light focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-[color-mix(in_srgb,var(--paper)_85%,#fff)]"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 選單內容 */}
            <div className="flex flex-col h-full pt-5 pb-4 overflow-y-auto">
              {/* Logo/標題 */}
              <div className="flex-shrink-0 flex items-center px-6 mb-8">
                <h1 className="text-2xl font-bold text-on-light">刺青 CRM</h1>
              </div>

              {/* 導航選單 */}
              <nav className="flex-1 px-4 space-y-2">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`${
                        isActive
                          ? 'border-l-4 border-blue-500 bg-[color-mix(in_srgb,#2563eb_18%,var(--paper))] text-on-light'
                          : 'border-l-4 border-transparent text-on-light-muted hover:bg-[color-mix(in_srgb,var(--paper)_88%,#000)]'
                      } group flex items-center px-4 py-3 text-base font-medium rounded-r-md transition-all duration-150`}
                    >
                      <IconComponent className="mr-4 h-6 w-6 flex-shrink-0" />
                      <span>{item.name}</span>
                    </a>
                  );
                })}
              </nav>

              {/* 登出按鈕 */}
              <div className="px-4 pb-4 border-t border-[var(--line-light)] pt-4">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-md transition-all duration-150"
                >
                  <LogOut className="mr-4 h-6 w-6 flex-shrink-0" />
                  <span>登出</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-[var(--panel)] border-r border-[var(--line)] text-on-dark">
          <div className="flex items-center flex-shrink-0 px-4 py-4">
            <h1 className="text-xl font-bold text-on-dark">刺青 CRM</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-[color-mix(in_srgb,#2563eb_16%,var(--panel))] text-on-dark'
                      : 'text-on-dark-muted hover:bg-[color-mix(in_srgb,var(--panel)_82%,#000)]'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
                >
                  <IconComponent className="mr-3 h-6 w-6" />
                  {item.name}
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content area - this is the scrolling container */}
      <main className="lg:pl-64 flex-1 overflow-y-auto">
        {/* Header - now inside the scrolling container with sticky positioning */}
        <header className="sticky top-0 z-20 bg-[color-mix(in_srgb,var(--panel)_92%,#000)] backdrop-blur shadow-sm border-b border-[var(--line)]">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <button
                  type="button"
                  className="px-4 border-r border-[var(--line)] text-on-dark-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </button>
                <h2 className="text-lg font-medium text-on-dark ml-4">
                  管理後台
                </h2>
              </div>
            </div>
          </div>
        </header>

        {/* Page content - no need for overflow-y-auto here since main has it */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}