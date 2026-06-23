import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const userId = auth.userId!;

    // Fetch Stats
    const { data: stats } = await supabase
      .from("ludo_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch Match History (last 30 completed matches)
    const { data: history } = await supabase
      .from("ludo_match_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    return NextResponse.json({
      success: true,
      data: {
        stats: stats || {
          wins: 0,
          losses: 0,
          total_matches: 0,
          win_rate: "0%",
          current_streak: 0,
          best_streak: 0,
          total_won_coins: 0
        },
        history: history || []
      }
    });

  } catch (err: any) {
    console.error("[ludo_get_stats]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
