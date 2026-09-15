"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import GamingBottomNav from "@/components/gaming/GamingBottomNav";
import { ToastContainer } from "@/components/ui/Toast";

interface GamingLayoutProps {
  children: ReactNode;
}

/**
 * Gaming Hub shell — applies to every /games/* route.
 *
 * • /games/game/[roomId] takes over the whole viewport (no chrome at all).
 * • Everything else gets the arena background + the 3-tab hub nav.
 * • The main app BottomNav renders nothing on /games/* so there is never a
 *   doubled / overlapping navigation bar again.
 */
export default function GamingLayout({ children }: GamingLayoutProps) {
  const pathname = usePathname();
  const isGameRoute = pathname.startsWith("/games/game/");

  // The live board ships its own full-screen chrome — but it still fires
  // toasts (forfeit, errors), so the container has to stay mounted.
  if (isGameRoute) {
    return (
      <>
        <ToastContainer />
        {children}
      </>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden gaming-gradient-bg text-slate-100">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Page content — each page owns its own bottom padding (.hub-pad-bottom-lg) */}
      <ToastContainer />

      <main className="relative z-10">
        {children}
      </main>

      <GamingBottomNav />
    </div>
  );
}
