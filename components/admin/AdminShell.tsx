"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import LudzoLogo from "@/components/layout/LudzoLogo";
import { ToastContainer } from "@/components/ui/Toast";
import { useAdminUser, isModeratorUser } from "@/hooks/useAdminUser";
import {
  ActivityIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  CheckSquareIcon,
  CloseIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MegaphoneIcon,
  MenuIcon,
  OverviewIcon,
  ScrollIcon,
  SettingsNavIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/DuotoneIcons";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: ReactNode;
  title?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: OverviewIcon },
  { label: "Users", href: "/admin/users", icon: UsersIcon },
  { label: "Tasks", href: "/admin/tasks", icon: CheckSquareIcon },
  { label: "Support", href: "/admin/support", icon: LifeBuoyIcon },
  { label: "Deposits", href: "/admin/deposits", icon: ArrowDownCircleIcon },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpCircleIcon },
  { label: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon },
  { label: "Moderators", href: "/admin/moderators", icon: ShieldIcon },
  { label: "System", href: "/admin/system", icon: ActivityIcon },
  { label: "Settings", href: "/admin/settings", icon: SettingsNavIcon },
  { label: "Logs", href: "/admin/logs", icon: ScrollIcon },
];

/** Moderator ko sirf ye sections — baqi sab server-side bhi 403 hain. */
const MODERATOR_ALLOWED = new Set([
  "/admin/dashboard",
  "/admin/users",
  "/admin/support",
  "/admin/withdrawals",
]);

export default function AdminShell({ children, title }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: meLoading, logout } = useAdminUser();
  const isMod = isModeratorUser(user);

  const navItems = isMod ? NAV_ITEMS.filter((i) => MODERATOR_ALLOWED.has(i.href)) : NAV_ITEMS;

  // Moderator URL se allowed section ke bahar jaaye to dashboard pe wapas.
  // (Asli protection API me 403 hai — ye sirf UX.)
  const section = "/" + pathname.split("/").filter(Boolean).slice(0, 2).join("/");
  useEffect(() => {
    if (!meLoading && isMod && !MODERATOR_ALLOWED.has(section)) {
      router.replace("/admin/dashboard");
    }
  }, [meLoading, isMod, section, router]);

  const handleLogout = () => {
    logout();
    router.push("/admin");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#222]">
        <LudzoLogo size={32} />
        <div>
          <div className="text-sm font-black text-white tracking-tight">LUDZO</div>
          <div className={cn("text-[10px] font-medium", isMod ? "text-sky-400" : "text-gray-500")}>
            {isMod ? "Moderator Panel" : "Admin Panel"}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => { router.push(href); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-[#23856C]/20 text-[#63D9B4]"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
              )}
            >
              <Icon size={16} className={active ? "text-[#23856C]" : ""} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#23856C]" />}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#222]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOutIcon size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    // `.selectable` opts the desktop console out of the mini-app long-press
    // hardening (app/workspace.css) so staff can still select IDs and right-click.
    <div className="selectable min-h-screen bg-black flex">
      <ToastContainer />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-[#0a0a0a] border-r border-[#222]">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-56 bg-[#0a0a0a] border-r border-[#222] flex flex-col transition-transform md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#222]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] mr-2"
          >
            {sidebarOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
          <h1 className="text-sm font-bold text-white">{title ?? "Admin"}</h1>
          <div className="ml-auto flex items-center gap-2">
            {user?.username && (
              <span className="hidden sm:inline text-[10px] text-gray-500 font-medium">@{user.username}</span>
            )}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full font-semibold",
                isMod
                  ? "bg-sky-500/20 text-sky-300"
                  : "bg-[#23856C]/20 text-[#63D9B4]"
              )}
            >
              {isMod ? "Moderator" : "Admin"}
            </motion.div>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
