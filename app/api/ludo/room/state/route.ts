import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Constants ─────────────────────────────────────────────────────────────────
const TURN_TIMEOUT_SECS   = 18;   // 15s play + 3s warning
const MATCH_DURATION_SECS = 480;  // 8 minutes

// Safe TRACK indices (0-indexed, shared with roll/move routes)
const SAFE_TRACK_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  if (relPos < 1 || relPos > 51) return null;
  return (relPos - 1 + (isPlayer1 ? 0 : 26)) % 52;
}

// ── Bot AI helpers ────────────────────────────────────────────────────────────

function calcBotMovable(botPieces: number[], roll: number): number[] {
  const movable: number[] = [];
  for (let i = 0; i < 4; i++) {
    const pos = botPieces[i];
    if (pos === 57) continue;
    if (pos === 0 && roll === 6) { movable.push(i); continue; }
    if (pos > 0 && pos + roll <= 57) movable.push(i);
  }
  return movable;
}

/**
 * Bot AI: choose the best piece index using simple heuristics.
 * Priority: reach finish > capture opponent > advance furthest piece
 */
function botChoosePiece(
  botPieces: number[],
  oppPieces: number[],
  movable: number[],
  roll: number
): number {
  let best = movable[0];
  let bestScore = -Infinity;

  for (const idx of movable) {
    const pos     = botPieces[idx];
    const nextPos = pos === 0 ? 1 : pos + roll;
    let score     = nextPos; // prefer advancing further

    if (nextPos === 57) { score += 1000; }

    // Capture bonus
    if (nextPos >= 1 && nextPos <= 51) {
      const absCell = toAbsTrack(nextPos, false); // bot is player_2
      if (absCell !== null && !SAFE_TRACK_INDICES.has(absCell)) {
        for (const oPos of oppPieces) {
          if (oPos >= 1 && oPos <= 51) {
            const oAbs = toAbsTrack(oPos, true); // opponent is player_1
            if (oAbs === absCell) { score += 500; break; }
          }
        }
      }
    }

    if (score > bestScore) { bestScore = score; best = idx; }
  }
  return best;
}

/**
 * Apply a bot move (shared logic between state route and move route).
 * Returns { botPieces, oppPieces, hasCapture, isWin } with updated arrays.
 */
