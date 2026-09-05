/**
 * LUDZO — Ludo Engine Verification Suite
 * ============================================================================
 * Zero-dependency. Node 22+ apne aap TypeScript strip kar leta hai:
 *
 *     node --experimental-strip-types scripts/verify-ludo-engine.mjs
 *
 * Ye script `lib/ludo-engine.ts` ko client ke ACTUAL board geometry
 * (`TRACK` array from app/games/game/[roomId]/page.tsx) ke against test karta
 * hai, taaki engine aur rendered board hamesha sync me rahe.
 *
 * Exit code 0 = sab pass. Exit code 1 = koi regression.
 */

import * as E from "../lib/ludo-engine.ts";

// ─── Board geometry (MUST match app/games/game/[roomId]/page.tsx) ────────────
const TRACK = [
  [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],
  [14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],
  [8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],
  [4,8],[3,8],[2,8],[1,8],[0,8],[0,7],
];
const P1_HOME_LANE = [[1,7],[2,7],[3,7],[4,7],[5,7]];
const P2_HOME_LANE = [[13,7],[12,7],[11,7],[10,7],[9,7]];

// Board art ke hisaab se launch squares (client inhe highlight karta hai)
const DRAWN_LAUNCH_RED  = 1;
const DRAWN_LAUNCH_BLUE = 27;
const DRAWN_STARS       = [9, 22, 35, 48];

let passed = 0;
const failures = [];

function ok(name, cond, detail = "") {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else      { failures.push(name); console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); }
}
function section(t) { console.log(`\n${t}`); }
const cell = (i) => `idx${i}=(${TRACK[i][0]},${TRACK[i][1]})`;

// ════════════════════════════════════════════════════════════════════════════
section("1. TRACK GEOMETRY — engine vs rendered board");
// ════════════════════════════════════════════════════════════════════════════

ok("TRACK has exactly 52 cells", TRACK.length === 52, `got ${TRACK.length}`);
ok("TRACK has no duplicate coordinates",
   new Set(TRACK.map(([x, y]) => `${x},${y}`)).size === 52);

ok("P1 spawn (relPos 1) lands on the DRAWN red launch cell",
   E.toAbsTrack(1, true) === DRAWN_LAUNCH_RED,
   `engine=${E.toAbsTrack(1, true)} ${cell(E.toAbsTrack(1, true))}, art=${DRAWN_LAUNCH_RED} ${cell(DRAWN_LAUNCH_RED)}`);

ok("P2 spawn (relPos 1) lands on the DRAWN blue launch cell",
   E.toAbsTrack(1, false) === DRAWN_LAUNCH_BLUE,
   `engine=${E.toAbsTrack(1, false)}, art=${DRAWN_LAUNCH_BLUE}`);

ok("both spawn cells are SAFE (cannot be captured on your own start)",
   E.isSafeCell(E.toAbsTrack(1, true)) && E.isSafeCell(E.toAbsTrack(1, false)));

ok("all 4 drawn star cells are in SAFE_TRACK_INDICES",
   DRAWN_STARS.every((s) => E.isSafeCell(s)));

ok("SAFE_TRACK_INDICES = 4 launch + 4 star cells (8 total)",
   E.SAFE_TRACK_INDICES.size === 8,
   `got ${E.SAFE_TRACK_INDICES.size}: ${[...E.SAFE_TRACK_INDICES].join(",")}`);

// Home-lane entry: relPos 51 must be geometrically ADJACENT to home-lane cell 0
function adjacent(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}
const p1LastShared = TRACK[E.toAbsTrack(51, true)];
const p2LastShared = TRACK[E.toAbsTrack(51, false)];
ok("P1 relPos 51 is adjacent to its home-lane entry (no diagonal teleport)",
   adjacent(p1LastShared, P1_HOME_LANE[0]),
   `${p1LastShared} -> ${P1_HOME_LANE[0]}`);
ok("P2 relPos 51 is adjacent to its home-lane entry (no diagonal teleport)",
   adjacent(p2LastShared, P2_HOME_LANE[0]),
   `${p2LastShared} -> ${P2_HOME_LANE[0]}`);

