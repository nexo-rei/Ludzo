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
 *   Player 1: absIdx = (relPos - 1 + 1)  % 52   →  relPos 1  = abs 1
 *   Player 2: absIdx = (relPos - 1 + 27) % 52   →  relPos 1  = abs 27
 *   Only relPos 1..51 map to the shared track.
 *
 *   The +1 / +27 offsets are what align the engine with the rendered board:
 *   the client draws the launch squares at TRACK index 1 (red) and 27 (blue),
 *   and the home-lane entry cell is TRACK index 51 (red) / 25 (blue) — which is
 *   exactly relPos 51 under this mapping. Each player therefore walks 51 of the
 *   52 shared cells and skips only the cell immediately before their own start.
 *
 *   ⚠️ The previous offsets (0 / 26) were off by one, which caused:
 *        • pieces spawning one cell behind the drawn launch square
 *        • the launch square NOT being safe (a piece could be captured on its
 *          own start cell, because 0 and 26 are absent from SAFE_TRACK_INDICES)
 *        • the home-entry cell (abs 51 / 25) never being used, so tokens
 *          teleported diagonally into the home lane
 *
 * SAFE CELLS (capture-immune absolute indices):
 *   1, 9, 14, 22, 27, 35, 40, 48
 *   = the 4 launch squares (1, 14, 27, 40) + the 4 star squares (9, 22, 35, 48)
 *
 * BLOCK / BARRIER RULE (adapted from the reference Ludo `allBlockState` logic):
 *   When a player has TWO OR MORE of their own pieces on the same shared-track
 *   cell, those pieces form a "block" (barrier). An opponent piece may neither
 *   land on nor pass over that cell. Blocks only exist on the shared track
 *   (positions 1..51); the private home lane (52..56) can never be blocked.
 *   Blocks can never form on a SAFE cell — see getBlockedAbsCells() for why
 *   (yard soft-lock + trapped co-resident piece).
 *   Blocks are derived on the server from board_state.pieces at evaluation time
 *   — there is no stored block column, so no schema change is required.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Tokens per player in LUDZO 1v1: TWO. Both tokens must reach position 57 for
 * the win (calcFinished / applyMove.isWin). The engine is length-generic — it
 * loops over the pieces arrays it is given — so legacy rooms that were seeded
 * with 4 tokens keep playing correctly, while every new room is seeded with
 * 2 tokens by match_ludo_queue() (see sql/04_ludo_two_tokens_cleanup.sql).
 */
export const PIECES_PER_PLAYER = 2;

export const SAFE_TRACK_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

export const TURN_TIMEOUT_SECS    = 18;   // 15 s play + 3 s grace
export const MATCH_DURATION_SECS  = 480;  // 8 minutes
export const MAX_CONSECUTIVE_SIXES = 3;   // 3 sixes in a row → forfeit turn


/** Rolls that release a token from the yard. Applies to bot and human alike. */
export const YARD_RELEASE_ROLLS: ReadonlySet<number> = new Set([1, 6]);

/** True if `roll` may bring a token out of the yard. */
export function canLeaveYard(roll: number): boolean {
  return YARD_RELEASE_ROLLS.has(roll);
}

// ── Position helpers ──────────────────────────────────────────────────────────

