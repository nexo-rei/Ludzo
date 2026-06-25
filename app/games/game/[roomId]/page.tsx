"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/hooks/useApp";
import { showToast } from "@/components/ui/Toast";

// ─── Ludo Board Track Coordinates (15×15 grid) ───────────────────────────────
const TRACK_COORDS = [
  { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
  { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 5 }, { x: 6, y: 4 },
  { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  { x: 7, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 },
  { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 }, { x: 9, y: 6 },
  { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 },
  { x: 14, y: 6 }, { x: 14, y: 7 }, { x: 14, y: 8 }, { x: 13, y: 8 },
  { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 },
  { x: 8, y: 13 }, { x: 8, y: 14 }, { x: 7, y: 14 }, { x: 6, y: 14 },
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 },
  { x: 6, y: 9 }, { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 },
  { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 }, { x: 0, y: 7 },
];

const STAR_SPOTS = [9, 22, 35, 48];
const EMOTES = ["Laugh", "Angry", "Fire", "Crown", "Clap", "Shock"];

// ─── SVG Emote Icons ──────────────────────────────────────────────────────────
function EmoteSVG({ type, size = 24 }: { type: string; size?: number }) {
  const s = size;
  switch (type) {
    case "Laugh":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
          <ellipse cx="11" cy="13" rx="2" ry="2.5" fill="#92400E" />
          <ellipse cx="21" cy="13" rx="2" ry="2.5" fill="#92400E" />
          <path d="M9 19 Q16 26 23 19" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="#FCD34D" />
          <path d="M9 21 Q16 28 23 21" fill="#EF4444" opacity="0.7" />
        </svg>
      );
    case "Angry":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
          <path d="M8 11 L14 14" stroke="#7F1D1D" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 11 L18 14" stroke="#7F1D1D" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="11" cy="16" rx="2" ry="2" fill="#7F1D1D" />
          <ellipse cx="21" cy="16" rx="2" ry="2" fill="#7F1D1D" />
          <path d="M10 23 Q16 19 22 23" stroke="#7F1D1D" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "Fire":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M16 2 C16 2 20 8 18 13 C22 10 24 6 22 2 C26 6 28 12 26 18 C28 16 29 14 28 10 C31 15 30 22 26 26 C24 30 20 31 16 31 C12 31 8 30 6 26 C2 22 1 15 4 10 C3 14 4 16 6 18 C4 12 6 6 10 2 C8 6 10 10 14 13 C12 8 16 2 16 2Z" fill="#F97316" />
          <path d="M16 12 C16 12 19 16 17 20 C20 18 21 14 20 12 C22 15 22 20 19 24 C18 27 16 28 16 28 C16 28 14 27 13 24 C10 20 10 15 12 12 C11 14 12 16 14 20 C12 16 16 12 16 12Z" fill="#FCD34D" />
        </svg>
      );
    case "Crown":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M4 24 L6 12 L12 18 L16 8 L20 18 L26 12 L28 24 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="4" y="24" width="24" height="4" rx="1" fill="#F59E0B" />
          <circle cx="16" cy="8" r="2.5" fill="#EF4444" />
          <circle cx="6" cy="12" r="2" fill="#A855F7" />
          <circle cx="26" cy="12" r="2" fill="#3B82F6" />
        </svg>
      );
    case "Clap":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <path d="M12 8 L10 16 L8 14 L7 10 Q7 7 10 7 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          <path d="M14 6 L13 18 L11 16 L10 8 Q10 5 13 5 Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" />
          <path d="M16 7 L17 19 L10 19 L9 10 Q10 7 13 7 L16 7 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          <path d="M17 9 L20 20 L16 22 L13 19 L17 9 Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" />
          <path d="M19 12 L22 22 L19 24 L18 21 L19 12 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          <path d="M9 20 L20 22 L20 26 Q16 28 10 26 Z" fill="#F59E0B" />
          <path d="M7 11 L6 13" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 9 L4 12" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "Shock":
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="#A855F7" stroke="#9333EA" strokeWidth="1.5" />
          <path d="M9 11 L15 13" stroke="#DDD6FE" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M23 11 L17 13" stroke="#DDD6FE" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="11" cy="15" rx="2.5" ry="3" fill="#EDE9FE" />
          <ellipse cx="21" cy="15" rx="2.5" ry="3" fill="#EDE9FE" />
          <ellipse cx="16" cy="22" rx="3.5" ry="4" fill="#1E1B4B" />
        </svg>
      );
    default:
      return null;
  }
}

