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

    if (room.status !== "active" && room.status !== "countdown") {
      return NextResponse.json({ success: false, error: "Match cannot be forfeited now" }, { status: 400 });
    }

    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const isPlayer1 = room.player_1_id === userId;
    const opponentId = isPlayer1 ? room.player_2_id : room.player_1_id;

    const now = Date.now();
    const matchDuration = Math.floor((now - new Date(room.created_at).getTime()) / 1000);

    // Call Settle RPC Function to execute forfeiting
    await supabase.rpc("settle_ludo_match", {
      p_room_id: room.id,
      p_winner_id: opponentId,
      p_loser_id: userId,
      p_win_reason: "forfeit",
      p_duration: matchDuration
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[ludo_forfeit]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
