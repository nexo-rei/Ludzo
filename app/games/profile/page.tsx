"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/hooks/useApp";
import { TrophyIcon, CoinIcon } from "@/components/ui/Icons";

export default function ProfilePage() {
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
          }
        }
      } catch (err) {
        console.error("Failed to load profile stats:", err);
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
            <TrophyIcon size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gaming-foreground">My Profile</h1>
            <p className="text-xs text-gaming-muted text-purple-400/80">Ludo statistics & standings</p>
          </div>
        </motion.div>

        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-purple-500/20 bg-slate-900/40 p-5 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full border-2 border-purple-500 overflow-hidden bg-slate-950 shadow-lg">
            <img
              src="https://api.dicebear.com/7.x/adventurer/svg?seed=You"
              alt="Avatar"
              className="w-full h-full"
            />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100">Player Profile</h2>
            <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-wider block mt-1">LUDO PRO DIVISION</span>
          </div>
        </motion.div>

        {/* Pro Stats Cards Grid */}
        <div className="space-y-3.5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-0.5">Gaming statistics</h3>

          {loading ? (
            <div className="grid grid-cols-2 gap-3.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-900/50 animate-pulse border border-slate-900" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {/* Total Matches */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col justify-between h-20"
              >
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Total Matches</span>
                <span className="text-lg font-black text-slate-100 mt-1">{stats.total_matches}</span>
              </motion.div>

              {/* Win Rate */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col justify-between h-20"
              >
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Win Rate</span>
                <span className="text-lg font-black text-amber-400 mt-1">{stats.win_rate}</span>
              </motion.div>

              {/* Wins */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col justify-between h-20"
              >
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Wins</span>
                <span className="text-lg font-black text-emerald-400 mt-1">{stats.wins}</span>
              </motion.div>

              {/* Losses */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col justify-between h-20"
              >
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Losses</span>
                <span className="text-lg font-black text-red-500 mt-1">{stats.losses}</span>
              </motion.div>

              {/* Current Streak */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col justify-between h-20"
              >
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Current Streak</span>
                <span className="text-lg font-black text-emerald-400 mt-1">🔥 {stats.current_streak}</span>
              </motion.div>

              {/* Best Streak */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-slate-900 bg-slate-900/30 flex flex-col justify-between h-20"
              >
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">Best Streak</span>
                <span className="text-lg font-black text-amber-400 mt-1">👑 {stats.best_streak}</span>
              </motion.div>
            </div>
          )}

          {/* Total Earnings */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 to-slate-950 flex items-center justify-between"
            >
              <div>
                <span className="text-[9px] text-purple-400 font-black uppercase tracking-wider block">Total Won Coins Earned</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">{stats.total_won_coins} Coins</span>
              </div>
              <CoinIcon size={28} className="text-amber-400" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
