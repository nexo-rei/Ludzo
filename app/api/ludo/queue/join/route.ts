import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { stake } = await req.json();
    const allowedStakes = [50, 100, 200, 500, 1000, 2000, 5000];
    if (!allowedStakes.includes(stake)) {
      return NextResponse.json({ success: false, error: "Invalid stake amount" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Server-Side Log: Queue Join Requested
    console.log(`[LUDO MATCHMAKER] Queue Join: User ${userId} requested stake ${stake}`);

    // 1. Check if already in an active room
    const { data: activeRooms } = await supabase
      .from("ludo_rooms")
      .select("id")
      .or(`status.eq.countdown,status.eq.active`)
      .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
      .limit(1);

    if (activeRooms && activeRooms.length > 0) {
      console.log(`[LUDO MATCHMAKER] Queue Join Aborted: User ${userId} is already in active room ${activeRooms[0].id}`);
      return NextResponse.json({
        success: false,
        error: "You are already in an active match",
        room_id: activeRooms[0].id
      }, { status: 400 });
    }

    // 2. Check if already in queue
    const { data: activeQueue } = await supabase
      .from("ludo_queues")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "waiting")
      .eq("stake", stake)
      .maybeSingle();

    if (activeQueue) {
      console.log(`[LUDO MATCHMAKER] User ${userId} already has waiting queue entry ${activeQueue.id}`);

      // Perform atomic matchmaking immediately on the existing queue
      const { data: matchResult, error: matchErr } = await supabase.rpc("match_ludo_queue", {
        p_queue_id: activeQueue.id,
        p_user_id: userId
      });

      if (!matchErr && matchResult && matchResult.matched) {
        console.log(`[LUDO MATCHMAKER] MATCH SUCCESS: Room ${matchResult.room_id} created instantly for User ${userId}. Opponent: ${matchResult.opponent_id} (${matchResult.match_type})`);
        return NextResponse.json({ success: true, matched: true, room_id: matchResult.room_id });
      }

      return NextResponse.json({ success: true, matched: false, queue_id: activeQueue.id });
    }

    // 3. Deduct coins and create queue entry atomically
    const { data: queueId, error: rpcErr } = await supabase.rpc("join_ludo_queue", {
      p_user_id: userId,
      p_stake: stake
    });

    if (rpcErr) {
      console.error("[LUDO MATCHMAKER] Wallet deduction / join_ludo_queue failed:", rpcErr);
      return NextResponse.json({ success: false, error: rpcErr.message }, { status: 400 });
    }

    console.log(`[LUDO MATCHMAKER] Queue Joined: Queue ID ${queueId} created for User ${userId} with stake ${stake}`);

    // 4. Perform atomic matchmaking check immediately on join
    const { data: matchResult, error: matchErr } = await supabase.rpc("match_ludo_queue", {
      p_queue_id: queueId,
      p_user_id: userId
    });

    if (!matchErr && matchResult && matchResult.matched) {
      console.log(`[LUDO MATCHMAKER] MATCH SUCCESS (Instant Join): Room ${matchResult.room_id} created for User ${userId}. Opponent: ${matchResult.opponent_id} (${matchResult.match_type})`);
      return NextResponse.json({ success: true, matched: true, room_id: matchResult.room_id });
    }

    return NextResponse.json({ success: true, matched: false, queue_id: queueId });
  } catch (err: any) {
    console.error("[LUDO MATCHMAKER ERROR]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
