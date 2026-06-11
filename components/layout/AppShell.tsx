"use client";
//rebuild

import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export default function AppShell({ children, hideNav = false, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex justify-center">
      <div className={cn("relative w-full max-w-app flex flex-col min-h-screen", className)}>
        <ToastContainer />
        <main className={cn("flex-1", !hideNav && "pb-20")}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
