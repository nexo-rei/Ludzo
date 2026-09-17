"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import WorkspaceNav from "@/components/layout/WorkspaceNav";
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
    <div className="relative min-h-screen w-full overflow-x-hidden gaming-workspace gaming-gradient-bg text-slate-100">
      <WorkspaceNav />
      {/* Page content — each page owns its own bottom padding (.hub-pad-bottom-lg) */}
      <ToastContainer />

      <main className="gaming-content relative z-10">
        {children}
      </main>

      <GamingBottomNav />
    </div>
  );
}
