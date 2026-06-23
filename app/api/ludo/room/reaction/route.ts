import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { room_id, reaction_type } = await req.json();
    const allowedReactions = ["Laugh", "Angry", "Fire", "GG", "Crown", "Shock", "Cry"];
    if (!room_id || !allowedReactions.includes(reaction_type)) {
      return NextResponse.json({ success: false, error: "Invalid reaction parameters" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Fetch Room Details
    const { data: room, error } = await supabase
      .from("ludo_rooms")
      .select("chat_reactions, player_1_id, player_2_id")
      .eq("id", room_id)
      .maybeSingle();

    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const reactions = room.chat_reactions || [];
    const newReaction = {
      player_id: userId,
      type: reaction_type,
      timestamp: Date.now()
    };

    // Keep only last 10 reactions in the room log to preserve size
    const updatedReactions = [...reactions, newReaction].slice(-10);

    await supabase
      .from("ludo_rooms")
      .update({ chat_reactions: updatedReactions })
      .eq("id", room_id);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[ludo_reaction]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
