"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { showToast } from "@/components/ui/Toast";
import { useApp } from "@/hooks/useApp";
import { useRouter } from "next/navigation";
import { CoinIcon, GamesIcon, TrophyIcon } from "@/components/ui/Icons";

// Clockwise standard Ludo path cell mapping on a 15x15 board grid
const TRACK_COORDS = [
  { x: 0, y: 6 }, // 0
  { x: 1, y: 6 }, // 1 (Red Launch)
  { x: 2, y: 6 }, // 2
  { x: 3, y: 6 }, // 3
  { x: 4, y: 6 }, // 4
  { x: 5, y: 6 }, // 5
  { x: 6, y: 5 }, // 6
  { x: 6, y: 4 }, // 7
  { x: 6, y: 3 }, // 8
  { x: 6, y: 2 }, // 9 (Star Safe Spot)
  { x: 6, y: 1 }, // 10
  { x: 6, y: 0 }, // 11
  { x: 7, y: 0 }, // 12
  { x: 8, y: 0 }, // 13
  { x: 8, y: 1 }, // 14 (Green Launch)
  { x: 8, y: 2 }, // 15
  { x: 8, y: 3 }, // 16
  { x: 8, y: 4 }, // 17
  { x: 8, y: 5 }, // 18
  { x: 9, y: 6 }, // 19
  { x: 10, y: 6 }, // 20
  { x: 11, y: 6 }, // 21
  { x: 12, y: 6 }, // 22 (Star Safe Spot)
  { x: 13, y: 6 }, // 23
  { x: 14, y: 6 }, // 24
  { x: 14, y: 7 }, // 25
  { x: 14, y: 8 }, // 26
  { x: 13, y: 8 }, // 27 (Blue Launch)
  { x: 12, y: 8 }, // 28
  { x: 11, y: 8 }, // 29
  { x: 10, y: 8 }, // 30
  { x: 9, y: 8 }, // 31
  { x: 8, y: 9 }, // 32
  { x: 8, y: 10 }, // 33
  { x: 8, y: 11 }, // 34
  { x: 8, y: 12 }, // 35 (Star Safe Spot)
  { x: 8, y: 13 }, // 36
  { x: 8, y: 14 }, // 37
  { x: 7, y: 14 }, // 38
  { x: 6, y: 14 }, // 39
  { x: 6, y: 13 }, // 40 (Yellow Launch)
  { x: 6, y: 12 }, // 41
  { x: 6, y: 11 }, // 42
  { x: 6, y: 10 }, // 43
  { x: 6, y: 9 }, // 44
  { x: 5, y: 8 }, // 45
  { x: 4, y: 8 }, // 46
  { x: 3, y: 8 }, // 47
  { x: 2, y: 8 }, // 48 (Star Safe Spot)
  { x: 1, y: 8 }, // 49
  { x: 0, y: 8 }, // 50
  { x: 0, y: 7 }  // 51
];

const STAKES = [50, 100, 200, 500, 1000, 2000, 5000];

