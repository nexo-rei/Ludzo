"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LudzoLogo from "@/components/layout/LudzoLogo";
import { useTelegram } from "@/hooks/useTelegram";

export default function SplashPage() {
  const router = useRouter();
  const { isReady } = useTelegram();

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => {
      const lang = localStorage.getItem("ludzo_lang");
      const user = localStorage.getItem("ludzo_user");
      if (!lang) router.replace("/language");
      else if (!user) router.replace("/auth");
      else router.replace("/home");
    }, 3000);
    return () => clearTimeout(timer);
  }, [isReady, router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center relative overflow-hidden">
      <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <LudzoLogo size={64} />
        <h1 className="text-4xl font-semibold tracking-tight mt-5">ludzo<span className="text-[var(--accent)]">.</span></h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">Your next move starts here.</p>
        <div className="w-28 h-0.5 overflow-hidden bg-[var(--border)] mt-10 rounded-full" role="progressbar" aria-label="Loading Ludzo"><motion.div className="h-full bg-[var(--accent)]" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} /></div>
      </motion.div>
      <p className="absolute bottom-10 text-[10px] tracking-[.2em] text-[var(--text-muted)]">PLAY. EARN. REPEAT.</p>
    </div>
  );
}
