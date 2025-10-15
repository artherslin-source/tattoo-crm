"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard,
  Calendar,
  Users,
  Image,
  Bell,
  LogOut,
  Menu,
  X
} from "lucide-react";

const navigation = [
  {
    name: '儀表板',
    href: '/artist/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '我的行程',
    href: '/artist/appointments',
    icon: Calendar,
  },
  {
    name: '顧客資訊',
    href: '/artist/customers',
    icon: Users,
  },
  {
    name: '作品管理',
    href: '/artist/portfolio',
    icon: Image,
  },
  {
    name: '通知中心',
    href: '/artist/notifications',
    icon: Bell,
  },
];

export default function ArtistSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-md"
        >
          {sidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

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
            className={cn(
              "fixed inset-y-0 left-0 w-2/3 bg-white shadow-2xl transform transition-transform duration-[900ms] ease-in-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            {/* 關閉按鈕：在選單內部的右上角 */}
            <div className="absolute top-4 right-4">
              <button
                type="button"
                className="flex items-center justify-center h-10 w-10 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 選單內容 */}
            <div className="flex flex-col h-full pt-5 pb-4 overflow-y-auto">
              {/* Logo/標題 */}
              <div className="flex-shrink-0 flex items-center px-6 mb-8">
                <h1 className="text-2xl font-bold text-gray-900">刺青師後台</h1>
              </div>

              {/* 導航選單 */}
              <nav className="flex-1 px-4 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-3 text-base font-medium rounded-r-md transition-all duration-150 border-l-4",
                        isActive
                          ? "bg-blue-100 text-blue-900 border-blue-600"
                          : "text-gray-700 hover:bg-gray-100 border-transparent"
                      )}
                    >
                      <item.icon className="mr-4 h-6 w-6 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
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

      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64">
        <div className="flex flex-col h-full bg-white shadow-lg">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">刺青師後台</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start"
            >
              <LogOut className="mr-3 h-4 w-4" />
              登出
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
