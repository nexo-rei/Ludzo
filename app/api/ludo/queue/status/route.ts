import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BOTS = [
  { name: "Suresh Pro", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Suresh" },
  { name: "Rahul Singh", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Rahul" },
  { name: "Priya Sharma", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Priya" },
  { name: "Amit Verma", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Amit" },
  { name: "Sneha Reddy", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sneha" },
  { name: "Kabir", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Kabir" },
  { name: "Neha Patel", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Neha" },
  { name: "Vikram Malhotra", avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Vikram" }
];

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

    // Query queue
    const { data: queue, error } = await supabase
      .from("ludo_queues")
      .select("*")
      .eq("id", queueId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!queue) {
      return NextResponse.json({ success: false, error: "Queue entry not found" }, { status: 404 });
    }

    if (queue.status === "matched") {
      return NextResponse.json({ success: true, matched: true, room_id: queue.room_id });
    }

    if (queue.status === "cancelled") {
      return NextResponse.json({ success: true, cancelled: true });
    }

    // Check waiting time to automatically assign Bot Match (after 10 seconds in queue)
    const joinedAt = new Date(queue.joined_at).getTime();
    const elapsed = (Date.now() - joinedAt) / 1000;

    if (elapsed > 10) {
      // Select random bot profile
      const botProfile = BOTS[Math.floor(Math.random() * BOTS.length)];
      const botId = `bot_${Math.floor(Math.random() * 90000) + 10000}`;

      const initialBoard = {
        pieces: {
          player_1: [0, 0, 0, 0],
          player_2: [0, 0, 0, 0]
        },
        last_roll: 0,
        dice_rolled: false,
        movable_pieces: [],
        bot_profile: botProfile
      };

      // Create a Room with Bot as player_2
      const { data: room, error: roomErr } = await supabase
        .from("ludo_rooms")
        .insert({
          stake: queue.stake,
          player_1_id: userId,
          player_2_id: botId,
          status: "countdown",
          board_state: initialBoard,
          turn_player_id: userId, // Real user rolls first
          turn_start_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roomErr) {
        console.error("Failed to create bot room:", roomErr);
        return NextResponse.json({ success: true, matched: false });
      }

      // Mark queue as matched
      await supabase
        .from("ludo_queues")
        .update({ status: "matched", room_id: room.id })
        .eq("id", queueId);

      return NextResponse.json({ success: true, matched: true, room_id: room.id });
    }

    return NextResponse.json({ success: true, matched: false });
  } catch (err: any) {
    console.error("[ludo_queue_status]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
