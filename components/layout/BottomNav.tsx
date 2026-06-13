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
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-50 pb-safe"
      style={{
        background: "rgba(15,23,42,0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(124,58,237,0.15)",
      }}
    >
      <div className="flex items-stretch justify-around h-16">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 transition-colors duration-150 select-none",
                active ? "text-[#A855F7]" : "text-[#475569] hover:text-[#64748B]"
              )}
            >
              {/* Active top bar */}
              {active && (
                <motion.span
                  layoutId="nav-active-bar"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg, #7C3AED, #A855F7)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                className={active ? "text-[#A855F7]" : "text-[#475569]"}
              />
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide",
                  active ? "font-bold text-[#A855F7]" : "text-[#475569]"
                )}
              >
                {label}
              </span>
              {/* Active glow dot */}
              {active && (
                <motion.span
                  layoutId="nav-active-dot"
                  className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#7C3AED]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
