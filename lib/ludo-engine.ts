/**
 * LUDZO — Server-Authoritative Ludo Engine
 * ==========================================
 * Single source of truth for ALL game logic.
 * Imported by: roll, move, state routes.
 *
 * POSITION SYSTEM (relative, per-player):
 *   0       = in yard (home base, never on track)
 *   1       = starting square (launch cell, first cell on main track)
 *   2..51   = remaining main track cells
 *   52..56  = exclusive home lane (5 steps, safe from capture)
 *   57      = finished (reached the centre)
 *
 * ABSOLUTE TRACK MAPPING (0-indexed, 52 cells, clockwise):
 *   Player 1 absolute = (relPos - 1 + 0)  % 52  → starts at index 0
 *   Player 2 absolute = (relPos - 1 + 26) % 52  → starts at index 26
 *
 *   Only relPos 1..51 are on the shared track.
 *   52-56 are the private home lane (per player, not shared).
 *   57 is finished.
 *
 * SAFE CELLS (cannot be captured):
 *   Absolute track indices: 1, 9, 14, 22, 27, 35, 40, 48
 *   These include the star cells and each player's launch cell.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const SAFE_TRACK_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

export const TURN_TIMEOUT_SECS   = 18;   // 15 s play + 3 s grace
export const MATCH_DURATION_SECS = 480;  // 8 minutes
export const MAX_CONSECUTIVE_SIXES = 3;  // Three sixes in a row → forfeit turn

// ── Position helpers ──────────────────────────────────────────────────────────

/**
 * Convert a player-relative position (1..51) to an absolute track index (0..51).
 * Returns null for positions not on the shared track (0, 52-57).
 */
export function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  if (relPos < 1 || relPos > 51) return null;
  const offset = isPlayer1 ? 0 : 26;
  return (relPos - 1 + offset) % 52;
}

export function isSafeCell(absIdx: number): boolean {
  return SAFE_TRACK_INDICES.has(absIdx);
}

/** Returns true if a piece at `pos` can legally move `roll` steps forward. */
export function canAdvance(pos: number, roll: number): boolean {
  if (pos === 0) return false;        // in yard — must use roll=6 to leave
  if (pos === 57) return false;       // already finished
  return pos + roll <= 57;           // cannot overshoot finish
}

// ── Movable piece calculation ─────────────────────────────────────────────────

/**
 * Calculate which piece indices can legally move given the current roll.
 * Returns array of 0-3 indices.
 */
export function calcMovablePieces(pieces: number[], roll: number): number[] {
  const movable: number[] = [];
  for (let i = 0; i < 4; i++) {
    const pos = pieces[i];
    if (pos === 57) continue;                 // already finished
    if (pos === 0) {
      if (roll === 6) movable.push(i);        // only a 6 can release from yard
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

/**
 * Apply a move for `pieceIdx` and return updated state.
 * @param myPieces    Moving player's pieces (relative positions).
 * @param oppPieces   Opponent's pieces (relative positions).
 * @param pieceIdx    Which of my 4 pieces to move (0-3).
 * @param roll        The dice value (1-6).
 * @param amPlayer1   Whether the moving player is player 1.
 */
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

  // Calculate new position
  let newPos: number;
  if (currPos === 0) {
    // Leaving yard → always land on starting square (position 1)
    newPos = 1;
  } else {
    newPos = Math.min(currPos + roll, 57);
  }

  mp[pieceIdx] = newPos;

  // ── Capture detection ──────────────────────────────────────────────────────
  // Capture is only possible on the shared track (positions 1..51).
  // Home lane (52-56) and the finish (57) are immune.
  let hasCapture = false;
  if (newPos >= 1 && newPos <= 51) {
    const myAbs = toAbsTrack(newPos, amPlayer1);
    if (myAbs !== null && !isSafeCell(myAbs)) {
      for (let i = 0; i < 4; i++) {
        const oPos = op[i];
        if (oPos < 1 || oPos > 51) continue;  // yard, home lane, or finished

        // The opponent is the other player
        const oppAbs = toAbsTrack(oPos, !amPlayer1);
        if (oppAbs === myAbs) {
          op[i] = 0;  // send opponent's piece back to yard
          hasCapture = true;
          // Do NOT break — multiple opponent pieces on same cell all get captured
        }
      }
    }
  }

  const reachedFinish = newPos === 57;
  const isWin = mp.every(p => p === 57);

  return { myPieces: mp, oppPieces: op, hasCapture, reachedFinish, isWin };
}

// ── Extra-turn rule ──────────────────────────────────────────────────────────

/**
 * Returns true if the moving player earns another turn.
 * Classic Ludo rules: extra turn for rolling 6, capturing an opponent, or getting a piece home.
 * Exception: if this is already the 3rd consecutive six, no extra turn.
 */
export function getsExtraTurn(
  roll: number,
  hasCapture: boolean,
  reachedFinish: boolean,
  consecutiveSixes: number
): boolean {
  if (roll === 6 && consecutiveSixes >= MAX_CONSECUTIVE_SIXES) {
    return false; // 3rd six — turn forfeited (no extra turn)
  }
  return roll === 6 || hasCapture || reachedFinish;
}

// ── Score calculation ─────────────────────────────────────────────────────────

/**
 * Calculate total score for a player (sum of piece positions).
 * Position 57 (finished) is the maximum contribution.
 */
export function calcScore(pieces: number[]): number {
  return pieces.reduce((s, p) => s + p, 0);
}

// ── Bot AI ────────────────────────────────────────────────────────────────────

/**
 * Bot strategy: choose the best movable piece.
 * Priority (descending): finish > capture > advance furthest piece > leave yard.
 */
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
    let score     = nextPos;  // base score = how far the piece advances

    if (nextPos === 57) {
      score += 10_000;  // highest priority: reach finish
    } else if (nextPos >= 52) {
      score += 5_000;   // high priority: enter home lane
    }

    // Capture bonus — bot is always player_2
    if (nextPos >= 1 && nextPos <= 51) {
      const absCell = toAbsTrack(nextPos, false);
      if (absCell !== null && !isSafeCell(absCell)) {
        for (const oPos of oppPieces) {
          if (oPos >= 1 && oPos <= 51) {
            const oAbs = toAbsTrack(oPos, true);  // opponent = player_1
            if (oAbs === absCell) {
              score += 2_000;
              break;
            }
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = idx;
    }
  }

  return best;
}
