"use client";
import SymbolIcon from "@/components/ui/SymbolIcon";

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
 *   • the entry confirmation and the matchmaking radar render through the shared
 *     <Sheet> (components/ui/Sheet) — viewport-capped panel, scrolling body,
 *     pinned action row — so no button can ever land under the fold again
 *   • fully responsive (single 480px column, 2-col stake grid, fluid heights)
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ui/Toast";
import Sheet from "@/components/ui/Sheet";
import { useApp } from "@/hooks/useApp";
import { CoinIcon } from "@/components/ui/Icons";
import { displayName } from "@/lib/utils";
import { LudoIcon, DiceIcon, ArenaHomeIcon, TokenIcon } from "@/components/gaming/GamingIcons";

/** Must match the CHECK constraint on ludo_rooms.stake / ludo_queues.stake. */
const STAKES = [50, 100, 200, 500, 1000, 2000, 5000];

/** Platform take, mirrored from settle_ludo_match(). Display only. */
const PLATFORM_FEE = 0.02;

/** How often we ask the server whether an opponent was found. */
const QUEUE_POLL_MS = 1500;

const payoutFor = (stake: number) => Math.floor(stake * 2 * (1 - PLATFORM_FEE));

const HOW_TO_PLAY = [
  { icon: "dice", text: "Roll a 6 to bring a token out of the yard" },
  { icon: "target", text: "Both tokens must reach home to win the pool" },
  { icon: "repeat", text: "A 6, a capture or a finished token grants a bonus roll" },
  { icon: "warning", text: "Three 6s in a row — the third one is forfeited" },
  { icon: "shield", text: "★ cells are safe — nobody can capture you there" },
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

  /** Matchmaking resilience: one long-search notice, one retry notice. */
  const stallNoticedRef  = useRef(false);
  const pollFailuresRef  = useRef(0);

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
    if (!isQueueing) {
      setQueueTimer(0);
      stallNoticedRef.current = false;
      pollFailuresRef.current = 0;
      return;
    }
    const interval = setInterval(() => setQueueTimer((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isQueueing]);

  // ── Long-search notice ──────────────────────────────────────────────────────
  // An arena opponent is seated between 20 s and 28 s, so anything past ~35 s
  // means matchmaking is stuck (server/queue issue) — tell the user instead of
  // letting the radar spin forever in silence.
  useEffect(() => {
    if (isQueueing && queueTimer >= 35 && !stallNoticedRef.current) {
      stallNoticedRef.current = true;
      showToast("Still searching — you can cancel matchmaking and try again.", "info");
    }
  }, [isQueueing, queueTimer]);

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

        if (!res.ok) {
          // Don't fail silently — a server error used to leave the radar
          // spinning with the stake escrowed and no explanation at all.
          pollFailuresRef.current += 1;
          if (pollFailuresRef.current === 3) {
            showToast("Matchmaking hiccup — still trying…", "info");
          }
          if (res.status === 401) {
            setIsQueueing(false);
            setQueueId(null);
            refreshWallet();
            showToast("Session expired. Please reload the app.", "error");
          }
          return;
        }

        const data = await res.json();
        pollFailuresRef.current = 0;

        if (!data.success) {
          if (data.error) console.warn("[matchmaking]", data.error, data.reason ?? "");
          return;
        }

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
        } else if (data.queue_id) {
          setQueueId(data.queue_id);
          setIsQueueing(true);
          setQueueTimer(0);
          showToast(`${stake} Coins staked. Searching for an opponent…`, "success");
        } else {
          // Accepted but no queue id — the radar could never poll. Never leave
          // the user stuck; the server refunds via the janitor if it did debit.
          refreshWallet();
          showToast("Could not start matchmaking. Please try again.", "error");
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
          className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-emerald-600/20 blur-3xl"
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
            <div className="relative h-11 w-11 flex-none overflow-hidden rounded-2xl border border-emerald-500/50 bg-slate-900 shadow-[0_0_16px_rgba(34,197,94,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user?.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`}
                alt="Player"
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`; }}
              />
              <span className="absolute -bottom-px left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
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
            className="flex flex-none items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-slate-900/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 transition-colors hover:border-emerald-400/60 hover:text-white"
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
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Won Coins</span>
            <div className="mt-1 flex items-center gap-1.5">
              <TokenIcon size={16} className="text-emerald-300" />
              <span className="text-lg font-black tabular-nums text-emerald-300">{wonCoins.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Hero: Ludo ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="arena-glow relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/80 via-slate-950 to-slate-950 shadow-[0_18px_50px_-24px_rgba(34,197,94,0.8)]"
        >
          {/* board watermark */}
          <div className="pointer-events-none absolute -right-6 -top-4 opacity-[0.16]">
            <LudoIcon size={148} className="text-emerald-300" />
          </div>

          <div className="relative z-10 p-5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Ludo 1v1</span>
            </div>

            <h2 className="mt-2 text-2xl font-black leading-none tracking-tight text-white">LUDO CLASH</h2>
            <p className="mt-1.5 max-w-[260px] text-[11px] font-medium leading-relaxed text-slate-300">
              Stake Coins, get matched in seconds and race your tokens home. Winner takes the pool.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["2 Players", "8 min cap", "18s / turn", "3 lives"].map((chip) => (
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
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-600 to-green-600 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_30px_-10px_rgba(34,197,94,0.9)]"
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
              <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-300">Choose your stake</h3>
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
                      ? "border-slate-800 bg-slate-900/50 hover:border-emerald-500/50 hover:bg-emerald-950/25"
                      : "cursor-not-allowed border-slate-900 bg-slate-950/50 opacity-45",
                    isPicked ? "ring-1 ring-emerald-400/70" : "",
                    highlight && affordable && !isPicked ? "ring-1 ring-amber-400/50" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-400">Stake</span>
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
                      className="pointer-events-none absolute inset-0 rounded-2xl border border-emerald-400/60 bg-emerald-500/10"
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
            <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-300">How to play</h3>
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
                <span className="mt-0.5 flex-none text-sm leading-none"><SymbolIcon name={rule.icon} size={17} /></span>
                <span className="text-[10px] font-semibold leading-snug text-slate-300">{rule.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── MATCH CONFIRMATION ─────────────────────────────────────────────── */}
      {/* Rendered through <Sheet>: the panel is capped to the visible viewport and
          only its body scrolls, so Cancel / Join can never end up under the fold
          or behind the hub nav on a short phone screen. */}
      <Sheet
        open={showConfirm && selectedStake !== null}
        onClose={() => !joining && setShowConfirm(false)}
        dismissable={!joining}
        title={selectedStake !== null ? `Enter for ${selectedStake.toLocaleString()} Coins` : "Match entry"}
        subtitle="Your stake is held in escrow until the match is settled."
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={joining}
              className="h-11 rounded-xl border text-[12px] font-semibold transition-opacity disabled:opacity-50"
              style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (selectedStake !== null) handleRegister(selectedStake); }}
              disabled={joining}
              className="h-11 rounded-xl text-[12px] font-semibold transition-opacity disabled:opacity-60"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
            >
              {joining ? "Joining…" : "Join match"}
            </button>
          </div>
        }
      >
        {selectedStake !== null && (
          <div>
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
              {[
                { label: "Your entry stake", value: `${selectedStake.toLocaleString()} Coins` },
                { label: "Opponent entry stake", value: `${selectedStake.toLocaleString()} Coins` },
                { label: "Total pool", value: `${(selectedStake * 2).toLocaleString()} Coins` },
                { label: "Platform fee", value: `${Math.round(PLATFORM_FEE * 100)}%` },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-[12px]"
                  style={{
                    background: "var(--bg-elevated)",
                    borderBottom: i < 3 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <div className="text-[var(--text-muted)]">{row.label}</div>
                  <div className="font-numeric font-semibold tabular-nums text-[var(--text-primary)]">{row.value}</div>
                </div>
              ))}
            </div>

            <div
              className="mt-2.5 flex items-center justify-between rounded-xl px-3 py-3"
              style={{ background: "var(--accent-soft)" }}
            >
              <div className="flex items-center gap-2">
                <TokenIcon size={16} className="text-[var(--accent)]" />
                <div className="text-[12px] font-medium text-[var(--text-primary)]">Winner receives</div>
              </div>
              <div className="font-numeric text-[13px] font-semibold tabular-nums text-[var(--accent)]">
                {payoutFor(selectedStake).toLocaleString()} Won Coins
              </div>
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
              Matching pairs you with a player on the same stake. If no live player connects within a few seconds an
              arena opponent takes the seat, and the stake is refunded if the match is cancelled before the first roll.
            </p>
          </div>
        )}
      </Sheet>

      {/* ── MATCHMAKING RADAR ──────────────────────────────────────────────── */}
      <Sheet
        open={isQueueing && selectedStake !== null}
        onClose={handleCancelMatchmaking}
        dismissable={false}
        variant="center"
        title="Searching for an opponent"
        subtitle={selectedStake !== null ? `Scanning lobbies for a ${selectedStake.toLocaleString()} Coin match.` : undefined}
        footer={
          <button
            type="button"
            onClick={handleCancelMatchmaking}
            className="h-11 w-full rounded-xl border text-[12px] font-semibold text-[#DC2626] transition-colors hover:bg-[rgba(239,68,68,0.08)]"
            style={{ borderColor: "rgba(239,68,68,0.35)" }}
          >
            Cancel matchmaking
          </button>
        }
      >
        <div className="flex flex-col items-center gap-5 py-1 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
            <motion.div
              animate={{ scale: [1, 1.14, 1] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute h-[68px] w-[68px] rounded-full"
              style={{ background: "var(--accent-soft)" }}
            />
            <LudoIcon size={30} className="relative z-10 text-[var(--accent)]" />
          </div>

          <div className="flex w-full items-center justify-center gap-5">
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <div
                className="h-12 w-12 overflow-hidden rounded-full"
                style={{ border: "2px solid var(--accent)", background: "var(--bg-elevated)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user?.photo_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId ?? "me"}`; }}
                />
              </div>
              <div className="max-w-[84px] truncate text-[11px] font-medium text-[var(--text-secondary)]">
                {displayName(user, "You")}
              </div>
            </div>

            <div
              className="flex-none rounded-lg px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              VS
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full text-sm"
                style={{ border: "2px dashed var(--border)", background: "var(--bg-elevated)", color: "var(--text-muted)" }}
              >
                ?
              </div>
              <div className="text-[11px] font-medium text-[var(--text-muted)]">Searching</div>
            </div>
          </div>

          <div
            className="flex w-full items-center justify-between border-t pt-3 text-[11px]"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="font-numeric tabular-nums text-[var(--text-muted)]">Elapsed {queueTimer}s</div>
            {selectedStake !== null && (
              <div className="font-numeric font-semibold tabular-nums text-[var(--text-secondary)]">
                Stake {selectedStake.toLocaleString()} Coins
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
