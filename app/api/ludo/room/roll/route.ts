import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { room_id } = await req.json();
    if (!room_id) {
      return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 });
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

    if (room.dice_rolled) {
      return NextResponse.json({ success: false, error: "Dice already rolled for this turn" }, { status: 400 });
    }

    // Roll Dice
    const roll = Math.floor(Math.random() * 6) + 1;

    // Determine Player Index
    const isPlayer1 = room.player_1_id === userId;
    const player = isPlayer1 ? "player_1" : "player_2";
    const opponent = isPlayer1 ? "player_2" : "player_1";

    const pieces = room.board_state.pieces[player];
    const opponentPieces = room.board_state.pieces[opponent];

    // Calculate Movable Pieces
    const movable: number[] = [];
    for (let i = 0; i < 4; i++) {
      const pos = pieces[i];
      if (pos === 0 && roll === 6) {
        movable.push(i);
      } else if (pos > 0 && pos + roll <= 57) {
        movable.push(i);
      }
    }

    let nextTurnPlayerId = room.turn_player_id;
    let nextDiceRolled = true;
    let nextMovablePieces = movable;
    let nextTurnStartAt = new Date().toISOString();

    // If no moves, switch turn automatically
    if (movable.length === 0) {
      nextTurnPlayerId = isPlayer1 ? room.player_2_id : room.player_1_id;
      nextDiceRolled = false;
      nextMovablePieces = [];
    }

    // Save update
    const { data: updatedRoom, error: saveErr } = await supabase
      .from("ludo_rooms")
      .update({
        dice_rolled: nextDiceRolled,
        last_roll: roll,
        movable_pieces: nextMovablePieces,
        turn_player_id: nextTurnPlayerId,
        turn_start_at: nextTurnStartAt,
        updated_at: new Date().toISOString()
      })
      .eq("id", room_id)
      .select()
      .single();

    if (saveErr) {
      console.error("Failed to save roll state:", saveErr);
      return NextResponse.json({ success: false, error: "Failed to roll dice" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        roll,
        movable_pieces: nextMovablePieces,
        turn_player_id: nextTurnPlayerId,
        dice_rolled: nextDiceRolled
      }
    });

  } catch (err: any) {
    console.error("[ludo_roll_dice]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