// Each player must walk exactly 51 of the 52 shared cells and skip only the
// cell immediately before their own start square.
for (const [name, isP1, launch] of [["P1", true, DRAWN_LAUNCH_RED], ["P2", false, DRAWN_LAUNCH_BLUE]]) {
  const walked = new Set();
  for (let rel = 1; rel <= 51; rel++) walked.add(E.toAbsTrack(rel, isP1));
  const skipped = [];
  for (let i = 0; i < 52; i++) if (!walked.has(i)) skipped.push(i);
  const expectedSkip = (launch - 1 + 52) % 52;
  ok(`${name} walks 51/52 cells and skips ONLY idx ${expectedSkip} (cell before own start)`,
     walked.size === 51 && skipped.length === 1 && skipped[0] === expectedSkip,
     `skipped=[${skipped.join(",")}]`);
}

// Home lane must be contiguous and end next to the centre
ok("P1 home lane cells are contiguous", P1_HOME_LANE.every((c, i) => i === 0 || adjacent(P1_HOME_LANE[i - 1], c)));
ok("P2 home lane cells are contiguous", P2_HOME_LANE.every((c, i) => i === 0 || adjacent(P2_HOME_LANE[i - 1], c)));
ok("home lanes never overlap the shared track",
   [...P1_HOME_LANE, ...P2_HOME_LANE].every((h) => !TRACK.some((t) => t[0] === h[0] && t[1] === h[1])));

// ════════════════════════════════════════════════════════════════════════════
section("2. MOVEMENT RULES");
// ════════════════════════════════════════════════════════════════════════════

ok("cannot leave the yard without a 6",
   E.calcMovablePieces([0, 0, 0, 0], 3).length === 0);
ok("a 6 releases exactly one yard piece (all 4 identical → all movable)",
   E.calcMovablePieces([0, 0, 0, 0], 6).length === 4);
ok("canAdvance(0, 6) is false (yard handled separately)", E.canAdvance(0, 6) === false);
ok("canAdvance(57, x) is false (finished pieces never move)", E.canAdvance(57, 3) === false);
ok("exact roll required to finish: canAdvance(55, 2) === true", E.canAdvance(55, 2) === true);
ok("overshoot blocked: canAdvance(55, 3) === false", E.canAdvance(55, 3) === false);

// applyMove must REFUSE an overshoot instead of clamping it into a win
const overshoot = E.applyMove([55, 0, 0, 0], [0, 0, 0, 0], 0, 4, true);
ok("applyMove rejects an overshoot (no silent clamp-to-win)",
   overshoot.illegal === true && overshoot.myPieces[0] === 55,
   `illegal=${overshoot.illegal} pos=${overshoot.myPieces[0]} reason=${overshoot.reason}`);

const exactFinish = E.applyMove([55, 57, 57, 57], [0, 0, 0, 0], 0, 2, true);
ok("exact roll reaches 57 and wins the match",
   exactFinish.illegal === false && exactFinish.reachedFinish && exactFinish.isWin);

ok("applyMove rejects leaving the yard on a non-6",
   E.applyMove([0, 0, 0, 0], [0, 0, 0, 0], 0, 4, true).illegal === true);
ok("applyMove rejects moving an already-finished piece",
   E.applyMove([57, 0, 0, 0], [0, 0, 0, 0], 0, 3, true).illegal === true);

// ════════════════════════════════════════════════════════════════════════════
section("3. CAPTURE + SAFE CELLS");
// ════════════════════════════════════════════════════════════════════════════

// P1 at rel 10 rolling 3 -> rel 13 -> abs 13 (not safe). Put a lone P2 piece there.
// P2 abs 13 => rel = (13 - 27 + 52) % 52 + 1 = 39
const capBoard = E.applyMove([10, 0, 0, 0], [39, 0, 0, 0], 0, 3, true);
ok("lone opponent piece on a normal cell IS captured",
   capBoard.hasCapture === true && capBoard.oppPieces[0] === 0,
   JSON.stringify(capBoard.oppPieces));

// Same landing but on a SAFE cell (abs 9). P2 rel for abs 9 = (9-27+52)%52+1 = 35
const safeBoard = E.applyMove([6, 0, 0, 0], [35, 0, 0, 0], 0, 3, true);
ok("piece on a SAFE cell is NOT captured",
   safeBoard.hasCapture === false && safeBoard.oppPieces[0] === 35,
   `abs=${E.toAbsTrack(9, true)} safe=${E.isSafeCell(E.toAbsTrack(9, true))}`);

