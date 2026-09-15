"use client";

/**
 * LUDZO — Ludo Lobby (the "Play" tab)
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the ONLY thing the Play tab shows: Ludo. No "coming soon" shelf, no
 * other games — Ludo is the product, so the page opens straight into it.
 *
 * LOGIC IS UNCHANGED from the previous lobby (app/games/page.tsx):
 *   • GET  /api/ludo/room/active   → unfinished match always wins over the lobby
 *   • POST /api/ludo/queue/join    → stake escrow + matchmaking
 *   • GET  /api/ludo/queue/status  → poll (1.5s) for match / cancel
 *   • POST /api/ludo/queue/cancel  → refund
 * Only the presentation layer was rebuilt:
 *   • stake picker is INLINE (no bottom sheet that the nav bar covered and
 *     which made the lower stake options untappable)
 *   • modals sit on z-[100] with safe-area padding so nothing overlaps them
 *   • fully responsive (single 480px column, 2-col stake grid, fluid heights)
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { CoinIcon } from "@/components/ui/Icons";
import { LudoIcon, DiceIcon, ArenaHomeIcon, TokenIcon } from "@/components/gaming/GamingIcons";

/** Must match the CHECK constraint on ludo_rooms.stake / ludo_queues.stake. */
const STAKES = [50, 100, 200, 500, 1000, 2000, 5000];

/** Platform take, mirrored from settle_ludo_match(). Display only. */
const PLATFORM_FEE = 0.02;

/** How often we ask the server whether an opponent was found. */
const QUEUE_POLL_MS = 1500;

const payoutFor = (stake: number) => Math.floor(stake * 2 * (1 - PLATFORM_FEE));

const HOW_TO_PLAY = [
  { icon: "🎲", text: "Roll a 6 to bring a token out of the yard" },
  { icon: "🎯", text: "Both tokens must reach home to win the pool" },
  { icon: "🔁", text: "A 6, a capture or a finished token grants a bonus roll" },
  { icon: "⚠️", text: "Three 6s in a row — the third one is forfeited" },
  { icon: "🛡️", text: "★ cells are safe — nobody can capture you there" },
  { icon: "⏱️", text: "18s per turn, 8 min per match, 3 hearts" },
];

