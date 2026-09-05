"use client";

/**
 * LUDZO — Ludo Arena Lobby
 * ─────────────────────────────────────────────────────────────────────────────
 * This page is the LOBBY ONLY: pick a stake → join the queue → get routed to
 * /games/game/[roomId], which is the single authoritative game screen.
 *
 * A previous version of this file also carried a second, complete copy of the
 * game (board renderer, dice, forfeit, reactions, winner overlay — ~700 lines).
 * It was unreachable: `setRoomId()` was never called with a real value, so
 * `gameActive && roomState` could never be true. It was also actively harmful:
 *
 *   • it used a THIRD track convention (`position % 52` / `(26 + position) % 52`)
 *     and a different player-2 home path (`x: 14 - (position - 51)`, which runs
 *     into the centre column), so any future edit to "the board" could land in
 *     the wrong copy;
 *   • it reused the `showStakes` flag for both the stake picker and the reaction
 *     drawer (`onClick={() => setShowStakes(!showStakes)} ("reused toggle"),
 *     which popped the stake-selection modal over a live match;
 *   • it read `roomState.player_2_profile.avatar` with no optional chaining.
 *
 * All of that is gone. Game rendering lives in exactly one place now.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, GamesIcon } from "@/components/ui/Icons";

/** Must match the CHECK constraint on ludo_rooms.stake / ludo_queues.stake. */
const STAKES = [50, 100, 200, 500, 1000, 2000, 5000];

/** Platform take, mirrored from settle_ludo_match(). Display only. */
const PLATFORM_FEE = 0.02;

/** How often we ask the server whether an opponent was found. */
const QUEUE_POLL_MS = 1500;

