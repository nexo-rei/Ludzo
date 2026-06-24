"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, GamesIcon } from "@/components/ui/Icons";

const STAKES = [50, 100, 200, 500, 1000, 2000, 5000];

export default function GamesPage() {
  const router = useRouter();
  const { isInGamingHub, setIsInGamingHub, wallet, refreshWallet, userId } = useApp();

  // Dialog / Modal overlays
  const [showStakes, setShowStakes] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedStake, setSelectedStake] = useState<number | null>(null);

  // Matchmaking Queue States
  const [queueId, setQueueId] = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueTimer, setQueueingTimer] = useState(0);

  // (room redirect handled in queue polling → router.push)

  // Sound play helper with clean console locations logging
  const playSound = (soundName: string) => {
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {
        console.log(`[Audio System] Note: Sound '${soundName}.mp3' triggered successfully. Upload custom mp3 in '/public/sounds/' to replace.`);
      });
    } catch {
      console.log(`[Audio System] Play failed for '${soundName}.mp3'`);
    }
  };

  // Haptic Feedback Viber helper
  const triggerVibe = (type: "dice" | "kill" | "victory" | "defeat") => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        switch (type) {
          case "dice":
            window.navigator.vibrate(30);
            break;
          case "kill":
            window.navigator.vibrate([100, 50, 100]);
            break;
          case "victory":
            window.navigator.vibrate([200, 100, 200, 100, 300]);
            break;
          case "defeat":
            window.navigator.vibrate([150, 150, 150]);
            break;
        }
      } catch { /* Silent fail if unsupported */ }
    }
  };

  // Automatically force Gaming Hub mode
  useEffect(() => {
    if (!isInGamingHub) {
      setIsInGamingHub(true);
    }
  }, [isInGamingHub, setIsInGamingHub]);

  // On mount: check if user has an active room and redirect back in
  useEffect(() => {
    if (!userId) return;
    const checkActiveRoom = async () => {
      try {
        const res = await fetch("/api/ludo/room/active", {
          headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.has_active_room) {
            console.log("[Ludzo] Reconnecting to active room:", data.room_id);
            router.replace(`/games/game/${data.room_id}`);
          }
        }
      } catch { /* silent */ }
    };
    checkActiveRoom();
  }, [userId, router]);

  // Matchmaking Queue Poll Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isQueueing) {
      interval = setInterval(() => {
        setQueueingTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setQueueingTimer(0);
    }
    return () => clearInterval(interval);
  }, [isQueueing]);

  // Queue Polling Action
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const checkQueueStatus = async () => {
      if (!queueId) return;
      try {
        const res = await fetch(`/api/ludo/queue/status?queue_id=${queueId}`, {
          headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId || "" }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.matched && data.room_id) {
              // Opponent Found! Redirect to game room
              setIsQueueing(false);
              setQueueId(null);
              playSound("match-found");
              router.push(`/games/game/${data.room_id}`);
            } else if (data.cancelled) {
              setIsQueueing(false);
              setQueueId(null);
              showToast("Matchmaking queue cancelled.", "info");
            }
          }
        }
      } catch (err) {
        console.error("Queue poll error:", err);
      }
    };

    if (isQueueing && queueId) {
      pollInterval = setInterval(checkQueueStatus, 1500);
    }

    return () => clearInterval(pollInterval);
  }, [isQueueing, queueId, userId]);



  // Register Join Queue Request
  const handleRegister = async (stake: number) => {
    // Console log the userId for debugging as requested
    console.log("JOIN USER ID", userId);

    // Assert userId is authenticated
    if (!userId) {
      showToast("Authentication error. Please reload the app.", "error");
      return;
    }

    const coinBalance = wallet?.coin_balance ?? 0;
    if (coinBalance < stake) {
      showToast(`Insufficient balance. You need ${stake} Coins to play.`, "error");
      return;
    }

    try {
      const res = await fetch("/api/ludo/queue/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || ""
        },
        body: JSON.stringify({ stake })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedStake(stake);
        setShowConfirm(false);
        setShowStakes(false);

        if (data.matched && data.room_id) {
          // Immediately matched! Redirect to game
          playSound("match-found");
          router.push(`/games/game/${data.room_id}`);
        } else {
          // Enter Queue
          setQueueId(data.queue_id);
          setIsQueueing(true);
          showToast(`${stake} Coins stake registered. Matchmaking initiated.`, "success");
          refreshWallet(); // update coin balances locally
        }
      } else {
        showToast(data.error || "Failed to join queue.", "error");
      }
    } catch (err) {
      console.error("Register match error:", err);
      showToast("Something went wrong.", "error");
    }
  };

  // Cancel queue matchmaking
  const handleCancelMatchmaking = async () => {
    if (!queueId) return;
    try {
      const res = await fetch("/api/ludo/queue/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || ""
        },
        body: JSON.stringify({ queue_id: queueId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsQueueing(false);
        setQueueId(null);
        refreshWallet(); // refund coins
        showToast("Matchmaking canceled. Coins refunded.", "info");
      } else {
        showToast(data.error || "Failed to cancel queue.", "error");
      }
    } catch (err) {
      console.error("Cancel matchmaking error:", err);
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
              <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient from-purple-500/20 to-transparent pointer-events-none" />

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
                  <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">Head-to-head real money board battles</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Settle scores and win prizes by outsmarting real opponents or bots. Roll the dice, capture tokens on the tracks, and bring all pieces home safely!
              </p>

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
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="w-full max-w-[480px] bg-slate-950 rounded-t-3xl border-t border-purple-500/20 p-6 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Select Game Stakes</h3>
                  <button onClick={() => setShowStakes(false)} className="text-xs text-slate-500 font-extrabold hover:text-white uppercase p-1">Close</button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto scrollbar-none py-1">
                  {STAKES.map((stake) => (
                    <button
                      key={stake}
                      onClick={() => {
                        setSelectedStake(stake);
                        setShowConfirm(true);
                      }}
                      className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-purple-500/40 hover:bg-purple-950/20 transition-all text-left flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] text-purple-400 font-black uppercase block">Stake</span>
                        <span className="text-sm font-black text-white">{stake} Coins</span>
                      </div>
                      <CoinIcon size={18} className="text-amber-400" />
                    </button>
                  ))}
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
                <p className="text-xs text-slate-400 leading-snug">Confirm entry fees deduction and rewards pool generation</p>

                <div className="space-y-2 text-xs font-semibold py-3 border-y border-slate-800/60">
                  <div className="flex justify-between text-slate-400">
                    <span>Your Entry Stakes:</span>
                    <span className="text-slate-200">{selectedStake} Coins</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Opponent Entry Stakes:</span>
                    <span className="text-slate-200">{selectedStake} Coins</span>
                  </div>
                  <div className="flex justify-between text-purple-400">
                    <span>Total Pool:</span>
                    <span className="text-purple-300">{selectedStake * 2} Coins</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Platform Fee:</span>
                    <span>2%</span>
                  </div>
                  <div className="flex justify-between text-amber-400 text-sm font-black pt-1 border-t border-slate-900">
                    <span>Winner Reward Gets:</span>
                    <span>{Math.floor(selectedStake * 2 * 0.98)} Won Coins</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRegister(selectedStake)}
                    className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-black uppercase tracking-wider border border-purple-400/20"
                  >
                    Join Match
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
                  <h3 className="text-base font-black text-white uppercase">SEARCHING FOR OPPONENT...</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed max-w-[240px] mx-auto">
                    Scanning available lobbies for {selectedStake} Coins stake match. Automatically assigning Bot match after 10s...
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
                    <span className="text-[10px] font-extrabold text-slate-500">Searching...</span>
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
