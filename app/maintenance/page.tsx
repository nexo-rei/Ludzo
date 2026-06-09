"use client";

import { motion } from "framer-motion";
import LudzoLogo from "@/components/layout/LudzoLogo";

interface MaintenancePageProps {
  message?: string;
}

export default function MaintenancePage({ message }: MaintenancePageProps) {
  const defaultMsg = "LUDZO is currently undergoing scheduled maintenance. We'll be back online shortly!";

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        className="flex flex-col items-center gap-6 max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated logo */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <LudzoLogo size={72} />
        </motion.div>

        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Under Maintenance</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">{message ?? defaultMsg}</p>
        </div>

        {/* Animated loading bar */}
        <div className="w-full bg-[var(--border)] rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #7C3AED, #A855F7)" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <p className="text-xs text-[var(--text-muted)]">Please check back soon 🙏</p>
      </motion.div>
    </div>
  );
}
