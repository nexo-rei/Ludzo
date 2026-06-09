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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        className="flex flex-col items-center gap-6 z-10"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          animate={{ boxShadow: ["0 0 20px rgba(124,58,237,0.3)", "0 0 50px rgba(124,58,237,0.7)", "0 0 20px rgba(124,58,237,0.3)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="rounded-3xl"
        >
          <LudzoLogo size={88} />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h1 className="text-5xl font-black text-white tracking-tight">LUDZO</h1>
          <motion.p
            className="text-[#A855F7] text-base font-semibold tracking-widest mt-2 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Earn • Play • Win
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        className="absolute bottom-16 flex gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}
