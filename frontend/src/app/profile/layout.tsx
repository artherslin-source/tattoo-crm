"use client";

import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { Button } from "@/components/ui/button";
import { Home, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-bold text-gray-900">會員中心</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
          >
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* 左侧导航 - 桌面版 */}
        <div className="hidden lg:block">
          <ProfileSidebar />
        </div>

        {/* 左侧导航 - 移动版 */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-white">
              <ProfileSidebar />
            </div>
          </div>
        )}

        {/* 右侧内容区 */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

