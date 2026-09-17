"use client";
//rebuild

import { ReactNode } from "react";
import WorkspaceNav from "./WorkspaceNav";
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
    <div className="app-workspace min-h-screen bg-[var(--bg)] flex justify-center">
      {!hideNav && <WorkspaceNav />}
      <div className={cn("workspace-content relative w-full flex flex-col min-h-screen", hideNav && "workspace-standalone", className)}>
        <ToastContainer />
        <main className={cn("flex-1", !hideNav && "pb-20")}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