// ─── Dice Face SVG ────────────────────────────────────────────────────────────
function DiceFace({ value, size = 40 }: { value: number; size?: number }) {
  const dotMap: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };
  const dots: [number, number][] = dotMap[value] ?? [];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="20" fill="#1E293B" stroke="#A855F7" strokeWidth="4" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill="#A855F7" />
      ))}
    </svg>
  );
}

// ─── Heart Indicator ──────────────────────────────────────────────────────────
function HeartRow({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21C12 21 3 14 3 8.5C3 5.46 5.46 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.54 3 23 5.46 23 8.5C23 14 14 21 14 21H12Z"
            fill={i < count ? "#EF4444" : "#374151"}
            stroke={i < count ? "#DC2626" : "#4B5563"}
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────
export default function LudoGamePage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string;
  const { userId, refreshWallet, setIsGameActive, recordMatchResult } = useApp();

  const [phase, setPhase] = useState<"pre-match" | "countdown" | "playing" | "ended">("pre-match");
  const [countdown, setCountdown] = useState(3);
  const [roomState, setRoomState] = useState<any>(null);
  const [rolling, setRolling] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);
  const [lastReactTime, setLastReactTime] = useState(0);
  const [floatingEmotes, setFloatingEmotes] = useState<Array<{ id: string; type: string; fromOpponent: boolean }>>([]);
  const [matchTimer, setMatchTimer] = useState(480); // 8 minutes
  const [turnTimer, setTurnTimer] = useState(15);
  const [rollingAnim, setRollingAnim] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(0);

  const prevReactionCount = useRef(0);
  const prevTurnPlayer = useRef<string | null>(null);
  const stateRef = useRef<any>(null);
  stateRef.current = roomState;

  // Lock game screen — hide nav, disable back
  useEffect(() => {
    setIsGameActive(true);
    // Push state to prevent browser back during game
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => {
      setIsGameActive(false);
      window.removeEventListener("popstate", handlePop);
    };
  }, [setIsGameActive]);

  // Sound helper
  const playSound = useCallback((name: string) => {
    try {
      const a = new Audio(`/sounds/${name}.mp3`);
      a.volume = 0.5;
      a.play().catch(() => {});
    } catch {}
  }, []);

  // Vibration helper
  const vibe = useCallback((pattern: number | number[]) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {}
  }, []);

  // Fetch room state from server
  const fetchState = useCallback(async () => {
    if (!roomId || !userId) return;
    try {
      const res = await fetch(`/api/ludo/room/state?room_id=${roomId}`, {
        headers: { "Authorization": `Bearer ${userId}`, "x-user-id": userId },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.data) return;

      const state = data.data;
      setRoomState(state);

      // Update dice display if rolled
      if (state.last_roll > 0) setDiceDisplay(state.last_roll);

      // Detect new reactions from opponent
      const reactions = state.chat_reactions || [];
      if (reactions.length > prevReactionCount.current) {
        const latest = reactions[reactions.length - 1];
        if (latest.player_id !== userId) {
          const id = `emote_${Date.now()}`;
          setFloatingEmotes(prev => [...prev.slice(-4), { id, type: latest.type, fromOpponent: true }]);
          playSound("piece-move");
          setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 2500);
        }
        prevReactionCount.current = reactions.length;
      }

      // Detect my turn start
      if (prevTurnPlayer.current && prevTurnPlayer.current !== state.turn_player_id && state.turn_player_id === userId) {
        vibe(30);
        playSound("dice-roll");
      }
      prevTurnPlayer.current = state.turn_player_id;

      // Handle game end
      if ((state.status === "completed" || state.status === "forfeited") && phase === "playing") {
        const won = state.winner_id === userId;
        playSound(won ? "victory" : "defeat");
        vibe(won ? [200, 100, 200, 100, 300] : [150, 150, 150]);
        recordMatchResult(won, state.stake);
        refreshWallet();
        setPhase("ended");
      }

      // Transition from countdown to active
      if (state.status === "active" && phase === "pre-match") {
        setPhase("countdown");
      }

    } catch (err) {
      console.error("fetchState error:", err);
    }
  }, [roomId, userId, phase, playSound, vibe, recordMatchResult, refreshWallet]);

  // Initial load + pre-match polling
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Countdown 3→1 then go to playing
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setPhase("playing");
      playSound("match-found");
    }
  }, [phase, countdown, playSound]);

  // Active game polling (faster)
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [phase, fetchState]);

  // Match timer countdown (client-side display only)
  useEffect(() => {
    if (phase !== "playing") return;
    if (!roomState?.created_at) return;
    const elapsed = Math.floor((Date.now() - new Date(roomState.created_at).getTime()) / 1000);
    setMatchTimer(Math.max(0, 480 - elapsed));
    const t = setInterval(() => setMatchTimer(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, roomState?.created_at]);

  // Turn timer countdown (client-side display only)
  useEffect(() => {
    if (phase !== "playing" || !roomState?.turn_start_at) return;
    const elapsed = Math.floor((Date.now() - new Date(roomState.turn_start_at).getTime()) / 1000);
    setTurnTimer(Math.max(0, 15 - elapsed));
    const t = setInterval(() => setTurnTimer(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, roomState?.turn_player_id, roomState?.turn_start_at]);

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleRoll = async () => {
    if (!roomId || rolling || !userId) return;
    if (roomState?.turn_player_id !== userId) return;
    if (roomState?.dice_rolled) return;

    setRolling(true);
    setRollingAnim(true);
    playSound("dice-roll");
    vibe(30);

    // Animate dice rolling
    let animCount = 0;
    const animInterval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
      animCount++;
      if (animCount > 8) clearInterval(animInterval);
    }, 80);

    try {
      const res = await fetch("/api/ludo/room/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        body: JSON.stringify({ room_id: roomId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchState();
      } else {
        showToast(data.error || "Roll failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    } finally {
      setRolling(false);
      setTimeout(() => setRollingAnim(false), 300);
    }
  };

  const handleMove = async (pieceIndex: number) => {
    if (!roomId || !userId) return;
    playSound("piece-move");
    vibe(20);

    try {
      const res = await fetch("/api/ludo/room/move", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        body: JSON.stringify({ room_id: roomId, piece_index: pieceIndex }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.has_capture) {
          playSound("kill");
          vibe([100, 50, 100]);
          showToast("🎯 Captured opponent piece!", "success");
        }
        await fetchState();
      } else {
        showToast(data.error || "Move failed", "error");
      }
    } catch {
      showToast("Connection error", "error");
    }
  };

  const handleEmote = async (type: string) => {
    if (!roomId || !userId || Date.now() - lastReactTime < 2000) return;
    setLastReactTime(Date.now());
    setShowEmotes(false);

    const id = `emote_${Date.now()}`;
    setFloatingEmotes(prev => [...prev.slice(-4), { id, type, fromOpponent: false }]);
    setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 2500);

    try {
      await fetch("/api/ludo/room/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        body: JSON.stringify({ room_id: roomId, reaction_type: type }),
      });
    } catch {}
  };

  const handleForfeit = async () => {
    if (!roomId || !userId) return;
    if (!confirm("Forfeit match? You will lose your stake.")) return;
    try {
      await fetch("/api/ludo/room/forfeit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userId}`, "x-user-id": userId },
        body: JSON.stringify({ room_id: roomId }),
      });
      await fetchState();
    } catch {}
  };

  const handleExit = () => {
    setIsGameActive(false);
    router.replace("/games");
  };

  // ─── Board Coordinate Logic ──────────────────────────────────────────────────
  const getPieceCoords = (isPlayer1: boolean, position: number, pieceIdx: number) => {
    if (position === 0) {
      const p1Yard = [{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }];
      const p2Yard = [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }];
      return isPlayer1 ? p1Yard[pieceIdx % 4] : p2Yard[pieceIdx % 4];
    }
    if (position === 57) {
      return isPlayer1 ? { x: 4.5 + (pieceIdx * 0.4), y: 7.5 } : { x: 9.5 - (pieceIdx * 0.4), y: 7.5 };
    }
    if (position >= 52 && position <= 56) {
      return isPlayer1
        ? { x: position - 51, y: 7 }
        : { x: 14 - (position - 51), y: 7 };
    }
    const index = isPlayer1 ? (position - 1) % 52 : (position + 25) % 52;
    return TRACK_COORDS[Math.min(index, TRACK_COORDS.length - 1)] || { x: 7, y: 7 };
  };

  const getStackOffset = (pieces: number[], pos: number, idx: number) => {
    if (pos === 0 || pos === 57) return { dx: 0, dy: 0 };
    const samePos = pieces.reduce((acc: number[], p, i) => (p === pos ? [...acc, i] : acc), []);
    if (samePos.length <= 1) return { dx: 0, dy: 0 };
    const orderIdx = samePos.indexOf(idx);
    const angle = (orderIdx * 2 * Math.PI) / samePos.length;
    return { dx: Math.cos(angle) * 1.2, dy: Math.sin(angle) * 1.2 };
  };

  // ─── Derived state shortcuts ─────────────────────────────────────────────────
  const isMyTurn = roomState?.turn_player_id === userId;
  const amPlayer1 = roomState?.player_1_id === userId;
  const myHearts = amPlayer1 ? roomState?.hearts_player_1 : roomState?.hearts_player_2;
  const oppHearts = amPlayer1 ? roomState?.hearts_player_2 : roomState?.hearts_player_1;
  const myScore = amPlayer1 ? roomState?.score_player_1 : roomState?.score_player_2;
  const oppScore = amPlayer1 ? roomState?.score_player_2 : roomState?.score_player_1;
  const myPieces = amPlayer1 ? roomState?.board_state?.pieces?.player_1 : roomState?.board_state?.pieces?.player_2;
  const oppPieces = amPlayer1 ? roomState?.board_state?.pieces?.player_2 : roomState?.board_state?.pieces?.player_1;
  const opponent = amPlayer1 ? roomState?.player_2_profile : roomState?.player_1_profile;
  const myProfile = amPlayer1 ? roomState?.player_1_profile : roomState?.player_2_profile;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ─── PRE-MATCH SCREEN ────────────────────────────────────────────────────────
  if (phase === "pre-match" || !roomState) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[999]">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto"
          />
          <p className="text-xs text-purple-400 font-bold uppercase tracking-widest">Entering Arena...</p>
        </div>
      </div>
    );
  }

  // ─── COUNTDOWN SCREEN ────────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[999] select-none">
        {/* VS reveal */}
        <div className="flex items-center gap-8 mb-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full border-2 border-purple-500 overflow-hidden shadow-[0_0_24px_rgba(168,85,247,0.5)] bg-slate-900">
              <img src={myProfile?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=You`} alt="Me" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-black text-purple-300">{myProfile?.name || "You"}</span>
          </div>

          <div className="text-2xl font-black text-amber-400 animate-pulse">VS</div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full border-2 border-blue-500 overflow-hidden shadow-[0_0_24px_rgba(59,130,246,0.5)] bg-slate-900">
              <img src={opponent?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=Opponent`} alt="Opponent" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-black text-blue-300">{opponent?.name || "Opponent"}</span>
          </div>
        </div>

        {/* Countdown number */}
        <div className="space-y-3 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Match starts in</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4, type: "spring" }}
              className={`text-9xl font-black tabular-nums drop-shadow-[0_0_30px_rgba(168,85,247,0.6)] ${
                countdown === 1 ? "text-red-400" : countdown === 2 ? "text-amber-400" : "text-purple-400"
              }`}
            >
              {countdown === 0 ? "GO!" : countdown}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stake info */}
        <div className="mt-8 bg-slate-900/60 border border-purple-500/20 rounded-xl px-6 py-3 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase">Prize Pool</span>
          <div className="text-lg font-black text-amber-400 mt-0.5">{roomState.stake * 2} Coins</div>
        </div>
      </div>
    );
  }

  // ─── ENDED SCREEN ────────────────────────────────────────────────────────────
  if (phase === "ended" && roomState) {
    const iWon = roomState.winner_id === userId;
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[999] p-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-full max-w-sm rounded-3xl bg-slate-950 border border-purple-500/30 p-7 text-center space-y-5"
        >
          {iWon ? (
            <>
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-6xl select-none"
              >
                <EmoteSVG type="Crown" size={64} />
              </motion.div>
              <h2 className="text-2xl font-black text-emerald-400 tracking-tight">VICTORY!</h2>
              <p className="text-xs text-slate-400 leading-relaxed">Outstanding play! Your rewards have been credited to your Won Coins balance.</p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-4 space-y-1">
                <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">Won Coins Earned</div>
                <div className="text-3xl font-black text-emerald-400">+{Math.floor(roomState.stake * 2 * 0.98)}</div>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl select-none flex justify-center">
                <EmoteSVG type="Shock" size={64} />
              </div>
              <h2 className="text-2xl font-black text-red-500 tracking-tight">DEFEATED</h2>
              <p className="text-xs text-slate-400 leading-relaxed">A tough match! Come back stronger in your next battle.</p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl py-4 space-y-1">
                <div className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider">Stake Lost</div>
                <div className="text-3xl font-black text-red-400">-{roomState.stake}</div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExit}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest border border-purple-400/20"
            >
              Return to Lobby
            </button>
          </div>

          {/* Win reason tag */}
          {roomState.win_reason && (
            <div className="text-[9px] text-slate-600 font-mono">
              {roomState.win_reason === "forfeit" ? "Opponent forfeited" :
               roomState.win_reason === "timeout" ? "Hearts depleted — timeout" :
               roomState.win_reason === "score_timer" ? "Time limit — higher score wins" : ""}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── ACTIVE GAME BOARD ───────────────────────────────────────────────────────
  const CELL = 100 / 15;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden z-[999] select-none text-white">

      {/* Floating emotes layer */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floatingEmotes.map(({ id, type, fromOpponent }) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.3, y: fromOpponent ? -60 : 60, x: fromOpponent ? 40 : -40 }}
              animate={{ opacity: 1, scale: 1.3, y: fromOpponent ? 40 : -40, x: fromOpponent ? 20 : -20 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.5 }}
              className={`absolute ${fromOpponent ? "top-20 right-4" : "bottom-32 left-4"}`}
            >
              <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-2 border border-purple-500/30 shadow-xl">
                <EmoteSVG type={type} size={36} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── OPPONENT HEADER ── */}
      <div className="flex-none px-3 pt-3 pb-2">
        <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 overflow-hidden bg-slate-950">
                <img src={opponent?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=Opp`} alt="Opp" className="w-full h-full object-cover" />
              </div>
              {!isMyTurn && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-950 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-200 truncate max-w-[100px]">{opponent?.name || "Opponent"}</div>
              <div className="text-[9px] text-slate-500 font-semibold">Score: {oppScore ?? 0}</div>
            </div>
          </div>

          <HeartRow count={oppHearts ?? 3} />

          <button
            onClick={() => setShowEmotes(v => !v)}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center"
          >
            <EmoteSVG type="Clap" size={18} />
          </button>
        </div>
      </div>

      {/* ── TIMERS BAR ── */}
      <div className="flex-none px-3 pb-1">
        <div className="flex items-center justify-between text-[9px] font-mono font-bold">
          <span className="text-slate-500">
            Turn: <span className={`tabular-nums ${turnTimer <= 5 ? "text-red-400 animate-pulse" : "text-purple-300"}`}>{turnTimer}s</span>
          </span>
          <span className="text-amber-400 font-black">Pool: {roomState.stake * 2} Coins</span>
          <span className="text-slate-500">
            Time: <span className={`tabular-nums ${matchTimer <= 60 ? "text-red-400" : "text-slate-300"}`}>{formatTime(matchTimer)}</span>
          </span>
        </div>
        {/* Turn timer bar */}
        <div className="mt-1 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${turnTimer <= 5 ? "bg-red-500" : "bg-purple-500"}`}
            style={{ width: `${(turnTimer / 15) * 100}%` }}
          />
        </div>
      </div>

      {/* ── LUDO BOARD ── */}
      <div className="flex-1 px-2 py-1 flex items-center justify-center overflow-hidden">
        <div className="relative w-full aspect-square max-w-[420px] max-h-[420px]">
          <svg className="w-full h-full rounded-2xl shadow-2xl" viewBox="0 0 100 100" fill="none">

            {/* Board base */}
            <rect width="100" height="100" rx="4" fill="#090D18" />

            {/* ── Yards ── */}
            {/* Red (Player 1) - top-left */}
            <rect x="0" y="0" width="40" height="40" rx="4" fill="#EF444415" stroke="#EF4444" strokeWidth="0.6" />
            <rect x="6" y="6" width="28" height="28" rx="3" fill="#0A0F1E" stroke="#EF4444" strokeWidth="0.5" />
            {[[13,13],[27,13],[13,27],[27,27]].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="4.5" fill="#EF444430" stroke="#EF4444" strokeWidth="0.5" />
            ))}
            {/* Green - top-right (unused 1v1) */}
            <rect x="60" y="0" width="40" height="40" rx="4" fill="#1E293B15" stroke="#334155" strokeWidth="0.3" />
            {/* Yellow - bottom-left (unused 1v1) */}
            <rect x="0" y="60" width="40" height="40" rx="4" fill="#1E293B15" stroke="#334155" strokeWidth="0.3" />
            {/* Blue (Player 2) - bottom-right */}
            <rect x="60" y="60" width="40" height="40" rx="4" fill="#3B82F615" stroke="#3B82F6" strokeWidth="0.6" />
            <rect x="66" y="66" width="28" height="28" rx="3" fill="#0A0F1E" stroke="#3B82F6" strokeWidth="0.5" />
            {[[73,73],[87,73],[73,87],[87,87]].map(([cx,cy],i) => (
              <circle key={i} cx={cx} cy={cy} r="4.5" fill="#3B82F630" stroke="#3B82F6" strokeWidth="0.5" />
            ))}

            {/* ── Home triangle ── */}
            <polygon points="40,40 50,50 40,60" fill="#EF444420" stroke="#EF4444" strokeWidth="0.5" />
            <polygon points="60,40 50,50 60,60" fill="#3B82F620" stroke="#3B82F6" strokeWidth="0.5" />
            <polygon points="40,40 50,50 60,40" fill="#1E293B10" stroke="#334155" strokeWidth="0.25" />
            <polygon points="40,60 50,50 60,60" fill="#1E293B10" stroke="#334155" strokeWidth="0.25" />
            <circle cx="50" cy="50" r="4" fill="#A855F720" stroke="#A855F7" strokeWidth="0.5" />

            {/* ── Track cells ── */}
            {TRACK_COORDS.map((cell, idx) => {
              const isLaunch = idx === 1 || idx === 27;
              const isStar = STAR_SPOTS.includes(idx);
              let fill = "#1E293B25";
              if (idx === 1) fill = "#EF444440";
              else if (idx === 27) fill = "#3B82F640";
              else if (isStar) fill = "#A855F725";
              return (
                <g key={idx}>
                  <rect
                    x={cell.x * CELL + 0.3}
                    y={cell.y * CELL + 0.3}
                    width={CELL - 0.6}
                    height={CELL - 0.6}
                    rx="0.8"
                    fill={fill}
                    stroke={isLaunch || isStar ? (isStar ? "#A855F7" : idx === 1 ? "#EF4444" : "#3B82F6") : "#334155"}
                    strokeWidth={isLaunch || isStar ? 0.45 : 0.15}
                  />
                  {isStar && (
                    <text x={cell.x * CELL + CELL / 2} y={cell.y * CELL + CELL / 2 + 1.5} textAnchor="middle" fontSize="4" fill="#A855F7" opacity="0.8">★</text>
                  )}
                </g>
              );
            })}

            {/* ── Home paths ── */}
            {/* Red home path (left) */}
            {[1,2,3,4,5].map(col => (
              <rect key={`rh${col}`} x={col*CELL+0.3} y={7*CELL+0.3} width={CELL-0.6} height={CELL-0.6} rx="0.8" fill="#EF444430" stroke="#EF4444" strokeWidth="0.3" />
            ))}
            {/* Blue home path (right) */}
            {[9,10,11,12,13].map(col => (
              <rect key={`bh${col}`} x={col*CELL+0.3} y={7*CELL+0.3} width={CELL-0.6} height={CELL-0.6} rx="0.8" fill="#3B82F630" stroke="#3B82F6" strokeWidth="0.3" />
            ))}

            {/* ── PLAYER PIECES ── */}
            {/* Player 1 (Red) */}
            {(roomState.board_state?.pieces?.player_1 || []).map((pos: number, idx: number) => {
              const p1IsMe = amPlayer1;
              const coords = getPieceCoords(true, pos, idx);
              const stack = getStackOffset(roomState.board_state.pieces.player_1, pos, idx);
              const cx = coords.x * CELL + CELL / 2 + stack.dx;
              const cy = coords.y * CELL + CELL / 2 + stack.dy;
              const canMove = p1IsMe && isMyTurn && roomState.dice_rolled && roomState.movable_pieces?.includes(idx);
              return (
                <g key={`p1-${idx}`} onClick={() => canMove && handleMove(idx)} style={{ cursor: canMove ? "pointer" : "default" }}>
                  {canMove && (
                    <circle cx={cx} cy={cy} r="4">
                      <animate attributeName="r" values="3;4.5;3" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {canMove && <circle cx={cx} cy={cy} r="4" fill="#EF444440" />}
                  <circle cx={cx} cy={cy} r="2.8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="0.6" />
                  <circle cx={cx} cy={cy} r="1.3" fill="#7F1D1D" />
                  {p1IsMe && pos === 0 && (
                    <text x={cx} y={cy + 0.6} textAnchor="middle" fontSize="2.5" fill="white" fontWeight="bold">{idx+1}</text>
                  )}
                </g>
              );
            })}

            {/* Player 2 (Blue) */}
            {(roomState.board_state?.pieces?.player_2 || []).map((pos: number, idx: number) => {
              const p2IsMe = !amPlayer1;
              const coords = getPieceCoords(false, pos, idx);
              const stack = getStackOffset(roomState.board_state.pieces.player_2, pos, idx);
              const cx = coords.x * CELL + CELL / 2 + stack.dx;
              const cy = coords.y * CELL + CELL / 2 + stack.dy;
              const canMove = p2IsMe && isMyTurn && roomState.dice_rolled && roomState.movable_pieces?.includes(idx);
              return (
                <g key={`p2-${idx}`} onClick={() => canMove && handleMove(idx)} style={{ cursor: canMove ? "pointer" : "default" }}>
                  {canMove && <circle cx={cx} cy={cy} r="4" fill="#3B82F640" />}
                  {canMove && (
                    <circle cx={cx} cy={cy} r="4">
                      <animate attributeName="r" values="3;4.5;3" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={cx} cy={cy} r="2.8" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="0.6" />
                  <circle cx={cx} cy={cy} r="1.3" fill="#1E3A8A" />
                </g>
              );
            })}

          </svg>
        </div>
      </div>

      {/* ── MY PLAYER FOOTER ── */}
      <div className="flex-none px-3 pt-1 pb-3">
        <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl px-3 py-2.5">
          {/* My avatar + name */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500 overflow-hidden bg-slate-950">
                <img src={myProfile?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=Me`} alt="Me" className="w-full h-full object-cover" />
              </div>
              {isMyTurn && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-950 animate-pulse" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-200 truncate max-w-[80px]">{myProfile?.name || "You"}</div>
              <div className="text-[9px] text-slate-500 font-semibold">Score: {myScore ?? 0}</div>
            </div>
          </div>

          <HeartRow count={myHearts ?? 3} />

          {/* Dice / action area */}
          <div className="flex items-center gap-2">
            {isMyTurn && roomState.status === "active" ? (
              !roomState.dice_rolled ? (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  disabled={rolling}
                  onClick={handleRoll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-black uppercase tracking-wider border border-purple-400/30 disabled:opacity-60"
                >
                  {rolling ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.3, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <DiceFace value={diceDisplay || 1} size={20} />
                  )}
                  {rolling ? "Rolling..." : "Roll!"}
                </motion.button>
              ) : (
                <div className="flex items-center gap-1.5 bg-purple-950/50 border border-purple-500/30 px-2.5 py-1.5 rounded-xl">
                  <motion.div
                    key={diceDisplay}
                    initial={{ scale: 0.5, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <DiceFace value={diceDisplay || roomState.last_roll} size={22} />
                  </motion.div>
                  <div>
                    <div className="text-[8px] text-purple-400 font-black uppercase">Rolled</div>
                    <div className="text-sm font-black text-amber-400 tabular-nums">{roomState.last_roll}</div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-2.5 py-1.5 rounded-xl">
                {roomState.last_roll > 0 && <DiceFace value={roomState.last_roll} size={18} />}
                <span className="text-[9px] text-slate-500 font-bold">
                  {isMyTurn ? "Move a piece" : "Opponent's turn"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between mt-2 px-1">
          <button
            onClick={handleForfeit}
            className="text-[9px] text-red-500/70 hover:text-red-500 font-bold uppercase tracking-wider py-1 px-2 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors"
          >
            🏳 Forfeit
          </button>

          {isMyTurn && roomState.dice_rolled && (
            <div className="text-[9px] text-purple-400 font-black uppercase tracking-wider animate-pulse">
              ← Tap a piece to move →
            </div>
          )}

          <div className="text-[9px] text-slate-600 font-mono">
            {roomState.stake}c stake
          </div>
        </div>
      </div>

      {/* ── EMOTE PICKER ── */}
      <AnimatePresence>
        {showEmotes && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30"
              onClick={() => setShowEmotes(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute top-20 right-4 z-40 bg-slate-950/98 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-3 shadow-2xl"
            >
              <div className="text-[9px] text-purple-400 font-black uppercase tracking-widest mb-2.5 px-1">Send Reaction</div>
              <div className="grid grid-cols-3 gap-2">
                {EMOTES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleEmote(type)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 transition-all"
                  >
                    <EmoteSVG type={type} size={28} />
                    <span className="text-[8px] text-slate-400 font-semibold">{type}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── GAME OVER OVERLAY (when playing phase detects completed status) ── */}
      {(roomState.status === "completed" || roomState.status === "forfeited") && phase === "playing" && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
          />
        </div>
      )}

    </div>
  );
}