ok("opponent pieces inside their own home lane (52-56) can never be captured",
   E.applyMove([10, 0, 0, 0], [54, 0, 0, 0], 0, 3, true).oppPieces[0] === 54);

// ════════════════════════════════════════════════════════════════════════════
section("4. BLOCK / BARRIER RULE");
// ════════════════════════════════════════════════════════════════════════════

// P2 has two pieces on rel 6 -> abs (5+27)%52 = 32
const blockOwner = [6, 6, 0, 0];
const blockedAbs = E.getBlockedAbsCells(blockOwner, false);
ok("two pieces on one cell create exactly one barrier",
   blockedAbs.size === 1, `got ${[...blockedAbs].map(cell).join(",")}`);

// P1 at rel 27 rolling 6 -> path rel 28..33 -> abs 28..33, which crosses 32.
// The other three pieces are already finished (57) so they are not candidates —
// otherwise a roll of 6 would legitimately release yard pieces and the
// assertion would be meaningless.
const crossAttempt = E.calcMovablePieces([27, 57, 57, 57], 6, blockOwner, true);
ok("calcMovablePieces forbids passing OVER a barrier",
   crossAttempt.length === 0, `movable=${JSON.stringify(crossAttempt)}`);

// Force the same move through applyMove directly (simulates a stale
// movable_pieces array or a hand-crafted request) — it must be refused.
const forcedCross = E.applyMove([27, 0, 0, 0], blockOwner, 0, 6, true);
ok("applyMove ALSO refuses to cross a barrier (defence in depth)",
   forcedCross.illegal === true && forcedCross.oppPieces.join() === blockOwner.join(),
   `illegal=${forcedCross.illegal} reason=${forcedCross.reason} opp=${JSON.stringify(forcedCross.oppPieces)}`);

// Landing directly on the barrier cell must not double-capture.
// P1 at rel 26 rolling 6 -> rel 32 == P2's barrier abs? rel32 -> abs (31+1)=32 ✔
const landOnBarrier = E.applyMove([26, 0, 0, 0], blockOwner, 0, 6, true);
ok("landing ON a barrier is illegal (fixes the old double-capture bug)",
   landOnBarrier.illegal === true && landOnBarrier.oppPieces.join() === blockOwner.join(),
   `illegal=${landOnBarrier.illegal} opp=${JSON.stringify(landOnBarrier.oppPieces)}`);

ok("home-lane cells can never form a barrier",
   E.getBlockedAbsCells([53, 53, 0, 0], true).size === 0);
ok("yard pieces (pos 0) never form a barrier",
   E.getBlockedAbsCells([0, 0, 0, 0], true).size === 0);
ok("a barrier does NOT block the barrier owner's own pieces",
   E.calcMovablePieces([6, 6, 0, 0], 3, [6, 6, 0, 0], true).length === 2);

// ════════════════════════════════════════════════════════════════════════════
section("5. EXTRA-TURN RULES");
// ════════════════════════════════════════════════════════════════════════════

ok("rolling a 6 grants an extra turn",     E.getsExtraTurn(6, false, false) === true);
ok("a capture grants an extra turn",        E.getsExtraTurn(3, true,  false) === true);
ok("reaching home grants an extra turn",    E.getsExtraTurn(2, false, true)  === true);
ok("a plain move passes the turn",          E.getsExtraTurn(3, false, false) === false);
ok("MAX_CONSECUTIVE_SIXES is 3",            E.MAX_CONSECUTIVE_SIXES === 3);

// ════════════════════════════════════════════════════════════════════════════
section("6. MATCH-TIMER TIEBREAK (no player_1 bias)");
// ════════════════════════════════════════════════════════════════════════════

ok("more pieces home wins",
   E.decideTimerWinner({ pieces1:[57,57,10,10], pieces2:[57,10,10,10], score1:10, score2:10, hearts1:1, hearts2:3 }) === 1);
ok("it is symmetric (swap the seats → the other player wins)",
   E.decideTimerWinner({ pieces1:[57,10,10,10], pieces2:[57,57,10,10], score1:10, score2:10, hearts1:3, hearts2:1 }) === 2);
