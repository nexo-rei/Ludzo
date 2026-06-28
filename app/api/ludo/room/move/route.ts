import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMove, getsExtraTurn, calcScore } from "@/lib/ludo-engine";

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
    const userId   = auth.userId!;

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
      console.warn(`[LUDO MOVE] Illegal piece ${pieceIdx} not in movable=${JSON.stringify(movable)}`);
      return NextResponse.json({ success: false, error: "That piece cannot move" }, { status: 400 });
    }

    // ── Set up board state ────────────────────────────────────────────────────
    const isPlayer1 = room.player_1_id === userId;
    const myKey     = isPlayer1 ? "player_1" : "player_2";
    const oppKey    = isPlayer1 ? "player_2" : "player_1";

    // Deep clone to avoid mutating the original
    const boardState = JSON.parse(JSON.stringify(
      room.board_state ?? { pieces: { player_1: [0,0,0,0], player_2: [0,0,0,0] } }
    ));
    const myPieces:  number[] = boardState.pieces[myKey]  ?? [0,0,0,0];
    const oppPieces: number[] = boardState.pieces[oppKey] ?? [0,0,0,0];

    const roll = room.last_roll as number;

    console.log(`[LUDO MOVE] room=${room_id} user=${userId} player=${myKey} piece=${pieceIdx} pos=${myPieces[pieceIdx]} roll=${roll}`);

    // ── Apply move using shared engine ────────────────────────────────────────
    const result = applyMove(myPieces, oppPieces, pieceIdx, roll, isPlayer1);

    boardState.pieces[myKey]  = result.myPieces;
    boardState.pieces[oppKey] = result.oppPieces;

    // ── Recalculate scores correctly (from updated pieces) ────────────────────
    const score1 = isPlayer1
      ? calcScore(result.myPieces)
      : calcScore(result.oppPieces);
    const score2 = isPlayer1
      ? calcScore(result.oppPieces)
      : calcScore(result.myPieces);

    // ── Win detection ─────────────────────────────────────────────────────────
    if (result.isWin) {
      const loserId = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);

      const matchStartMs = room.match_start_time
        ? new Date(room.match_start_time).getTime()
        : new Date(room.created_at).getTime();
      const duration = Math.floor((Date.now() - matchStartMs) / 1000);

      console.log(`[LUDO MOVE] WIN room=${room_id} winner=${userId} loser=${loserId} duration=${duration}s`);

      // Save final board state
      await supabase
        .from("ludo_rooms")
        .update({
          board_state:    boardState,
          score_player_1: score1,
          score_player_2: score2,
          updated_at:     new Date().toISOString(),
        })
        .eq("id", room_id);

      // Settle — NOTE: no p_board_state parameter (that was the bug)
      const { data: settled, error: settleErr } = await supabase.rpc("settle_ludo_match", {
        p_room_id:    room_id,
        p_winner_id:  userId,
        p_loser_id:   loserId,
        p_win_reason: "normal",
        p_duration:   duration,
      });

      if (settleErr) {
        console.error(`[LUDO MOVE] settle_ludo_match error:`, settleErr.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          winner_id:   userId,
          pieces:      result.myPieces,
          has_capture: result.hasCapture,
          extra_turn:  false,
          is_win:      true,
        },
      });
    }

    // ── Determine next turn ───────────────────────────────────────────────────
    const consecutiveSixes = (room.consecutive_sixes ?? 0) as number;
    const extraTurn = getsExtraTurn(roll, result.hasCapture, result.reachedFinish, consecutiveSixes);
    const nextTurnPlayerId = extraTurn
      ? userId
      : (isPlayer1 ? String(room.player_2_id) : String(room.player_1_id));

    if (extraTurn) {
      const reason = roll === 6 ? "rolled 6" : result.hasCapture ? "captured" : "reached finish";
      console.log(`[LUDO MOVE] EXTRA TURN for user=${userId} reason=${reason}`);
    } else {
      console.log(`[LUDO MOVE] Turn passes to ${nextTurnPlayerId}`);
    }

    // ── Save updated game state ───────────────────────────────────────────────
    const { error: saveErr } = await supabase
      .from("ludo_rooms")
      .update({
        board_state:      boardState,
        score_player_1:   score1,
        score_player_2:   score2,
        turn_player_id:   nextTurnPlayerId,
        turn_start_at:    new Date().toISOString(),
        dice_rolled:      false,
        last_roll:        0,
        movable_pieces:   [],
        // Reset consecutive six count only when turn actually passes
        consecutive_sixes: extraTurn && roll === 6 ? consecutiveSixes : 0,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", room_id);

    if (saveErr) {
      console.error(`[LUDO MOVE] Failed to save move:`, saveErr.message);
      return NextResponse.json({ success: false, error: "Failed to save move" }, { status: 500 });
    }

    if (result.hasCapture) {
      console.log(`[LUDO MOVE] Capture confirmed room=${room_id} by user=${userId}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        winner_id:   null,
        pieces:      result.myPieces,
        has_capture: result.hasCapture,
        extra_turn:  extraTurn,
        is_win:      false,
      },
    });

  } catch (err: any) {
    console.error("[LUDO MOVE] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
