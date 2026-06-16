"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import GamingBottomNav from "@/components/gaming/GamingBottomNav";

interface GamingLayoutProps {
  children: ReactNode;
}

export default function GamingLayout({ children }: GamingLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen w-full bg-gaming-background text-gaming-foreground overflow-x-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-gaming-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gaming-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Page content */}
      <main className="relative z-10 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Gaming Hub Bottom Navigation */}
      <GamingBottomNav />
    </div>
  );
}
