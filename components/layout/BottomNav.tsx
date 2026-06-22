"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  TaskIcon,
  GamesIcon,
  ReferralIcon,
  ProfileIcon,
  GamingHomeIcon,
  GamingMatchesIcon,
  GamingPlayIcon,
  GamingProfileIcon,
} from "@/components/ui/Icons";
import { motion } from "framer-motion";
import { useApp } from "@/hooks/useApp";
import { useEffect } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub } = useApp();

  // Route-based check to prevent layout flashes or blank page navigation loops
  // Pathnames /matches and /games are exclusively inside the Gaming Hub.
  // /home and /profile are dual-use and rely on the isInGamingHub state.
  const isGamingTab = ["/matches", "/games"].includes(pathname) || (["/home", "/profile"].includes(pathname) && isInGamingHub);

  // Sync state if user navigated via deep links or address bar
  useEffect(() => {
    if (["/matches", "/games"].includes(pathname) && !isInGamingHub) {
      setIsInGamingHub(true);
    }
  }, [pathname, isInGamingHub, setIsInGamingHub]);

  // Navigation items for the main application
  const MAIN_NAV_ITEMS = [
    { href: "/home",    label: "Home",    Icon: HomeIcon },
    { href: "/tasks",   label: "Tasks",   Icon: TaskIcon },
    { href: "/games",   label: "Games",   Icon: GamesIcon, isGamesEntry: true },
    { href: "/refer",   label: "Refer",   Icon: ReferralIcon },
    { href: "/profile", label: "Profile", Icon: ProfileIcon },
  ];

  // Navigation items for the Gaming Hub
  const GAMING_NAV_ITEMS = [
    { href: "/home",    label: "Home",    Icon: GamingHomeIcon },
    { href: "/matches", label: "Matches", Icon: GamingMatchesIcon },
    { href: "/games",   label: "Play",    Icon: GamingPlayIcon },
    { href: "/profile", label: "Profile", Icon: GamingProfileIcon },
  ];

  const navItems = isGamingTab ? GAMING_NAV_ITEMS : MAIN_NAV_ITEMS;

  const handleNavClick = (e: React.MouseEvent, item: any) => {
    if (!isInGamingHub && item.isGamesEntry) {
      e.preventDefault();
      setIsInGamingHub(true);
      router.push("/home"); // specified: tapping Games opens Gaming Hub Home Page
    }
  };

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-full max-w-app z-50 px-3">
      <div
        className={cn(
          "flex items-stretch justify-around h-16 rounded-2xl transition-all duration-300",
          isGamingTab 
            ? "bg-slate-950/90 border border-purple-500/30 shadow-[0_4px_32px_rgba(168,85,247,0.25)]" 
            : "bg-white/95 border border-purple-500/12 shadow-[0_4px_32px_rgba(124,58,237,0.12),_0_1px_8px_rgba(0,0,0,0.06)] dark:bg-slate-950/90 dark:border-slate-800"
        )}
        style={{
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
        }}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          const activeColor = isGamingTab ? "#A855F7" : "#7C3AED";
          const inactiveColor = isGamingTab ? "#64748B" : "#94A3B8";

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all duration-200 select-none rounded-xl mx-1",
                active ? "text-[var(--active-color)]" : "text-[var(--inactive-color)]"
              )}
              style={{
                "--active-color": activeColor,
                "--inactive-color": inactiveColor,
              } as React.CSSProperties}
            >
              {/* Active background pill */}
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-y-2 inset-x-0 rounded-xl"
                  style={{ 
                    background: isGamingTab 
                      ? "rgba(168,85,247,0.12)" 
                      : "rgba(124,58,237,0.08)" 
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative z-10">
                <item.Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  style={{ color: active ? activeColor : inactiveColor }}
                />
                {/* Active glow under icon */}
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
