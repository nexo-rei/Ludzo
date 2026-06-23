"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/hooks/useApp";
import { MatchesIcon, TrendUpIcon } from "@/components/gaming/GamingIcons";
import EmptyState from "@/components/gaming/EmptyState";

export default function MatchesPage() {
  const { wallet } = useApp();
  const [stats, setStats] = useState<any>({
    wins: 0,
    losses: 0,
    total_matches: 0,
    win_rate: "0%",
    current_streak: 0,
    best_streak: 0,
    total_won_coins: 0
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!wallet?.user_id) return;
      try {
        const res = await fetch("/api/ludo/stats", {
          headers: { "Authorization": `Bearer ${wallet.user_id}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setStats(data.data.stats);
            setHistory(data.data.history);
          }
        }
      } catch (err) {
        console.error("Failed to load matches stats:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [wallet?.user_id]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white pb-24">
      <div className="mx-auto max-w-[480px] px-4 pt-5 pb-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gaming-primary/10 text-gaming-primary">
            <MatchesIcon size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gaming-foreground">Matches</h1>
            <p className="text-xs text-gaming-muted text-purple-400/80">Track your gaming activity</p>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-3 gap-2.5"
        >
          {[
            { label: "Played", value: stats.total_matches, icon: TrendUpIcon, colorClass: "text-gaming-primary" },
            { label: "Won", value: stats.wins, icon: TrendUpIcon, colorClass: "text-gaming-success" },
            { label: "Win Rate", value: stats.win_rate, icon: TrendUpIcon, colorClass: "text-gaming-gold" },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.06, duration: 0.3 }}
                className="rounded-xl border border-purple-500/10 bg-slate-900/50 p-3 text-center"
              >
                <p className="text-base font-black text-white">{stat.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Streaks Overview Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-2.5 rounded-xl border border-purple-500/10 bg-slate-900/50 p-4"
        >
          <div className="text-center border-r border-slate-800">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Current Streak</span>
            <span className="text-base font-black text-emerald-400 block mt-0.5">🔥 {stats.current_streak} Wins</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Best Streak</span>
            <span className="text-base font-black text-amber-400 block mt-0.5">👑 {stats.best_streak} Wins</span>
          </div>
        </motion.div>

        {/* Match Sections */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Match History</h2>

          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-900/50 animate-pulse border border-slate-900" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState type="history" message="Your completed matches will appear here." />
          ) : (
            <div className="space-y-3">
              {history.map((match) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-900 bg-slate-900/30 p-4 flex items-center justify-between hover:border-purple-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-purple-500/20 overflow-hidden bg-slate-950 shrink-0">
                      <img
                        src={match.opponent_avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=Opponent"}
                        alt="Opponent"
                        className="w-full h-full"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block truncate max-w-[150px]">{match.opponent_name}</span>
                      <span className="text-[9px] text-slate-500 font-bold block mt-0.5 font-mono">
                        {new Date(match.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      match.result === "win" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"
                    }`}>
                      {match.result === "win" ? "Victory" : "Defeat"}
                    </span>
                    <span className="text-xs font-black text-amber-400 font-numeric">
                      {match.result === "win" ? `+${match.reward} Won Coins` : `-${match.stake} Coins`}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
