"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, ClockIcon, TrophyIcon } from "@/components/ui/Icons";

interface MatchItem {
  id: string;
  gameName: string;
  isWin: boolean;
  stakes: number;
  reward: number;
  timestamp: string;
}

export default function MatchesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub, gamingStats } = useApp();
  const [matchHistory, setMatchHistory] = useState<MatchItem[]>([]);

  // Keep in Gaming Hub mode
  useEffect(() => {
    if (!isInGamingHub) {
      setIsInGamingHub(true);
    }
  }, [isInGamingHub, setIsInGamingHub]);

  // Load user's personal match history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("ludzo_match_history");
    if (stored) {
      try {
        setMatchHistory(JSON.parse(stored));
      } catch { /* silent */ }
    }
  }, []);

  const formatMatchTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  return (
    <AppShell>
      <div className="relative min-h-screen pb-24 gaming-gradient-bg px-4 py-4 space-y-6 select-none text-white">

        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                My Battle History
              </h1>
              <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest mt-0.5">
                Personal Logs
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

          {/* User Stats Card Summary if they have matches */}
          {gamingStats.totalMatches > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-purple-500/15 bg-slate-950/40 text-center"
            >
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Battles</span>
                <span className="text-sm font-black font-numeric text-white">{gamingStats.totalMatches}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Wins</span>
                <span className="text-sm font-black font-numeric text-emerald-400">{gamingStats.wins}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Win Rate</span>
                <span className="text-sm font-black font-numeric text-purple-400">{gamingStats.winRate}</span>
              </div>
            </motion.div>
          )}

          {/* Matches content rendering */}
          <div className="space-y-3">
            {matchHistory.length === 0 ? (
              // Empty State
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center px-6 space-y-5 border border-slate-800/80 rounded-2xl bg-slate-950/30"
              >
                {/* Ludo Boards Style Empty Illustration */}
                <div className="w-24 h-24 bg-purple-500/5 rounded-full flex items-center justify-center border border-purple-500/10 shadow-[0_0_24px_rgba(168,85,247,0.05)]">
                  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" className="text-purple-400 opacity-60">
                    <rect x="10" y="10" width="80" height="80" rx="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                    {/* Simplified board grids */}
                    <line x1="10" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="10" y1="60" x2="90" y2="60" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="40" y1="10" x2="40" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="60" y1="10" x2="60" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    {/* central triangle */}
                    <polygon points="50,50 40,40 60,40" fill="currentColor" fillOpacity="0.1"/>
                    <polygon points="50,50 40,60 60,60" fill="currentColor" fillOpacity="0.1"/>
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-200 uppercase tracking-wide">
                    Your completed matches will appear here
                  </h4>
                  <p className="text-xs text-slate-500 max-w-[240px] leading-normal font-medium">
                    Compete in Ludo Clash and stack wins to write your gaming history ledger!
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/games")}
                  className="px-5 h-9 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-purple-400/20 shadow-[0_4px_16px_rgba(168,85,247,0.3)]"
                >
                  ENTER THE ARENA
                </motion.button>
              </motion.div>
            ) : (
              // Match List
              <div className="space-y-3">
                {matchHistory.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 relative overflow-hidden flex items-center justify-between"
                  >
                    <div 
                      className="absolute top-0 left-0 w-1.5 h-full" 
                      style={{ background: m.isWin ? "#10B981" : "#EF4444" }}
                    />

                    <div className="space-y-1 pl-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-white">
                          {m.gameName}
                        </span>
                        <span 
                          className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-numeric tracking-wider"
                          style={{
                            backgroundColor: m.isWin ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                            color: m.isWin ? "#10B981" : "#EF4444",
                            border: m.isWin ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(239,68,68,0.2)"
                          }}
                        >
                          {m.isWin ? "Victory" : "Defeat"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold tracking-wide">
                        {formatMatchTime(m.timestamp)}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Net Result</span>
                      <div className="flex items-center gap-1 mt-0.5 font-numeric">
                        <CoinIcon size={12} className={m.isWin ? "text-emerald-400" : "text-slate-500"} />
                        <span className={`text-xs font-black ${m.isWin ? "text-emerald-400" : "text-red-400"}`}>
                          {m.isWin ? `+${m.reward - m.stakes}` : `-${m.stakes}`}
                        </span>
                      </div>
                    </div>

                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