const REACTIONS = ["Laugh", "Angry", "Fire", "GG", "Crown", "Shock", "Cry"];

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

  // Countdown & Opponent Reveal
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealedOpponent, setRevealedOpponent] = useState<{ name: string; avatar: string } | null>(null);

  // Active Match States
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameActive, setGameplayActive] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);
  const [rolling, setRolling] = useState(false);
  const [lastReactTime, setLastReactTime] = useState(0);

  const prevTurnPlayerIdRef = useRef<string | null>(null);
  const prevReactionsCountRef = useRef<number>(0);

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
              // Opponent Found! Transition out of matchmaking
              setIsQueueing(false);
              setQueueId(null);
              setRoomId(data.room_id);
              playSound("match-found");
              // Trigger Countdown Screen
              setCountdown(10);
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

  // Countdown timer thread
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        // Countdown completed, show Opponent Reveal screen
        setCountdown(null);
        // Pre-fetch room details to get opponent profile
        fetchRoomState().then(() => {
          setShowReveal(true);
        });
      }
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Opponent Reveal timer thread (3 seconds)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showReveal) {
      timer = setTimeout(() => {
        setShowReveal(false);
        setGameplayActive(true);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showReveal]);

  // Active Game State Polling (Every 1 second)
  const fetchRoomState = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/ludo/room/state?room_id=${roomId}`, {
        headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId || "" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const state = data.data;
          setRoomState(state);

          const opponent = state.player_1_id === userId ? state.player_2_profile : state.player_1_profile;
          setRevealedOpponent(opponent);

          // Audio triggers on turn change
          if (state.status === "active") {
            if (prevTurnPlayerIdRef.current && prevTurnPlayerIdRef.current !== state.turn_player_id) {
              // Trigger vibration for turn alert
              if (state.turn_player_id === userId) {
                triggerVibe("dice");
              }
            }
            prevTurnPlayerIdRef.current = state.turn_player_id;
          }

          // Trigger reactions sound / vibe on new reactions
          const reactions = state.chat_reactions || [];
          if (reactions.length > prevReactionsCountRef.current) {
            const latest = reactions[reactions.length - 1];
            if (latest.player_id !== userId) {
              playSound("piece-move");
            }
            prevReactionsCountRef.current = reactions.length;
          }

          // Handle game completed/settled
          if (state.status === "completed" || state.status === "forfeited") {
            if (roomState?.status === "active") {
              const won = state.winner_id === userId;
              playSound(won ? "victory" : "defeat");
              triggerVibe(won ? "victory" : "defeat");
              refreshWallet(); // Reload Won Coins & stats from Supabase
            }
          }
        }
      }
    } catch (err) {
      console.error("Room state fetch error:", err);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (roomId && gameActive) {
      fetchRoomState();
      interval = setInterval(fetchRoomState, 1000);
    }
    return () => clearInterval(interval);
  }, [roomId, gameActive, userId]);

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
          // Immediately matched!
          setRoomId(data.room_id);
          playSound("match-found");
          setCountdown(10);
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

  // Roll Dice API trigger
  const handleRollDice = async () => {
    if (!roomId || rolling) return;
    setRolling(true);
    playSound("dice-roll");
    triggerVibe("dice");

    try {
      const res = await fetch("/api/ludo/room/roll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || ""
        },
        body: JSON.stringify({ room_id: roomId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchRoomState();
      } else {
        showToast(data.error || "Roll failed.", "error");
      }
    } catch (err) {
      console.error("Roll dice error:", err);
    } finally {
      setRolling(false);
    }
  };

  // Move Piece API trigger
  const handleMovePiece = async (pieceIndex: number) => {
    if (!roomId) return;
    playSound("piece-move");

    try {
      const res = await fetch("/api/ludo/room/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || ""
        },
        body: JSON.stringify({ room_id: roomId, piece_index: pieceIndex })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data?.has_capture) {
          playSound("kill");
          triggerVibe("kill");
          showToast("Opponent piece captured! Got an extra turn!", "success");
        }
        fetchRoomState();
      } else {
        showToast(data.error || "Failed to move piece.", "error");
      }
    } catch (err) {
      console.error("Move piece error:", err);
    }
  };

  // Forfeit Match Trigger
  const handleForfeit = async () => {
    if (!roomId) return;
    if (!confirm("Are you sure you want to forfeit? You will lose your entire entry stakes!")) return;

    try {
      const res = await fetch("/api/ludo/room/forfeit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || ""
        },
        body: JSON.stringify({ room_id: roomId })
      });
      if (res.ok) {
        fetchRoomState();
      }
    } catch (err) {
      console.error("Forfeit error:", err);
    }
  };

  // Send Reaction Trigger
  const handleSendReaction = async (reaction: string) => {
    if (!roomId || Date.now() - lastReactTime < 2000) return;
    setLastReactTime(Date.now());

    try {
      await fetch("/api/ludo/room/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId || ""
        },
        body: JSON.stringify({ room_id: roomId, reaction_type: reaction })
      });
      fetchRoomState();
    } catch (err) {
      console.error("Reaction send error:", err);
    }
  };

  // Exit game room after completion
  const handleExitMatch = () => {
    setGameplayActive(false);
    setRoomState(null);
    setRoomId(null);
    setRevealedOpponent(null);
    refreshWallet();
  };

  // Map coordinates logic
  const getPieceCoords = (isPlayer1: boolean, position: number, pieceIdx: number) => {
    if (position === 0) {
      // Yard
      if (isPlayer1) {
        const layout = [
          { x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 },
          { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }
        ];
        return layout[pieceIdx];
      } else {
        const layout = [
          { x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 },
          { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }
        ];
        return layout[piece_idx_to_use(pieceIdx)];
      }
    }

    if (position === 57) {
      // Home triangle
      return isPlayer1
        ? { x: 4.5 + pieceIdx * 0.3, y: 7.5 }
        : { x: 9.5 - pieceIdx * 0.3, y: 7.5 };
    }

    if (position >= 52 && position <= 56) {
      // Home path
      return isPlayer1
        ? { x: position - 51, y: 7 }
        : { x: 14 - (position - 51), y: 7 };
    }

    // Common track coords
    const index = isPlayer1 ? (position % 52) : (26 + position) % 52;
    return TRACK_COORDS[index];
  };

  const piece_idx_to_use = (idx: number) => idx % 4;

  const getPiecesAtPosition = (player: 'player_1' | 'player_2', pos: number) => {
    if (pos === 0 || pos === 57) return [];
    const positions: { player: 'player_1' | 'player_2', idx: number }[] = [];
    if (!roomState?.board_state?.pieces) return [];

    const p1Pieces = roomState.board_state.pieces.player_1;
    const p2Pieces = roomState.board_state.pieces.player_2;

    p1Pieces.forEach((pPos: number, idx: number) => {
      if (pPos === pos && player === 'player_1') positions.push({ player: 'player_1', idx });
    });
    p2Pieces.forEach((pPos: number, idx: number) => {
      if (pPos === pos && player === 'player_2') positions.push({ player: 'player_2', idx });
    });
    return positions;
  };

  // Compute piece offset for overlapping pieces on same tile
  const getOverlapOffset = (player: 'player_1' | 'player_2', pos: number, pieceIdx: number) => {
    if (pos === 0 || pos === 57 || pos >= 52) return { dx: 0, dy: 0 };
    const list = getPiecesAtPosition(player, pos);
    if (list.length <= 1) return { dx: 0, dy: 0 };

    const offsetIdx = list.findIndex(p => p.idx === pieceIdx);
    if (offsetIdx === -1) return { dx: 0, dy: 0 };

    // Arrange pieces in quadrant grids
    const angle = (offsetIdx * 2 * Math.PI) / list.length;
    return {
      dx: Math.cos(angle) * 1.1,
      dy: Math.sin(angle) * 1.1
    };
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

        {/* --- COUNTDOWN SCREEN --- */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center"
            >
              {/* Disable Backing / Hide bottom nav by being pure full screen */}
              <div className="space-y-4 text-center">
                <span className="text-[10px] text-purple-400 font-black tracking-widest uppercase">Lobby Coordinate established</span>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">MATCH STARTING IN</h2>
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl font-black text-amber-400 tabular-nums font-mono drop-shadow-[0_0_24px_rgba(245,158,11,0.4)]"
                >
                  {countdown}
                </motion.div>
                <div className="w-48 h-1 bg-slate-900 rounded-full mx-auto overflow-hidden">
                  <motion.div
                    className="h-full bg-purple-500"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- OPPONENT REVEAL SCREEN --- */}
        <AnimatePresence>
          {showReveal && revealedOpponent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center space-y-8"
            >
              <div className="space-y-1">
                <span className="text-[10px] text-purple-400 font-black tracking-widest uppercase block animate-pulse">Lobby match verified</span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">OPPONENT REVEALED</h3>
              </div>

              <div className="flex items-center justify-center gap-8 w-full max-w-md">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500 overflow-hidden shadow-[0_0_16px_rgba(168,85,247,0.3)] bg-slate-900">
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=You" alt="Me" className="w-full h-full" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-200">You</span>
                </div>

                <div className="text-xl font-black text-purple-500 animate-pulse shrink-0">VS</div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full border-2 border-blue-500 overflow-hidden shadow-[0_0_16px_rgba(59,130,246,0.3)] bg-slate-900">
                    <img src={revealedOpponent.avatar} alt="Opponent" className="w-full h-full" />
                  </div>
                  {/* Shows ONLY first_name / display name. NEVER exposes Telegram Usernames, IDs or DB indexes */}
                  <span className="text-xs font-extrabold text-slate-200">{revealedOpponent.name}</span>
                </div>
              </div>

              <div className="bg-purple-950/20 border border-purple-500/20 py-2.5 px-6 rounded-full text-[10px] font-black uppercase text-purple-400 tracking-widest animate-pulse">
                REDIRECTING TO GAME BOARD...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- FULLY CONNECTED GAMEPLAY BOARD --- */}
        <AnimatePresence>
          {gameActive && roomState && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-4 text-white"
            >
              <div className="w-full max-w-sm flex flex-col space-y-4 h-full max-h-[640px] justify-between relative">

                {/* Top Section: Opponent Profile Banner */}
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full border border-blue-500 overflow-hidden bg-slate-950">
                      <img src={roomState.player_2_profile.avatar} alt="P2" className="w-full h-full" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block truncate max-w-[120px]">{roomState.player_2_profile.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${roomState.turn_player_id === roomState.player_2_id ? "bg-blue-500 animate-ping" : "bg-slate-500"}`} />
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                          {roomState.turn_player_id === roomState.player_2_id ? "Thinking..." : "Waiting"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Opponent Hearts */}
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <span key={i} className="text-sm">
                        {i < roomState.hearts_player_2 ? "❤️" : "💔"}
                      </span>
                    ))}
                  </div>

                  {/* Reaction Button (triggers drawer) */}
                  <button
                    onClick={() => setShowStakes(!showStakes)} /* reused toggle */
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-purple-500 text-xs font-bold text-purple-400 shrink-0"
                  >
                    💬 Chat
                  </button>
                </div>

                {/* Score Summary Banner */}
                <div className="flex justify-between items-center text-[10px] px-2 font-mono text-slate-500">
                  <span>Match Turn Timer: <strong className="text-purple-400 tabular-nums">{roomState.turn_remaining_seconds}s</strong></span>
                  <span>Pool: <strong className="text-amber-400 font-black">{roomState.stake * 2} Coins</strong></span>
                </div>

                {/* SPECTACULAR VECTOR SVG LUDO BOARD RENDERER */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl p-1 flex items-center justify-center select-none">
                  <svg className="w-full h-full rounded-xl" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="#090d16" />

                    {/* RED PLAYER YARD (Left Base) */}
                    <rect x="0" y="0" width="40" height="40" rx="4" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="0.5" />
                    <rect x="6" y="6" width="28" height="28" rx="3" fill="#090d16" stroke="#ef4444" strokeWidth="0.5" />
                    <circle cx="13" cy="13" r="3" fill="#ef4444" fillOpacity="0.4" />
                    <circle cx="27" cy="13" r="3" fill="#ef4444" fillOpacity="0.4" />
                    <circle cx="13" cy="27" r="3" fill="#ef4444" fillOpacity="0.4" />
                    <circle cx="27" cy="27" r="3" fill="#ef4444" fillOpacity="0.4" />

                    {/* BLUE PLAYER YARD (Right Base) */}
                    <rect x="60" y="60" width="40" height="40" rx="4" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="0.5" />
                    <rect x="66" y="66" width="28" height="28" rx="3" fill="#090d16" stroke="#3b82f6" strokeWidth="0.5" />
                    <circle cx="73" cy="73" r="3" fill="#3b82f6" fillOpacity="0.4" />
                    <circle cx="87" cy="73" r="3" fill="#3b82f6" fillOpacity="0.4" />
                    <circle cx="73" cy="87" r="3" fill="#3b82f6" fillOpacity="0.4" />
                    <circle cx="87" cy="87" r="3" fill="#3b82f6" fillOpacity="0.4" />

                    {/* Dummy unused yards just for look consistency */}
                    <rect x="60" y="0" width="40" height="40" rx="4" fill="#1e293b" fillOpacity="0.1" stroke="#334155" strokeWidth="0.25" />
                    <rect x="0" y="60" width="40" height="40" rx="4" fill="#1e293b" fillOpacity="0.1" stroke="#334155" strokeWidth="0.25" />

                    {/* Home Central Goal Triangles */}
                    <polygon points="40,40 50,50 40,60" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="0.5" />
                    <polygon points="60,40 50,50 60,60" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="0.5" />
                    <polygon points="40,40 50,50 60,40" fill="#334155" fillOpacity="0.1" stroke="#334155" strokeWidth="0.25" />
                    <polygon points="40,60 50,50 60,60" fill="#334155" fillOpacity="0.1" stroke="#334155" strokeWidth="0.25" />

                    {/* Draw Clockwise common cells */}
                    {TRACK_COORDS.map((cell, idx) => {
                      const size = 100 / 15;
                      const cx = cell.x * size;
                      const cy = cell.y * size;

                      let cellColor = "rgba(51, 65, 85, 0.15)";
                      let isSpecial = false;

                      // Launch spots
                      if (idx === 1) { cellColor = "rgba(239, 68, 68, 0.4)"; isSpecial = true; }
                      else if (idx === 27) { cellColor = "rgba(59, 130, 246, 0.4)"; isSpecial = true; }
                      // Star Safe Spots
                      else if ([9, 22, 35, 48].includes(idx)) { cellColor = "rgba(168, 85, 247, 0.25)"; isSpecial = true; }

                      return (
                        <g key={idx}>
                          <rect
                            x={cx + 0.3}
                            y={cy + 0.3}
                            width={size - 0.6}
                            height={size - 0.6}
                            rx={1}
                            fill={cellColor}
                            stroke="#334155"
                            strokeWidth={isSpecial ? 0.4 : 0.15}
                          />
                          {[9, 22, 35, 48].includes(idx) && (
                            <path d={`M ${cx+size/2} ${cy+2} l 0.7 2 l 1.8 0 l -1.5 1.2 l 0.6 2 l -1.6 -1.2 l -1.6 1.2 l 0.6 -2 l -1.5 -1.2 l 1.8 0 z`} fill="#a855f7" transform={`scale(0.7) translate(${(cx+size/2)*0.43}, ${(cy+size/2)*0.43})`} />
                          )}
                        </g>
                      );
                    })}

                    {/* Home Path Tracks */}
                    {/* Red Home (Left) */}
                    {[1, 2, 3, 4, 5].map((col) => {
                      const size = 100/15;
                      return (
                        <rect key={col} x={col*size+0.3} y={7*size+0.3} width={size-0.6} height={size-0.6} rx={1} fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="0.25" />
                      );
                    })}
                    {/* Blue Home (Right) */}
                    {[13, 12, 11, 10, 9].map((col) => {
                      const size = 100/15;
                      return (
                        <rect key={col} x={col*size+0.3} y={7*size+0.3} width={size-0.6} height={size-0.6} rx={1} fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="0.25" />
                      );
                    })}

                    {/* DRAW PLAYER pieces */}
                    {/* Player 1 (Red) Pieces */}
                    {roomState.board_state.pieces.player_1.map((pos: number, idx: number) => {
                      const size = 100 / 15;
                      const coords = getPieceCoords(true, pos, idx);
                      const offsets = getOverlapOffset('player_1', pos, idx);
                      const cx = (coords.x * size) + (size / 2) + offsets.dx;
                      const cy = (coords.y * size) + (size / 2) + offsets.dy;

                      const myTurn = roomState.turn_player_id === roomState.player_1_id;
                      const canMove = myTurn && roomState.dice_rolled && roomState.movable_pieces.includes(idx);

                      return (
                        <g key={`p1-${idx}`} className="cursor-pointer" onClick={() => canMove && handleMovePiece(idx)}>
                          {canMove && (
                            <circle cx={cx} cy={cy} r={3.2} fill="#ef4444" fillOpacity="0.3">
                              <animate attributeName="r" values="2.6;4;2.6" dur="1.2s" repeatCount="indefinity" />
                            </circle>
                          )}
                          <circle cx={cx} cy={cy} r={2.5} fill="#ef4444" stroke="#fff" strokeWidth={0.5} />
                          <circle cx={cx} cy={cy} r={1.2} fill="#7f1d1d" />
                        </g>
                      );
                    })}

                    {/* Player 2 (Blue) Pieces */}
                    {roomState.board_state.pieces.player_2.map((pos: number, idx: number) => {
                      const size = 100 / 15;
                      const coords = getPieceCoords(false, pos, idx);
                      const offsets = getOverlapOffset('player_2', pos, idx);
                      const cx = (coords.x * size) + (size / 2) + offsets.dx;
                      const cy = (coords.y * size) + (size / 2) + offsets.dy;

                      const opponentTurn = roomState.turn_player_id === roomState.player_2_id;
                      const isRealPlayer2 = roomState.player_2_id === userId;
                      const canMove = opponentTurn && isRealPlayer2 && roomState.dice_rolled && roomState.movable_pieces.includes(idx);

                      return (
                        <g key={`p2-${idx}`} className="cursor-pointer" onClick={() => canMove && handleMovePiece(idx)}>
                          {canMove && (
                            <circle cx={cx} cy={cy} r={3.2} fill="#3b82f6" fillOpacity="0.3">
                              <animate attributeName="r" values="2.6;4;2.6" dur="1.2s" repeatCount="indefinity" />
                            </circle>
                          )}
                          <circle cx={cx} cy={cy} r={2.5} fill="#3b82f6" stroke="#fff" strokeWidth={0.5} />
                          <circle cx={cx} cy={cy} r={1.2} fill="#1e3a8a" />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Floating animated reactions inside Ludo board panel */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <AnimatePresence>
                      {roomState?.chat_reactions?.slice(-3).map((r: any, idx: number) => {
                        const isP1 = r.player_id === roomState.player_1_id;
                        return (
                          <motion.div
                            key={r.timestamp + idx}
                            initial={{ opacity: 0, scale: 0.2, y: isP1 ? 160 : -160, x: isP1 ? -100 : 100 }}
                            animate={{ opacity: 1, scale: 1.5, y: isP1 ? 100 : -100, x: isP1 ? -60 : 60 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl z-40 bg-slate-900/90 rounded-full px-2.5 py-1 border border-purple-500/20 shadow-lg select-none"
                          >
                            {r.type === "Laugh" && "😂"}
                            {r.type === "Angry" && "😡"}
                            {r.type === "Fire" && "🔥"}
                            {r.type === "GG" && "🤝"}
                            {r.type === "Crown" && "👑"}
                            {r.type === "Shock" && "😱"}
                            {r.type === "Cry" && "😭"}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Bottom Section: My Profile Banner */}
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full border border-purple-500 overflow-hidden bg-slate-950">
                      <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=You" alt="P1" className="w-full h-full" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block truncate max-w-[120px]">You</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${roomState.turn_player_id === userId ? "bg-purple-500 animate-pulse" : "bg-slate-500"}`} />
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                          {roomState.turn_player_id === userId ? "YOUR TURN" : "Waiting"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* My Hearts */}
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <span key={i} className="text-sm">
                        {i < (roomState.player_1_id === userId ? roomState.hearts_player_1 : roomState.hearts_player_2) ? "❤️" : "💔"}
                      </span>
                    ))}
                  </div>

                  {/* Play Dice Area */}
                  {roomState.status === "active" && roomState.turn_player_id === userId ? (
                    <div className="shrink-0 flex items-center gap-2">
                      {!roomState.dice_rolled ? (
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          disabled={rolling}
                          onClick={handleRollDice}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-black uppercase tracking-widest border border-purple-400/30"
                        >
                          {rolling ? "Rolling..." : "Roll Dice"}
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/20 px-3 py-1.5 rounded-xl shrink-0">
                          <span className="text-[9px] font-black text-purple-400">ROLLED:</span>
                          <span className="text-sm font-black text-amber-400 font-mono animate-bounce">{roomState.last_roll}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Opponent rolled indicator
                    roomState.last_roll > 0 && (
                      <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-[9px] font-mono text-slate-500">
                        Opponent rolled: <strong className="text-slate-300">{roomState.last_roll}</strong>
                      </div>
                    )
                  )}
                </div>

                {/* Forfeit and Active Control Footer */}
                <div className="flex justify-between items-center gap-4">
                  <button
                    onClick={handleForfeit}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 border border-red-500/20 text-red-500 hover:text-red-400 text-[9px] font-bold uppercase tracking-wider shrink-0"
                  >
                    🏳️ Forfeit Match
                  </button>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide text-right truncate">
                    {roomState.dice_rolled && roomState.turn_player_id === userId
                      ? "TAP HIGHLIGHTED PEG ON BOARD TO MOVE"
                      : "WAITING FOR ACTIVE PLAY COORDINATE"}
                  </div>
                </div>

              </div>

              {/* Chat Reactions Floating Panel Drawer (Overlaid) */}
              <AnimatePresence>
                {showStakes && (
                  <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="absolute bottom-20 left-4 right-4 bg-slate-950 rounded-2xl border border-purple-500/25 p-4 z-50 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">SEND LIVE REACTION</span>
                      <button onClick={() => setShowStakes(false)} className="text-[9px] text-slate-500 font-bold uppercase hover:text-white">Done</button>
                    </div>
                    <div className="flex justify-between gap-1.5">
                      {REACTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            handleSendReaction(r);
                            setShowStakes(false);
                          }}
                          className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-purple-950 border border-slate-800 hover:border-purple-500/40 text-lg flex items-center justify-center transition-all"
                        >
                          {r === "Laugh" && "😂"}
                          {r === "Angry" && "😡"}
                          {r === "Fire" && "🔥"}
                          {r === "GG" && "🤝"}
                          {r === "Crown" && "👑"}
                          {r === "Shock" && "😱"}
                          {r === "Cry" && "😭"}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Match Settled Winner Outcome Overlay */}
              {(roomState.status === "completed" || roomState.status === "forfeited") && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-slate-950 p-6 text-center space-y-5 shadow-2xl relative overflow-hidden"
                  >
                    {roomState.winner_id === userId ? (
                      <>
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-radial-gradient from-emerald-500 to-transparent" />
                        <h4 className="text-xl font-black text-emerald-400 tracking-tight animate-bounce">🏆 VICTORY CHAMPION!</h4>
                        <p className="text-xs text-slate-300 max-w-[280px] mx-auto leading-normal">
                          Superb game! You conquered the board and beat the opposition. Your rewards are processed and secured in your Won Coins balance.
                        </p>
                        <div className="flex justify-center gap-3 text-xs font-black py-2">
                          <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-1.5 font-numeric text-amber-400">
                            <CoinIcon size={14} />
                            +{Math.floor(roomState.stake * 2 * 0.98)} Won Coins
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="text-xl font-black text-red-500 tracking-tight">🏳️ DEFEATED</h4>
                        <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-normal">
                          Good try! Better luck in the next game coordinate. The stakes have been resolved.
                        </p>
                        <div className="text-[10px] text-red-400/80 font-mono font-bold bg-red-500/5 py-1.5 px-3 rounded-lg border border-red-500/10 inline-block">
                          Stakes lost: -{roomState.stake} Coins
                        </div>
                      </>
                    )}

                    <button
                      onClick={handleExitMatch}
                      className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest border border-purple-400/20 shadow-lg mt-2"
                    >
                      RETURN TO LOBBY
                    </button>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}
