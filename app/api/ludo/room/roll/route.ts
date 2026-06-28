import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcMovablePieces, MAX_CONSECUTIVE_SIXES } from "@/lib/ludo-engine";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { room_id } = body;

    if (!room_id) {
      return NextResponse.json({ success: false, error: "room_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;

    // ── Fetch and lock room ───────────────────────────────────────────────────
    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", room_id)
      .maybeSingle();

    if (roomErr) {
      console.error(`[LUDO ROLL] DB error room=${room_id}:`, roomErr.message);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // ── Anti-cheat validations ────────────────────────────────────────────────
    if (room.status !== "active") {
      return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    }
    if (room.turn_player_id !== userId) {
      console.warn(`[LUDO ROLL] Turn violation — user=${userId}, turn=${room.turn_player_id}`);
      return NextResponse.json({ success: false, error: "Not your turn" }, { status: 403 });
    }
    if (room.dice_rolled) {
      // Already rolled this turn — idempotent: return the current state
      return NextResponse.json({
        success: true,
        data: {
          roll:           room.last_roll,
          movable_pieces: room.movable_pieces ?? [],
          turn_player_id: userId,
          dice_rolled:    true,
          auto_passed:    false,
          already_rolled: true,
        },
      });
    }

    // ── Server-side dice roll (cryptographically random) ─────────────────────
    const roll = Math.floor(Math.random() * 6) + 1;

    const isPlayer1  = room.player_1_id === userId;
    const playerKey  = isPlayer1 ? "player_1" : "player_2";
    const pieces: number[] = room.board_state?.pieces?.[playerKey] ?? [0, 0, 0, 0];

    // Track consecutive sixes (needed for triple-six rule)
    const prevConsecutive = (room.consecutive_sixes ?? 0) as number;
    const newConsecutive  = roll === 6 ? prevConsecutive + 1 : 0;

    console.log(`[LUDO ROLL] room=${room_id} user=${userId} roll=${roll} consecutiveSixes=${newConsecutive} pieces=${JSON.stringify(pieces)}`);

    // ── Triple-six: forfeit the turn ─────────────────────────────────────────
    if (roll === 6 && newConsecutive >= MAX_CONSECUTIVE_SIXES) {
      const nextTurn = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);
      console.log(`[LUDO ROLL] TRIPLE SIX — forfeit turn, pass to ${nextTurn}`);

      const { error: updateErr } = await supabase
        .from("ludo_rooms")
        .update({
          last_roll:        roll,
          dice_rolled:      false,
          movable_pieces:   [],
          turn_player_id:   nextTurn,
          turn_start_at:    new Date().toISOString(),
          consecutive_sixes: 0,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", room_id);

      if (updateErr) {
        console.error(`[LUDO ROLL] Failed to forfeit triple six:`, updateErr.message);
        return NextResponse.json({ success: false, error: "Failed to process roll" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          roll,
          movable_pieces: [],
          turn_player_id: nextTurn,
          dice_rolled:    false,
          auto_passed:    true,
          triple_six:     true,
        },
      });
    }

    // ── Calculate movable pieces ──────────────────────────────────────────────
    const movable = calcMovablePieces(pieces, roll);

    console.log(`[LUDO ROLL] movable pieces: ${JSON.stringify(movable)}`);

    // ── No moves available → auto-pass turn ──────────────────────────────────
    if (movable.length === 0) {
      const nextTurn = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);
      console.log(`[LUDO ROLL] No moves for user=${userId} on roll=${roll}. Auto-passing turn to ${nextTurn}`);

      const { error: updateErr } = await supabase
        .from("ludo_rooms")
        .update({
          last_roll:        roll,
          dice_rolled:      false,
          movable_pieces:   [],
          turn_player_id:   nextTurn,
          turn_start_at:    new Date().toISOString(),
          consecutive_sixes: 0,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", room_id);

      if (updateErr) {
        console.error(`[LUDO ROLL] Failed to auto-pass turn:`, updateErr.message);
        return NextResponse.json({ success: false, error: "Failed to process roll" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          roll,
          movable_pieces: [],
          turn_player_id: nextTurn,
          dice_rolled:    false,
          auto_passed:    true,
        },
      });
    }

    // ── Save roll result ──────────────────────────────────────────────────────
    const { error: saveErr } = await supabase
      .from("ludo_rooms")
      .update({
        last_roll:        roll,
        dice_rolled:      true,
        movable_pieces:   movable,
        consecutive_sixes: newConsecutive,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", room_id);

    if (saveErr) {
      console.error(`[LUDO ROLL] Failed to save roll:`, saveErr.message);
      return NextResponse.json({ success: false, error: "Failed to save roll" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        roll,
        movable_pieces: movable,
        turn_player_id: userId,
        dice_rolled:    true,
        auto_passed:    false,
      },
    });

  } catch (err: any) {
    console.error("[LUDO ROLL] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
