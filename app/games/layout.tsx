"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import GamingBottomNav from "@/components/gaming/GamingBottomNav";

interface GamingLayoutProps {
  children: ReactNode;
}

export default function GamingLayout({ children }: GamingLayoutProps) {
  const pathname = usePathname();
  const isGameRoute = pathname.startsWith("/games/game/");

  // Game screen takes over the full viewport — no layout chrome at all
  if (isGameRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen w-full bg-gaming-background text-gaming-foreground overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-gaming-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gaming-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Page content — NO AnimatePresence wrapper (caused blank frame on game route transition) */}
      <main className="relative z-10 pb-24">
        {children}
      </main>

      <GamingBottomNav />
    </div>
  );
}
