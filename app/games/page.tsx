"use client";

import { useState, type ReactElement } from "react";
import { motion } from "framer-motion";
import { Bell, Users, Zap, Clock } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { showToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

interface GameCard {
  id: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  icon: ReactElement;
  players: string;
  entryFee: string;
  badge: string;
  badgeColor: string;
}

const GAMES: GameCard[] = [
  {
    id: "ludo-clash",
    title: "Ludo Clash",
    description: "Classic strategy board game. Compete head-to-head for Coins.",
    gradientFrom: "#4C1D95", gradientTo: "#2E1065", borderColor: "rgba(168,85,247,0.4)",
    badge: "Coming Soon", badgeColor: "#A855F7", players: "2–4 Players", entryFee: "50 Coins",
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        <rect x="6" y="6" width="36" height="36" rx="8" fill="rgba(168,85,247,0.2)" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5"/>
        <circle cx="16" cy="16" r="5" fill="#A855F7"/><circle cx="32" cy="16" r="5" fill="#7C3AED"/>
        <circle cx="16" cy="32" r="5" fill="#7C3AED"/><circle cx="32" cy="32" r="5" fill="#A855F7"/>
        <rect x="19" y="19" width="10" height="10" rx="3" fill="rgba(168,85,247,0.5)"/>
        <path d="M22 24l2 2 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "water-sort",
    title: "Water Sort",
    description: "Sort colored water into matching tubes. Fast-paced brain challenge.",
    gradientFrom: "#1E3A8A", gradientTo: "#0C1445", borderColor: "rgba(59,130,246,0.4)",
    badge: "Coming Soon", badgeColor: "#3B82F6", players: "Solo", entryFee: "30 Coins",
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="10" width="9" height="26" rx="4.5" fill="rgba(59,130,246,0.25)" stroke="#3B82F6" strokeWidth="1.5"/>
        <rect x="8" y="24" width="9" height="12" rx="4.5" fill="#3B82F6"/>
        <rect x="20" y="6" width="9" height="30" rx="4.5" fill="rgba(16,185,129,0.25)" stroke="#10B981" strokeWidth="1.5"/>
        <rect x="20" y="20" width="9" height="16" rx="4.5" fill="#10B981"/>
        <rect x="32" y="14" width="9" height="22" rx="4.5" fill="rgba(245,158,11,0.25)" stroke="#F59E0B" strokeWidth="1.5"/>
        <rect x="32" y="28" width="9" height="8" rx="4.5" fill="#F59E0B"/>
      </svg>
    ),
  },
  {
    id: "bottle-match",
    title: "Bottle Match",
    description: "Fill bottles with matching colors. Satisfying puzzle gameplay.",
    gradientFrom: "#064E3B", gradientTo: "#022C22", borderColor: "rgba(16,185,129,0.4)",
    badge: "Coming Soon", badgeColor: "#10B981", players: "Solo", entryFee: "25 Coins",
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        <path d="M13 6h8v5h-2c-2.5 0-4 2-4 4.5v19a4.5 4.5 0 009 0V15.5c0-2.5-1.5-4.5-4-4.5h-2V6h-5z" fill="rgba(16,185,129,0.2)" stroke="#10B981" strokeWidth="1.5"/>
        <path d="M13 30h8v5.5a4.5 4.5 0 01-9 0V30h1z" fill="#10B981"/>
        <path d="M27 6h8v5h-2c-2.5 0-4 2-4 4.5v19a4.5 4.5 0 009 0V15.5c0-2.5-1.5-4.5-4-4.5h-2V6h-5z" fill="rgba(168,85,247,0.2)" stroke="#A855F7" strokeWidth="1.5"/>
        <path d="M27 30h8v5.5a4.5 4.5 0 01-9 0V30h1z" fill="#A855F7"/>
      </svg>
    ),
  },
  {
    id: "quiz-battle",
    title: "Quiz Battle",
    description: "Rapid-fire trivia against opponents. Knowledge pays off.",
    gradientFrom: "#78350F", gradientTo: "#451A03", borderColor: "rgba(245,158,11,0.4)",
    badge: "Coming Soon", badgeColor: "#F59E0B", players: "2 Players", entryFee: "40 Coins",
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="8" width="40" height="28" rx="7" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" strokeWidth="1.5"/>
        <path d="M20 22c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2-1.5 3-3 3.5V27" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="24" cy="31" r="2" fill="#F59E0B"/>
        <path d="M14 42l5-6h10l5 6" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "spin-win",
    title: "Spin & Win",
    description: "Daily lucky wheel with guaranteed Coin rewards every spin.",
    gradientFrom: "#7F1D1D", gradientTo: "#450A0A", borderColor: "rgba(239,68,68,0.4)",
    badge: "Coming Soon", badgeColor: "#EF4444", players: "Solo", entryFee: "Free",
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="18" fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5"/>
        <path d="M24 6v6M42 24h-6M24 42v-6M6 24h6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
        <path d="M36.7 11.3l-4.2 4.2M36.7 36.7l-4.2-4.2M11.3 36.7l4.2-4.2M11.3 11.3l4.2 4.2" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="24" cy="24" r="5" fill="#EF4444"/>
        <path d="M24 10l2.5 14h-5L24 10z" fill="rgba(239,68,68,0.5)"/>
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
      <PageHeader title="Games Hub" />
      <div className="px-4 py-4 space-y-4 pb-6">

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl p-6 overflow-hidden text-center"
          style={{
            background: "linear-gradient(135deg, #1E1040 0%, #0F172A 100%)",
            border: "1px solid rgba(124,58,237,0.3)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.2)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.3) 0%, transparent 70%)" }}/>
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(168,85,247,0.4)" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.5">
              <rect x="2" y="6" width="20" height="12" rx="4"/>
              <path d="M6 12h4M8 10v4" strokeLinecap="round"/>
              <circle cx="15" cy="11" r="1" fill="#A855F7" stroke="none"/>
              <circle cx="17" cy="13" r="1" fill="#A855F7" stroke="none"/>
            </svg>
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Games Hub</h1>
          <p className="text-xs leading-relaxed max-w-xs mx-auto mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
            Skill-based games launching soon. Compete &amp; earn Coins!
          </p>
          <Button
            variant="primary" size="sm" className="mx-auto gap-2"
            onClick={handleNotify} disabled={notified}
            style={notified ? { background: "rgba(16,185,129,0.2)", color: "#10B981" } as React.CSSProperties : undefined}
          >
            <Bell size={13}/> {notified ? "Notified!" : "Notify Me When Live"}
          </Button>
        </motion.div>

        {/* Section label */}
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Upcoming Games</h2>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }}/>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#7C3AED" }}>{GAMES.length}</span>
        </div>

        {/* Game cards */}
        <div className="space-y-3">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.01 }}
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${game.gradientFrom} 0%, ${game.gradientTo} 100%)`,
                border: `1px solid ${game.borderColor}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20"
                style={{ background: `radial-gradient(circle, ${game.badgeColor} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }}/>
              <div className="relative flex items-center gap-4 p-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {game.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-black text-white">{game.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${game.badgeColor}25`, color: game.badgeColor, border: `1px solid ${game.badgeColor}40` }}>
                      {game.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>{game.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                      <Users size={10}/> {game.players}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: game.badgeColor }}>
                      <Zap size={10}/> {game.entryFee}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <Clock size={10}/> Soon
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
