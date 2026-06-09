"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, Gamepad2, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/home",   label: "Home",    icon: Home        },
  { href: "/tasks",  label: "Tasks",   icon: CheckSquare },
  { href: "/games",  label: "Games",   icon: Gamepad2    },
  { href: "/refer",  label: "Refer",   icon: Users       },
  { href: "/profile",label: "Profile", icon: User        },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-50
                    bg-[var(--card-bg)]/95 backdrop-blur-md border-t border-[var(--border)]
                    pb-safe">
      <div className="flex items-center justify-around px-2 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full",
                "transition-colors duration-150 select-none",
                active ? "text-[#7C3AED]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={cn("text-[10px] font-medium", active && "font-bold")}>
                {label}
              </span>
              {active && (
                <span className="absolute -top-px h-0.5 w-6 rounded-full bg-[#7C3AED]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
