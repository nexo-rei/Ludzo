import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { movePiece, playerKey } from "@/lib/ludo/engine";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { room_id, piece_index } = await req.json();
    if (!room_id || piece_index === undefined) return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });

    const supabase = createAdminClient();
    const userId = auth.userId!;
    const { data: room } = await supabase.from("ludo_rooms").select("*").eq("id", room_id).maybeSingle();
    if (!room) return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    if (room.status !== "active") return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    if (room.turn_player_id !== userId) return NextResponse.json({ success: false, error: "It is not your turn" }, { status: 400 });
    if (!room.dice_rolled || !room.last_roll) return NextResponse.json({ success: false, error: "You must roll first" }, { status: 400 });
    if (!(room.movable_pieces || []).includes(piece_index)) return NextResponse.json({ success: false, error: "Invalid piece index selected" }, { status: 400 });

    const key = playerKey(room.player_1_id === userId);
    const result = movePiece(room.board_state, key, piece_index, room.last_roll);
    const now = new Date();
    const opponentId = key === "player_1" ? room.player_2_id : room.player_1_id;
    const extraTurn = room.last_roll === 6 || result.hasCapture || result.finished;
    const duration = Math.floor((now.getTime() - new Date(room.match_start_at ?? room.created_at).getTime()) / 1000);

    if (result.won) {
      await supabase.rpc("settle_ludo_match", { p_room_id: room.id, p_winner_id: userId, p_loser_id: opponentId, p_win_reason: "normal", p_duration: duration });
    } else {
      const { data: updatedRoom, error } = await supabase.from("ludo_rooms").update({
        turn_player_id: extraTurn ? userId : opponentId,
        turn_start_at: now.toISOString(),
        dice_rolled: false,
        last_roll: 0,
        movable_pieces: [],
        score_player_1: result.score1,
        score_player_2: result.score2,
        board_state: result.board,
        updated_at: now.toISOString(),
      }).eq("id", room_id).select().single();
      if (error) return NextResponse.json({ success: false, error: "Failed to save move" }, { status: 500 });
      await supabase.from("ludo_room_states").upsert({ room_id, state: updatedRoom, snapshot_at: now.toISOString() }, { onConflict: "room_id" });
    }

    return NextResponse.json({ success: true, data: { winner_id: result.won ? userId : null, pieces: result.board.pieces[key], has_capture: result.hasCapture, extra_turn: extraTurn, board_state: result.board } });
  } catch (err: any) {
    console.error("[ludo_move_piece]", err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
