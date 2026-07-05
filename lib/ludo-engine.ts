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
 *
 * BLOCK / BARRIER RULE (adapted from the reference Ludo `allBlockState` logic):
 *   When a player has TWO OR MORE of their own pieces on the same shared-track
 *   cell, those pieces form a "block" (barrier). An opponent piece may neither
 *   land on nor pass over that cell. Blocks only exist on the shared track
 *   (positions 1..51); the private home lane (52..56) can never be blocked.
 *   Blocks are derived on the server from board_state.pieces at evaluation time
 *   — there is no stored block column, so no schema change is required.
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

// ── Block / barrier detection ─────────────────────────────────────────────────

/**
 * Absolute shared-track cells where the given owner has a block (≥2 pieces).
 * Only track positions 1..51 are considered; home-lane cells cannot form blocks.
 *
 * @param ownerPieces  The four relative positions of the block owner.
 * @param ownerIsP1    true if the owner is player_1 (for abs-track mapping).
 */
export function getBlockedAbsCells(ownerPieces: number[], ownerIsP1: boolean): Set<number> {
  const counts = new Map<number, number>();
  for (const p of ownerPieces) {
    if (p < 1 || p > 51) continue;
    const abs = toAbsTrack(p, ownerIsP1);
    if (abs === null) continue;
    counts.set(abs, (counts.get(abs) ?? 0) + 1);
  }
  const blocked = new Set<number>();
  for (const [abs, count] of counts) {
    if (count >= 2) blocked.add(abs);
  }
  return blocked;
}

/**
 * True if moving a piece from `fromPos` to `toPos` (relative positions of the
 * MOVING player) would land on or pass over any opponent block cell. Only the
 * shared track (1..51) is checked; the home lane is never blocked.
 *
 * `fromPos` may be 0 (leaving the yard); the destination cell (pos 1) is then
 * the only cell tested.
 */
export function pathCrossesBlock(
  fromPos: number,
  toPos: number,
  moverIsP1: boolean,
  blockedAbsCells: Set<number>
): boolean {
  if (blockedAbsCells.size === 0) return false;
  for (let p = fromPos + 1; p <= toPos; p++) {
    if (p < 1 || p > 51) continue; // only shared-track cells can be blocked
    const abs = toAbsTrack(p, moverIsP1);
    if (abs !== null && blockedAbsCells.has(abs)) return true;
  }
  return false;
}

// ── Movable piece calculation ─────────────────────────────────────────────────
//
// `oppPieces` + `amPlayer1` enable the block/barrier rule: a piece cannot move
// if its path lands on or crosses a cell where the opponent has a block (≥2
// pieces). They default to no-opponent so legacy callers stay behaviour-safe,
// but every real caller passes them.
export function calcMovablePieces(
  pieces: number[],
  roll: number,
  oppPieces: number[] = [],
  amPlayer1: boolean = true
): number[] {
  const blocked = getBlockedAbsCells(oppPieces, !amPlayer1);
  const movable: number[] = [];
  for (let i = 0; i < 4; i++) {
    const pos = pieces[i];
    if (pos === 57) continue;
    if (pos === 0) {
      // Leaving the yard requires a 6 AND the start cell must not be blocked.
      if (roll === 6 && !pathCrossesBlock(0, 1, amPlayer1, blocked)) movable.push(i);
      continue;
    }
    if (canAdvance(pos, roll)) {
      const newPos = pos + roll;
      if (!pathCrossesBlock(pos, newPos, amPlayer1, blocked)) movable.push(i);
    }
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
