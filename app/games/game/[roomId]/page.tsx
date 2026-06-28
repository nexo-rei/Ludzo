"use client";

/**
 * LUDZO — Ludo 1v1 Game Screen (Phase 5 — fully fixed)
 //rebuild
 * ─────────────────────────────────────────────────────
 * Route: /games/game/[roomId]
 *
 * Key fixes in this version:
 *  - Match timer is SERVER-AUTHORITATIVE: uses match_remaining_seconds from
 *    the server on every poll.  Never restarts on refresh / reconnect.
 *  - Turn timer is SERVER-AUTHORITATIVE: resyncs from turn_remaining_seconds
 *    on every poll.  Resets correctly when the turn changes.
 *  - Reconnect: room status "active" → skip countdown, restore full state.
 *  - Emoji reactions: picked up via 1.2 s polling of chat_reactions.
 *  - No client-side game logic — all dice / movement / settlement is server.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/hooks/useApp";
import { showToast } from "@/components/ui/Toast";

// ─── Types ─────────────────────────────────────────────────────────────────
type GamePhase = "loading" | "pre-match" | "countdown" | "playing" | "ended" | "error";

interface PlayerProfile {
  name: string;
  avatar: string;
}

interface BoardState {
  pieces: {
    player_1: number[];
    player_2: number[];
  };
  bot_profile?: PlayerProfile;
}

interface RoomState {
  id: string;
  stake: number;
  player_1_id: string;
  player_2_id: string;
  player_1_profile: PlayerProfile;
  player_2_profile: PlayerProfile;
  status: "countdown" | "active" | "completed" | "forfeited";
  turn_player_id: string;
  /** Server-computed, seconds remaining in the current turn */
  turn_remaining_seconds: number;
  /** Server-computed, seconds remaining in the whole match */
  match_remaining_seconds: number;
  /** ISO timestamp of when the match actually started (server-set) */
  match_start_time: string;
  dice_rolled: boolean;
  last_roll: number;
  movable_pieces: number[];
  hearts_player_1: number;
  hearts_player_2: number;
  score_player_1: number;
  score_player_2: number;
  winner_id: string | null;
  loser_id: string | null;
  win_reason: string | null;
  board_state: BoardState;
  chat_reactions: Array<{ player_id: string; type: string; timestamp: number }>;
}

// ─── Ludo board track (52 cells, clockwise) ────────────────────────────────
const TRACK: { x: number; y: number }[] = [
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

const SAFE_SPOTS  = new Set([1, 9, 14, 22, 27, 35, 40, 48]);
const STAR_SPOTS  = new Set([9, 22, 35, 48]);
const CELL        = 100 / 15;

// ─── Emote definitions ─────────────────────────────────────────────────────
const EMOTES = ["Laugh", "Angry", "Fire", "Crown", "Clap", "Shock"] as const;
type EmoteType = typeof EMOTES[number];

function EmoteSVG({ type, size = 24 }: { type: EmoteType | string; size?: number }) {
  switch (type) {
    case "Laugh":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
          <ellipse cx="11" cy="13" rx="2" ry="2.5" fill="#92400E" />
          <ellipse cx="21" cy="13" rx="2" ry="2.5" fill="#92400E" />
          <path d="M9 19 Q16 26 23 19" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="#FCD34D" />
        </svg>
      );
    case "Angry":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
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
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M16 2C16 2 20 8 18 13C22 10 24 6 22 2C26 6 28 12 26 18C28 16 29 14 28 10C31 15 30 22 26 26C24 30 20 31 16 31C12 31 8 30 6 26C2 22 1 15 4 10C3 14 4 16 6 18C4 12 6 6 10 2C8 6 10 10 14 13C12 8 16 2 16 2Z" fill="#F97316" />
          <path d="M16 12C16 12 19 16 17 20C20 18 21 14 20 12C22 15 22 20 19 24C18 27 16 28 16 28C16 28 14 27 13 24C10 20 10 15 12 12C11 14 12 16 14 20C12 16 16 12 16 12Z" fill="#FCD34D" />
        </svg>
      );
    case "Crown":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M4 24 L6 12 L12 18 L16 8 L20 18 L26 12 L28 24 Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="4" y="24" width="24" height="4" rx="1" fill="#F59E0B" />
          <circle cx="16" cy="8" r="2.5" fill="#EF4444" />
          <circle cx="6" cy="12" r="2" fill="#A855F7" />
          <circle cx="26" cy="12" r="2" fill="#3B82F6" />
        </svg>
      );
    case "Clap":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M12 8 L10 16 L8 14 L7 10 Q7 7 10 7Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          <path d="M15 6 L14 19 L10 18 L10 8 Q10 5 13 5Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" />
          <path d="M18 7 L19 20 L12 20 L11 9 Q12 6 15 6Z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          <path d="M21 10 L22 21 L18 22 L17 20Z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" />
          <path d="M10 20 L20 22 L20 26 Q15 28 10 26Z" fill="#F59E0B" />
        </svg>
      );
    case "Shock":
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
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

