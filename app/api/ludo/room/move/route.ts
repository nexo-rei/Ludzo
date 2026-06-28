import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Board constants ──────────────────────────────────────────────────────────

/**
 * Safe TRACK indices (0-indexed, 0..51).
 * Pieces on these cells cannot be captured.
 * Indices 1, 9, 14, 22, 27, 35, 40, 48 correspond to the stars / launch squares
 * on the 15×15 Ludo board as defined in the frontend SAFE_SPOTS set.
 */
const SAFE_TRACK_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

/**
 * POSITION SYSTEM (relative, per-player):
 *   0       = in yard (home base)
 *   1       = starting square (launch cell)
 *   1..51   = main shared track
 *   52..56  = exclusive home lane (5 steps, safe from capture)
 *   57      = finished (in the centre home triangle)
 *
 * ABSOLUTE TRACK MAPPING (for collision / capture detection):
 *   Player 1 absolute cell = (relPos - 1)      % 52  (starts at index 0)
 *   Player 2 absolute cell = (relPos - 1 + 26) % 52  (starts at index 26)
 *
 * Only positions 1..51 are on the shared track; 52-56 and 57 are private.
 */

function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  if (relPos < 1 || relPos > 51) return null;
  const offset = isPlayer1 ? 0 : 26;
  return (relPos - 1 + offset) % 52;
}

