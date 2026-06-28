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
    const userId   = auth.userId!;

    // ── Fetch room ────────────────────────────────────────────────────────────
    const { data: room, error } = await supabase
      .from("ludo_rooms")
      .select("id, status, player_1_id, player_2_id, created_at, match_start_time")
      .eq("id", room_id)
      .maybeSingle();

    if (error) {
      console.error("[LUDO FORFEIT] DB error:", (error as any).message ?? error);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "active" && room.status !== "countdown") {
      return NextResponse.json({ success: false, error: "Match cannot be forfeited now" }, { status: 400 });
    }
    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const isPlayer1  = room.player_1_id === userId;
    const opponentId = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);

    const matchStartMs = room.match_start_time
      ? new Date(room.match_start_time).getTime()
      : new Date(room.created_at).getTime();
    const duration = Math.floor((Date.now() - matchStartMs) / 1000);

    // ── Settle match — NOTE: correct signature, no p_board_state ────────────
    const { data: settled, error: settleErr } = await supabase.rpc("settle_ludo_match", {
      p_room_id:    room.id,
      p_winner_id:  opponentId,
      p_loser_id:   userId,
      p_win_reason: "forfeit",
      p_duration:   duration,
    });

    if (settleErr) {
      console.error("[LUDO FORFEIT] settle_ludo_match error:", settleErr.message);
      return NextResponse.json({ success: false, error: "Failed to settle match" }, { status: 500 });
    }

    console.log(`[LUDO FORFEIT] room=${room_id} loser=${userId} winner=${opponentId} settled=${settled}`);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[LUDO FORFEIT] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