export default function LudoLobby() {
  const router = useRouter();
  const { wallet, refreshWallet, userId, user } = useApp();

  // Stake selection
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [highlight, setHighlight]       = useState(false);

  // Matchmaking queue
  const [queueId, setQueueId]       = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueTimer, setQueueTimer] = useState(0);
  const [joining, setJoining]       = useState(false);

  const stakesRef = useRef<HTMLDivElement | null>(null);

  const playSound = (soundName: string) => {
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {
        console.log(`[Audio System] Sound '${soundName}.mp3' not playable — add the file to /public/sounds/ to enable it.`);
      });
    } catch {
      console.log(`[Audio System] Play failed for '${soundName}.mp3'`);
    }
  };

  // ── Always show fresh balances on entry (post-match, deposits, …) ───────────
  useEffect(() => {
    if (userId) refreshWallet();
  }, [userId, refreshWallet]);

  // ── Reconnect: an unfinished match always wins over the lobby ───────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/ludo/room/active", {
          headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.success && data.has_active_room) {
          router.replace(`/games/game/${data.room_id}`);
        }
      } catch { /* offline — stay in the lobby */ }
    };
    check();
    return () => { cancelled = true; };
  }, [userId, router]);

  // ── Queue elapsed-seconds ticker ────────────────────────────────────────────
  useEffect(() => {
    if (!isQueueing) { setQueueTimer(0); return; }
    const interval = setInterval(() => setQueueTimer((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isQueueing]);

  // ── Queue status polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isQueueing || !queueId) return;

    let inFlight = false;

    const checkQueueStatus = async () => {
      if (inFlight) return;              // never overlap polls
      inFlight = true;
      try {
        const res = await fetch(`/api/ludo/queue/status?queue_id=${queueId}`, {
          headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId || "" },
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!data.success) return;

        if (data.matched && data.room_id) {
          setIsQueueing(false);
          setQueueId(null);
          playSound("match-found");
          router.push(`/games/game/${data.room_id}`);
        } else if (data.cancelled) {
          setIsQueueing(false);
          setQueueId(null);
          refreshWallet();               // stake was refunded by the server
          showToast("Matchmaking cancelled — stake refunded.", "info");
        }
      } catch (err) {
        console.error("Queue poll error:", err);
      } finally {
        inFlight = false;
      }
    };

    const pollInterval = setInterval(checkQueueStatus, QUEUE_POLL_MS);
    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQueueing, queueId, userId]);

  // ── Join a queue ────────────────────────────────────────────────────────────
  const handleRegister = async (stake: number) => {
    if (!userId) {
      showToast("Authentication error. Please reload the app.", "error");
      return;
    }
    if (joining) return;                 // double-tap guard

    const coinBalance = wallet?.coin_balance ?? 0;
    if (coinBalance < stake) {
      showToast(`Insufficient balance. You need ${stake} Coins to play.`, "error");
      setShowConfirm(false);
      return;
    }

    setJoining(true);
    try {
      const res = await fetch("/api/ludo/queue/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ stake }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedStake(stake);
        setShowConfirm(false);
        refreshWallet();                 // stake has been escrowed server-side

        if (data.matched && data.room_id) {
          playSound("match-found");
          router.push(`/games/game/${data.room_id}`);
        } else {
          setQueueId(data.queue_id ?? null);
          setIsQueueing(true);
          setQueueTimer(0);
          showToast(`${stake} Coins staked. Searching for an opponent…`, "success");
        }
      } else {
        // 400 + room_id means "you are already in a live match" — go play it.
        if (data.room_id) {
          router.replace(`/games/game/${data.room_id}`);
          return;
        }
        showToast(data.error || "Failed to join queue.", "error");
      }
    } catch (err) {
      console.error("Register match error:", err);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setJoining(false);
    }
  };

  // ── Leave the queue (server refunds the stake) ──────────────────────────────
  const handleCancelMatchmaking = async () => {
    if (!queueId) {
      setIsQueueing(false);
      return;
    }
    try {
      const res = await fetch("/api/ludo/queue/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || "",
        },
        body: JSON.stringify({ queue_id: queueId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsQueueing(false);
        setQueueId(null);
        refreshWallet();
        showToast("Matchmaking cancelled. Coins refunded.", "info");
      } else {
        setIsQueueing(false);
        setQueueId(null);
        refreshWallet();
        showToast(data.error || "Could not cancel — you may already be matched.", "info");
      }
    } catch (err) {
      console.error("Cancel matchmaking error:", err);
      showToast("Could not reach the server. Please try again.", "error");
    }
  };

  const coinBalance = wallet?.coin_balance ?? 0;
  const wonCoins    = wallet?.won_coins_balance ?? 0;

  const handlePlayTap = () => {
    if (selectedStake) {
      setShowConfirm(true);
      return;
    }
    stakesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 1400);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      {/* Ambient arena light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-app px-4 pt-4 space-y-4 hub-pad-bottom-lg select-none">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-11 w-11 flex-none overflow-hidden rounded-2xl border border-purple-500/50 bg-slate-900 shadow-[0_0_16px_rgba(168,85,247,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`}
                alt="Player"
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`; }}
              />
              <span className="absolute -bottom-px left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-black leading-tight tracking-tight text-slate-50">
                {user?.first_name ?? "Ludo Arena"}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5">
                <CoinIcon size={12} className="flex-none text-amber-400" />
                <span className="text-[11px] font-black tabular-nums text-amber-400">{coinBalance.toLocaleString()}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">coins</span>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => router.push("/games/home")}
            className="flex flex-none items-center gap-1.5 rounded-xl border border-purple-500/35 bg-slate-900/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-300 transition-colors hover:border-purple-400/60 hover:text-white"
          >
            <ArenaHomeIcon size={13} />
            Arena
          </motion.button>
        </motion.div>

        {/* ── Balance strip ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="surface-glass rounded-2xl px-4 py-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Playable Coins</span>
            <div className="mt-1 flex items-center gap-1.5">
              <CoinIcon size={16} className="text-amber-400" />
              <span className="text-lg font-black tabular-nums text-white">{coinBalance.toLocaleString()}</span>
            </div>
          </div>
          <div className="surface-glass rounded-2xl px-4 py-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">Won Coins</span>
            <div className="mt-1 flex items-center gap-1.5">
              <TokenIcon size={16} className="text-purple-300" />
              <span className="text-lg font-black tabular-nums text-purple-300">{wonCoins.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Hero: Ludo ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="arena-glow relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-950/80 via-slate-950 to-slate-950 shadow-[0_18px_50px_-24px_rgba(168,85,247,0.8)]"
        >
          {/* board watermark */}
          <div className="pointer-events-none absolute -right-6 -top-4 opacity-[0.16]">
            <LudoIcon size={148} className="text-purple-300" />
          </div>

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Ludo 1v1</span>
            </div>

            <h2 className="mt-2 text-2xl font-black leading-none tracking-tight text-white">LUDO CLASH</h2>
            <p className="mt-1.5 max-w-[260px] text-[11px] font-medium leading-relaxed text-slate-300">
              Stake Coins, get matched in seconds and race your tokens home. Winner takes the pool.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["2 Players", "8 min cap", "18s / turn", "3 ❤ lives"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400"
                >
                  {chip}
                </span>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.975 }}
              whileHover={{ scale: 1.01 }}
              onClick={handlePlayTap}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_30px_-10px_rgba(168,85,247,0.9)]"
            >
              <DiceIcon size={17} />
              {selectedStake ? `Play for ${selectedStake} Coins` : "Play Ludo Now"}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stakes (inline — tappable, no bottom sheet) ───────────────────── */}
        <div ref={stakesRef} className="space-y-2.5 scroll-mt-4">
          <div className="flex items-end justify-between px-0.5">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-purple-300">Choose your stake</h3>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Winner receives 98% of the pool</p>
            </div>
            <AnimatePresence>
              {highlight && (
                <motion.span
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] font-black uppercase tracking-wider text-amber-400"
                >
                  ↓ Tap a stake
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {STAKES.map((stake, i) => {
              const affordable = coinBalance >= stake;
              const isPicked   = selectedStake === stake;

              return (
                <motion.button
                  key={stake}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 + i * 0.04, duration: 0.3 }}
                  whileTap={affordable ? { scale: 0.97 } : undefined}
                  disabled={!affordable}
                  onClick={() => { setSelectedStake(stake); setShowConfirm(true); }}
                  className={[
                    "relative overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-all",
                    affordable
                      ? "border-slate-800 bg-slate-900/50 hover:border-purple-500/50 hover:bg-purple-950/25"
                      : "cursor-not-allowed border-slate-900 bg-slate-950/50 opacity-45",
                    isPicked ? "ring-1 ring-purple-400/70" : "",
                    highlight && affordable && !isPicked ? "ring-1 ring-amber-400/50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-widest text-purple-400">Stake</span>
                      <span className="mt-0.5 block text-base font-black leading-none tabular-nums text-white">
                        {stake.toLocaleString()}
                      </span>
                      <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        Wins {payoutFor(stake).toLocaleString()} · Won Coins
                      </span>
                    </div>
                    <CoinIcon size={18} className={affordable ? "text-amber-400" : "text-slate-600"} />
                  </div>

                  {!affordable && (
                    <span className="mt-1.5 block text-[9px] font-black uppercase tracking-wider text-red-400">
                      Need {(stake - coinBalance).toLocaleString()} more
                    </span>
                  )}

                  {isPicked && (
                    <motion.span
                      layoutId="stake-picked"
                      className="pointer-events-none absolute inset-0 rounded-2xl border border-purple-400/60 bg-purple-500/10"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {coinBalance < STAKES[0] && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-center"
            >
              <p className="text-[11px] font-bold text-amber-300">
                You need at least {STAKES[0]} Coins to enter the arena.
              </p>
              <button
                onClick={() => router.push("/tasks")}
                className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200"
              >
                Earn Coins
              </button>
            </motion.div>
          )}
        </div>

        {/* ── How to play ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="surface-glass rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-purple-300">How to play</h3>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">2 tokens · 1v1</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {HOW_TO_PLAY.map((rule, i) => (
              <motion.div
                key={rule.text}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="flex items-start gap-2 rounded-xl border border-slate-800/70 bg-slate-950/50 px-2.5 py-2"
              >
                <span className="mt-0.5 flex-none text-sm leading-none">{rule.icon}</span>
                <span className="text-[10px] font-semibold leading-snug text-slate-300">{rule.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── MATCH CONFIRMATION ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && selectedStake && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !joining && setShowConfirm(false)}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="surface-glass w-full max-w-sm rounded-3xl p-5"
            >
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
                  <DiceIcon size={22} className="text-purple-300" />
                </div>
                <h3 className="mt-3 text-sm font-black uppercase tracking-widest text-white">Match confirmation</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Your stake is held until the match is settled.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-y border-slate-800/70 py-3 text-[11px] font-semibold">
                <div className="flex justify-between text-slate-400">
                  <span>Your entry stake</span>
                  <span className="text-slate-200">{selectedStake.toLocaleString()} Coins</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Opponent entry stake</span>
                  <span className="text-slate-200">{selectedStake.toLocaleString()} Coins</span>
                </div>
                <div className="flex justify-between text-purple-300">
                  <span>Total pool</span>
                  <span>{(selectedStake * 2).toLocaleString()} Coins</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Platform fee</span>
                  <span>{Math.round(PLATFORM_FEE * 100)}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-900 pt-2 text-sm font-black text-amber-400">
                  <span>Winner receives</span>
                  <span className="tabular-nums">{payoutFor(selectedStake).toLocaleString()} Won Coins</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={joining}
                  className="h-11 rounded-xl border border-slate-800 bg-slate-900/80 text-[11px] font-black uppercase tracking-wider text-slate-400 transition-colors hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegister(selectedStake)}
                  disabled={joining}
                  className="h-11 rounded-xl border border-purple-400/25 bg-gradient-to-r from-purple-600 to-indigo-600 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:from-purple-500 disabled:opacity-60"
                >
                  {joining ? "Joining…" : "Join Match"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MATCHMAKING RADAR ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isQueueing && selectedStake && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="surface-glass flex w-full max-w-sm flex-col items-center space-y-5 rounded-3xl p-6 text-center"
            >
              <div className="relative flex h-28 w-28 items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-500"
                />
                <motion.div
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="absolute flex h-20 w-20 items-center justify-center rounded-full border border-purple-500/15 bg-purple-500/5"
                />
                <LudoIcon size={34} className="relative z-10 animate-pulse text-purple-300" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Searching for opponent…</h3>
                <p className="mx-auto max-w-[250px] text-[11px] font-semibold leading-relaxed text-slate-400">
                  Scanning lobbies for a {selectedStake.toLocaleString()} Coin match. A bot opponent is assigned if nobody joins in time.
                </p>
              </div>

              <div className="flex w-full items-center justify-center gap-6 py-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-purple-500 bg-slate-900 ring-4 ring-purple-500/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={user?.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`}
                      alt="Me"
                      className="h-full w-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`; }}
                    />
                  </div>
                  <span className="max-w-[76px] truncate text-[10px] font-extrabold text-slate-300">
                    {user?.first_name ?? "You"}
                  </span>
                </div>

                <div className="animate-pulse rounded-lg border border-purple-500/25 bg-purple-950/40 px-3 py-1 text-xs font-black text-purple-300">
                  VS
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full border-2 border-dashed border-slate-700 bg-slate-900 text-slate-600">
                    ?
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-500">Searching…</span>
                </div>
              </div>

              <div className="flex w-full items-center justify-between border-t border-purple-500/10 pt-2.5 font-mono text-[10px]">
                <span className="font-bold text-slate-500">Elapsed {queueTimer}s</span>
                <span className="font-black text-purple-300">Stake {selectedStake.toLocaleString()} Coins</span>
              </div>

              <button
                onClick={handleCancelMatchmaking}
                className="h-11 w-full rounded-xl border border-red-500/30 bg-slate-900/80 text-[10px] font-black uppercase tracking-widest text-red-400 transition-colors hover:border-red-500/60"
              >
                Cancel matchmaking
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
