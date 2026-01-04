"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import useMediaQuery from "@/hooks/useMediaQuery";
import { clearTokens } from "@/lib/api";
import { getUserRole, isArtistRole } from "@/lib/access";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const role = getUserRole();
  const isArtist = isArtistRole(role);

  const navLinks: Array<{ href: string; label: string }> = isArtist
    ? [
        { href: "/admin/dashboard", label: "📊 刺青師工作台" },
        { href: "/admin/calendar", label: "📆 週行程日曆" },
        { href: "/admin/portfolio", label: "🖼️ 作品管理" },
        { href: "/admin/members", label: "👥 會員管理" },
        { href: "/admin/contacts", label: "💬 聯絡管理" },
        { href: "/admin/appointments", label: "📅 預約管理" },
        { href: "/admin/billing", label: "💰 帳務管理" },
        { href: "/admin/notifications", label: "🔔 通知中心" },
      ]
    : [
        { href: "/admin/dashboard", label: "📊 儀表板" },
        { href: "/admin/analytics", label: "📈 統計報表" },
        { href: "/admin/services", label: "⚙️ 服務管理" },
        { href: "/admin/artists", label: "🎨 刺青師管理" },
        { href: "/admin/members", label: "👥 會員管理" },
        { href: "/admin/contacts", label: "💬 聯絡管理" },
        { href: "/admin/appointments", label: "📅 預約管理" },
        { href: "/admin/billing", label: "💰 帳務管理" },
        { href: "/admin/notifications", label: "🔔 通知中心" },
      ];

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  // 桌機：直接顯示固定側欄
  if (isDesktop) {
    return (
      <aside className="sidebar">
        <div>
          <h1 className="brand-logo">彫川紋身 CRM</h1>
          <nav>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} prefetch={true}>
                {l.label}
              </Link>
            ))}
          </nav>
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
              <nav className="flex flex-col gap-3">
                {navLinks.map((l) => (
                  <Link key={l.href} href={l.href} onClick={onClose} prefetch={true}>
                    {l.label}
                  </Link>
                ))}
              </nav>
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
