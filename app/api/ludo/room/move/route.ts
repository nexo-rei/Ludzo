import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { room_id, piece_index } = await req.json();
    if (!room_id || piece_index === undefined) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Fetch Room Details
    const { data: room, error } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", room_id)
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "active") {
      return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    }

    if (room.turn_player_id !== userId) {
      return NextResponse.json({ success: false, error: "It is not your turn" }, { status: 400 });
    }

    if (!room.dice_rolled) {
      return NextResponse.json({ success: false, error: "You must roll first" }, { status: 400 });
    }

    const movable = room.movable_pieces || [];
    if (!movable.includes(piece_index)) {
      return NextResponse.json({ success: false, error: "Invalid piece index selected" }, { status: 400 });
    }

    // Move Piece
    const isPlayer1 = room.player_1_id === userId;
    const player = isPlayer1 ? "player_1" : "player_2";
    const opponent = isPlayer1 ? "player_2" : "player_1";

    const boardState = room.board_state;
    const pieces = boardState.pieces[player];
    const opponentPieces = boardState.pieces[opponent];

    const currPos = pieces[piece_index];
    const roll = room.last_roll;
    const newPos = currPos === 0 ? 1 : currPos + roll;

    pieces[piece_index] = newPos;

    // Check Capture (Kills)
    let hasCapture = false;
    if (newPos >= 1 && newPos <= 51) {
      const cellIdx = isPlayer1 ? (newPos) % 52 : (26 + newPos) % 52;
      const isSafe = [1, 9, 14, 22, 27, 35, 40, 48].includes(cellIdx);

      if (!isSafe) {
        for (let i = 0; i < 4; i++) {
          const oPos = opponentPieces[i];
          if (oPos >= 1 && oPos <= 51) {
            const oCellIdx = !isPlayer1 ? (oPos) % 52 : (26 + oPos) % 52;
            if (oCellIdx === cellIdx) {
              opponentPieces[i] = 0; // reset to Yard
              hasCapture = true;
            }
          }
        }
      }
    }

    boardState.pieces[player] = pieces;
    boardState.pieces[opponent] = opponentPieces;

    // Recalculate Scores
    let score1 = room.score_player_1;
    let score2 = room.score_player_2;
    if (isPlayer1) {
      score1 = pieces.reduce((sum: number, p: number) => sum + p, 0);
    } else {
      score2 = pieces.reduce((sum: number, p: number) => sum + p, 0);
    }

    // Check Win Condition
    const isWin = pieces.every((p: number) => p === 57);
    let status = room.status;
    let winnerId = room.winner_id;
    let loserId = room.loser_id;
    let winReason = room.win_reason;
    let turnPlayerId = room.turn_player_id;
    let turnStartAt = room.turn_start_at;
    let diceRolled = room.dice_rolled;
    let lastRoll = room.last_roll;
    let nextMovablePieces = room.movable_pieces;

    if (isWin) {
      status = "completed";
      winnerId = userId;
      loserId = isPlayer1 ? room.player_2_id : room.player_1_id;
      winReason = "normal";

      const now = Date.now();
      const matchDuration = Math.floor((now - new Date(room.created_at).getTime()) / 1000);

      // Call database match settlement function
      await supabase.rpc("settle_ludo_match", {
        p_room_id: room.id,
        p_winner_id: winnerId,
        p_loser_id: loserId,
        p_win_reason: "normal",
        p_duration: matchDuration
      });

    } else {
      // Extra turn rule
      const getsExtraTurn = roll === 6 || hasCapture || newPos === 57;
      if (getsExtraTurn) {
        turnPlayerId = userId;
        turnStartAt = new Date().toISOString();
        diceRolled = false;
        lastRoll = 0;
        nextMovablePieces = [];
      } else {
        // Switch turn to opponent
        turnPlayerId = isPlayer1 ? room.player_2_id : room.player_1_id;
        turnStartAt = new Date().toISOString();
        diceRolled = false;
        lastRoll = 0;
        nextMovablePieces = [];
      }

      // Save Room Updates
      await supabase
        .from("ludo_rooms")
        .update({
          turn_player_id: turnPlayerId,
          turn_start_at: turnStartAt,
          dice_rolled: diceRolled,
          last_roll: lastRoll,
          movable_pieces: nextMovablePieces,
          score_player_1: score1,
          score_player_2: score2,
          board_state: boardState,
          updated_at: new Date().toISOString()
        })
        .eq("id", room_id);
    }

    return NextResponse.json({
      success: true,
      data: {
        winner_id: winnerId,
        pieces,
        has_capture: hasCapture,
        extra_turn: roll === 6 || hasCapture || newPos === 57
      }
    });

  } catch (err: any) {
    console.error("[ludo_move_piece]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
