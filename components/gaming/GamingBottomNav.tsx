"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { HomeIcon, MatchesIcon, PlayIcon, ProfileIcon } from "./GamingIcons";

const TABS = [
  { label: "Home", href: "/games", icon: HomeIcon },
  { label: "Matches", href: "/games/matches", icon: MatchesIcon },
  { label: "Play", href: "/games/play", icon: PlayIcon },
  { label: "Profile", href: "/games/profile", icon: ProfileIcon },
];

export default function GamingBottomNav() {
  const pathname = usePathname();

  // Hide entirely during active game — layout already short-circuits,
  // but this is a belt-and-suspenders guard.
  if (pathname.startsWith("/games/game/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-[480px]">
        <div className="relative bg-gaming-surface/95 backdrop-blur-xl border-t border-gaming-border/50 px-2 py-2">
          <ul className="flex items-center justify-around">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                pathname === tab.href ||
                (tab.href !== "/games" && pathname.startsWith(tab.href + "/"));
              return (
                <li key={tab.href} className="relative flex-1">
                  <Link
                    href={tab.href}
                    className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-colors duration-200 ${
                      isActive
                        ? "text-gaming-primary"
                        : "text-gaming-muted hover:text-gaming-foreground"
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        size={22}
                        active={isActive}
                        className={isActive ? "text-gaming-primary" : ""}
                      />
                      {isActive && (
                        <motion.div
                          layoutId="gaming-active-tab"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gaming-primary rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-semibold tracking-wide ${
                        isActive ? "text-gaming-primary" : "text-gaming-muted"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
