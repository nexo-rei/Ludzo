"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HomeIcon, TaskIcon, GamesIcon, ReferralIcon, ProfileIcon } from "@/components/ui/Icons";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/home",    label: "Home",    Icon: HomeIcon    },
  { href: "/tasks",   label: "Tasks",   Icon: TaskIcon    },
  { href: "/games",   label: "Games",   Icon: GamesIcon   },
  { href: "/refer",   label: "Refer",   Icon: ReferralIcon},
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-full max-w-app z-50 px-3">
      <div
        className="flex items-stretch justify-around h-16 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(124,58,237,0.12)",
          boxShadow: "0 4px 32px rgba(124,58,237,0.12), 0 1px 8px rgba(0,0,0,0.06)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-all duration-200 select-none rounded-xl mx-1",
                active ? "text-[#7C3AED]" : "text-[#94A3B8]"
              )}
            >
              {/* Active background pill */}
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-y-2 inset-x-0 rounded-xl"
                  style={{ background: "rgba(124,58,237,0.08)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative z-10">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  style={{ color: active ? "#7C3AED" : "#94A3B8" }}
                />
                {/* Active glow under icon */}
                {active && (
                  <motion.span
                    className="absolute -inset-1 rounded-full blur-sm opacity-30 pointer-events-none"
                    style={{ background: "#7C3AED" }}
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span
                className="relative z-10 text-[9px] font-semibold tracking-wide"
                style={{ color: active ? "#7C3AED" : "#94A3B8" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
