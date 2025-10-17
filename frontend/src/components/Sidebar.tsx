"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import useMediaQuery from "@/hooks/useMediaQuery";
import { clearTokens } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  // 桌機：直接顯示固定側欄
  if (isDesktop) {
    return (
      <aside className="sidebar">
        <div>
          <h1>雕川紋身 CRM</h1>
          <nav>
            <Link href="/admin/dashboard">📊 儀表板</Link>
            <Link href="/admin/members">👥 會員管理</Link>
            <Link href="/admin/orders">🧾 訂單管理</Link>
            <Link href="/admin/appointments">📅 預約管理</Link>
            <Link href="/admin/artists">🎨 刺青師管理</Link>
            <Link href="/admin/services">⚙️ 服務管理</Link>
            <Link href="/admin/contacts">💬 聯絡管理</Link>
          </nav>
        </div>
        <div className="flex flex-col gap-3">
          <ThemeToggle />
          <Link href="/admin/profile" className="text-sm">👤 個人資料</Link>
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
              <div className="flex items-center justify-between mb-2">
                <h1>雕川紋身 CRM</h1>
                <button onClick={onClose} aria-label="關閉" className="text-2xl">✕</button>
              </div>
              <nav className="flex flex-col gap-1">
                <Link href="/admin/dashboard" onClick={onClose}>📊 儀表板</Link>
                <Link href="/admin/members" onClick={onClose}>👥 會員管理</Link>
                <Link href="/admin/orders" onClick={onClose}>🧾 訂單管理</Link>
                <Link href="/admin/appointments" onClick={onClose}>📅 預約管理</Link>
                <Link href="/admin/artists" onClick={onClose}>🎨 刺青師管理</Link>
                <Link href="/admin/services" onClick={onClose}>⚙️ 服務管理</Link>
                <Link href="/admin/contacts" onClick={onClose}>💬 聯絡管理</Link>
              </nav>
              <div className="mt-6 flex flex-col gap-3">
                <ThemeToggle />
                <Link href="/admin/profile" onClick={onClose} className="text-sm">👤 個人資料</Link>
                <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">🚪 登出</button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
