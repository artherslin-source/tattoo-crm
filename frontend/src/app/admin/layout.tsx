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
    name: "管理預約",
    href: "/admin/appointments",
    icon: Calendar,
  },
  {
    name: "管理聯絡通知",
    href: "/admin/contacts",
    icon: MessageSquare,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">驗證管理員權限中...</p>
        </div>
      </div>
    );
  }

  // 如果沒有 token 或權限不足，顯示錯誤頁面
  if (!token || (userRole !== 'BOSS' && userRole !== 'BRANCH_MANAGER')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {!token ? '需要登入' : '權限不足'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
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
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">刺青 CRM</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    >
                      <IconComponent className="mr-4 h-6 w-6" />
                      {item.name}
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center flex-shrink-0 px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">刺青 CRM</h1>
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
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
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
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <button
                  type="button"
                  className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </button>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white ml-4">
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