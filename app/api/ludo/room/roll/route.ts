import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MATCH_SECONDS, movablePieces, normalizeBoardState, playerKey } from "@/lib/ludo/engine";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { room_id } = await req.json();
    if (!room_id) return NextResponse.json({ success: false, error: "Room ID is required" }, { status: 400 });

    const supabase = createAdminClient();
    const userId = auth.userId!;
    const { data: room } = await supabase.from("ludo_rooms").select("*").eq("id", room_id).maybeSingle();
    if (!room) return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    if (room.player_1_id !== userId && room.player_2_id !== userId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    if (room.status !== "active") return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    if (room.turn_player_id !== userId) return NextResponse.json({ success: false, error: "It is not your turn" }, { status: 400 });
    if (room.dice_rolled) return NextResponse.json({ success: false, error: "Dice already rolled for this turn" }, { status: 400 });

    const now = new Date();
    const matchStart = new Date(room.match_start_at ?? room.created_at);
    if ((now.getTime() - matchStart.getTime()) / 1000 >= MATCH_SECONDS) {
      return NextResponse.json({ success: false, error: "Match timer has expired. Syncing result." }, { status: 409 });
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    const key = playerKey(room.player_1_id === userId);
    const board = normalizeBoardState(room.board_state);
    const movable = movablePieces(board, key, roll);

    const update: Record<string, any> = { last_roll: roll, updated_at: now.toISOString() };
    if (movable.length === 0) {
      update.turn_player_id = key === "player_1" ? room.player_2_id : room.player_1_id;
      update.turn_start_at = now.toISOString();
      update.dice_rolled = false;
      update.movable_pieces = [];
    } else {
      update.dice_rolled = true;
      update.movable_pieces = movable;
    }

    const { data: updatedRoom, error: saveErr } = await supabase.from("ludo_rooms").update(update).eq("id", room_id).select().single();
    if (saveErr) return NextResponse.json({ success: false, error: "Failed to roll dice" }, { status: 500 });

    await supabase.from("ludo_room_states").upsert({ room_id, state: updatedRoom, snapshot_at: now.toISOString() }, { onConflict: "room_id" });
    return NextResponse.json({ success: true, data: { roll, movable_pieces: update.movable_pieces, turn_player_id: updatedRoom.turn_player_id, dice_rolled: updatedRoom.dice_rolled } });
  } catch (err) {
    console.error("[ludo_roll_dice]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
