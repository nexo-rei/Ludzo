"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LudzoLogo from "./LudzoLogo";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(progressInterval); return 100; }
        return p + 2;
      });
    }, 48);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 500);
    }, 3200);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "#0F172A" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Background radial glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.18) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Decorative grid lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(124,58,237,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Diamond spinner ring */}
          <motion.div
            className="absolute"
            style={{
              width: 180,
              height: 180,
              border: "1px solid rgba(124,58,237,0.25)",
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute"
            style={{
              width: 140,
              height: 140,
              border: "1px solid rgba(168,85,247,0.15)",
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* Logo + title */}
          <motion.div
            className="relative flex flex-col items-center gap-6 z-10"
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
          >
            {/* Logo with glow */}
            <motion.div
              className="relative"
              animate={{
                filter: [
                  "drop-shadow(0 0 12px rgba(124,58,237,0.5))",
                  "drop-shadow(0 0 32px rgba(168,85,247,0.7))",
                  "drop-shadow(0 0 12px rgba(124,58,237,0.5))",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <LudzoLogo size={88} />
            </motion.div>

            {/* App name */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h1
                className="text-5xl font-black tracking-[0.2em] text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                LUDZO
              </h1>
              <motion.p
                className="mt-2 text-xs font-semibold tracking-[0.35em] uppercase"
                style={{ color: "#A855F7" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.5 }}
              >
                Earn · Play · Win
              </motion.p>
            </motion.div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            className="absolute bottom-16 w-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            <div
              className="w-full h-0.5 rounded-full overflow-hidden"
              style={{ background: "rgba(124,58,237,0.2)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #7C3AED, #A855F7)",
                  width: `${progress}%`,
                  transition: "width 0.05s linear",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