// ─── Dice face ─────────────────────────────────────────────────────────────
function DiceFace({ value, size = 40, rolling = false }: { value: number; size?: number; rolling?: boolean }) {
  const dotMap: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };
  const dots = dotMap[value] ?? dotMap[1];
  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 100 100" fill="none"
      animate={rolling ? { rotate: [0, -20, 20, -15, 15, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <rect width="100" height="100" rx="20" fill="#1E293B" stroke="#A855F7" strokeWidth="4" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill="#A855F7" />
      ))}
    </motion.svg>
  );
}

// ─── Hearts row ────────────────────────────────────────────────────────────
function Hearts({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21C12 21 3 14 3 8.5C3 5.46 5.46 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.54 3 23 5.46 23 8.5C23 14 14 21 14 21H12Z"
            fill={i < count ? "#EF4444" : "#1E293B"}
            stroke={i < count ? "#DC2626" : "#374151"}
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </div>
  );
}

// ─── Loading screen ────────────────────────────────────────────────────────
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[999] gap-5">
      <motion.div
        className="relative w-16 h-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent" />
      </motion.div>
      <motion.p
        key={message}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] text-purple-400 font-black uppercase tracking-[0.2em]"
      >
        {message}
      </motion.p>
    </div>
  );
}

// ─── Error screen ──────────────────────────────────────────────────────────
function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[999] p-6 gap-6">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="27" fill="#1E293B" stroke="#EF4444" strokeWidth="2" />
        <path d="M28 16 L28 30" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        <circle cx="28" cy="38" r="2.5" fill="#EF4444" />
      </svg>
      <div className="text-center space-y-2">
        <p className="text-sm font-black text-white">Unable to Load Match</p>
        <p className="text-xs text-slate-400 leading-relaxed max-w-[260px]">{message}</p>
      </div>
      <button
        onClick={onBack}
        className="px-6 py-3 rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-wider"
      >
        Back to Lobby
      </button>
    </div>
  );
}