export default function GamesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub, wallet, refreshWallet, userId } = useApp();

  // Stake selection
  const [showStakes, setShowStakes]     = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);

  // Matchmaking queue
  const [queueId, setQueueId]         = useState<string | null>(null);
  const [isQueueing, setIsQueueing]   = useState(false);
  const [queueTimer, setQueueTimer]   = useState(0);
  const [joining, setJoining]         = useState(false);

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

  // ── Force Gaming Hub mode while on this page ────────────────────────────────
  useEffect(() => {
    if (!isInGamingHub) setIsInGamingHub(true);
  }, [isInGamingHub, setIsInGamingHub]);

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
        setShowStakes(false);
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
        // "already matched" is the common case — send the player into the room.
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

  return (
    <AppShell>
      <div className="relative min-h-screen pb-24 gaming-gradient-bg px-4 py-4 space-y-6 select-none text-white overflow-x-hidden">

        {/* Ambient background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute top-2/3 left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 space-y-5">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Ludo Arena</h1>
              <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest mt-0.5">Real PvP Matchmaking</p>
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
          </div>

          {/* Ludo Clash Featured Game Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-gradient-to-b from-purple-950/80 to-slate-950 shadow-[0_16px_48px_rgba(168,85,247,0.2)]"
          >
            <div className="p-5 border-b border-purple-500/10 bg-purple-950/20 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-purple-500/40 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                  <svg width="46" height="40" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" rx="12" fill="#0F172A" stroke="#334155" strokeWidth="2.5"/>
                    <rect x="6" y="6" width="34" height="36" rx="4" fill="#EF4444" stroke="#fff" strokeWidth="1.5"/>
                    <rect x="60" y="6" width="34" height="36" rx="4" fill="#22C55E" stroke="#fff" strokeWidth="1.5"/>
                    <rect x="6" y="58" width="34" height="36" rx="4" fill="#EAB308" stroke="#fff" strokeWidth="1.5"/>
                    <rect x="60" y="58" width="34" height="36" rx="4" fill="#3B82F6" stroke="#fff" strokeWidth="1.5"/>
                    <polygon points="50,50 40,40 60,40" fill="#22C55E"/>
                    <polygon points="50,50 40,60 60,60" fill="#EAB308"/>
                    <polygon points="50,50 40,40 40,60" fill="#EF4444"/>
                    <polygon points="50,50 60,40 60,60" fill="#3B82F6"/>
                    <rect x="40" y="40" width="20" height="20" stroke="#fff" strokeWidth="1"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">LIVE MATCHMAKING</span>
                    <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-wider">LUDO 1V1</span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1 leading-none tracking-tight">Ludo Clash</h3>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">Head-to-head board battles</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Settle scores and win prizes by outsmarting real opponents or bots. Roll the dice, capture tokens on the tracks, and bring all four pieces home safely!
              </p>

              {/* 1v1 · 8-minute cap · 3 hearts — matches lib/ludo-engine.ts */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400">2 Players</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400">8 min cap</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400">18s per turn</span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-400">3 ❤ lives</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <span className="text-slate-500 text-[9px] block font-bold uppercase">Dashboard Coins</span>
                  <span className="text-slate-200 text-xs font-black block mt-0.5">{wallet?.coin_balance ?? 0}</span>
                </div>
                <div className="py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <span className="text-purple-400 text-[9px] block font-bold uppercase">Won Coins Balance</span>
                  <span className="text-amber-400 text-xs font-black block mt-0.5">{wallet?.won_coins_balance ?? 0}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowStakes(true)}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_4px_24px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 border border-purple-400/40"
              >
                <GamesIcon size={16} />
                PLAY LUDO NOW
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* --- STAKES SELECTION POPUP --- */}
        <AnimatePresence>
          {showStakes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center"
              onClick={() => setShowStakes(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[480px] bg-slate-950 rounded-t-3xl border-t border-purple-500/20 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Select Game Stakes</h3>
                  <button onClick={() => setShowStakes(false)} className="text-xs text-slate-500 font-extrabold hover:text-white uppercase p-1">Close</button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto scrollbar-none py-1">
                  {STAKES.map((stake) => {
                    const affordable = (wallet?.coin_balance ?? 0) >= stake;
                    return (
                      <button
                        key={stake}
                        disabled={!affordable}
                        onClick={() => {
                          setSelectedStake(stake);
                          setShowConfirm(true);
                        }}
                        className={`py-3 px-4 rounded-xl border transition-all text-left flex items-center justify-between ${
                          affordable
                            ? "border-slate-800 bg-slate-900/40 hover:border-purple-500/40 hover:bg-purple-950/20"
                            : "border-slate-900 bg-slate-950/40 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div>
                          <span className="text-[10px] text-purple-400 font-black uppercase block">Stake</span>
                          <span className="text-sm font-black text-white">{stake} Coins</span>
                          {!affordable && (
                            <span className="text-[8px] text-red-400 font-bold uppercase block mt-0.5">Insufficient</span>
                          )}
                        </div>
                        <CoinIcon size={18} className="text-amber-400" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MATCH CONFIRMATION POPUP --- */}
        <AnimatePresence>
          {showConfirm && selectedStake && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-slate-950/95 p-6 space-y-5 text-center shadow-[0_24px_48px_rgba(168,85,247,0.15)]"
              >
                <h3 className="text-base font-black tracking-tight text-white uppercase">Match Confirmation</h3>
                <p className="text-xs text-slate-400 leading-snug">Your stake is held until the match is settled.</p>

                <div className="space-y-2 text-xs font-semibold py-3 border-y border-slate-800/60">
                  <div className="flex justify-between text-slate-400">
                    <span>Your entry stake:</span>
                    <span className="text-slate-200">{selectedStake} Coins</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Opponent entry stake:</span>
                    <span className="text-slate-200">{selectedStake} Coins</span>
                  </div>
                  <div className="flex justify-between text-purple-400">
                    <span>Total pool:</span>
                    <span className="text-purple-300">{selectedStake * 2} Coins</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Platform fee:</span>
                    <span>{Math.round(PLATFORM_FEE * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-amber-400 text-sm font-black pt-1 border-t border-slate-900">
                    <span>Winner receives:</span>
                    <span>{Math.floor(selectedStake * 2 * (1 - PLATFORM_FEE))} Won Coins</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={joining}
                    className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRegister(selectedStake)}
                    disabled={joining}
                    className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-black uppercase tracking-wider border border-purple-400/20 disabled:opacity-60"
                  >
                    {joining ? "Joining…" : "Join Match"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MATCHMAKING RADAR LOADER --- */}
        <AnimatePresence>
          {isQueueing && selectedStake && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-slate-950 p-6 flex flex-col items-center text-center space-y-6 shadow-[0_24px_64px_rgba(168,85,247,0.3)]">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-purple-500/20 border-t-purple-500"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute w-20 h-20 rounded-full border border-purple-500/10 bg-purple-500/5 flex items-center justify-center"
                  />
                  <GamesIcon size={32} className="text-purple-400 relative z-10 animate-pulse" />
                </div>

                <div className="space-y-1.5 w-full">
                  <h3 className="text-base font-black text-white uppercase">SEARCHING FOR OPPONENT…</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed max-w-[240px] mx-auto">
                    Scanning lobbies for a {selectedStake} Coin match. A bot opponent is assigned if nobody joins in time.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-6 w-full py-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full border-2 border-purple-500 flex items-center justify-center text-xs font-black text-white bg-gradient-to-tr from-purple-600 to-indigo-600 ring-4 ring-purple-500/20">
                      ME
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-300 truncate max-w-[70px]">@you</span>
                  </div>

                  <div className="text-xs font-black text-purple-400 px-3 py-1 bg-purple-950/30 border border-purple-500/20 rounded-lg animate-pulse">VS</div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 bg-slate-900 animate-pulse">?</div>
                    <span className="text-[10px] font-extrabold text-slate-500">Searching…</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-500/10 w-full flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-500 font-bold">Elapsed: {queueTimer}s</span>
                  <span className="text-purple-400 font-black">Stake: {selectedStake} Coins</span>
                </div>

                <button
                  onClick={handleCancelMatchmaking}
                  className="w-full h-10 rounded-xl bg-slate-900 border border-red-500/30 hover:border-red-500/60 text-red-400 text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  CANCEL MATCHMAKING
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}
