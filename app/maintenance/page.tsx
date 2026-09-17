"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

import { motion } from "framer-motion";

export default function MaintenancePage() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center px-6 z-[999] text-center">
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl mb-6"
      >
        <SymbolIcon name="tools" size={40} />
      </motion.div>
      <h1 className="text-2xl font-black text-white tracking-tight">
        Under Maintenance
      </h1>
      <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-[300px]">
        We are performing scheduled maintenance. Please check back in a little while.
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
