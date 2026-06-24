import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Check for any active/countdown room the player is in
    const { data: rooms, error } = await supabase
      .from("ludo_rooms")
      .select("id, status, stake")
      .or(`status.eq.countdown,status.eq.active`)
      .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[active_room] query error:", error);
      return NextResponse.json({ success: false, error: "Query failed" }, { status: 500 });
    }

    if (rooms && rooms.length > 0) {
      return NextResponse.json({
        success: true,
        has_active_room: true,
        room_id: rooms[0].id,
        status: rooms[0].status,
        stake: rooms[0].stake,
      });
    }

    return NextResponse.json({ success: true, has_active_room: false });
  } catch (err: any) {
    console.error("[active_room] error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
