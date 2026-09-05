"use client";

/**
 * LUDZO — My Battle History (Gaming Hub "Matches" tab)
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the page BottomNav sends users to. It used to read
 * `localStorage.ludzo_match_history`, which was only ever written by the demo
 * helper `recordMatchResult()` in hooks/useApp.tsx — so real Ludo matches never
 * showed up here at all (the identical-looking /games/matches page was the one
 * wired to the API). It now reads the same authoritative endpoint:
 *
 *     GET /api/ludo/stats  →  { stats: ludo_stats, history: ludo_match_history }
 *
 * Visual structure is unchanged.
 */

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon } from "@/components/ui/Icons";

/** A row from ludo_match_history, as returned by /api/ludo/stats. */
interface MatchItem {
  id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  stake: number;
  result: "win" | "loss";
  duration: number;
  reward: number;
  created_at: string;
}

interface Stats {
  wins: number;
  losses: number;
  total_matches: number;
  win_rate: string;
  current_streak: number;
  best_streak: number;
  total_won_coins: number;
}

const EMPTY_STATS: Stats = {
  wins: 0, losses: 0, total_matches: 0, win_rate: "0%",
  current_streak: 0, best_streak: 0, total_won_coins: 0,
};

const GAME_NAME = "Ludo Clash";

export default function MatchesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub, userId } = useApp();

  const [matchHistory, setMatchHistory] = useState<MatchItem[]>([]);
  const [stats, setStats]               = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState(false);

  // Keep in Gaming Hub mode
  useEffect(() => {
    if (!isInGamingHub) setIsInGamingHub(true);
  }, [isInGamingHub, setIsInGamingHub]);

  const loadHistory = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch("/api/ludo/stats", {
        headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStats({ ...EMPTY_STATS, ...(data.data.stats ?? {}) });
        setMatchHistory(Array.isArray(data.data.history) ? data.data.history : []);
        setLoadError(false);
      }
    } catch (err) {
      console.error("[matches] failed to load history:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const formatMatchTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " +
             d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  const formatDuration = (secs: number) => {
    if (!secs || secs < 0) return "—";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
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

          {/* Stats summary — from ludo_stats */}
          {stats.total_matches > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-4 gap-2 p-4 rounded-xl border border-purple-500/15 bg-slate-950/40 text-center"
            >
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Battles</span>
                <span className="text-sm font-black font-numeric text-white">{stats.total_matches}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Wins</span>
                <span className="text-sm font-black font-numeric text-emerald-400">{stats.wins}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Win Rate</span>
                <span className="text-sm font-black font-numeric text-purple-400">{stats.win_rate}</span>
              </div>
              <div>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Best Streak</span>
                <span className="text-sm font-black font-numeric text-amber-400">{stats.best_streak}</span>
              </div>
            </motion.div>
          )}

          {/* Matches content rendering */}
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[74px] rounded-xl border border-slate-800/60 bg-slate-950/30 animate-pulse" />
                ))}
              </div>
            ) : matchHistory.length === 0 ? (
              // Empty State
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center px-6 space-y-5 border border-slate-800/80 rounded-2xl bg-slate-950/30"
              >
                {/* Ludo board style empty illustration */}
                <div className="w-24 h-24 bg-purple-500/5 rounded-full flex items-center justify-center border border-purple-500/10 shadow-[0_0_24px_rgba(168,85,247,0.05)]">
                  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" className="text-purple-400 opacity-60">
                    <rect x="10" y="10" width="80" height="80" rx="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <line x1="10" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="10" y1="60" x2="90" y2="60" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="40" y1="10" x2="40" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="60" y1="10" x2="60" y2="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                    <polygon points="50,50 40,40 60,40" fill="currentColor" fillOpacity="0.1"/>
                    <polygon points="50,50 40,60 60,60" fill="currentColor" fillOpacity="0.1"/>
                  </svg>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-200 uppercase tracking-wide">
                    {loadError ? "Could not load your history" : "Your completed matches will appear here"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-[240px] leading-normal font-medium">
                    {loadError
                      ? "Check your connection and try again — your matches are safe on the server."
                      : "Compete in Ludo Clash and stack wins to write your gaming history ledger!"}
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => (loadError ? loadHistory() : router.push("/games"))}
                  className="px-5 h-9 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-purple-400/20 shadow-[0_4px_16px_rgba(168,85,247,0.3)]"
                >
                  {loadError ? "RETRY" : "ENTER THE ARENA"}
                </motion.button>
              </motion.div>
            ) : (
              // Match List
              <div className="space-y-3">
                {matchHistory.map((m, i) => {
                  const isWin = m.result === "win";
                  // Winner is paid floor(stake*2*0.98) into Won Coins; the stake
                  // itself was already escrowed at queue time, so the net swing
                  // versus not playing is reward - stake.
                  const net = isWin ? Math.max(0, (m.reward ?? 0) - (m.stake ?? 0)) : -(m.stake ?? 0);
                  return (
                    <motion.div
                      key={m.id ?? `${m.created_at}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 relative overflow-hidden flex items-center justify-between gap-3"
                    >
                      <div
                        className="absolute top-0 left-0 w-1.5 h-full"
                        style={{ background: isWin ? "#10B981" : "#EF4444" }}
                      />

                      <div className="space-y-1 pl-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white truncate">{GAME_NAME}</span>
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-numeric tracking-wider shrink-0"
                            style={{
                              backgroundColor: isWin ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                              color: isWin ? "#10B981" : "#EF4444",
                              border: isWin ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(239,68,68,0.2)",
                            }}
                          >
                            {isWin ? "Victory" : "Defeat"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold truncate">
                          vs {m.opponent_name || "Opponent"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold tracking-wide">
                          {formatMatchTime(m.created_at)} · {formatDuration(m.duration)} · stake {m.stake}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end shrink-0">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Net Result</span>
                        <div className="flex items-center gap-1 mt-0.5 font-numeric">
                          <CoinIcon size={12} className={isWin ? "text-emerald-400" : "text-slate-500"} />
                          <span className={`text-xs font-black ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                            {isWin ? `+${net}` : `${net}`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
