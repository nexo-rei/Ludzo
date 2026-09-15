"use client";

/**
 * LUDZO — main app bottom navigation
 * ─────────────────────────────────────────────────────────────────────────────
 * The gaming hub is now a self-contained route group (/games/*) with its own
 * 3-tab bar (components/gaming/GamingBottomNav.tsx). This bar therefore:
 *
 *   • renders NOTHING on /games/*  → the doubled/overlapping nav bars are gone
 *   • keeps the 5 main-app tabs (Home, Tasks, Games, Refer, Profile)
 *   • sends the Games tab to /games/home (the arena dashboard)
 *
 * The old `isInGamingHub` dual-mode trick (which turned Home/Profile into the
 * gamer screens) was removed — that was the source of the confusing UI.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  TaskIcon,
  GamesIcon,
  ReferralIcon,
  ProfileIcon,
} from "@/components/ui/Icons";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/home",      label: "Home",    Icon: HomeIcon },
  { href: "/tasks",     label: "Tasks",   Icon: TaskIcon },
  { href: "/games/home", label: "Games",  Icon: GamesIcon },
  { href: "/refer",     label: "Refer",   Icon: ReferralIcon },
  { href: "/profile",   label: "Profile", Icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  // The arena has its own chrome — never render both bars.
  if (pathname.startsWith("/games")) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/home" && href !== "/games/home" && pathname.startsWith(href + "/"));

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-full max-w-app z-50 px-3">
      <div
        className={cn(
          "flex items-stretch justify-around h-16 rounded-2xl transition-all duration-300",
          "bg-white/95 border border-purple-500/12 shadow-[0_4px_32px_rgba(124,58,237,0.12),_0_1px_8px_rgba(0,0,0,0.06)]",
          "dark:bg-slate-950/90 dark:border-slate-800"
        )}
        style={{ backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const activeColor = "#7C3AED";
          const inactiveColor = pathname.startsWith("/games") ? "#64748B" : "#94A3B8";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all duration-200 select-none rounded-xl mx-1",
                active ? "text-[var(--active-color)]" : "text-[var(--inactive-color)]"
              )}
              style={{
                "--active-color": activeColor,
                "--inactive-color": inactiveColor,
              } as React.CSSProperties}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-y-2 inset-x-0 rounded-xl"
                  style={{ background: "rgba(124,58,237,0.08)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <div className="relative z-10">
                <item.Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  style={{ color: active ? activeColor : inactiveColor }}
                />
                {active && (
                  <motion.span
                    className="absolute -inset-1 rounded-full blur-sm opacity-30 pointer-events-none"
                    style={{ background: activeColor }}
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              <span
                className="relative z-10 text-[9px] font-semibold tracking-wide"
                style={{ color: active ? activeColor : inactiveColor }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