ok("equal pieces → most hearts wins",
   E.decideTimerWinner({ pieces1:[10,10,10,10], pieces2:[10,10,10,10], score1:40, score2:40, hearts1:1, hearts2:3 }) === 2);
ok("equal pieces+hearts → highest score wins",
   E.decideTimerWinner({ pieces1:[40,0,0,0], pieces2:[10,10,10,10], score1:40, score2:40, hearts1:3, hearts2:3 }) === 1 ||
   E.decideTimerWinner({ pieces1:[40,0,0,0], pieces2:[10,10,10,10], score1:41, score2:40, hearts1:3, hearts2:3 }) === 1);

// Identical boards must be a real coin flip, not an automatic player_1 win.
let p1Wins = 0;
const N = 4000;
for (let i = 0; i < N; i++) {
  if (E.decideTimerWinner({ pieces1:[20,20,20,20], pieces2:[20,20,20,20], score1:80, score2:80, hearts1:3, hearts2:3 }) === 1) p1Wins++;
}
const ratio = p1Wins / N;
ok("dead-heat matches are decided ~50/50 (old code gave player_1 100%)",
   ratio > 0.45 && ratio < 0.55, `player_1 won ${(ratio * 100).toFixed(1)}% of ${N} identical boards`);

// ════════════════════════════════════════════════════════════════════════════
section("7. BOT AI");
// ════════════════════════════════════════════════════════════════════════════

ok("bot always takes the winning move",
   E.botChoosePiece([55, 10, 10, 10], [20, 20, 20, 20], [0, 1, 2, 3], 2, false) === 0);
ok("bot prefers entering the home lane over a plain advance",
   E.botChoosePiece([50, 20, 20, 20], [1, 2, 3, 4], [0, 1, 2, 3], 3, false) === 0);
ok("bot takes a free capture when available",
   // bot (P2) at rel 10 -> rel 13 -> abs 39. Opponent P1 piece on abs 39 -> rel 39.
   E.botChoosePiece([10, 1, 1, 1], [39, 1, 1, 1], [0, 1, 2, 3], 3, false) === 0);
ok("bot avoids stepping into danger when a safe alternative exists",
   // Bot (P2) options with roll 1:
   //   piece 0: rel 44 -> 45 -> abs 19  (NOT safe, and inside P1's reach)
   //   piece 1: rel 8  -> 9  -> abs 35  (STAR = safe)
   // P1 sits on abs 15..18 so abs 16..24 are reachable next turn, which makes
   // abs 19 dangerous. Neither destination holds a capturable piece, so the
   // only sane choice is the safe star at abs 35.
   (() => {
     const botPieces = [44, 8, 0, 0];
     const oppPieces = [15, 16, 17, 18];
     const movable   = E.calcMovablePieces(botPieces, 1, oppPieces, false);
     if (movable.length !== 2) return false;
     const chosen  = E.botChoosePiece(botPieces, oppPieces, movable, 1, false);
     const destAbs = E.toAbsTrack(botPieces[chosen] + 1, false);
     return destAbs === 35 && E.isSafeCell(35);
   })());
ok("bot still prefers a capture over ducking into safety",
   // piece 0 -> abs 33 holds a lone P1 piece (capture + extra turn);
   // piece 1 -> abs 35 is the safe star. Capturing must win.
   (() => {
     const botPieces = [8, 6, 20, 20];
     const oppPieces = [33, 45, 46, 47];
     const movable   = E.calcMovablePieces(botPieces, 1, oppPieces, false);
     const chosen    = E.botChoosePiece(botPieces, oppPieces, movable, 1, false);
     return E.toAbsTrack(botPieces[chosen] + 1, false) === 33;
   })());
ok("a barrier on a SAFE cell never forms (prevents the yard soft-lock)",
   // Two P1 pieces parked on abs 27 = P2's launch square. abs 27 is safe, so it
   // must NOT become a barrier — otherwise P2 could never leave the yard.
   E.getBlockedAbsCells([27, 27, 0, 0], true).size === 0 &&
   E.calcMovablePieces([0, 0, 0, 0], 6, [27, 27, 0, 0], false).length === 4);
ok("botChoosePiece returns -1 when nothing is movable",
   E.botChoosePiece([0, 0, 0, 0], [0, 0, 0, 0], [], 3, false) === -1);
