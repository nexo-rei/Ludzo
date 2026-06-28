import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Safe absolute TRACK indices (0-indexed) — matches the SAFE_SPOTS set in the frontend
const SAFE_TRACK_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

// ── Position helpers ──────────────────────────────────────────────────────────

/**
 * Returns true when a piece at `pos` (relative, 1..51) can be moved to
 * `nextPos` without entering the home lane for the wrong player.
 * Home lane = positions 52..56.  Position 57 = finished.
 */
function canAdvance(pos: number, roll: number): boolean {
  if (pos === 0) return false; // still in yard — only roll=6 releases
  const next = pos + roll;
  return next <= 57; // cannot overshoot the finish
}

/**
 * Convert a player's relative position to an absolute TRACK index (0..51).
 * Player 1 starts at track index 0; Player 2 starts at track index 26.
 * Positions 52-56 are in the home lane (off the shared track — safe).
 * Position 57 is finished.
 */
function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  if (relPos <= 0 || relPos > 51) return null; // yard, home lane, or finished
  const offset = isPlayer1 ? 0 : 26;
  return (relPos - 1 + offset) % 52;
}

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
    const userId = auth.userId!;

    // ── Fetch room ────────────────────────────────────────────────────────────
    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", room_id)
      .maybeSingle();

    if (roomErr) {
      console.error(`[LUDO ROLL] DB error fetching room ${room_id}:`, roomErr.message);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // ── Anti-cheat: validate turn ownership ───────────────────────────────────
    if (room.status !== "active") {
      console.warn(`[LUDO ROLL] Room ${room_id} is not active (status=${room.status}), user=${userId}`);
      return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    }
    if (room.turn_player_id !== userId) {
      console.warn(`[LUDO ROLL] Turn violation — user=${userId}, turn=${room.turn_player_id}`);
      return NextResponse.json({ success: false, error: "Not your turn" }, { status: 403 });
    }
    if (room.dice_rolled) {
      console.warn(`[LUDO ROLL] Duplicate roll attempt — user=${userId}, room=${room_id}`);
      return NextResponse.json({ success: false, error: "Dice already rolled this turn" }, { status: 400 });
    }

    // ── Roll dice (server-side, cryptographically random) ────────────────────
    const roll = Math.floor(Math.random() * 6) + 1;
    const isPlayer1 = room.player_1_id === userId;
    const playerKey = isPlayer1 ? "player_1" : "player_2";
    const pieces: number[] = room.board_state?.pieces?.[playerKey] ?? [0, 0, 0, 0];

    console.log(`[LUDO ROLL] room=${room_id} user=${userId} player=${playerKey} roll=${roll} pieces=${JSON.stringify(pieces)}`);

    // ── Calculate movable pieces ──────────────────────────────────────────────
    const movable: number[] = [];

    for (let i = 0; i < 4; i++) {
      const pos = pieces[i];

      if (pos === 57) {
        // Already finished — skip
        continue;
      }

      if (pos === 0) {
        // In yard: can only leave on a 6
        if (roll === 6) {
          movable.push(i);
        }
        continue;
      }

      // On main track (1..51) or home lane (52..56)
      if (canAdvance(pos, roll)) {
        movable.push(i);
      }
    }

    console.log(`[LUDO ROLL] movable pieces: ${JSON.stringify(movable)}`);

    // ── No moves available → auto-pass turn ──────────────────────────────────
    if (movable.length === 0) {
      const nextTurn = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);
      console.log(`[LUDO ROLL] No moves for user=${userId} on roll=${roll}. Auto-passing turn to ${nextTurn}`);

      const { error: updateErr } = await supabase
        .from("ludo_rooms")
        .update({
          last_roll:      roll,
          dice_rolled:    false,   // next player starts fresh
          movable_pieces: [],
          turn_player_id: nextTurn,
          turn_start_at:  new Date().toISOString(),
          updated_at:     new Date().toISOString(),
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
          dice_rolled: false,
          auto_passed: true,
        },
      });
    }

    // ── Save roll result ──────────────────────────────────────────────────────
    const { error: saveErr } = await supabase
      .from("ludo_rooms")
      .update({
        last_roll:      roll,
        dice_rolled:    true,
        movable_pieces: movable,
        updated_at:     new Date().toISOString(),
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
        dice_rolled: true,
        auto_passed: false,
      },
    });

  } catch (err: any) {
    console.error("[LUDO ROLL] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
