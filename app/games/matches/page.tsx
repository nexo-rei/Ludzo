"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

/**
 * LUDZO — Battle History (/games/matches)
 * ─────────────────────────────────────────────────────────────────────────────
 * Reached from the Profile tab ("Battle History" row). Reads the authoritative
 * endpoint — GET /api/ludo/stats → { stats: ludo_stats, history: ludo_match_history }.
 * Presentation matches the rest of the arena: glass cards, spring animations,
 * full safe-area bottom padding for the floating 3-tab nav.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, RefreshIcon } from "@/components/ui/DuotoneIcons";
import { useApp } from "@/hooks/useApp";
import { CoinIcon } from "@/components/ui/Icons";
import { BattleLogIcon, TokenIcon, LudoIcon } from "@/components/gaming/GamingIcons";

interface MatchRow {
  id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  stake: number;
  result: "win" | "loss";
  reward: number;
  duration?: number;
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

const EMPTY: Stats = {
  wins: 0, losses: 0, total_matches: 0, win_rate: "0%",
  current_streak: 0, best_streak: 0, total_won_coins: 0,
};

export default function MatchesPage() {
  const router = useRouter();
  const { userId, refreshWallet } = useApp();

  const [stats, setStats] = useState<Stats>(EMPTY);
  const [history, setHistory] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const loadStats = async () => {
      try {
        const res = await fetch("/api/ludo/stats", {
          headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.data) {
          setStats({ ...EMPTY, ...(data.data.stats ?? {}) });
          setHistory(Array.isArray(data.data.history) ? data.data.history : []);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to load matches stats:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();
    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  useEffect(() => { if (userId) refreshWallet(); }, [userId, refreshWallet]);

  const refresh = () => { setLoading(true); setError(false); setReloadKey(k => k + 1); };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      <div className="relative z-10 mx-auto w-full max-w-app px-4 pt-4 space-y-4 hub-pad-bottom-lg select-none">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => router.push("/games/profile")}
              aria-label="Back to profile"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-purple-500/35 bg-slate-900/70 text-purple-300"
            >
              <ChevronLeftIcon size={17} />
            </motion.button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-50">Battle History</h1>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-purple-400">
                Ludo Clash · Match Logs
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.92, rotate: -25 }}
            onClick={refresh}
            aria-label="Refresh history"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-purple-500/35 bg-slate-900/70 text-purple-300"
          >
            <RefreshIcon size={15} className={loading ? "animate-spin" : ""} />
          </motion.button>
        </motion.div>

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="surface-glass grid grid-cols-4 gap-1 rounded-3xl px-3 py-4 text-center"
        >
          {[
            { label: "Battles", value: stats.total_matches, tone: "text-slate-100" },
            { label: "Wins", value: stats.wins, tone: "text-emerald-400" },
            { label: "Losses", value: stats.losses, tone: "text-red-400" },
            { label: "Win Rate", value: stats.win_rate, tone: "text-purple-300" },
          ].map((cell, i) => (
            <motion.div
              key={cell.label}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.05 }}
            >
              <span className={`block text-sm font-black tabular-nums ${cell.tone}`}>{cell.value}</span>
              <span className="mt-0.5 block text-[8px] font-black uppercase tracking-wider text-slate-500">
                {cell.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Streaks + Won Coins ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-3 gap-2.5"
        >
          <div className="surface-glass rounded-2xl px-3 py-3 text-center">
            <span className="block text-sm font-black text-emerald-400"><SymbolIcon name="streak" size={14} /> {stats.current_streak}</span>
            <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Streak</span>
          </div>
          <div className="surface-glass rounded-2xl px-3 py-3 text-center">
            <span className="block text-sm font-black text-amber-400"><SymbolIcon name="award" size={14} /> {stats.best_streak}</span>
            <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Best</span>
          </div>
          <div className="surface-glass rounded-2xl px-3 py-3 text-center">
            <span className="flex items-center justify-center gap-1 text-sm font-black tabular-nums text-amber-400">
              <TokenIcon size={13} /> {stats.total_won_coins.toLocaleString()}
            </span>
            <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Won Coins</span>
          </div>
        </motion.div>

        {/* ── History list ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="px-0.5 text-[10px] font-black uppercase tracking-widest text-purple-300">Match History</h2>

          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-2xl border border-slate-800/60 bg-slate-950/40" />
              ))}
            </div>
          ) : error ? (
            <div className="surface-glass space-y-3 rounded-3xl p-6 text-center">
              <p className="text-xs font-bold text-slate-300">Match history load nahi ho payi.</p>
              <button
                onClick={refresh}
                className="rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="surface-glass flex flex-col items-center gap-3 rounded-3xl px-6 py-10 text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10">
                <LudoIcon size={44} className="text-purple-300/80" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-200">No matches yet</h4>
                <p className="mx-auto mt-1 max-w-[240px] text-[10px] font-medium leading-relaxed text-slate-500">
                  Compete in Ludo Clash — every finished battle and Coin result lands here.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push("/games")}
                className="h-9 rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 px-4 text-[10px] font-black uppercase tracking-widest text-white"
              >
                Enter the arena
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              {history.map((match, i) => {
                const isWin = match.result === "win";
                const net = isWin ? Math.max(0, (match.reward ?? 0) - (match.stake ?? 0)) : -(match.stake ?? 0);
                return (
                  <motion.div
                    key={match.id ?? i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.35) }}
                    className="surface-glass relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl p-3.5"
                  >
                    <span
                      className="absolute left-0 top-0 h-full w-1"
                      style={{ background: isWin ? "#10B981" : "#EF4444" }}
                    />

                    <div className="flex min-w-0 items-center gap-3 pl-1">
                      <div className="h-10 w-10 flex-none overflow-hidden rounded-xl border border-purple-500/20 bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={match.opponent_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=Opponent`}
                          alt="Opponent"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-extrabold text-slate-100">
                            {match.opponent_name || "Opponent"}
                          </span>
                          <span
                            className="flex-none rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider"
                            style={{
                              background: isWin ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                              color: isWin ? "#10B981" : "#EF4444",
                            }}
                          >
                            {isWin ? "Victory" : "Defeat"}
                          </span>
                        </div>
                        <span className="mt-0.5 block text-[9px] font-bold text-slate-500">
                          {new Date(match.created_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })} · stake {match.stake}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-none items-center gap-1 text-right">
                      <CoinIcon size={12} className={isWin ? "text-emerald-400" : "text-slate-500"} />
                      <span className={`text-xs font-black tabular-nums ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                        {isWin ? `+${net}` : net}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty-state fallback icon (kept for design parity) */}
        {!loading && !error && history.length === 0 && (
          <div className="flex justify-center opacity-40">
            <BattleLogIcon size={18} className="text-purple-400" />
          </div>
        )}
      </div>
    </div>
  );
}