function isSafeCell(absIdx: number): boolean {
  return SAFE_TRACK_INDICES.has(absIdx);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { room_id, piece_index } = body;

    if (!room_id || piece_index === undefined || piece_index === null) {
      return NextResponse.json({ success: false, error: "room_id and piece_index are required" }, { status: 400 });
    }

    const pieceIdx = Number(piece_index);
    if (!Number.isInteger(pieceIdx) || pieceIdx < 0 || pieceIdx > 3) {
      return NextResponse.json({ success: false, error: "piece_index must be 0-3" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // ── Fetch room ────────────────────────────────────────────────────────────
    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", room_id)
      .maybeSingle();

    if (roomErr) {
      console.error(`[LUDO MOVE] DB error:`, roomErr.message);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // ── Anti-cheat validations ────────────────────────────────────────────────
    if (room.status !== "active") {
      console.warn(`[LUDO MOVE] Room not active room=${room_id} status=${room.status} user=${userId}`);
      return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    }
    if (room.turn_player_id !== userId) {
      console.warn(`[LUDO MOVE] Turn violation user=${userId} turn=${room.turn_player_id}`);
      return NextResponse.json({ success: false, error: "Not your turn" }, { status: 403 });
    }
    if (!room.dice_rolled) {
      return NextResponse.json({ success: false, error: "Roll the dice first" }, { status: 400 });
    }

    const movable: number[] = room.movable_pieces ?? [];
    if (!movable.includes(pieceIdx)) {
      console.warn(`[LUDO MOVE] Illegal piece ${pieceIdx} not in movable=${JSON.stringify(movable)} user=${userId}`);
      return NextResponse.json({ success: false, error: "That piece cannot move" }, { status: 400 });
    }

    // ── Set up board pointers ─────────────────────────────────────────────────
    const isPlayer1 = room.player_1_id === userId;
    const myKey   = isPlayer1 ? "player_1" : "player_2";
    const oppKey  = isPlayer1 ? "player_2" : "player_1";

    const boardState = JSON.parse(JSON.stringify(room.board_state)); // deep clone
    const myPieces:  number[] = boardState.pieces[myKey]  ?? [0, 0, 0, 0];
    const oppPieces: number[] = boardState.pieces[oppKey] ?? [0, 0, 0, 0];

    const roll       = room.last_roll as number;
    const currPos    = myPieces[pieceIdx];

    // ── Calculate new position ────────────────────────────────────────────────
    let newPos: number;
    if (currPos === 0) {
      // Leaving yard with a 6 → move to start square (position 1)
      newPos = 1;
    } else {
      newPos = currPos + roll;
    }

    // Clamp to 57 (finished) — should never exceed due to movable pre-check
    if (newPos > 57) newPos = 57;

    console.log(`[LUDO MOVE] room=${room_id} user=${userId} player=${myKey} piece=${pieceIdx} pos ${currPos}→${newPos} roll=${roll}`);

    myPieces[pieceIdx] = newPos;

    // ── Capture logic ─────────────────────────────────────────────────────────
    let hasCapture = false;

    if (newPos >= 1 && newPos <= 51) {
      // Only on the shared track (not in home lane or finished)
      const myAbsCell = toAbsTrack(newPos, isPlayer1)!;

      if (!isSafeCell(myAbsCell)) {
        for (let i = 0; i < 4; i++) {
          const oPos = oppPieces[i];
          if (oPos < 1 || oPos > 51) continue; // yard, home lane, or finished — not capturable

          const oppAbsCell = toAbsTrack(oPos, !isPlayer1)!;

          if (oppAbsCell === myAbsCell) {
            console.log(`[LUDO MOVE] CAPTURE! piece=${pieceIdx} at abs=${myAbsCell} captured opp piece=${i}`);
            oppPieces[i] = 0; // send back to yard
            hasCapture = true;
          }
        }
      }
    }

    boardState.pieces[myKey]  = myPieces;
    boardState.pieces[oppKey] = oppPieces;

    // ── Recalculate scores (sum of all piece positions) ───────────────────────
    const score1 = isPlayer1
      ? myPieces.reduce((s: number, p: number) => s + p, 0)
      : room.score_player_1 as number;
    const score2 = !isPlayer1
      ? myPieces.reduce((s: number, p: number) => s + p, 0)
      : room.score_player_2 as number;

    // ── Win detection (all 4 pieces at position 57) ───────────────────────────
    const isWin = myPieces.every((p: number) => p === 57);

    if (isWin) {
      const loserId = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);
      const now = Date.now();
      const matchStart = room.match_start_time
        ? new Date(room.match_start_time).getTime()
        : new Date(room.created_at).getTime();
      const duration = Math.floor((now - matchStart) / 1000);

      console.log(`[LUDO MOVE] WIN DETECTED room=${room_id} winner=${userId} loser=${loserId} duration=${duration}s`);

      // Save final board state then settle atomically
      await supabase
        .from("ludo_rooms")
        .update({
          board_state:    boardState,
          score_player_1: score1,
          score_player_2: score2,
          updated_at:     new Date().toISOString(),
        })
        .eq("id", room_id);

      const { data: settled, error: settleErr } = await supabase.rpc("settle_ludo_match", {
        p_room_id:     room_id,
        p_winner_id:   userId,
        p_loser_id:    loserId,
        p_win_reason:  "normal",
        p_duration:    duration,
        p_board_state: boardState,
      });

      if (settleErr) {
        console.error(`[LUDO MOVE] settle_ludo_match error:`, settleErr.message);
      } else if (settled === false) {
        console.warn(`[LUDO MOVE] settle_ludo_match returned false (already settled) room=${room_id}`);
      } else {
        console.log(`[LUDO MOVE] Settlement completed room=${room_id} winner=${userId}`);
      }

      return NextResponse.json({
        success: true,
        data: {
          winner_id:   userId,
          pieces:      myPieces,
          has_capture: hasCapture,
          extra_turn:  false,
          is_win:      true,
        },
      });
    }

    // ── Extra turn rules ──────────────────────────────────────────────────────
    // Extra turn granted for: rolled 6, captured an opponent, or reached finish (57)
    const reachedFinish = newPos === 57;
    const getsExtraTurn = roll === 6 || hasCapture || reachedFinish;

    let nextTurnPlayerId: string;
    if (getsExtraTurn) {
      nextTurnPlayerId = userId;
      const reason = roll === 6 ? "rolled 6" : hasCapture ? "captured" : "reached finish";
      console.log(`[LUDO MOVE] EXTRA TURN for user=${userId} reason=${reason}`);
    } else {
      nextTurnPlayerId = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);
      console.log(`[LUDO MOVE] Turn passes to ${nextTurnPlayerId}`);
    }

    // ── Save updated game state ───────────────────────────────────────────────
    const { error: saveErr } = await supabase
      .from("ludo_rooms")
      .update({
        board_state:    boardState,
        score_player_1: score1,
        score_player_2: score2,
        turn_player_id: nextTurnPlayerId,
        turn_start_at:  new Date().toISOString(),
        dice_rolled:    false,
        last_roll:      0,
        movable_pieces: [],
        updated_at:     new Date().toISOString(),
      })
      .eq("id", room_id);

    if (saveErr) {
      console.error(`[LUDO MOVE] Failed to save move:`, saveErr.message);
      return NextResponse.json({ success: false, error: "Failed to save move" }, { status: 500 });
    }

    if (hasCapture) {
      console.log(`[LUDO MOVE] Capture confirmed room=${room_id} by user=${userId}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        winner_id:   null,
        pieces:      myPieces,
        has_capture: hasCapture,
        extra_turn:  getsExtraTurn,
        is_win:      false,
      },
    });

  } catch (err: any) {
    console.error("[LUDO MOVE] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
