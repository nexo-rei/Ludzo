import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_REACTIONS = ["Laugh", "Angry", "Fire", "GG", "Crown", "Shock", "Cry", "Clap"] as const;
const REACTION_COOLDOWN_MS = 2000;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { room_id, reaction_type } = await req.json();

    if (!room_id) {
      return NextResponse.json({ success: false, error: "room_id is required" }, { status: 400 });
    }
    if (!ALLOWED_REACTIONS.includes(reaction_type)) {
      return NextResponse.json({ success: false, error: "Invalid reaction type" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;
    const now      = Date.now();

    // ── Verify the player is in this room and match is active ─────────────────
    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("chat_reactions, player_1_id, player_2_id, status")
      .eq("id", room_id)
      .maybeSingle();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }
    if (room.player_1_id !== userId && room.player_2_id !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (room.status !== "active" && room.status !== "countdown") {
      return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    }

    // ── Server-side cooldown ──────────────────────────────────────────────────
    const existing: Array<{ player_id: string; type: string; timestamp: number }> =
      room.chat_reactions ?? [];

    const myLast = existing
      .filter(r => r.player_id === userId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (myLast && now - myLast.timestamp < REACTION_COOLDOWN_MS) {
      return NextResponse.json(
        { success: false, error: "Please wait before reacting again" },
        { status: 429 }
      );
    }

    const newReaction = {
      player_id: userId,
      type:      reaction_type,
      timestamp: now,
    };

    // ── Update chat_reactions in ludo_rooms (polling-based sync) ─────────────
    // Keep latest 20 to prevent JSONB bloat
    const updatedReactions = [...existing, newReaction].slice(-20);

    const { error: updateErr } = await supabase
      .from("ludo_rooms")
      .update({
        chat_reactions: updatedReactions,
        updated_at:     new Date().toISOString(),
      })
      .eq("id", room_id);

    if (updateErr) {
      console.error(`[LUDO REACTION] Failed to save reaction:`, updateErr.message);
      return NextResponse.json({ success: false, error: "Failed to save reaction" }, { status: 500 });
    }

    // ── Also write to ludo_reactions table for any realtime subscribers ───────
    // This is a belt-and-suspenders approach: polling reads from ludo_rooms,
    // realtime subscribers can read from ludo_reactions.
    await supabase
      .from("ludo_reactions")
      .insert({
        room_id:   room_id,
        sender_id: userId,
        reaction:  reaction_type,
        sent_at:   new Date().toISOString(),
      });

    console.log(`[LUDO REACTION] room=${room_id} player=${userId} type=${reaction_type}`);

    return NextResponse.json({ success: true, timestamp: now });

  } catch (err: any) {
    console.error("[LUDO REACTION] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
