"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, USDTIcon, TrophyIcon, ClockIcon } from "@/components/ui/Icons";

export default function MatchesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub } = useApp();
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");

  const mockLiveMatches = [
    { id: "m1", player1: "@speed_dice", player2: "@ludo_champ", stakes: 100, activeTime: "3m 42s", status: "In Progress" },
    { id: "m2", player1: "@cryptokid", player2: "@gold_miner", stakes: 50, activeTime: "12m 10s", status: "In Progress" },
    { id: "m3", player1: "@tg_legend", player2: "@sam_win", stakes: 200, activeTime: "0m 52s", status: "Matchmaking" },
  ];

  return (
    <AppShell>
      <div className="relative min-h-screen pb-24 gaming-gradient-bg px-4 py-4 space-y-6 select-none text-white">

        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 space-y-5">
          {/* Page Header */}
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Arena Matches
              </h1>
              <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest mt-0.5">
                Battle Tracker
              </p>
            </div>

            {/* Exit Button */}
            <motion.button
              onClick={() => {
                setIsInGamingHub(false);
                router.push("/home");
              }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-purple-500/40 text-purple-300 hover:text-white transition-colors"
            >
              Exit Hub
            </motion.button>
          </motion.div>

          {/* Sub-navigation Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-950/70 border border-slate-800">
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === "live"
                  ? "bg-purple-600 text-white shadow-[0_2px_12px_rgba(168,85,247,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Battles
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === "history"
                  ? "bg-purple-600 text-white shadow-[0_2px_12px_rgba(168,85,247,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ClockIcon size={14} />
              Match History
            </button>
          </div>

          {/* Tab Content Display */}
          <AnimatePresence mode="wait">
            {activeTab === "live" ? (
              <motion.div
                key="live-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Active Pools summary banner */}
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/20 flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    🟢 Matchmaking Pool Active
                  </span>
                  <span className="text-purple-300 font-bold font-numeric">
                    {mockLiveMatches.length} Rooms active
                  </span>
                </div>

                <div className="space-y-3">
                  {mockLiveMatches.map((m) => (
                    <div 
                      key={m.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 relative overflow-hidden flex items-center justify-between"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                          <span>{m.player1}</span>
                          <span className="text-purple-400 font-black">VS</span>
                          <span>{m.player2}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                          <span>Stakes: {m.stakes} Coins</span>
                          <span>⏳ {m.activeTime}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="bg-slate-900 border border-slate-800 text-purple-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider block">
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="history-content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-12 text-center px-6 space-y-4 border border-slate-800/80 rounded-2xl bg-slate-950/30"
              >
                {/* Custom SVG Illustration for Empty Match History */}
                <div className="w-24 h-24 bg-purple-500/5 rounded-full flex items-center justify-center border border-purple-500/10">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-purple-500">
                    <rect x="8" y="10" width="32" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="rgba(168,85,247,0.05)" />
                    <path d="M16 6v4M32 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 18h32" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="16" cy="26" r="2" fill="currentColor" />
                    <circle cx="24" cy="26" r="2" fill="currentColor" />
                    <circle cx="32" cy="26" r="2" fill="currentColor" />
                    <circle cx="16" cy="32" r="2" fill="currentColor" />
                    <circle cx="24" cy="32" r="2" fill="currentColor" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-200 uppercase tracking-wide">
                    NO COMPLETED MATCHES
                  </h4>
                  <p className="text-xs text-slate-500 max-w-[240px] leading-normal font-medium">
                    Your completed matches will appear here once you play a round of Ludo Clash!
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/games")}
                  className="px-5 h-9 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-purple-400/20"
                >
                  PLAY A MATCH NOW
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </AppShell>
  );
}
