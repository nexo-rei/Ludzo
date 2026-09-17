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
  HomeNavIcon,
  TasksNavIcon,
  GamesNavIcon,
  UsersIcon,
  ProfileNavIcon,
} from "@/components/ui/DuotoneIcons";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/home",      label: "Home",    Icon: HomeNavIcon },
  { href: "/tasks",     label: "Tasks",   Icon: TasksNavIcon },
  { href: "/games/home", label: "Games",  Icon: GamesNavIcon },
  { href: "/refer",     label: "Refer",   Icon: UsersIcon },
  { href: "/profile",   label: "Profile", Icon: ProfileNavIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  // The arena has its own chrome — never render both bars.
  if (pathname.startsWith("/games")) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/home" && href !== "/games/home" && pathname.startsWith(href + "/"));

  return (
    <nav className="mobile-navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("mobile-nav-link", active && "is-active")}>
          {active && <motion.span layoutId="nav-active-pill" className="mobile-nav-indicator" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <item.Icon size={21} />
          <span>{item.label}</span>
        </Link>;
      })}
    </nav>
  );
}
