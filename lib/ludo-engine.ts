/**
 * LUDZO — Server-Authoritative Ludo Engine
 * ==========================================
 * Single source of truth for board / movement logic.
 * Imported by: roll, move, state routes.
 *
 * POSITION SYSTEM (relative, per-player):
 *   0       = in yard (home base)
 *   1       = starting square (first cell on shared track)
 *   2..51   = rest of shared track
 *   52..56  = private home lane (5 cells, immune from capture)
 *   57      = finished
 *
 * ABSOLUTE TRACK MAPPING (0-indexed, 52 cells, clockwise):
 *   Player 1: absIdx = (relPos - 1 + 0)  % 52
 *   Player 2: absIdx = (relPos - 1 + 26) % 52
 *   Only relPos 1..51 map to the shared track.
 *
 * SAFE CELLS (capture-immune absolute indices):
 *   1, 9, 14, 22, 27, 35, 40, 48
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const SAFE_TRACK_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

export const TURN_TIMEOUT_SECS    = 18;   // 15 s play + 3 s grace
export const MATCH_DURATION_SECS  = 480;  // 8 minutes
export const MAX_CONSECUTIVE_SIXES = 3;   // 3 sixes in a row → forfeit turn

// ── Position helpers ──────────────────────────────────────────────────────────

export function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  if (relPos < 1 || relPos > 51) return null;
  const offset = isPlayer1 ? 0 : 26;
  return (relPos - 1 + offset) % 52;
}

export function isSafeCell(absIdx: number): boolean {
  return SAFE_TRACK_INDICES.has(absIdx);
}

export function canAdvance(pos: number, roll: number): boolean {
  if (pos === 0) return false;
  if (pos === 57) return false;
  return pos + roll <= 57;
}

// ── Movable piece calculation ─────────────────────────────────────────────────

export function calcMovablePieces(pieces: number[], roll: number): number[] {
  const movable: number[] = [];
  for (let i = 0; i < 4; i++) {
    const pos = pieces[i];
    if (pos === 57) continue;
    if (pos === 0) {
      if (roll === 6) movable.push(i);
      continue;
    }
    if (canAdvance(pos, roll)) movable.push(i);
  }
  return movable;
}

// ── Move application ──────────────────────────────────────────────────────────

export interface MoveResult {
  myPieces: number[];
  oppPieces: number[];
  hasCapture: boolean;
  reachedFinish: boolean;
  isWin: boolean;
}

export function applyMove(
  myPieces: number[],
  oppPieces: number[],
  pieceIdx: number,
  roll: number,
  amPlayer1: boolean
): MoveResult {
  const mp = [...myPieces];
  const op = [...oppPieces];

  const currPos = mp[pieceIdx];
  const newPos  = currPos === 0 ? 1 : Math.min(currPos + roll, 57);
  mp[pieceIdx]  = newPos;

  let hasCapture = false;
  if (newPos >= 1 && newPos <= 51) {
    const myAbs = toAbsTrack(newPos, amPlayer1);
    if (myAbs !== null && !isSafeCell(myAbs)) {
      for (let i = 0; i < 4; i++) {
        const oPos = op[i];
        if (oPos < 1 || oPos > 51) continue;
        const oppAbs = toAbsTrack(oPos, !amPlayer1);
        if (oppAbs === myAbs) {
          op[i] = 0;
          hasCapture = true;
        }
      }
    }
  }

  const reachedFinish = newPos === 57;
  const isWin = mp.every(p => p === 57);

  return { myPieces: mp, oppPieces: op, hasCapture, reachedFinish, isWin };
}

// ── Extra-turn rule ───────────────────────────────────────────────────────────
//
// IMPORTANT: This function does NOT check consecutive sixes.
// The triple-six guard lives exclusively in the ROLL route, which is the only
// place a six can be detected and blocked before the player even moves.
// By the time applyMove / getsExtraTurn is called, the roll was already allowed
// through, so a six always earns an extra turn here.
//
// Classic Ludo extra-turn conditions:
//   • Rolled a 6
//   • Captured an opponent piece
//   • A piece reached the finish (position 57)
//
export function getsExtraTurn(
  roll: number,
  hasCapture: boolean,
  reachedFinish: boolean
): boolean {
  return roll === 6 || hasCapture || reachedFinish;
}

// ── Score ─────────────────────────────────────────────────────────────────────

export function calcScore(pieces: number[]): number {
  return pieces.reduce((s, p) => s + p, 0);
}

// ── Bot AI ────────────────────────────────────────────────────────────────────

export function botChoosePiece(
  botPieces: number[],
  oppPieces: number[],
  movable: number[],
  roll: number
): number {
  let best = movable[0];
  let bestScore = -Infinity;

  for (const idx of movable) {
    const pos     = botPieces[idx];
    const nextPos = pos === 0 ? 1 : Math.min(pos + roll, 57);
    let score     = nextPos;

    if (nextPos === 57)      score += 10_000;
    else if (nextPos >= 52)  score += 5_000;

    if (nextPos >= 1 && nextPos <= 51) {
      const absCell = toAbsTrack(nextPos, false); // bot = player_2
      if (absCell !== null && !isSafeCell(absCell)) {
        for (const oPos of oppPieces) {
          if (oPos >= 1 && oPos <= 51) {
            const oAbs = toAbsTrack(oPos, true); // opponent = player_1
            if (oAbs === absCell) { score += 2_000; break; }
          }
        }
      }
    }

    if (score > bestScore) { bestScore = score; best = idx; }
  }

  return best;
}
