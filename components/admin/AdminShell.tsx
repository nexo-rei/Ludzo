"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";
import LudzoLogo from "@/components/layout/LudzoLogo";
import { ToastContainer } from "@/components/ui/Toast";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ArrowDownCircle,
  ArrowUpCircle,
  Megaphone,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: ReactNode;
  title?: string;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Tasks", href: "/admin/tasks", icon: CheckSquare },
  { label: "Deposits", href: "/admin/deposits", icon: ArrowDownCircle },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpCircle },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
];

export default function AdminShell({ children, title }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("ludzo_admin_token");
    router.push("/admin");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#222]">
        <LudzoLogo size={32} />
        <div>
          <div className="text-sm font-black text-white tracking-tight">LUDZO</div>
          <div className="text-[10px] text-gray-500 font-medium">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => { router.push(href); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-[#7C3AED]/20 text-[#A855F7]"
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
              )}
            >
              <Icon size={16} className={active ? "text-[#7C3AED]" : ""} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />}
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
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex">
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
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <h1 className="text-sm font-bold text-white">{title ?? "Admin"}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-[10px] px-2 py-1 rounded-full bg-[#7C3AED]/20 text-[#A855F7] font-semibold">
              Admin
            </div>
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
