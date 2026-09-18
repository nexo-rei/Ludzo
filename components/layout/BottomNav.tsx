"use client";

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
import { useI18n } from "@/hooks/useI18n";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  // The arena has its own chrome — never render both bars.
  if (pathname.startsWith("/games")) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/home" && href !== "/games/home" && pathname.startsWith(href + "/"));

  const NAV_ITEMS = [
    { href: "/home",       labelKey: "nav_home",    Icon: HomeNavIcon },
    { href: "/tasks",      labelKey: "nav_tasks",   Icon: TasksNavIcon },
    { href: "/games/home", labelKey: "nav_games",   Icon: GamesNavIcon },
    { href: "/refer",      labelKey: "nav_refer",   Icon: UsersIcon },
    { href: "/profile",    labelKey: "nav_profile", Icon: ProfileNavIcon },
  ];

  return (
    <nav className="mobile-navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const label = t(item.labelKey);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("mobile-nav-link", active && "is-active")}>
            {active && <motion.span layoutId="nav-active-pill" className="mobile-nav-indicator" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <item.Icon size={21} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
