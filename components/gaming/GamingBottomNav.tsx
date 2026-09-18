"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArenaHomeIcon, ArenaLudoIcon, ArenaProfileIcon } from "./GamingIcons";
import { useI18n } from "@/hooks/useI18n";

interface Tab {
  labelKey: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; className?: string; active?: boolean }>;
  aliases?: string[];
}

export default function GamingBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  // The live board takes over the whole viewport — no chrome during a match.
  if (pathname.startsWith("/games/game/")) return null;

  const TABS: Tab[] = [
    { labelKey: "nav_home", href: "/games/home", Icon: ArenaHomeIcon },
    { labelKey: "nav_play", href: "/games", Icon: ArenaLudoIcon, aliases: ["/games/play"] },
    { labelKey: "nav_profile", href: "/games/profile", Icon: ArenaProfileIcon, aliases: ["/games/matches"] },
  ];

  const isTabActive = (tab: Tab) =>
    pathname === tab.href ||
    (tab.aliases ?? []).includes(pathname) ||
    (tab.href !== "/games" && pathname.startsWith(tab.href + "/"));

  return (
    <nav
      className="gaming-mobile-nav fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto w-full max-w-app px-3 pb-2.5">
        <div className="relative flex items-stretch justify-around h-[62px] rounded-2xl surface-glass-nav">
          <span className="pointer-events-none absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />

          {TABS.map((tab) => {
            const Icon = tab.Icon;
            const active = isTabActive(tab);
            const label = t(tab.labelKey);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl select-none touch-manipulation"
              >
                {active && (
                  <motion.span
                    layoutId="gaming-nav-pill"
                    className="absolute inset-y-1.5 inset-x-1.5 rounded-xl bg-gradient-to-b from-purple-500/25 to-purple-500/5 border border-purple-400/25"
                    transition={{ type: "spring", stiffness: 480, damping: 34 }}
                  />
                )}

                <motion.span
                  className="relative z-10 flex flex-col items-center gap-1"
                  animate={active ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  <span className={`relative ${active ? "text-purple-300" : "text-slate-500"}`}>
                    <Icon size={22} active={active} />
                    {active && (
                      <motion.span
                        className="absolute -inset-1.5 rounded-full blur-md bg-purple-500/40 pointer-events-none"
                        animate={{ opacity: [0.25, 0.6, 0.25] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold tracking-wider uppercase leading-none ${
                      active ? "text-purple-300" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </motion.span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