function applyBotMove(
  botPieces: number[],
  oppPieces: number[],
  pieceIdx: number,
  roll: number
): { botPieces: number[]; oppPieces: number[]; hasCapture: boolean; isWin: boolean } {
  const bp = [...botPieces];
  const op = [...oppPieces];

  const curr   = bp[pieceIdx];
  const newPos = curr === 0 ? 1 : curr + roll;
  bp[pieceIdx] = Math.min(newPos, 57);

  let hasCapture = false;
  if (newPos >= 1 && newPos <= 51) {
    const absCell = toAbsTrack(newPos, false)!;
    if (!SAFE_TRACK_INDICES.has(absCell)) {
      for (let i = 0; i < 4; i++) {
        if (op[i] >= 1 && op[i] <= 51) {
          const oAbs = toAbsTrack(op[i], true)!;
          if (oAbs === absCell) { op[i] = 0; hasCapture = true; }
        }
      }
    }
  }

  const isWin = bp.every(p => p === 57);
  return { botPieces: bp, oppPieces: op, hasCapture, isWin };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roomId = req.nextUrl.searchParams.get("room_id");
    if (!roomId) {
      return NextResponse.json({ success: false, error: "room_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;
    const now      = Date.now();

    // ── Fetch room ────────────────────────────────────────────────────────────
    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (roomErr) {
      console.error(`[LUDO STATE] DB error room=${roomId}:`, roomErr.message);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // ── Access control ────────────────────────────────────────────────────────
    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // ── Clone mutable state ───────────────────────────────────────────────────
    let status         = room.status        as string;
    let boardState     = JSON.parse(JSON.stringify(room.board_state ?? { pieces: { player_1: [0,0,0,0], player_2: [0,0,0,0] } }));
    let turnPlayerId   = room.turn_player_id as string;
    let turnStartAt    = new Date(room.turn_start_at).getTime();
    let diceRolled     = room.dice_rolled    as boolean;
    let lastRoll       = room.last_roll      as number;
    let movablePieces  = (room.movable_pieces ?? []) as number[];
    let hearts1        = room.hearts_player_1 as number;
    let hearts2        = room.hearts_player_2 as number;
    let score1         = room.score_player_1  as number;
    let score2         = room.score_player_2  as number;
    let winnerId       = room.winner_id       as string | null;
    let loserId        = room.loser_id        as string | null;
    let winReason      = room.win_reason      as string | null;
    let stateModified  = false;

    // ── Server-authoritative match start time ─────────────────────────────────
    // match_start_time is set when room transitions to 'active'.
    // Use it (not created_at) for the 8-minute timer so the clock never restarts.
    const matchStartMs = room.match_start_time
      ? new Date(room.match_start_time).getTime()
      : new Date(room.created_at).getTime();
    const matchElapsedSecs = Math.floor((now - matchStartMs) / 1000);

    // ── 1. Countdown → Active transition (10s after creation) ────────────────
    if (status === "countdown") {
      const countdownElapsed = (now - new Date(room.created_at).getTime()) / 1000;
      if (countdownElapsed >= 10) {
        console.log(`[LUDO STATE] Activating room ${roomId} (countdown elapsed)`);
        // Use the atomic RPC to prevent duplicate activations
        await supabase.rpc("activate_ludo_room", { p_room_id: roomId });

        // Re-read the updated room so we have correct match_start_time
        const { data: updated } = await supabase
          .from("ludo_rooms")
          .select("status, match_start_time, turn_start_at")
          .eq("id", roomId)
          .maybeSingle();

        if (updated) {
          status      = updated.status;
          turnStartAt = new Date(updated.turn_start_at).getTime();
        }
      }
    }

    // ── 2. Turn timeout enforcement ───────────────────────────────────────────
    if (status === "active") {
      const turnElapsed = (now - turnStartAt) / 1000;

      if (turnElapsed >= TURN_TIMEOUT_SECS) {
        console.log(`[LUDO STATE] Turn timeout room=${roomId} player=${turnPlayerId} elapsed=${turnElapsed.toFixed(1)}s`);

        // Penalise the player who timed out
        const timeoutIsP1 = turnPlayerId === String(room.player_1_id);
        if (timeoutIsP1) {
          hearts1 = Math.max(0, hearts1 - 1);
          if (hearts1 <= 0) {
            winnerId  = String(room.player_2_id);
            loserId   = String(room.player_1_id);
            winReason = "timeout";
            status    = "completed";
            console.log(`[LUDO STATE] Player 1 hearts depleted — P2 wins room=${roomId}`);
          }
        } else {
          hearts2 = Math.max(0, hearts2 - 1);
          if (hearts2 <= 0) {
            winnerId  = String(room.player_1_id);
            loserId   = String(room.player_2_id);
            winReason = "timeout";
            status    = "completed";
            console.log(`[LUDO STATE] Player 2 hearts depleted — P1 wins room=${roomId}`);
          }
        }

        if (status !== "completed") {
          // Advance turn to the next player
          const nextTurn = timeoutIsP1
            ? String(room.player_2_id)
            : String(room.player_1_id);

          // Use advisory-locked RPC to prevent double-advance from concurrent polls
          await supabase.rpc("advance_ludo_turn", {
            p_room_id:             roomId,
            p_expected_turn:       turnPlayerId,
            p_expected_turn_start: room.turn_start_at,
            p_next_turn:           nextTurn,
            p_hearts_p1:           hearts1,
            p_hearts_p2:           hearts2,
          });

          // Re-read the fresh turn state
          const { data: refreshed } = await supabase
            .from("ludo_rooms")
            .select("turn_player_id, turn_start_at, hearts_player_1, hearts_player_2")
            .eq("id", roomId)
            .maybeSingle();

          if (refreshed) {
            turnPlayerId = refreshed.turn_player_id;
            turnStartAt  = new Date(refreshed.turn_start_at).getTime();
            hearts1      = refreshed.hearts_player_1;
            hearts2      = refreshed.hearts_player_2;
          }

          diceRolled    = false;
          lastRoll      = 0;
          movablePieces = [];
        } else {
          stateModified = true;
        }
      }
    }

    // ── 3. Match timer expiry (8 minutes) ────────────────────────────────────
    if (status === "active" && matchElapsedSecs >= MATCH_DURATION_SECS) {
      console.log(`[LUDO STATE] Match timer expired room=${roomId} elapsed=${matchElapsedSecs}s`);
      status    = "completed";
      winReason = "score_timer";

      if (score1 >= score2) {
        winnerId = String(room.player_1_id);
        loserId  = String(room.player_2_id);
      } else {
        winnerId = String(room.player_2_id);
        loserId  = String(room.player_1_id);
      }
      stateModified = true;
    }

    // ── 4. Server-authoritative bot turns ────────────────────────────────────
    if (status === "active" && turnPlayerId.startsWith("bot_")) {
      const botElapsed = (now - turnStartAt) / 1000;

      if (!diceRolled && botElapsed >= 2.5) {
        // Bot rolls dice
        const roll         = Math.floor(Math.random() * 6) + 1;
        const botPieces    = boardState.pieces.player_2 as number[];
        const allowedMoves = calcBotMovable(botPieces, roll);

        diceRolled = true;
        lastRoll   = roll;
        turnStartAt = now;

        console.log(`[LUDO STATE] BOT ROLL room=${roomId} roll=${roll} movable=${JSON.stringify(allowedMoves)}`);

        if (allowedMoves.length === 0) {
          // No moves — auto-pass to human
          turnPlayerId  = String(room.player_1_id);
          turnStartAt   = now;
          diceRolled    = false;
          lastRoll      = 0;
          movablePieces = [];
          console.log(`[LUDO STATE] Bot has no moves — auto-pass to player_1`);
        } else {
          movablePieces = allowedMoves;
        }
        stateModified = true;

      } else if (diceRolled && movablePieces.length > 0 && (now - turnStartAt) / 1000 >= 2.0) {
        // Bot moves a piece
        const botPieces  = boardState.pieces.player_2 as number[];
        const oppPieces  = boardState.pieces.player_1 as number[];
        const chosenIdx  = botChoosePiece(botPieces, oppPieces, movablePieces, lastRoll);

        console.log(`[LUDO STATE] BOT MOVE room=${roomId} piece=${chosenIdx}`);

        const { botPieces: newBot, oppPieces: newOpp, hasCapture, isWin } =
          applyBotMove(botPieces, oppPieces, chosenIdx, lastRoll);

        boardState.pieces.player_2 = newBot;
        boardState.pieces.player_1 = newOpp;
        score2 = newBot.reduce((s: number, p: number) => s + p, 0);
        score1 = newOpp.reduce((s: number, p: number) => s + p, 0);

        if (isWin) {
          status    = "completed";
          winnerId  = turnPlayerId;
          loserId   = String(room.player_1_id);
          winReason = "normal";
          console.log(`[LUDO STATE] BOT WINS room=${roomId}`);
        } else {
          const extraTurn = lastRoll === 6 || hasCapture || newBot[chosenIdx] === 57;
          turnPlayerId  = extraTurn ? turnPlayerId : String(room.player_1_id);
          turnStartAt   = now;
          diceRolled    = false;
          lastRoll      = 0;
          movablePieces = [];
          if (extraTurn) console.log(`[LUDO STATE] Bot gets extra turn`);
        }
        stateModified = true;
      }
    }

    // ── 5. Persist any state changes ─────────────────────────────────────────
    if (stateModified) {
      if (status === "completed") {
        const matchDuration = Math.floor((now - matchStartMs) / 1000);
        console.log(`[LUDO STATE] Settling room=${roomId} winner=${winnerId} reason=${winReason} duration=${matchDuration}s`);

        const { data: settled } = await supabase.rpc("settle_ludo_match", {
          p_room_id:     roomId,
          p_winner_id:   winnerId!,
          p_loser_id:    loserId!,
          p_win_reason:  winReason!,
          p_duration:    matchDuration,
          p_board_state: boardState,
        });

        if (!settled) {
          console.warn(`[LUDO STATE] settle_ludo_match returned false (already settled) room=${roomId}`);
          // Room was already settled — re-fetch actual winner
          const { data: settled_room } = await supabase
            .from("ludo_rooms")
            .select("winner_id, loser_id, win_reason, status")
            .eq("id", roomId)
            .maybeSingle();
          if (settled_room) {
            winnerId  = settled_room.winner_id;
            loserId   = settled_room.loser_id;
            winReason = settled_room.win_reason;
            status    = settled_room.status;
          }
        }
      } else {
        await supabase
          .from("ludo_rooms")
          .update({
            status,
            turn_player_id:  turnPlayerId,
            turn_start_at:   new Date(turnStartAt).toISOString(),
            dice_rolled:     diceRolled,
            last_roll:       lastRoll,
            movable_pieces:  movablePieces,
            hearts_player_1: hearts1,
            hearts_player_2: hearts2,
            score_player_1:  score1,
            score_player_2:  score2,
            board_state:     boardState,
            updated_at:      new Date().toISOString(),
          })
          .eq("id", roomId);
      }
    }

    // ── 6. Fetch player profiles ──────────────────────────────────────────────
    const { data: p1User } = await supabase
      .from("users")
      .select("first_name, photo_url")
      .eq("id", room.player_1_id)
      .maybeSingle();

    let p2Profile = {
      name:   "Ludo Bot",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LudoBot",
    };

    if (!String(room.player_2_id).startsWith("bot_")) {
      const { data: p2User } = await supabase
        .from("users")
        .select("first_name, photo_url")
        .eq("id", room.player_2_id)
        .maybeSingle();
      if (p2User) {
        p2Profile = {
          name:   p2User.first_name ?? "Player 2",
          avatar: p2User.photo_url  ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${room.player_2_id}`,
        };
      }
    } else {
      // Use bot profile stored in board_state
      const bp = boardState?.bot_profile;
      if (bp?.name) p2Profile = bp;
    }

    // ── 7. Compute turn remaining seconds (server-authoritative) ─────────────
    const turnRemainingSeconds = Math.max(
      0,
      TURN_TIMEOUT_SECS - Math.floor((now - turnStartAt) / 1000)
    );

    // ── 8. Compute match remaining seconds (server-authoritative) ─────────────
    const matchRemainingSeconds = Math.max(
      0,
      MATCH_DURATION_SECS - matchElapsedSecs
    );

    return NextResponse.json({
      success: true,
      data: {
        id:                     roomId,
        stake:                  room.stake,
        player_1_id:            String(room.player_1_id),
        player_2_id:            String(room.player_2_id),
        player_1_profile:       {
          name:   p1User?.first_name ?? "Player 1",
          avatar: p1User?.photo_url  ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=p1`,
        },
        player_2_profile:       p2Profile,
        status,
        turn_player_id:         turnPlayerId,
        turn_remaining_seconds: turnRemainingSeconds,
        match_remaining_seconds: matchRemainingSeconds,
        match_start_time:       room.match_start_time ?? room.created_at,
        dice_rolled:            diceRolled,
        last_roll:              lastRoll,
        movable_pieces:         movablePieces,
        hearts_player_1:        hearts1,
        hearts_player_2:        hearts2,
        score_player_1:         score1,
        score_player_2:         score2,
        winner_id:              winnerId,
        loser_id:               loserId,
        win_reason:             winReason,
        board_state:            boardState,
        chat_reactions:         room.chat_reactions ?? [],
      },
    });

  } catch (err: any) {
    console.error("[LUDO STATE] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
