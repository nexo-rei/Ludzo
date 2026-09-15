"use client";

/**
 * LUDZO — Gaming Hub Home (/games/home)
 * ─────────────────────────────────────────────────────────────────────────────
 * Tab 1 of the 3-tab game section. It shows the player's live arena standing:
 *
 *   • Coins / Won Coins / USDT  ← wallets table via /api/wallet (DB = truth)
 *   • Battles / Wins / Win-rate ← ludo_stats via /api/ludo/stats
 *   • Recent battles preview    ← ludo_match_history
 *   • Live announcements        ← /api/home
 *
 * Won Coins used to render 0 everywhere because it was read from a localStorage
 * shadow value. It now always comes from the database.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApp } from "@/hooks/useApp";
import { CoinIcon } from "@/components/ui/Icons";
import { LudoIcon, BattleLogIcon, TokenIcon, DiceIcon, ChevronRightIcon } from "@/components/gaming/GamingIcons";

interface Stats {
  total_matches: number;
  wins: number;
  win_rate: string;
  total_won_coins: number;
}

interface RecentMatch {
  id: string;
  opponent_name: string;
  result: "win" | "loss";
  stake: number;
  reward: number;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
}

const EMPTY_STATS: Stats = { total_matches: 0, wins: 0, win_rate: "0%", total_won_coins: 0 };

export default function GamingHomePage() {
  const router = useRouter();
  const { user, userId, wallet, refreshWallet } = useApp();

  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [recent, setRecent] = useState<RecentMatch[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [statsRes, homeRes] = await Promise.all([
        fetch("/api/ludo/stats", {
          headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
          cache: "no-store",
        }),
        fetch("/api/home", { headers: { "x-user-id": userId }, cache: "no-store" }),
      ]);

      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success && json.data) {
          setStats({ ...EMPTY_STATS, ...(json.data.stats ?? {}) });
          setRecent(Array.isArray(json.data.history) ? json.data.history.slice(0, 3) : []);
        }
      }

      if (homeRes.ok) {
        const json = await homeRes.json();
        if (json.success && Array.isArray(json.data?.announcements)) {
          setAnnouncements(json.data.announcements.slice(0, 2));
        }
      }
    } catch { /* silent — the dashboard still renders with cached values */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (userId) refreshWallet(); }, [userId, refreshWallet]);

  const coins    = wallet?.coin_balance ?? 0;
  const wonCoins = wallet?.won_coins_balance ?? 0;
  const usdt     = wallet?.usdt_balance ?? 0;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl"
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-app px-4 pt-4 space-y-4 hub-pad-bottom-lg select-none">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-12 w-12 flex-none overflow-hidden rounded-2xl border border-purple-500/50 bg-slate-900 shadow-[0_0_18px_rgba(168,85,247,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`}
                alt="Player"
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`; }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-[15px] font-black leading-tight tracking-tight text-slate-50">
                  @{(user?.first_name ?? "player").toLowerCase()}
                </h1>
                <span className="rounded-full border border-purple-500/30 bg-purple-600/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-purple-300">
                  Pro
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">
                Gamer Lobby
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => router.push("/home")}
            className="flex flex-none items-center gap-1 rounded-xl border border-purple-500/35 bg-slate-900/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-purple-300 transition-colors hover:border-purple-400/60 hover:text-white"
          >
            Exit Hub
          </motion.button>
        </motion.div>

        {/* ── Balances ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="surface-glass overflow-hidden rounded-3xl p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Playable Coins</span>
              <div className="mt-1 flex items-center gap-2">
                <CoinIcon size={22} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <motion.span
                  key={coins}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-black tabular-nums tracking-tight text-white"
                >
                  {coins.toLocaleString()}
                </motion.span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">Won Coins</span>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <TokenIcon size={18} className="text-purple-300" />
                <motion.span
                  key={wonCoins}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-black tabular-nums tracking-tight text-purple-300"
                >
                  {wonCoins.toLocaleString()}
                </motion.span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-purple-500/10 pt-3">
            <span className="text-[10px] font-bold tracking-wide text-purple-300/90">
              ⚡ 100 Won Coins = $1.00 USDT
            </span>
            <span className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1 font-mono text-[9px] font-bold text-emerald-400">
              Cash ${usdt.toFixed(2)}
            </span>
          </div>
        </motion.div>

        {/* ── Quick stats ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2.5"
        >
          {[
            { label: "Battles", value: loading ? "—" : stats.total_matches },
            { label: "Wins", value: loading ? "—" : stats.wins, tone: "text-emerald-400" },
            { label: "Win Rate", value: loading ? "—" : stats.win_rate, tone: "text-amber-400" },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/games/matches")}
              className="surface-glass rounded-2xl px-3 py-3 text-center"
            >
              <span className={`block text-base font-black tabular-nums ${item.tone ?? "text-slate-100"}`}>
                {item.value}
              </span>
              <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">
                {item.label}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Featured: Ludo ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="arena-glow relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-950 to-slate-950 shadow-[0_18px_50px_-24px_rgba(124,58,237,0.9)]"
        >
          <div className="pointer-events-none absolute -right-8 -top-6 opacity-20">
            <LudoIcon size={150} className="text-purple-300" />
          </div>

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-1.5">
              <span className="animate-pulse rounded bg-purple-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                Featured
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                Multiplayer PvP
              </span>
            </div>

            <h2 className="mt-2 text-xl font-black leading-none tracking-tight text-white">LUDO CLASH</h2>
            <p className="mt-1.5 max-w-[240px] text-[11px] font-medium leading-relaxed text-slate-300">
              Battle live players, roll the dice and claim the Coin pool instantly.
            </p>

            <motion.button
              whileTap={{ scale: 0.975 }}
              onClick={() => router.push("/games")}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_30px_-12px_rgba(168,85,247,0.9)]"
            >
              <DiceIcon size={16} />
              Play Ludo Now
            </motion.button>
          </div>
        </motion.div>

        {/* ── Recent battles ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2.5"
        >
          <button
            onClick={() => router.push("/games/matches")}
            className="flex w-full items-center justify-between px-0.5"
          >
            <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-300">Recent Battles</h3>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
              All <ChevronRightIcon size={13} />
            </span>
          </button>

          {recent.length === 0 ? (
            <div className="surface-glass flex flex-col items-center gap-2 rounded-2xl px-4 py-6 text-center">
              <BattleLogIcon size={26} className="text-purple-400/70" />
              <p className="text-[11px] font-bold text-slate-300">No battles yet</p>
              <p className="max-w-[220px] text-[10px] font-medium leading-relaxed text-slate-500">
                Your finished matches and Coin results will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((m, i) => {
                const isWin = m.result === "win";
                const net = isWin ? Math.max(0, (m.reward ?? 0) - (m.stake ?? 0)) : -(m.stake ?? 0);
                return (
                  <motion.button
                    key={m.id ?? i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.05 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => router.push("/games/matches")}
                    className="surface-glass flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[11px] font-black"
                        style={{
                          background: isWin ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                          color: isWin ? "#10B981" : "#EF4444",
                          border: `1px solid ${isWin ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                        }}
                      >
                        {isWin ? "W" : "L"}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-extrabold text-slate-100">
                          vs {m.opponent_name || "Opponent"}
                        </span>
                        <span className="block text-[10px] font-semibold text-slate-500">
                          {new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·
                          {" "}stake {m.stake}
                        </span>
                      </div>
                    </div>
                    <span className={`flex-none text-xs font-black tabular-nums ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                      {isWin ? "+" : ""}{net}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Announcements ────────────────────────────────────────────────── */}
        {announcements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="space-y-2.5"
          >
            <h3 className="px-0.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
              Arena Announcements
            </h3>
            {announcements.map((a) => (
              <div key={a.id} className="surface-glass flex items-start gap-3 rounded-2xl p-4">
                <div className="mt-0.5 flex-none rounded-lg border border-purple-500/25 bg-purple-500/10 p-2 text-purple-300">
                  <BattleLogIcon size={14} active />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold leading-tight text-slate-100">{a.title}</h4>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-400">{a.description}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
