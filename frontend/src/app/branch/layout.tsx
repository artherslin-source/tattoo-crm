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
  LogOut,
  Menu,
  X
} from "lucide-react";

const navigationItems = [
  {
    name: "儀表板",
    href: "/branch/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "管理會員",
    href: "/branch/members",
    icon: Users,
  },
  {
    name: "管理刺青師",
    href: "/branch/artists",
    icon: UserCheck,
  },
  {
    name: "管理訂單",
    href: "/branch/orders",
    icon: ShoppingCart,
  },
  {
    name: "管理服務項目",
    href: "/branch/services",
    icon: Settings,
  },
  {
    name: "管理預約",
    href: "/branch/appointments",
    icon: Calendar,
  },
];

interface BranchLayoutProps {
  children: ReactNode;
}

export default function BranchLayout({ children }: BranchLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const userRole = getUserRole();
    const token = getAccessToken();
    
    if (!token || userRole !== 'BRANCH_MANAGER') {
      router.replace('/profile');
      return;
    }
    
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">驗證分店經理權限中...</p>
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

      {/* Main content area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
                  分店管理後台
                </h2>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  登出
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
