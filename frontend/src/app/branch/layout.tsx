"use client";

import React, { useEffect, useState, ReactNode } from "react";
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
    name: "管理服務項目",
    href: "/branch/services",
    icon: Settings,
  },
  {
    name: "管理刺青師",
    href: "/branch/artists",
    icon: UserCheck,
  },
  {
    name: "管理會員",
    href: "/branch/members",
    icon: Users,
  },
  {
    name: "管理預約",
    href: "/branch/appointments",
    icon: Calendar,
  },
  {
    name: "管理訂單",
    href: "/branch/orders",
    icon: ShoppingCart,
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
          <p className="text-text-muted-light dark:text-text-muted-dark">驗證分店經理權限中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
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
            className={`fixed inset-y-0 left-0 w-2/3 bg-white shadow-2xl transform transition-transform duration-[900ms] ease-in-out ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* 關閉按鈕：在選單內部的右上角 */}
            <div className="absolute top-4 right-4">
              <button
                type="button"
                className="flex items-center justify-center h-10 w-10 rounded-full text-text-muted-light hover:text-text-secondary-light hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 選單內容 */}
            <div className="flex flex-col h-full pt-5 pb-4 overflow-y-auto">
              {/* Logo/標題 */}
              <div className="flex-shrink-0 flex items-center px-6 mb-8">
                <h1 className="text-2xl font-bold text-text-primary-light">刺青 CRM</h1>
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
                          ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-600'
                          : 'text-text-secondary-light hover:bg-gray-100 border-l-4 border-transparent'
                      } group flex items-center px-4 py-3 text-base font-medium rounded-r-md transition-all duration-150`}
                    >
                      <IconComponent className="mr-4 h-6 w-6 flex-shrink-0" />
                      <span>{item.name}</span>
                    </a>
                  );
                })}
              </nav>

              {/* 登出按鈕 */}
              <div className="px-4 pb-4 border-t border-gray-200 pt-4">
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
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center flex-shrink-0 px-4 py-4">
            <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">刺青 CRM</h1>
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
                      : 'text-text-muted-light dark:text-text-secondary-dark hover:bg-gray-50 dark:hover:bg-gray-700'
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
                  className="px-4 border-r border-gray-200 dark:border-gray-700 text-text-muted-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </button>
                <h2 className="text-lg font-medium text-text-primary-light dark:text-text-primary-dark ml-4">
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
