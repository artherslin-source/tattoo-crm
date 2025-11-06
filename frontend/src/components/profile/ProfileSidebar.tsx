"use client";

import { usePathname, useRouter } from "next/navigation";
import { User, Calendar, Heart, CreditCard, Star, Settings, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: User, label: "我的資料", href: "/profile" },
  { icon: Calendar, label: "預約紀錄", href: "/profile/appointments" },
  { icon: Heart, label: "收藏作品", href: "/profile/favorites" },
  { icon: CreditCard, label: "付款記錄", href: "/profile/payments" },
  { icon: Star, label: "我的評價", href: "/profile/reviews" },
  { icon: Settings, label: "設定中心", href: "/profile/settings" },
  { icon: Shield, label: "安全與隱私", href: "/profile/security" },
];

export function ProfileSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-blue-700" : "text-gray-500")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 mt-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            登出
          </Button>
        </div>
      </nav>
    </aside>
  );
}

