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
    //   - Looks for a real opponent waiting in the same stake queue
    //   - If none found and 20 s have elapsed, assigns a bot
    //   - Returns { matched, room_id, opponent_id, match_type, cancelled }
    const { data: matchResult, error: rpcErr } = await supabase.rpc("match_ludo_queue", {
      p_queue_id: queueId,
      p_user_id:  userId,
    });

    if (rpcErr) {
      console.error(`[LUDO MATCHMAKER] match_ludo_queue RPC failed for queue=${queueId}:`, rpcErr.message);
      return NextResponse.json({ success: false, error: "Matchmaking error" }, { status: 500 });
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

    // Still waiting
    return NextResponse.json({ success: true, matched: false });

  } catch (err: any) {
    console.error("[LUDO MATCHMAKER] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
