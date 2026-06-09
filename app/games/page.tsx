"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { showToast } from "@/components/ui/Toast";

const UPCOMING_FEATURES = [
  { icon: "🎮", title: "100 Coin Match", desc: "Classic head-to-head match with 100 coin entry" },
  { icon: "💎", title: "500 Coin Match", desc: "High stakes match for competitive players" },
  { icon: "👑", title: "1000 Coin Match", desc: "Premium tournament-style match" },
  { icon: "🏆", title: "Tournament Mode", desc: "Compete in weekly tournaments for big rewards" },
  { icon: "📊", title: "Game Leaderboards", desc: "Track your win rate and climb the rankings" },
];

export default function GamesPage() {
  const [notified, setNotified] = useState(false);

  const handleNotify = () => {
    setNotified(true);
    showToast("You'll be notified when Games launch! 🎮", "success");
  };

  return (
    <AppShell>
      <PageHeader title="Games" />

      <div className="px-4 py-6 flex flex-col items-center gap-6 max-w-app mx-auto">
        {/* Hero illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full glass rounded-3xl p-8 flex flex-col items-center text-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(16,185,129,0.08) 100%)" }}
        >
          <motion.div
            className="text-7xl"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            🎮
          </motion.div>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Coming Soon</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed max-w-xs mx-auto">
              Skill-based games are in development. Compete, win, and earn more Coins!
            </p>
          </div>

          <motion.button
            onClick={handleNotify}
            disabled={notified}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              notified
                ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40"
                : "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/30 hover:bg-[#5B21B6]"
            }`}
            whileTap={{ scale: 0.97 }}
          >
            <Bell size={15} />
            {notified ? "You'll be notified ✓" : "Notify Me When Live"}
          </motion.button>
        </motion.div>

        {/* Upcoming features */}
        <div className="w-full">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
            Upcoming Features
          </h2>
          <div className="space-y-2">
            {UPCOMING_FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="flex items-center gap-3 p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl"
              >
                <span className="text-2xl">{feat.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{feat.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{feat.desc}</div>
                </div>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#A855F7] font-semibold">
                  Soon
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
