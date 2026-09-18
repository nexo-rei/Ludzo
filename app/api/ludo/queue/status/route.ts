import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queueId = req.nextUrl.searchParams.get("queue_id");
    if (!queueId) {
      return NextResponse.json({ success: false, error: "queue_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;

    // ── Call atomic matchmaking RPC ───────────────────────────────────────────
    // This RPC:
    //   - Returns the room straight away if this user already has a live room
    //   - Looks for a real opponent waiting in the same stake queue (first)
    //   - If none found and this entry's random 20–28 s window has passed, it
    //     seats an arena (house) opponent — the wait time is randomised per
    //     queue entry, so the seat is never taken instantly and never before 20 s
    //   - Returns { matched, room_id, opponent_id, match_type, cancelled }
    const { data: matchResult, error: rpcErr } = await supabase.rpc("match_ludo_queue", {
      p_queue_id: queueId,
      p_user_id:  userId,
    });

    if (rpcErr) {
      console.error(`[LUDO MATCHMAKER] match_ludo_queue RPC failed for queue=${queueId}:`, rpcErr.message);
      // The reason is surfaced so a broken deployment (missing migration) is
      // visible instead of an endless "searching" radar.
      return NextResponse.json({ success: false, error: "Matchmaking error", reason: rpcErr.message }, { status: 500 });
    }

    if (matchResult?.matched) {
      const matchType = matchResult.match_type === "bot" ? "BOT" : "OPPONENT";
      console.log(`[LUDO MATCHMAKER] ${matchType} MATCH: room=${matchResult.room_id} opponent=${matchResult.opponent_id}`);
      return NextResponse.json({
        success:  true,
        matched:  true,
        room_id:  matchResult.room_id,
        match_type: matchResult.match_type,
      });
    }

    if (matchResult?.cancelled) {
      console.log(`[LUDO MATCHMAKER] Queue cancelled: queue=${queueId}`);
      return NextResponse.json({ success: true, cancelled: true });
    }

    // Still waiting. `waiting_secs` / `search_secs` are the entry's elapsed and
    // target seconds — handy in logs, and the client ignores them.
    if (matchResult?.reason) {
      console.warn(`[LUDO MATCHMAKER] queue=${queueId} still waiting:`, matchResult.reason);
    }
    return NextResponse.json({
      success:      true,
      matched:      false,
      waiting_secs: matchResult?.waiting_secs ?? null,
      search_secs:  matchResult?.search_secs  ?? null,
    });

  } catch (err: any) {
    console.error("[LUDO MATCHMAKER] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
