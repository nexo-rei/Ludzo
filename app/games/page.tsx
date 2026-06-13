"use client";

import { useState, type ReactElement } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

interface GameCard {
  id: string;
  title: string;
  description: string;
  available: boolean;
  color: string;
  bg: string;
  icon: ReactElement;
}

const GAMES: GameCard[] = [
  {
    id: "ludo-clash",
    title: "Ludo Clash",
    description: "Classic strategy board game. Compete head-to-head for Coins.",
    available: false,
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.1)",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="6" fill="rgba(124,58,237,0.2)" stroke="rgba(124,58,237,0.5)" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="4" fill="#A855F7" />
        <circle cx="32" cy="16" r="4" fill="#7C3AED" />
        <circle cx="16" cy="32" r="4" fill="#7C3AED" />
        <circle cx="32" cy="32" r="4" fill="#A855F7" />
        <rect x="20" y="20" width="8" height="8" rx="2" fill="rgba(168,85,247,0.4)" />
      </svg>
    ),
  },
  {
    id: "water-sort",
    title: "Water Sort",
    description: "Sort colored water into matching tubes. Fast-paced brain challenge.",
    available: false,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.1)",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="12" width="8" height="24" rx="4" fill="rgba(59,130,246,0.3)" stroke="#3B82F6" strokeWidth="1.5" />
        <rect x="10" y="24" width="8" height="12" rx="4" fill="#3B82F6" />
        <rect x="22" y="8" width="8" height="28" rx="4" fill="rgba(16,185,129,0.3)" stroke="#10B981" strokeWidth="1.5" />
        <rect x="22" y="22" width="8" height="14" rx="4" fill="#10B981" />
        <rect x="34" y="16" width="8" height="20" rx="4" fill="rgba(245,158,11,0.3)" stroke="#F59E0B" strokeWidth="1.5" />
        <rect x="34" y="28" width="8" height="8" rx="4" fill="#F59E0B" />
      </svg>
    ),
  },
  {
    id: "bottle-match",
    title: "Bottle Match",
    description: "Fill bottles with matching colors. Satisfying puzzle gameplay.",
    available: false,
    color: "#10B981",
    bg: "rgba(16,185,129,0.1)",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <path d="M16 8h6v4h-2c-2 0-4 2-4 4v18a4 4 0 008 0V16c0-2-2-4-4-4h-2V8h-2z" fill="rgba(16,185,129,0.25)" stroke="#10B981" strokeWidth="1.5" />
        <path d="M16 28h8v8a4 4 0 01-8 0v-8z" fill="#10B981" />
        <path d="M28 8h6v4h-2c-2 0-4 2-4 4v18a4 4 0 008 0V16c0-2-2-4-4-4h-2V8h-2z" fill="rgba(168,85,247,0.25)" stroke="#A855F7" strokeWidth="1.5" />
        <path d="M28 28h8v8a4 4 0 01-8 0v-8z" fill="#A855F7" />
      </svg>
    ),
  },
  {
    id: "quiz-battle",
    title: "Quiz Battle",
    description: "Rapid-fire trivia against opponents. Knowledge pays off.",
    available: false,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="8" width="36" height="28" rx="6" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" strokeWidth="1.5" />
        <path d="M20 20c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2-1.5 3-3 3.5V25" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="28" r="1.5" fill="#F59E0B" />
        <path d="M14 40l4-4h12l4 4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "spin-win",
    title: "Spin & Win",
    description: "Daily lucky wheel with guaranteed Coin rewards every spin.",
    available: false,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.1)",
    icon: (
      <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5" />
        <path d="M24 6v6M42 24h-6M24 42v-6M6 24h6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M37.1 10.9l-4.2 4.2M37.1 37.1l-4.2-4.2M10.9 37.1l4.2-4.2M10.9 10.9l4.2 4.2" stroke="#EF4444" strokeWidth="1" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#EF4444" />
        <path d="M24 12l2 12h-4l2-12z" fill="rgba(239,68,68,0.5)" />
      </svg>
    ),
  },
];

export default function GamesPage() {
  const [notified, setNotified] = useState(false);

  const handleNotify = () => {
    setNotified(true);
    showToast("You'll be notified when Games launch!", "success");
  };

  return (
    <AppShell>
      <PageHeader title="Games" />
      <div className="px-4 py-4 space-y-5 pb-6">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 overflow-hidden text-center"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.12) 60%, rgba(16,185,129,0.06) 100%)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="12" rx="4" />
              <path d="M6 12h4M8 10v4" strokeLinecap="round" />
              <circle cx="15" cy="11" r="1" fill="#A855F7" stroke="none" />
              <circle cx="17" cy="13" r="1" fill="#A855F7" stroke="none" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-1">Games Hub</h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
            Skill-based games are in development. Play to compete and earn Coins!
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4 mx-auto gap-2"
            onClick={handleNotify}
            disabled={notified}
            style={notified ? { background: "rgba(16,185,129,0.15)", color: "#10B981" } as React.CSSProperties : undefined}
          >
            <Bell size={13} /> {notified ? "Notified" : "Notify Me When Live"}
          </Button>
        </motion.div>

        {/* Game cards */}
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Upcoming Games</h2>
          <div className="space-y-3">
            {GAMES.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "var(--card-bg)", border: `1px solid ${game.color}1A` }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: game.bg, border: `1px solid ${game.color}30` }}>
                  {game.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{game.title}</span>
                    <Badge variant="purple" size="sm">Soon</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{game.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