export function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  if (relPos < 1 || relPos > 51) return null;
  // +1 / +27 — matches the rendered board, where the launch squares are
  // TRACK[1] (red) and TRACK[27] (blue). See the header note above.
  const offset = isPlayer1 ? 1 : 27;
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
 * ⚠️ SAFE CELLS CAN NEVER BE BLOCKED. Two reasons, both of which were live bugs:
 *
 *  1. YARD SOFT-LOCK. The launch squares (abs 1 and 27) are safe cells. If a
 *     player parked two pieces on the opponent's launch square, that square
 *     became a barrier and `pathCrossesBlock(0, 1, …)` rejected every yard
 *     piece — so the victim rolled a 6, got `movable = []`, auto-passed, and
 *     could NEVER bring a single piece into play. The match could then only end
 *     on the 8-minute timer.
 *  2. TRAPPED CO-RESIDENT. Because safe cells don't capture, an opponent piece
 *     can legitimately be sitting on a safe cell when the second block piece
 *     arrives. That piece would then be resting inside an enemy barrier, which
 *     is an inconsistent board state (the fuzzer caught exactly this).
 *
 * Star squares therefore stay passable, which matches the usual "safe haven"
 * semantics players expect.
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
    if (count >= 2 && !isSafeCell(abs)) blocked.add(abs);
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
  for (let i = 0; i < pieces.length; i++) {
    const pos = pieces[i];
    if (pos === 57) continue;
    if (pos === 0) {
            // Leaving the yard requires a release roll (1 or 6).
      if (canLeaveYard(roll) && !pathCrossesBlock(0, 1, amPlayer1, blocked)) movable.push(i);
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
  /**
   * true when the move violates a rule and must NOT be persisted.
   * `calcMovablePieces()` already filters these out at roll time — this is the
   * server's second line of defence for stale `movable_pieces` values, races
   * between concurrent requests, and any client that posts a raw piece_index.
   */
  illegal: boolean;
  reason?: string;
}

/** Absolute cells on which `owner` has a block (≥2 pieces). */
function opponentBlocks(oppPieces: number[], oppIsP1: boolean): Set<number> {
  return getBlockedAbsCells(oppPieces, oppIsP1);
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

  const reject = (reason: string): MoveResult => ({
    myPieces: mp, oppPieces: op,
    hasCapture: false, reachedFinish: false, isWin: false,
    illegal: true, reason,
  });

  const currPos = mp[pieceIdx];

  // ── Rule guards ───────────────────────────────────────────────────────────
  // Index guard: a stale/hand-crafted piece_index must never write undefined
  // into the board. (Legacy rooms can still legitimately use indexes 0..3.)
  if (
    !Number.isInteger(pieceIdx) || pieceIdx < 0 || pieceIdx >= myPieces.length ||
    !Number.isInteger(currPos)
  ) {
    return reject("invalid piece index for this board");
  }
  if (currPos === 57) return reject("piece already finished");
  if (currPos === 0 && !canLeaveYard(roll)) return reject("a 1 or a 6 is required to leave the yard");

  const newPos = currPos === 0 ? 1 : currPos + roll;

  // Reaching home requires an EXACT roll. Never clamp — clamping turned an
  // overshoot into an instant win (canAdvance() already forbids it, this keeps
  // applyMove() consistent so a stale movable_pieces list can't exploit it).
  if (newPos > 57) return reject(`overshoot: ${currPos} + ${roll} > 57`);

  // ── Block / barrier enforcement (was previously only done at roll time) ────
  const blocked = opponentBlocks(op, !amPlayer1);
  if (pathCrossesBlock(currPos, newPos, amPlayer1, blocked)) {
    return reject("path is blocked by an opponent barrier");
  }

  // Landing ON a barrier is illegal too — and this is what stops the old
  // double-capture, where a mover landing on a cell holding two opponent
  // pieces sent BOTH of them home.
  if (newPos >= 1 && newPos <= 51) {
    const destAbs = toAbsTrack(newPos, amPlayer1);
    if (destAbs !== null && blocked.has(destAbs)) {
      return reject("cannot land on an opponent barrier");
    }
  }

  mp[pieceIdx] = newPos;

  // ── Capture (single, non-blocked, non-safe cell only) ─────────────────────
  let hasCapture = false;
  if (newPos >= 1 && newPos <= 51) {
    const myAbs = toAbsTrack(newPos, amPlayer1);
    if (myAbs !== null && !isSafeCell(myAbs)) {
      for (let i = 0; i < op.length; i++) {
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

  return { myPieces: mp, oppPieces: op, hasCapture, reachedFinish, isWin, illegal: false };
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

/** How many pieces have actually reached home (position 57). */
export function calcFinished(pieces: number[]): number {
  return pieces.reduce((s, p) => s + (p === 57 ? 1 : 0), 0);
}

// ── Match-timer tiebreak ──────────────────────────────────────────────────────
//
// The old rule was `score1 >= score2`, which handed EVERY tied match to
// player_1 — a systematic advantage for whoever happened to be seated first.
// This ladder is symmetric: the same inputs always pick the genuinely stronger
// board, and an actual dead heat is settled with a coin flip instead of by seat.
//
// Returns 1 if player_1 wins, 2 if player_2 wins.

export function decideTimerWinner(opts: {
  pieces1: number[];
  pieces2: number[];
  score1: number;
  score2: number;
  hearts1: number;
  hearts2: number;
}): 1 | 2 {
  const fin1 = calcFinished(opts.pieces1);
  const fin2 = calcFinished(opts.pieces2);

  // 1. Most pieces home wins — that is the actual objective of Ludo.
  if (fin1 !== fin2) return fin1 > fin2 ? 1 : 2;

  // 2. Fewest timeouts (most hearts left) wins.
  if (opts.hearts1 !== opts.hearts2) return opts.hearts1 > opts.hearts2 ? 1 : 2;

  // 3. Furthest overall progress wins.
  if (opts.score1 !== opts.score2) return opts.score1 > opts.score2 ? 1 : 2;

  // 4. Genuinely identical boards → fair coin flip, no seat bias.
  return Math.random() < 0.5 ? 1 : 2;
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
//
// `amPlayer1` defaults to false because bots are always seated as player_2 in
// the current matchmaking, but it is a parameter so the heuristic stays correct
// if that ever changes.

export function botChoosePiece(
  botPieces: number[],
  oppPieces: number[],
  movable: number[],
  roll: number,
  amPlayer1: boolean = false
): number {
  if (movable.length === 0) return -1;

  const blockedByOpp = getBlockedAbsCells(oppPieces, !amPlayer1);

  /** Cells the opponent could reach next turn with a roll of 1..6. */
  const dangerAbs = new Set<number>();
  for (const oPos of oppPieces) {
    if (oPos < 1 || oPos > 51) continue;
    for (let r = 1; r <= 6; r++) {
      const dest = oPos + r;
      if (dest < 1 || dest > 51) continue;
      const abs = toAbsTrack(dest, !amPlayer1);
      if (abs !== null) dangerAbs.add(abs);
    }
  }

  let best     = movable[0];
  let bestScore = -Infinity;

  for (const idx of movable) {
    const pos     = botPieces[idx];
    const nextPos = pos === 0 ? 1 : pos + roll;
    let score     = nextPos;

    // Progress goals
    if (nextPos === 57)      score += 10_000;   // piece home
    else if (nextPos >= 52)  score += 5_000;    // entered the immune home lane

    const absCell = nextPos >= 1 && nextPos <= 51 ? toAbsTrack(nextPos, amPlayer1) : null;

    // Capture: only legal when the target cell holds exactly one opponent piece
    // and is not a safe cell. (applyMove rejects barrier captures.)
    if (absCell !== null && !isSafeCell(absCell) && !blockedByOpp.has(absCell)) {
      let victims = 0;
      for (const oPos of oppPieces) {
        if (oPos < 1 || oPos > 51) continue;
        if (toAbsTrack(oPos, !amPlayer1) === absCell) victims++;
      }
      if (victims === 1) score += 2_000;
    }

    // Safety: landing on a safe cell is good, landing on a cell the opponent
    // can reach next turn is bad — unless we just captured or went home.
    if (absCell !== null) {
      if (isSafeCell(absCell)) score += 600;
      else if (dangerAbs.has(absCell)) score -= 900;
    }

    // Leaving the yard is worth a bonus — it gets a piece into play.
    if (pos === 0 && nextPos === 1) score += 400;

    if (score > bestScore) { bestScore = score; best = idx; }
  }

  return best;
}
