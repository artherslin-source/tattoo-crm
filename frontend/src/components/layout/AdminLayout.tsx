"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import useMediaQuery from "@/hooks/useMediaQuery";
import useIsIpad from "@/hooks/useIsIpad";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isIpad = useIsIpad();
  const [isDark, setIsDark] = useState(false);

  // 監聽主題變化，同步 dark 類別到 admin-layout
  useEffect(() => {
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      setIsDark(htmlElement.classList.contains('dark'));
    };

    // 初始檢查
    checkTheme();

    // 監聽 class 變化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`admin-layout${isDark ? ' dark' : ''}`}>
      {/* 左側 Sidebar / Drawer */}
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {/* 內容側 */}
      <div className="flex-1 min-w-0">
        {/* 行動/平板頂欄；iPad（含橫向）也需要 topbar 以開啟 drawer */}
        {(!isDesktop || isIpad) && (
          <header className="topbar">
            <button aria-label="開啟側欄" onClick={() => setOpen(true)} className="text-2xl">☰</button>
            <div className="font-bold">後台管理</div>
            <ThemeToggle />
          </header>
        )}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
