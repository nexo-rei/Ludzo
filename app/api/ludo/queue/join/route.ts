import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_STAKES = [50, 100, 200, 500, 1000, 2000, 5000];

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { stake } = await req.json();

    if (!ALLOWED_STAKES.includes(stake)) {
      return NextResponse.json({ success: false, error: "Invalid stake amount" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId   = auth.userId!;

    console.log(`[LUDO MATCHMAKER] Queue Join: user=${userId} stake=${stake}`);

    // ── 1. Reject if already in an active room ────────────────────────────────
    const { data: activeRooms } = await supabase
      .from("ludo_rooms")
      .select("id, status")
      .in("status", ["countdown", "active"])
      .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeRooms && activeRooms.length > 0) {
      console.log(`[LUDO MATCHMAKER] Already in active room ${activeRooms[0].id}`);
      return NextResponse.json({
        success: false,
        error:   "You are already in an active match",
        room_id: activeRooms[0].id,
      }, { status: 400 });
    }

    // ── 2. Check if already waiting in this stake queue ───────────────────────
    const { data: activeQueue } = await supabase
      .from("ludo_queues")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "waiting")
      .eq("stake", stake)
      .maybeSingle();

    if (activeQueue) {
      console.log(`[LUDO MATCHMAKER] Already waiting in queue ${activeQueue.id}`);

      // Try to match immediately against an existing opponent
      const { data: matchResult, error: matchErr } = await supabase.rpc("match_ludo_queue", {
        p_queue_id: activeQueue.id,
        p_user_id:  userId,
      });

      if (!matchErr && matchResult?.matched) {
        console.log(`[LUDO MATCHMAKER] Instant match for existing queue entry: room=${matchResult.room_id}`);
        return NextResponse.json({ success: true, matched: true, room_id: matchResult.room_id });
      }

      return NextResponse.json({ success: true, matched: false, queue_id: activeQueue.id });
    }

    // ── 3. Deduct coins and create queue entry atomically via RPC ─────────────
    const { data: queueId, error: rpcErr } = await supabase.rpc("join_ludo_queue", {
      p_user_id: userId,
      p_stake:   stake,
    });

    if (rpcErr) {
      console.error("[LUDO MATCHMAKER] join_ludo_queue failed:", rpcErr.message);
      return NextResponse.json({ success: false, error: rpcErr.message }, { status: 400 });
    }

    console.log(`[LUDO MATCHMAKER] Queue entry created: queue_id=${queueId}`);

    // ── 4. Try instant matchmaking ────────────────────────────────────────────
    const { data: matchResult, error: matchErr } = await supabase.rpc("match_ludo_queue", {
      p_queue_id: queueId,
      p_user_id:  userId,
    });

    if (!matchErr && matchResult?.matched) {
      console.log(`[LUDO MATCHMAKER] Instant match: room=${matchResult.room_id} type=${matchResult.match_type}`);
      return NextResponse.json({ success: true, matched: true, room_id: matchResult.room_id });
    }

    // Still searching
    return NextResponse.json({ success: true, matched: false, queue_id: queueId });

  } catch (err: any) {
    console.error("[LUDO MATCHMAKER] Unhandled exception:", err?.message ?? err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