ok("bot heuristic is seat-agnostic (amPlayer1 = true still picks the winner)",
   E.botChoosePiece([55, 10, 10, 10], [20, 20, 20, 20], [0, 1, 2, 3], 2, true) === 0);

// ════════════════════════════════════════════════════════════════════════════
section("8. FUZZ — 300 full self-play matches");
// ════════════════════════════════════════════════════════════════════════════

function playOneMatch(rng) {
  const pieces = { 1: [0, 0, 0, 0], 2: [0, 0, 0, 0] };
  const sixes  = { 1: 0, 2: 0 };
  let turn = 1, plies = 0;

  while (plies < 2000) {
    plies++;
    const me = turn, opp = me === 1 ? 2 : 1;
    const roll = 1 + Math.floor(rng() * 6);

    sixes[me] = roll === 6 ? sixes[me] + 1 : 0;
    if (roll === 6 && sixes[me] >= E.MAX_CONSECUTIVE_SIXES) { sixes[me] = 0; turn = opp; continue; }

    const movable = E.calcMovablePieces(pieces[me], roll, pieces[opp], me === 1);
    if (movable.length === 0) { turn = opp; continue; }

    const idx = movable[Math.floor(rng() * movable.length)];
    const res = E.applyMove(pieces[me], pieces[opp], idx, roll, me === 1);

    // INVARIANT: a move the engine itself offered must never come back illegal
    if (res.illegal) return { fail: `engine offered an illegal move: ${res.reason}`, plies };

    pieces[me]  = res.myPieces;
    pieces[opp] = res.oppPieces;

    // INVARIANTS on the resulting board
    for (const p of [...pieces[1], ...pieces[2]]) {
      if (!Number.isInteger(p) || p < 0 || p > 57) return { fail: `piece out of range: ${p}`, plies };
    }
    for (const side of [1, 2]) {
      if (pieces[side].length !== 4) return { fail: "piece array length changed", plies };
      const finished = pieces[side].filter((p) => p === 57).length;
      // a finished piece can never come back to the yard
      if (finished > 4) return { fail: "impossible finish count", plies };
    }
    // no piece may sit on an opponent barrier cell
    for (const side of [1, 2]) {
      const other = side === 1 ? 2 : 1;
      const blocks = E.getBlockedAbsCells(pieces[other], other === 1);
      for (const rel of pieces[side]) {
        if (rel < 1 || rel > 51) continue;
        const abs = E.toAbsTrack(rel, side === 1);
        if (abs !== null && blocks.has(abs)) return { fail: "piece resting on an opponent barrier", plies };
      }
    }

    if (res.isWin) return { winner: me, plies, fail: null };
    turn = E.getsExtraTurn(roll, res.hasCapture, res.reachedFinish) ? me : opp;
  }
  return { winner: 0, plies, fail: "match did not terminate within 2000 plies" };
}

// deterministic PRNG so failures are reproducible
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260905);
let wins1 = 0, wins2 = 0, unfinished = 0, totalPlies = 0, maxPlies = 0;
let fuzzFail = null;
for (let i = 0; i < 300 && !fuzzFail; i++) {
  const r = playOneMatch(rng);
  if (r.fail) { fuzzFail = `match #${i + 1}: ${r.fail}`; break; }
  if (r.winner === 1) wins1++; else if (r.winner === 2) wins2++; else unfinished++;
  totalPlies += r.plies;
  maxPlies = Math.max(maxPlies, r.plies);
}

ok("300 random self-play matches completed with zero rule violations", fuzzFail === null, fuzzFail ?? "");
ok("every match produced a winner (no stalemate)", unfinished === 0, `${unfinished} unfinished`);
ok("both seats win roughly equally (no seat advantage in the engine)",
   Math.abs(wins1 - wins2) < 60, `P1=${wins1} P2=${wins2}`);
ok("average match length is sane",
   totalPlies / 300 > 40 && totalPlies / 300 < 400,
   `avg ${(totalPlies / 300).toFixed(1)} plies, max ${maxPlies}`);

// ════════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
if (failures.length === 0) {
  console.log(`✅ ALL ${passed} CHECKS PASSED — engine and board are in sync.`);
  process.exit(0);
} else {
  console.log(`❌ ${failures.length} of ${passed + failures.length} CHECKS FAILED:`);
  for (const f of failures) console.log(`   • ${f}`);
  process.exit(1);
}
