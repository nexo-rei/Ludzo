import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackApiRequest } from "@/lib/usage-tracker";

const ALLOWED_REACTIONS = ["Laugh", "Angry", "Fire", "GG", "Crown", "Shock", "Cry", "Clap"] as const;
type AllowedReaction = typeof ALLOWED_REACTIONS[number];

const REACTION_COOLDOWN_MS = 2000;

export async function POST(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("match_action");
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { room_id, reaction_type } = await req.json();

    if (!room_id) {
      return NextResponse.json({ success: false, error: "room_id is required" }, { status: 400 });
    }
    if (!ALLOWED_REACTIONS.includes(reaction_type as AllowedReaction)) {
      return NextResponse.json({ success: false, error: "Invalid reaction type" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;
    const now      = Date.now();

    // ── Verify player is in this room ─────────────────────────────────────────
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
      Array.isArray(room.chat_reactions) ? room.chat_reactions : [];

    const myLast = existing
      .filter(r => r.player_id === userId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (myLast && now - myLast.timestamp < REACTION_COOLDOWN_MS) {
      return NextResponse.json(
        { success: false, error: "Please wait before reacting again" },
        { status: 429 }
      );
    }

    const newReaction = { player_id: userId, type: reaction_type, timestamp: now };

    // ── Primary store: chat_reactions on ludo_rooms ──────────────────────────
    // This is the field both players poll every 1.2 s in /api/ludo/room/state.
    //
    // Appended ATOMICALLY in SQL (append_ludo_reaction) so two players reacting
    // in the same second don't overwrite each other — the old read-modify-write
    // dropped one of the two reactions. Falls back to RMW if the RPC has not
    // been installed yet (see sql/02_ludo_fixes.sql).
    const { error: rpcErr } = await supabase.rpc("append_ludo_reaction", {
      p_room_id:  room_id,
      p_reaction: newReaction,
      p_keep:     20,                       // cap the array to prevent JSONB bloat
    });

    if (rpcErr) {
      if (!/append_ludo_reaction/i.test(rpcErr.message)) {
        console.error(`[LUDO REACTION] append_ludo_reaction failed:`, rpcErr.message);
        return NextResponse.json({ success: false, error: "Failed to save reaction" }, { status: 500 });
      }
      console.warn(`[LUDO REACTION] append_ludo_reaction RPC missing — using non-atomic fallback. Run sql/02_ludo_fixes.sql.`);
      const updatedReactions = [...existing, newReaction].slice(-20);
      const { error: updateErr } = await supabase
        .from("ludo_rooms")
        .update({ chat_reactions: updatedReactions, updated_at: new Date().toISOString() })
        .eq("id", room_id);
      if (updateErr) {
        console.error(`[LUDO REACTION] Failed to save:`, updateErr.message);
        return NextResponse.json({ success: false, error: "Failed to save reaction" }, { status: 500 });
      }
    }

    // ── Secondary store: ludo_reactions table (fire-and-forget) ──────────────
    // Errors here must NOT fail the request — the primary store already succeeded.
    supabase
      .from("ludo_reactions")
      .insert({ room_id, sender_id: userId, reaction: reaction_type, sent_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.warn(`[LUDO REACTION] ludo_reactions insert failed (non-fatal):`, error.message);
      });

    console.log(`[LUDO REACTION] room=${room_id} player=${userId} type=${reaction_type}`);

    return NextResponse.json({ success: true, timestamp: now });

  } catch (err: any) {
    console.error("[LUDO REACTION] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
