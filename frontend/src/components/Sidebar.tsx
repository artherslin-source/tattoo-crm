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

type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

const LS_OPEN_GROUP_ID = "adminSidebarOpenGroupId";

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const role = getUserRole();
  const isArtist = isArtistRole(role);
  const isBoss = isBossRole(role);

  const groups: NavGroup[] = useMemo(() => {
    if (isArtist) {
      return [
        {
          id: "overview",
          title: "總覽",
          items: [{ href: "/admin/dashboard", label: "📊 刺青師工作台" }],
        },
        {
          id: "schedule",
          title: "預約/排程",
          items: [
            { href: "/admin/calendar", label: "📆 週行程日曆" },
            { href: "/admin/appointments", label: "📅 預約管理" },
          ],
        },
        {
          id: "customers",
          title: "客戶",
          items: [
            { href: "/admin/members", label: "👥 會員管理" },
            { href: "/admin/contacts", label: "💬 聯絡管理" },
          ],
        },
        {
          id: "billing",
          title: "帳務",
          items: [{ href: "/admin/billing", label: "💰 帳務管理" }],
        },
        {
          id: "content",
          title: "內容",
          items: [{ href: "/admin/portfolio", label: "🖼️ 作品管理" }],
        },
        {
          id: "notify",
          title: "通知",
          items: [{ href: "/admin/notifications", label: "🔔 通知中心" }],
        },
      ];
    }

    // Admin/BOSS
    return [
      {
        id: "overview",
        title: "總覽",
        items: [
          { href: "/admin/dashboard", label: "📊 儀表板" },
          { href: "/admin/analytics", label: "📈 統計報表" },
        ],
      },
      {
        id: "schedule",
        title: "預約/排程",
        items: [
          { href: "/admin/appointments", label: "📅 預約管理" },
          { href: "/admin/artists", label: "🎨 刺青師管理" },
        ],
      },
      {
        id: "customers",
        title: "客戶",
        items: [
          { href: "/admin/members", label: "👥 會員管理" },
          { href: "/admin/contacts", label: "💬 聯絡管理" },
          { href: "/admin/notifications", label: "🔔 通知中心" },
        ],
      },
      {
        id: "billing",
        title: "帳務",
        items: [{ href: "/admin/billing", label: "💰 帳務管理" }],
      },
      {
        id: "settings_boss",
        title: "設定（BOSS）",
        items: [
          { href: "/admin/site/home-hero", label: "🏠 首頁設定", bossOnly: true },
          { href: "/admin/services", label: "⚙️ 服務管理", bossOnly: true },
        ],
      },
      {
        id: "system_boss",
        title: "系統（BOSS）",
        items: [{ href: "/admin/system/backup", label: "🗄️ 備份/還原", bossOnly: true }],
      },
    ];
  }, [isArtist]);

  const visibleGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => !it.bossOnly || isBoss),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, isBoss]);

  const findGroupIdForPath = (p: string | null): string | null => {
    if (!p) return null;
    for (const g of visibleGroups) {
      for (const it of g.items) {
        if (p === it.href) return g.id;
        if (p.startsWith(`${it.href}/`)) return g.id;
      }
    }
    return null;
  };

  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  useEffect(() => {
    // Prefer the group containing current page.
    const current = findGroupIdForPath(pathname);
    if (current) {
      setOpenGroupId(current);
      return;
    }

    // Otherwise, fall back to last opened group (if valid), else first group.
    try {
      const saved = window.localStorage.getItem(LS_OPEN_GROUP_ID);
      if (saved && visibleGroups.some((g) => g.id === saved)) {
        setOpenGroupId(saved);
        return;
      }
    } catch {
      // ignore
    }

    setOpenGroupId(visibleGroups[0]?.id ?? null);
  }, [pathname, visibleGroups]);

  useEffect(() => {
    if (!openGroupId) return;
    try {
      window.localStorage.setItem(LS_OPEN_GROUP_ID, openGroupId);
    } catch {
      // ignore
    }
  }, [openGroupId]);

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const renderNav = (opts: { onItemClick?: () => void }) => {
    return (
      <nav>
        {visibleGroups.map((g) => {
          const isOpen = openGroupId === g.id;
          return (
            <div key={g.id} className="sidebar-group">
              <button
                type="button"
                className="sidebar-group-btn"
                aria-expanded={isOpen}
                onClick={() => setOpenGroupId((prev) => (prev === g.id ? null : g.id))}
              >
                <span className="sidebar-group-title">{g.title}</span>
                <span className="sidebar-group-chevron">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen ? (
                <div className="sidebar-group-items">
                  {g.items.map((it) => (
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
          );
        })}
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
              {renderNav({ onItemClick: onClose })}
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
