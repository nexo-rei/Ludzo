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

    // 1. Check if already in an active room
    const { data: activeRooms, error: activeRoomErr } = await supabase
      .from("ludo_rooms")
      .select("id")
      .or(`status.eq.countdown,status.eq.active`)
      .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
      .limit(1);

    if (activeRooms && activeRooms.length > 0) {
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
      return NextResponse.json({ success: true, matched: false, queue_id: activeQueue.id });
    }

    // 3. Deduct coins and join queue using RPC function
    const { data: queueId, error: rpcErr } = await supabase.rpc("join_ludo_queue", {
      p_user_id: userId,
      p_stake: stake
    });

    if (rpcErr) {
      return NextResponse.json({ success: false, error: rpcErr.message }, { status: 400 });
    }

    // 4. Try matching with another waiting user immediately
    const { data: opponentQueue } = await supabase
      .from("ludo_queues")
      .select("id, user_id")
      .eq("stake", stake)
      .eq("status", "waiting")
      .neq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (opponentQueue) {
      // Create a Room
      const initialBoard = {
        pieces: {
          player_1: [0, 0, 0, 0],
          player_2: [0, 0, 0, 0]
        },
        last_roll: 0,
        dice_rolled: false,
        movable_pieces: []
      };

      const { data: room, error: roomErr } = await supabase
        .from("ludo_rooms")
        .insert({
          stake,
          player_1_id: opponentQueue.user_id,
          player_2_id: userId,
          status: "countdown",
          board_state: initialBoard,
          turn_player_id: opponentQueue.user_id,
          turn_start_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roomErr) {
        console.error("Failed to create room:", roomErr);
        return NextResponse.json({ success: true, matched: false, queue_id: queueId });
      }

      // Mark both queues as matched
      await supabase
        .from("ludo_queues")
        .update({ status: "matched", room_id: room.id })
        .in("id", [opponentQueue.id, queueId]);

      return NextResponse.json({ success: true, matched: true, room_id: room.id });
    }

    return NextResponse.json({ success: true, matched: false, queue_id: queueId });
  } catch (err: any) {
    console.error("[ludo_join_queue]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
