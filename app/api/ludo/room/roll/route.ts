import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcMovablePieces, MAX_CONSECUTIVE_SIXES, PIECES_PER_PLAYER } from "@/lib/ludo-engine";

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

    const { data: room, error: roomErr } = await supabase
      .from("ludo_rooms")
      .select("*")
      .eq("id", room_id)
      .maybeSingle();

    if (roomErr) {
      console.error(`[LUDO ROLL] DB error:`, roomErr.message);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "active") {
      return NextResponse.json({ success: false, error: "Match is not active" }, { status: 400 });
    }
    if (room.turn_player_id !== userId) {
      return NextResponse.json({ success: false, error: "Not your turn" }, { status: 403 });
    }
    // Idempotent: if already rolled this turn, return current state so client can sync
    if (room.dice_rolled) {
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

    // ── Server-side roll ──────────────────────────────────────────────────────
    const roll = Math.floor(Math.random() * 6) + 1;

    const isPlayer1 = room.player_1_id === userId;
    const playerKey = isPlayer1 ? "player_1" : "player_2";
    const oppKey    = isPlayer1 ? "player_2" : "player_1";
    // Fresh rooms are seeded with 2 tokens per player (PIECES_PER_PLAYER);
    // legacy 4-token rooms keep playing — the engine is length-generic.
    const pieces: number[]    = room.board_state?.pieces?.[playerKey] ?? Array(PIECES_PER_PLAYER).fill(0);
    const oppPieces: number[] = room.board_state?.pieces?.[oppKey]    ?? Array(PIECES_PER_PLAYER).fill(0);

    // consecutive_sixes may not exist on older rooms — default to 0
    const prevConsecutive = (room.consecutive_sixes ?? 0) as number;
    const newConsecutive  = roll === 6 ? prevConsecutive + 1 : 0;

    const nextPlayer = isPlayer1 ? String(room.player_2_id) : String(room.player_1_id);

    console.log(
      `[LUDO ROLL] room=${room_id} user=${userId} roll=${roll}` +
      ` consecutive=${newConsecutive} pieces=${JSON.stringify(pieces)}`
    );

    // ── Triple-six → forfeit turn immediately (before calculating moves) ──────
    if (roll === 6 && newConsecutive >= MAX_CONSECUTIVE_SIXES) {
      console.log(`[LUDO ROLL] TRIPLE SIX — forfeit turn to ${nextPlayer}`);

      const updatePayload: Record<string, unknown> = {
        last_roll:      roll,
        dice_rolled:    false,
        movable_pieces: [],
        turn_player_id: nextPlayer,
        turn_start_at:  new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      };
      // Only write consecutive_sixes if the column exists (safe guard)
      if ("consecutive_sixes" in room) updatePayload.consecutive_sixes = 0;

      // CAS: only the request that still owns an un-rolled turn may write.
      const { data: passed } = await supabase
        .from("ludo_rooms")
        .update(updatePayload)
        .eq("id", room_id)
        .eq("turn_player_id", userId)
        .eq("dice_rolled", false)
        .select("id")
        .maybeSingle();

      if (!passed) {
        return NextResponse.json(
          { success: false, error: "Turn already advanced" },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          roll,
          movable_pieces: [],
          turn_player_id: nextPlayer,
          dice_rolled:    false,
          auto_passed:    true,
          triple_six:     true,
        },
      });
    }

    // ── Calculate movable pieces (block/barrier-aware) ────────────────────────
    const movable = calcMovablePieces(pieces, roll, oppPieces, isPlayer1);
    console.log(`[LUDO ROLL] movable=${JSON.stringify(movable)}`);

    // ── No moves → auto-pass turn ─────────────────────────────────────────────
    if (movable.length === 0) {
      console.log(`[LUDO ROLL] No moves — auto-pass to ${nextPlayer}`);

      const updatePayload: Record<string, unknown> = {
        last_roll:      roll,
        dice_rolled:    false,
        movable_pieces: [],
        turn_player_id: nextPlayer,
        turn_start_at:  new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      };
      if ("consecutive_sixes" in room) updatePayload.consecutive_sixes = 0;

      // CAS: only the request that still owns an un-rolled turn may write.
      const { data: passed } = await supabase
        .from("ludo_rooms")
        .update(updatePayload)
        .eq("id", room_id)
        .eq("turn_player_id", userId)
        .eq("dice_rolled", false)
        .select("id")
        .maybeSingle();

      if (!passed) {
        return NextResponse.json(
          { success: false, error: "Turn already advanced" },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          roll,
          movable_pieces: [],
          turn_player_id: nextPlayer,
          dice_rolled:    false,
          auto_passed:    true,
        },
      });
    }

    // ── Normal roll — wait for player to choose a piece ───────────────────────
        // ── Normal roll — wait for player to choose a piece ───────────────────────
    // Refresh the turn clock so the player gets a full window to pick a token.
    const updatePayload: Record<string, unknown> = {
      last_roll:      roll,
      dice_rolled:    true,
      movable_pieces: movable,
      turn_start_at:  new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    };
    if ("consecutive_sixes" in room) updatePayload.consecutive_sixes = newConsecutive;

    // CAS: prevents a double-tap / second tab from rolling twice on one turn.
    const { data: saved, error: saveErr } = await supabase
      .from("ludo_rooms")
      .update(updatePayload)
      .eq("id", room_id)
      .eq("turn_player_id", userId)
      .eq("dice_rolled", false)
      .select("id")
      .maybeSingle();

    if (saveErr) {
      console.error(`[LUDO ROLL] Failed to save roll:`, saveErr.message);
      return NextResponse.json({ success: false, error: "Failed to save roll" }, { status: 500 });
    }
    if (!saved) {
      console.warn(`[LUDO ROLL] Stale roll rejected room=${room_id} user=${userId}`);
      return NextResponse.json(
        { success: false, error: "Turn already advanced — please sync" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        roll,
        movable_pieces:  movable,
        turn_player_id:  userId,
        dice_rolled:     true,
        auto_passed:     false,
        consecutive_sixes: newConsecutive,
      },
    });

  } catch (err: any) {
    console.error("[LUDO ROLL] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
