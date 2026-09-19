"use client";

import { useEffect, useState } from "react";
import SymbolIcon from "@/components/ui/SymbolIcon";

import { motion } from "framer-motion";

/**
 * Maintenance / Server-Full screen.
 *
 * Do modes hain:
 *   1. maintenance_mode → "Under Maintenance" (admin settings se)
 *   2. server_full      → "Servers at Capacity" (System / Bot Health →
 *      Capacity Controls me block mode ON + active users limit cross).
 *
 * Mode /api/maintenance se fetch hota hai; fetch fail ho to default
 * maintenance copy dikhti hai (fail-safe).
 */

interface MaintenanceStatus {
  maintenance_mode: boolean;
  maintenance_message: string;
  server_full: boolean;
  server_full_message: string;
}

export default function MaintenancePage() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);

  useEffect(() => {
    fetch("/api/maintenance")
      .then((r) => r.json())
      .then((json) => {
        if (json?.success) setStatus(json.data as MaintenanceStatus);
      })
      .catch(() => {
        /* fetch fail → default maintenance copy dikhegi */
      });
  }, []);

  const serverFull = status?.server_full === true;
  const title = serverFull ? "Servers at Capacity" : "Under Maintenance";
  const message =
    serverFull
      ? status?.server_full_message ||
        "LUDZO servers are at full capacity right now. Please try again in a few minutes!"
      : status?.maintenance_message ||
        "We are performing scheduled maintenance. Please check back in a little while.";

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center px-6 z-[999] text-center">
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl mb-6"
      >
        <SymbolIcon name={serverFull ? "bolt" : "tools"} size={40} />
      </motion.div>
      <h1 className="text-2xl font-black text-white tracking-tight">
        {title}
      </h1>
      <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-[300px]">
        {message}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-8 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest"
      >
        Retry
      </button>
      <p className="mt-6 text-[10px] text-slate-600 font-mono">LUDZO</p>
    </div>
  );
}
