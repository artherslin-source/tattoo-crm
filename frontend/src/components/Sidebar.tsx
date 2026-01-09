"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import useMediaQuery from "@/hooks/useMediaQuery";
import { clearTokens } from "@/lib/api";
import { getUserRole, isArtistRole, isBossRole } from "@/lib/access";

type Props = {
  open: boolean;
  onClose: () => void;
};

type NavItem = {
  href: string;
  label: string;
  bossOnly?: boolean;
};

const LS_SETTINGS_OPEN = "adminSidebarSettingsOpen";

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const role = getUserRole();
  const isArtist = isArtistRole(role);
  const isBoss = isBossRole(role);

  const navLinks: NavItem[] = useMemo(() => {
    if (isArtist) {
      return [
        { href: "/admin/dashboard", label: "📊 刺青師工作台" },
        { href: "/admin/calendar", label: "📆 週行程日曆" },
        { href: "/admin/portfolio", label: "🖼️ 作品管理" },
        { href: "/admin/members", label: "👥 會員管理" },
        { href: "/admin/contacts", label: "💬 聯絡管理" },
        { href: "/admin/appointments", label: "📅 預約管理" },
        { href: "/admin/billing", label: "💰 帳務管理" },
        { href: "/admin/notifications", label: "🔔 通知中心" },
      ];
    }
    return [
      { href: "/admin/dashboard", label: "📊 儀表板" },
      { href: "/admin/analytics", label: "📈 統計報表" },
      { href: "/admin/members", label: "👥 會員管理" },
      { href: "/admin/contacts", label: "💬 聯絡管理" },
      { href: "/admin/appointments", label: "📅 預約管理" },
      { href: "/admin/billing", label: "💰 帳務管理" },
    ];
  }, [isArtist]);

  const settingsItems: NavItem[] = useMemo(() => {
    // 設定群組：首頁設定/服務管理/刺青師管理/通知中心/備份管理
    // BOSS-only 仍維持：首頁設定 / 備份管理 / 服務管理
    const items: NavItem[] = [
      { href: "/admin/site/home-hero", label: "🏠 首頁設定", bossOnly: true },
      { href: "/admin/services", label: "⚙️ 服務管理", bossOnly: true },
      { href: "/admin/artists", label: "🎨 刺青師管理" },
      { href: "/admin/notifications", label: "🔔 通知中心" },
      { href: "/admin/system/backup", label: "🗄️ 備份管理", bossOnly: true },
    ];
    return items.filter((it) => !it.bossOnly || isBoss);
  }, [isBoss]);

  const isInSettings = useMemo(() => {
    if (!pathname) return false;
    return (
      pathname === "/admin/site/home-hero" ||
      pathname.startsWith("/admin/site/") ||
      pathname === "/admin/services" ||
      pathname.startsWith("/admin/services/") ||
      pathname === "/admin/system/backup" ||
      pathname.startsWith("/admin/system/backup/")
    );
  }, [pathname]);

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isInSettings) {
      setSettingsOpen(true);
      return;
    }
    try {
      const saved = window.localStorage.getItem(LS_SETTINGS_OPEN);
      if (saved === "1") setSettingsOpen(true);
    } catch {
      // ignore
    }
  }, [isInSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_SETTINGS_OPEN, settingsOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [settingsOpen]);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const renderNav = (opts: { onItemClick?: () => void; className?: string }) => {
    return (
      <nav className={opts.className}>
        {navLinks.map((l) => (
          <Link key={l.href} href={l.href} prefetch={true} onClick={opts.onItemClick}>
            {l.label}
          </Link>
        ))}

        {settingsItems.length > 0 ? (
          <div className="sidebar-group">
            <button
              type="button"
              className="sidebar-group-btn"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <span className="sidebar-group-title">設定</span>
              <span className="sidebar-group-chevron">{settingsOpen ? "▾" : "▸"}</span>
            </button>
            {settingsOpen ? (
              <div className="sidebar-group-items">
                {settingsItems.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    prefetch={true}
                    onClick={opts.onItemClick}
                    style={{ paddingLeft: "1.6rem" }}
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    );
  };

  // 桌機：直接顯示固定側欄
  if (isDesktop) {
    return (
      <aside className="sidebar">
        <div>
          <h1 className="brand-logo">彫川紋身 CRM</h1>
          {renderNav({})}
        </div>
        <div className="flex flex-col gap-3">
          <ThemeToggle />
          <Link href="/profile" className="text-sm">👤 個人資料</Link>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">🚪 登出</button>
        </div>
      </aside>
    );
  }

  // 行動/平板：Drawer
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer-panel"
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h1 className="brand-logo">彫川紋身 CRM</h1>
                <button onClick={onClose} aria-label="關閉" className="text-2xl">✕</button>
              </div>
              {renderNav({ onItemClick: onClose, className: "flex flex-col gap-3" })}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700 flex flex-col gap-4">
                <ThemeToggle />
                <Link href="/profile" onClick={onClose} className="text-sm">👤 個人資料</Link>
                <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">🚪 登出</button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
