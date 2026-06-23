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
      return NextResponse.json({ success: false, error: "Queue ID is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Perform atomic matchmaking and polling update in database
    const { data: matchResult, error: rpcErr } = await supabase.rpc("match_ludo_queue", {
      p_queue_id: queueId,
      p_user_id: userId
    });

    if (rpcErr) {
      console.error(`[LUDO MATCHMAKER] match_ludo_queue RPC failed for Queue ID ${queueId}:`, rpcErr);
      return NextResponse.json({ success: false, error: "Matchmaking error" }, { status: 500 });
    }

    if (matchResult && matchResult.matched) {
      if (matchResult.match_type === "bot") {
        console.log(`[LUDO MATCHMAKER] BOT ASSIGNED: 20-25s timer expired for User ${userId}. Bot assigned: ${matchResult.opponent_id}. Room Created: ${matchResult.room_id}. Match Started.`);
      } else {
        console.log(`[LUDO MATCHMAKER] OPPONENT FOUND: Real matchmaking completed. Room Created: ${matchResult.room_id}. Match Started. Player 1: ${matchResult.opponent_id}, Player 2: ${userId}`);
      }
      return NextResponse.json({ success: true, matched: true, room_id: matchResult.room_id });
    }

    if (matchResult && matchResult.cancelled) {
      console.log(`[LUDO MATCHMAKER] Queue Cancelled: Queue ID ${queueId} for User ${userId}`);
      return NextResponse.json({ success: true, cancelled: true });
    }

    // Still waiting (has not hit 20s bot limit and no real opponent matched yet)
    return NextResponse.json({ success: true, matched: false });
  } catch (err: any) {
    console.error("[LUDO MATCHMAKER STATUS ERROR]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