// ─── Board component ───────────────────────────────────────────────────────
function LudoBoard({
  room,
  amPlayer1,
  isMyTurn,
  onMove,
}: {
  room: RoomState;
  amPlayer1: boolean;
  isMyTurn: boolean;
  onMove: (idx: number) => void;
}) {
  const p1Yard: [number, number][] = [[13, 13], [27, 13], [13, 27], [27, 27]];
  const p2Yard: [number, number][] = [[73, 73], [87, 73], [73, 87], [87, 87]];

  /**
   * Convert a player's relative position to SVG coordinates.
   * Pos 0  → yard
   * Pos 57 → home centre
   * Pos 52-56 → home lane
   * Pos 1-51  → main track
   */
  const pieceXY = (isP1: boolean, pos: number, idx: number): [number, number] => {
    if (pos === 0) {
      const yard = isP1 ? p1Yard : p2Yard;
      const [cx, cy] = yard[idx % 4];
      return [cx, cy];
    }
    if (pos === 57) {
      return isP1
        ? [50 - 4 + (idx % 2) * 4, 50 - 4 + Math.floor(idx / 2) * 4]
        : [50 + (idx % 2) * 4, 50 + Math.floor(idx / 2) * 4];
    }
    if (pos >= 52 && pos <= 56) {
      // Home lane cells (row 7, columns differ per player)
      const homeTrack: [number, number][] = isP1
        ? [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]]
        : [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]];
      const cell = homeTrack[(pos - 52) % 5];
      return [cell[0] * CELL + CELL / 2, cell[1] * CELL + CELL / 2];
    }
    // Main track
    const trackIdx = isP1
      ? (pos - 1) % TRACK.length
      : (pos - 1 + 26) % TRACK.length;
    const cell = TRACK[Math.min(trackIdx, TRACK.length - 1)];
    return [cell.x * CELL + CELL / 2, cell.y * CELL + CELL / 2];
  };

  const stackOffset = (pieces: number[], pos: number, idx: number): [number, number] => {
    if (pos === 0 || pos === 57) return [0, 0];
    const same = pieces.reduce<number[]>((a, p, i) => (p === pos ? [...a, i] : a), []);
    if (same.length <= 1) return [0, 0];
    const order = same.indexOf(idx);
    const angle = (order * 2 * Math.PI) / same.length;
    return [Math.cos(angle) * 1.5, Math.sin(angle) * 1.5];
  };

  const canMove = (idx: number) =>
    isMyTurn && room.dice_rolled && (room.movable_pieces ?? []).includes(idx);

  const myPieces  = amPlayer1
    ? room.board_state?.pieces?.player_1 ?? [0, 0, 0, 0]
    : room.board_state?.pieces?.player_2 ?? [0, 0, 0, 0];
  const oppPieces = amPlayer1
    ? room.board_state?.pieces?.player_2 ?? [0, 0, 0, 0]
    : room.board_state?.pieces?.player_1 ?? [0, 0, 0, 0];

  return (
    <svg className="w-full h-full rounded-2xl" viewBox="0 0 100 100" fill="none">
      {/* Board background */}
      <rect width="100" height="100" rx="4" fill="#080D18" />

      {/* Red yard (top-left = Player 1) */}
      <rect x="0" y="0" width="40" height="40" rx="4" fill="#EF444412" stroke="#EF4444" strokeWidth="0.5" />
      <rect x="6" y="6" width="28" height="28" rx="3" fill="#090E1C" stroke="#EF4444" strokeWidth="0.4" />
      {p1Yard.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="#EF444425" stroke="#EF4444" strokeWidth="0.5" />
      ))}

      {/* Blue yard (bottom-right = Player 2) */}
      <rect x="60" y="60" width="40" height="40" rx="4" fill="#3B82F612" stroke="#3B82F6" strokeWidth="0.5" />
      <rect x="66" y="66" width="28" height="28" rx="3" fill="#090E1C" stroke="#3B82F6" strokeWidth="0.4" />
      {p2Yard.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="#3B82F625" stroke="#3B82F6" strokeWidth="0.5" />
      ))}

      {/* Unused yards (1v1 mode) */}
      <rect x="60" y="0" width="40" height="40" rx="4" fill="#0F172A" stroke="#1E293B" strokeWidth="0.3" />
      <rect x="0" y="60" width="40" height="40" rx="4" fill="#0F172A" stroke="#1E293B" strokeWidth="0.3" />

      {/* Home triangles */}
      <polygon points="40,40 50,50 40,60" fill="#EF444418" stroke="#EF4444" strokeWidth="0.4" />
      <polygon points="60,40 50,50 60,60" fill="#3B82F618" stroke="#3B82F6" strokeWidth="0.4" />
      <polygon points="40,40 50,50 60,40" fill="#0F172A" stroke="#1E293B" strokeWidth="0.2" />
      <polygon points="40,60 50,50 60,60" fill="#0F172A" stroke="#1E293B" strokeWidth="0.2" />
      <circle cx="50" cy="50" r="4" fill="#A855F718" stroke="#A855F7" strokeWidth="0.5" />

      {/* Track cells */}
      {TRACK.map((cell, idx) => {
        const x = cell.x * CELL;
        const y = cell.y * CELL;
        const isSafe  = SAFE_SPOTS.has(idx);
        const isStar  = STAR_SPOTS.has(idx);
        const isLaunchRed  = idx === 1;
        const isLaunchBlue = idx === 27;
        let fill   = "#0F172A30";
        let stroke = "#1E293B";
        let sw     = 0.15;
        if (isLaunchRed)  { fill = "#EF444435"; stroke = "#EF4444"; sw = 0.4; }
        else if (isLaunchBlue) { fill = "#3B82F635"; stroke = "#3B82F6"; sw = 0.4; }
        else if (isStar)  { fill = "#A855F720"; stroke = "#A855F7"; sw = 0.35; }
        return (
          <g key={idx}>
            <rect x={x + 0.25} y={y + 0.25} width={CELL - 0.5} height={CELL - 0.5} rx="0.7"
              fill={fill} stroke={stroke} strokeWidth={sw} />
            {isStar && (
              <text x={x + CELL / 2} y={y + CELL / 2 + 1.5} textAnchor="middle" fontSize="3.5" fill="#A855F7" opacity="0.9">★</text>
            )}
          </g>
        );
      })}

      {/* Red home lane */}
      {[1, 2, 3, 4, 5].map(col => (
        <rect key={`rh${col}`} x={col * CELL + 0.25} y={7 * CELL + 0.25} width={CELL - 0.5} height={CELL - 0.5} rx="0.7"
          fill="#EF444428" stroke="#EF4444" strokeWidth="0.3" />
      ))}
      {/* Blue home lane */}
      {[9, 10, 11, 12, 13].map(col => (
        <rect key={`bh${col}`} x={col * CELL + 0.25} y={7 * CELL + 0.25} width={CELL - 0.5} height={CELL - 0.5} rx="0.7"
          fill="#3B82F628" stroke="#3B82F6" strokeWidth="0.3" />
      ))}

      {/* Opponent pieces (below mine) */}
      {oppPieces.map((pos: number, idx: number) => {
        const isP1Piece = !amPlayer1;
        const [baseCx, baseCy] = pieceXY(isP1Piece, pos, idx);
        const [dx, dy] = stackOffset(oppPieces, pos, idx);
        const color = isP1Piece ? "#EF4444" : "#3B82F6";
        const inner = isP1Piece ? "#7F1D1D" : "#1E3A8A";
        return (
          <g key={`opp-${idx}`}>
            <circle cx={baseCx + dx} cy={baseCy + dy} r="2.6" fill={color} stroke="#FFFFFF" strokeWidth="0.5" />
            <circle cx={baseCx + dx} cy={baseCy + dy} r="1.1" fill={inner} />
          </g>
        );
      })}

      {/* My pieces (interactive, on top) */}
      {myPieces.map((pos: number, idx: number) => {
        const [baseCx, baseCy] = pieceXY(amPlayer1, pos, idx);
        const [dx, dy] = stackOffset(myPieces, pos, idx);
        const cx = baseCx + dx;
        const cy = baseCy + dy;
        const canMoveThis = canMove(idx);
        const color = amPlayer1 ? "#EF4444" : "#3B82F6";
        const inner = amPlayer1 ? "#7F1D1D" : "#1E3A8A";
        return (
          <g key={`my-${idx}`}
            onClick={() => canMoveThis && onMove(idx)}
            style={{ cursor: canMoveThis ? "pointer" : "default" }}
          >
            {canMoveThis && (
              <>
                <circle cx={cx} cy={cy} r="4" fill={color} opacity="0.25">
                  <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0.05;0.25" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r="3.5" fill="none" stroke={color} strokeWidth="0.5" opacity="0.7" />
              </>
            )}
            <circle cx={cx} cy={cy} r="2.6" fill={color} stroke="#FFFFFF" strokeWidth="0.5" />
            <circle cx={cx} cy={cy} r="1.1" fill={inner} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main game page ────────────────────────────────────────────────────────
export default function LudoGamePage() {
  const router  = useRouter();
  const params  = useParams();
  const rawId   = params?.roomId;
  const roomId  = Array.isArray(rawId) ? rawId[0] : rawId ?? "";

  const { userId, refreshWallet } = useApp();

  // Phase machine
  const [phase, setPhase]         = useState<GamePhase>("loading");
  const [loadingMsg, setLoadingMsg] = useState("Loading Ludo Arena...");
  const [errorMsg, setErrorMsg]   = useState("");
  const [countdown, setCountdown] = useState(3);

  // Server-authoritative room state
  const [room, setRoom]   = useState<RoomState | null>(null);

  // Local UI states
  const [rolling, setRolling]         = useState(false);
  const [rollingAnim, setRollingAnim] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(1);
  const [showEmotes, setShowEmotes]   = useState(false);
  const [lastEmoteTime, setLastEmoteTime] = useState(0);

  // Server-driven timers (display only — never restart the source-of-truth)
  const [matchSecs, setMatchSecs] = useState(480);
  const [turnSecs,  setTurnSecs]  = useState(15);

  // Floating emote overlays
  const [floatingEmotes, setFloatingEmotes] = useState<
    Array<{ id: string; type: string; mine: boolean }>
  >([]);

  // Refs
  const phaseRef             = useRef<GamePhase>("loading");
  const roomRef              = useRef<RoomState | null>(null);
  const prevReactionLen      = useRef(0);
  const prevTurnPlayer       = useRef<string | null>(null);
  const pollRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchTickRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnTickRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchSecsRef         = useRef(480);
  const turnSecsRef          = useRef(15);
  const endedRef             = useRef(false);

  phaseRef.current = phase;
  roomRef.current  = room;

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Sound / vibration ────────────────────────────────────────────────────
  const playSound = useCallback((name: string) => {
    try {
      const a = new Audio(`/sounds/${name}.mp3`);
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch {}
  }, []);

  const vibe = useCallback((pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch {}
  }, []);

  // ── Prevent accidental back navigation ───────────────────────────────────
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPop = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Fetch room state from server ─────────────────────────────────────────
  const fetchRoom = useCallback(async (): Promise<RoomState | null> => {
    if (!roomId || !userId) return null;
    try {
      const res = await fetch(`/api/ludo/room/state?room_id=${roomId}`, {
        headers: {
          "Authorization": `Bearer ${userId}`,
          "x-user-id":     userId,
        },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success || !data.data) return null;
      return data.data as RoomState;
    } catch {
      return null;
    }
  }, [roomId, userId]);

  // ── Apply server state → UI (reactions, turn notification) ───────────────
  const applyRoomState = useCallback((state: RoomState) => {
    setRoom(state);

    if (state.last_roll > 0) setDiceDisplay(state.last_roll);

    // Sync server-provided timers (prevents client-side drift)
    if (typeof state.match_remaining_seconds === "number") {
      matchSecsRef.current = state.match_remaining_seconds;
      setMatchSecs(state.match_remaining_seconds);
    }
    if (typeof state.turn_remaining_seconds === "number") {
      turnSecsRef.current = state.turn_remaining_seconds;
      setTurnSecs(state.turn_remaining_seconds);
    }

    // Detect new opponent reactions
    const reactions = state.chat_reactions ?? [];
    if (reactions.length > prevReactionLen.current) {
      const latest = reactions[reactions.length - 1];
      if (latest && latest.player_id !== userId) {
        const id = `fe_${Date.now()}_${Math.random()}`;
        setFloatingEmotes(prev => [...prev.slice(-3), { id, type: latest.type, mine: false }]);
        setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 2800);
        playSound("piece-move");
      }
      prevReactionLen.current = reactions.length;
    }

    // Notify when my turn starts
    if (prevTurnPlayer.current !== null &&
        prevTurnPlayer.current !== state.turn_player_id &&
        state.turn_player_id === userId) {
      vibe(40);
    }
    prevTurnPlayer.current = state.turn_player_id;
  }, [userId, playSound, vibe]);

  // ── Handle match end ──────────────────────────────────────────────────────
  const handleMatchEnd = useCallback((state: RoomState) => {
    if (endedRef.current) return;
    endedRef.current = true;

    const won = state.winner_id === userId;
    playSound(won ? "victory" : "defeat");
    vibe(won ? [200, 100, 200, 100, 300] : [150, 150, 150]);
    refreshWallet();
    setPhase("ended");
  }, [userId, playSound, vibe, refreshWallet]);

  // ── Initial load (supports reconnect) ────────────────────────────────────
  useEffect(() => {
    if (!roomId) { setErrorMsg("Invalid room link."); setPhase("error"); return; }
    if (!userId) { setErrorMsg("Not authenticated. Please reopen the app."); setPhase("error"); return; }

    let cancelled = false;

    const init = async () => {
      setLoadingMsg("Loading Ludo Arena...");
      const state = await fetchRoom();
      if (cancelled) return;

      if (!state) {
        setErrorMsg("Room not found or you are not a player in this match.");
        setPhase("error");
        return;
      }
      if (!state.board_state?.pieces?.player_1 || !state.board_state?.pieces?.player_2) {
        setErrorMsg("Match data is corrupt. Please return to lobby.");
        setPhase("error");
        return;
      }

      applyRoomState(state);

      if (state.status === "completed" || state.status === "forfeited") {
        handleMatchEnd(state);
        return;
      }

      // Reconnect: room is already active → go straight to playing (no countdown)
      if (state.status === "active") {
        setLoadingMsg("Reconnecting to match...");
        setPhase("playing");
        return;
      }

      // New match: countdown → playing
      setLoadingMsg("Match found!");
      setPhase("pre-match");
    };

    init();
    return () => { cancelled = true; };
  }, [roomId, userId, fetchRoom, applyRoomState, handleMatchEnd]);

  // ── Pre-match (1 s opponent reveal) ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "pre-match") return;
    const t = setTimeout(() => setPhase("countdown"), 1000);
    return () => clearTimeout(t);
  }, [phase]);

  // ── 3-2-1 countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n <= 0) { playSound("match-found"); setPhase("playing"); }
      else { setCountdown(n); setTimeout(tick, 1000); }
    };
    const t = setTimeout(tick, 1000);
    return () => clearTimeout(t);
  }, [phase, playSound]);

  // ── Active game polling (1.2 s) ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    const poll = async () => {
      const state = await fetchRoom();
      if (!state) return;
      applyRoomState(state);
      if (state.status === "completed" || state.status === "forfeited") {
        handleMatchEnd(state);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 1200);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, fetchRoom, applyRoomState, handleMatchEnd]);

  // ── Match countdown tick (client-side interpolation between server syncs) ─
  useEffect(() => {
    if (phase !== "playing") return;
    if (matchTickRef.current) clearInterval(matchTickRef.current);

    matchTickRef.current = setInterval(() => {
      matchSecsRef.current = Math.max(0, matchSecsRef.current - 1);
      setMatchSecs(matchSecsRef.current);
    }, 1000);

    return () => { if (matchTickRef.current) clearInterval(matchTickRef.current); };
  }, [phase]);

  // ── Turn countdown tick — resets when turn_player_id changes ──────────────
  useEffect(() => {
    if (phase !== "playing") return;
    if (turnTickRef.current) clearInterval(turnTickRef.current);

    // Seed from last polled value
    const seed = room?.turn_remaining_seconds ?? 15;
    turnSecsRef.current = seed;
    setTurnSecs(seed);

    turnTickRef.current = setInterval(() => {
      turnSecsRef.current = Math.max(0, turnSecsRef.current - 1);
      setTurnSecs(turnSecsRef.current);
    }, 1000);

    return () => { if (turnTickRef.current) clearInterval(turnTickRef.current); };
    // Re-run when the active player changes
  }, [phase, room?.turn_player_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Roll dice ─────────────────────────────────────────────────────────────
  const handleRoll = useCallback(async () => {
    if (!roomId || !userId || rolling) return;
    if (room?.turn_player_id !== userId) return;
    if (room?.dice_rolled) return;
    if (room?.status !== "active") return;

    setRolling(true);
    setRollingAnim(true);
    playSound("dice-roll");
    vibe(30);

    let ticks = 0;
    const anim = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
      if (++ticks >= 10) clearInterval(anim);
    }, 70);

    try {
      const res = await fetch("/api/ludo/room/roll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ room_id: roomId }),
      });
      const data = await res.json();
      if (data.success) {
        setDiceDisplay(data.data?.roll ?? 1);
        if (data.data?.auto_passed) {
          showToast("No moves available — turn passed", "info");
        }
        const fresh = await fetchRoom();
        if (fresh) applyRoomState(fresh);
      } else {
        showToast(data.error ?? "Roll failed", "error");
      }
    } catch {
      showToast("Connection error. Try again.", "error");
    } finally {
      setRolling(false);
      setTimeout(() => setRollingAnim(false), 400);
    }
  }, [roomId, userId, rolling, room, playSound, vibe, fetchRoom, applyRoomState]);

  // ── Move piece ────────────────────────────────────────────────────────────
  const handleMove = useCallback(async (pieceIdx: number) => {
    if (!roomId || !userId) return;
    playSound("piece-move");
    vibe(20);

    try {
      const res = await fetch("/api/ludo/room/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ room_id: roomId, piece_index: pieceIdx }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.has_capture) {
          playSound("kill");
          vibe([80, 40, 80]);
          showToast("Captured opponent piece!", "success");
        }
        if (data.data?.extra_turn) {
          showToast("Extra turn!", "success");
        }
        const fresh = await fetchRoom();
        if (fresh) {
          applyRoomState(fresh);
          if (fresh.status === "completed" || fresh.status === "forfeited") {
            handleMatchEnd(fresh);
          }
        }
      } else {
        showToast(data.error ?? "Move failed", "error");
      }
    } catch {
      showToast("Connection error. Try again.", "error");
    }
  }, [roomId, userId, playSound, vibe, fetchRoom, applyRoomState, handleMatchEnd]);

  // ── Send emote ────────────────────────────────────────────────────────────
  const handleEmote = useCallback(async (type: EmoteType) => {
    if (!roomId || !userId) return;
    if (Date.now() - lastEmoteTime < 2000) return;
    setLastEmoteTime(Date.now());
    setShowEmotes(false);

    const id = `fe_${Date.now()}`;
    setFloatingEmotes(prev => [...prev.slice(-3), { id, type, mine: true }]);
    setTimeout(() => setFloatingEmotes(prev => prev.filter(e => e.id !== id)), 2800);

    try {
      await fetch("/api/ludo/room/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ room_id: roomId, reaction_type: type }),
      });
    } catch {}
  }, [roomId, userId, lastEmoteTime]);

  // ── Forfeit ───────────────────────────────────────────────────────────────
  const handleForfeit = useCallback(async () => {
    if (!roomId || !userId) return;
    if (!confirm("Forfeit match? You will lose your stake.")) return;
    try {
      await fetch("/api/ludo/room/forfeit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ room_id: roomId }),
      });
      const fresh = await fetchRoom();
      if (fresh) {
        applyRoomState(fresh);
        if (fresh.status === "forfeited" || fresh.status === "completed") {
          handleMatchEnd(fresh);
        }
      }
    } catch {
      showToast("Could not forfeit. Try again.", "error");
    }
  }, [roomId, userId, fetchRoom, applyRoomState, handleMatchEnd]);

  // ── Exit to lobby ─────────────────────────────────────────────────────────
  const handleExit = useCallback(() => router.replace("/games"), [router]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PHASES
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === "loading") return <LoadingScreen message={loadingMsg} />;
  if (phase === "error")   return <ErrorScreen message={errorMsg} onBack={handleExit} />;

  // PRE-MATCH: opponent reveal
  if (phase === "pre-match" && room) {
    const myProf  = room.player_1_id === userId ? room.player_1_profile : room.player_2_profile;
    const oppProf = room.player_1_id === userId ? room.player_2_profile : room.player_1_profile;
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[999] px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500 shadow-[0_0_24px_rgba(168,85,247,0.5)] bg-slate-900">
              <img src={myProf?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=me"} alt="Me"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=me"; }} />
            </div>
            <span className="text-xs font-black text-purple-300 max-w-[80px] truncate text-center">{myProf?.name ?? "You"}</span>
          </div>
          <div className="text-2xl font-black text-amber-400 animate-pulse">VS</div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.5)] bg-slate-900">
              <img src={oppProf?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=opp"} alt="Opponent"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=opp"; }} />
            </div>
            <span className="text-xs font-black text-blue-300 max-w-[80px] truncate text-center">{oppProf?.name ?? "Opponent"}</span>
          </div>
        </motion.div>
        <div className="mt-8 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Prize Pool</div>
          <div className="text-xl font-black text-amber-400">{(room.stake ?? 0) * 2} Coins</div>
        </div>
      </div>
    );
  }

  // COUNTDOWN: 3-2-1
  if (phase === "countdown" && room) {
    const myProf  = room.player_1_id === userId ? room.player_1_profile : room.player_2_profile;
    const oppProf = room.player_1_id === userId ? room.player_2_profile : room.player_1_profile;
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[999] px-6">
        <div className="flex items-center gap-8 mb-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500 bg-slate-900">
              <img src={myProf?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=me"} alt="Me"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=me"; }} />
            </div>
            <span className="text-[10px] font-black text-purple-300 truncate max-w-[70px] text-center">{myProf?.name ?? "You"}</span>
          </div>
          <div className="text-lg font-black text-amber-400">VS</div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-900">
              <img src={oppProf?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=opp"} alt="Opponent"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=opp"; }} />
            </div>
            <span className="text-[10px] font-black text-blue-300 truncate max-w-[70px] text-center">{oppProf?.name ?? "Opponent"}</span>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.4 }}
            className="text-7xl font-black text-white"
          >
            {countdown === 0 ? "GO!" : countdown}
          </motion.div>
        </AnimatePresence>
        <p className="mt-6 text-[10px] text-purple-400/70 font-bold uppercase tracking-widest">Get ready to play!</p>
      </div>
    );
  }

  // ENDED: victory / defeat screen
  if (phase === "ended" && room) {
    const iWon = room.winner_id === userId;
    return (
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center z-[999] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-full max-w-xs rounded-3xl bg-slate-950 border border-purple-500/20 p-7 text-center space-y-5 shadow-2xl"
        >
          <div className="flex justify-center">
            <EmoteSVG type={iWon ? "Crown" : "Shock"} size={64} />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${iWon ? "text-emerald-400" : "text-red-400"}`}>
              {iWon ? "VICTORY!" : "DEFEATED"}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {iWon
                ? "Outstanding play! Rewards credited to your Won Coins balance."
                : "A tough match! Come back stronger next time."}
            </p>
          </div>
          <div className={`rounded-xl py-4 border ${iWon ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <div className={`text-[9px] font-bold uppercase tracking-wider ${iWon ? "text-emerald-400/80" : "text-red-400/80"}`}>
              {iWon ? "Won Coins Earned" : "Stake Lost"}
            </div>
            <div className={`text-3xl font-black mt-1 ${iWon ? "text-emerald-400" : "text-red-400"}`}>
              {iWon ? `+${Math.floor((room.stake ?? 0) * 2 * 0.98)}` : `-${room.stake ?? 0}`}
            </div>
          </div>
          {room.win_reason && (
            <div className="text-[9px] text-slate-600 font-mono">
              {room.win_reason === "forfeit"     ? "Opponent forfeited"         :
               room.win_reason === "timeout"     ? "Hearts depleted"            :
               room.win_reason === "score_timer" ? "Time up — highest score wins" : ""}
            </div>
          )}
          <button
            onClick={handleExit}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest"
          >
            Return to Lobby
          </button>
        </motion.div>
      </div>
    );
  }

  // PLAYING: main game screen
  if (!room) return <LoadingScreen message="Syncing match..." />;

  const amPlayer1 = room.player_1_id === userId;
  const isMyTurn  = room.turn_player_id === userId;
  const myProfile  = amPlayer1 ? room.player_1_profile : room.player_2_profile;
  const oppProfile = amPlayer1 ? room.player_2_profile : room.player_1_profile;
  const myHearts   = amPlayer1 ? (room.hearts_player_1 ?? 3) : (room.hearts_player_2 ?? 3);
  const oppHearts  = amPlayer1 ? (room.hearts_player_2 ?? 3) : (room.hearts_player_1 ?? 3);
  const myScore    = amPlayer1 ? (room.score_player_1 ?? 0) : (room.score_player_2 ?? 0);
  const oppScore   = amPlayer1 ? (room.score_player_2 ?? 0) : (room.score_player_1 ?? 0);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden z-[999] select-none text-white">

      {/* Floating emotes */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floatingEmotes.map(({ id, type, mine }) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.4, y: mine ? 60 : -60 }}
              animate={{ opacity: 1, scale: 1.2, y: mine ? -20 : 20 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.45 }}
              className={`absolute ${mine ? "bottom-28 left-4" : "top-24 right-4"}`}
            >
              <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-2 border border-purple-500/30 shadow-xl">
                <EmoteSVG type={type as EmoteType} size={36} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* OPPONENT HEADER */}
      <div className="flex-none px-3 pt-safe pt-3 pb-2">
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-full border-2 border-blue-500 overflow-hidden bg-slate-950 flex-none">
              <img src={oppProfile?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=opp"} alt="Opp"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=opp"; }} />
              {!isMyTurn && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border border-slate-950 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-200 truncate max-w-[90px]">{oppProfile?.name ?? "Opponent"}</div>
              <div className="text-[9px] text-slate-500 font-semibold">Score {oppScore}</div>
            </div>
          </div>
          <Hearts count={oppHearts} />
          <button
            onClick={() => setShowEmotes(v => !v)}
            className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-none"
          >
            <EmoteSVG type="Clap" size={18} />
          </button>
        </div>
      </div>

      {/* Timer bar */}
      <div className="flex-none px-3 pb-1">
        <div className="flex items-center justify-between text-[9px] font-mono font-bold mb-1">
          <span className="text-slate-500">
            Turn: <span className={turnSecs <= 5 ? "text-red-400 animate-pulse" : "text-purple-300"}>{turnSecs}s</span>
          </span>
          <span className="text-amber-400 font-black">{(room.stake ?? 0) * 2} Pool</span>
          <span className="text-slate-500">
            Time: <span className={matchSecs <= 60 ? "text-red-400" : "text-slate-300"}>{formatTime(matchSecs)}</span>
          </span>
        </div>
        <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${turnSecs <= 5 ? "bg-red-500" : "bg-purple-500"}`}
            style={{ width: `${Math.max(0, (turnSecs / 15) * 100)}%` }}
          />
        </div>
      </div>

      {/* LUDO BOARD */}
      <div className="flex-1 px-2 py-1 flex items-center justify-center min-h-0">
        <div className="w-full aspect-square max-w-[400px] max-h-[400px]">
          <LudoBoard
            room={room}
            amPlayer1={amPlayer1}
            isMyTurn={isMyTurn}
            onMove={handleMove}
          />
        </div>
      </div>

      {/* MY PLAYER FOOTER */}
      <div className="flex-none px-3 pt-1 pb-safe pb-3">
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-full border-2 border-purple-500 overflow-hidden bg-slate-950 flex-none">
              <img src={myProfile?.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=me"} alt="Me"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=me"; }} />
              {isMyTurn && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-purple-500 rounded-full border border-slate-950 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-200 truncate max-w-[80px]">{myProfile?.name ?? "You"}</div>
              <div className="text-[9px] text-slate-500 font-semibold">Score {myScore}</div>
            </div>
          </div>
          <Hearts count={myHearts} />
          <div className="flex-none">
            {isMyTurn && room.status === "active" ? (
              !room.dice_rolled ? (
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  disabled={rolling}
                  onClick={handleRoll}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-black uppercase tracking-wider border border-purple-400/30 disabled:opacity-60 min-w-[80px]"
                >
                  <DiceFace value={diceDisplay} size={18} rolling={rollingAnim} />
                  {rolling ? "Rolling" : "Roll!"}
                </motion.button>
              ) : (
                <div className="flex items-center gap-1.5 bg-purple-950/50 border border-purple-500/30 px-2.5 py-1.5 rounded-xl">
                  <motion.div
                    key={room.last_roll}
                    initial={{ scale: 0.4, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  >
                    <DiceFace value={room.last_roll || diceDisplay} size={22} />
                  </motion.div>
                  <div>
                    <div className="text-[8px] text-purple-400 font-black uppercase leading-none">Rolled</div>
                    <div className="text-sm font-black text-amber-400 tabular-nums">{room.last_roll}</div>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 px-2.5 py-1.5 rounded-xl text-center min-w-[70px]">
                {room.last_roll > 0 && (
                  <div className="flex justify-center mb-0.5">
                    <DiceFace value={room.last_roll} size={16} />
                  </div>
                )}
                <span className="text-[8px] text-slate-500 font-bold leading-none">
                  {isMyTurn ? "Pick piece" : "Their turn"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action hint + forfeit */}
        <div className="flex items-center justify-between mt-2 px-1">
          <button
            onClick={handleForfeit}
            className="text-[9px] text-red-500/60 hover:text-red-500 font-bold uppercase tracking-wider py-1 px-2 rounded-lg border border-red-500/15 hover:border-red-500/30 transition-colors"
          >
            🏳 Forfeit
          </button>
          {isMyTurn && room.dice_rolled && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[9px] text-purple-400 font-black uppercase tracking-wider"
            >
              Tap a piece to move
            </motion.div>
          )}
          <div className="text-[9px] text-slate-600 font-mono">{room.stake}c</div>
        </div>
      </div>

      {/* EMOTE PICKER */}
      <AnimatePresence>
        {showEmotes && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30"
              onClick={() => setShowEmotes(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-[72px] right-3 z-40 bg-slate-950/98 border border-purple-500/30 rounded-2xl p-3 shadow-2xl"
            >
              <div className="text-[9px] text-purple-400 font-black uppercase tracking-widest mb-2 px-1">React</div>
              <div className="grid grid-cols-3 gap-2">
                {EMOTES.map(type => (
                  <button
                    key={type}
                    onClick={() => handleEmote(type)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/40 transition-all"
                  >
                    <EmoteSVG type={type} size={26} />
                    <span className="text-[8px] text-slate-400 font-semibold">{type}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Transitional overlay while match end propagates */}
      {(room.status === "completed" || room.status === "forfeited") && phase === "playing" && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
          />
        </div>
      )}
    </div>
  );
}
