import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, telegram_id, first_name, last_name, username, language_code, photo_url, status, created_at")
      .eq("id", auth.userId!)
      .maybeSingle();

    if (error || !user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Stats
    //rebuild
    const { count: totalTasks } = await supabase
      .from("user_tasks").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("status", "completed");

    const { count: totalReferrals } = await supabase
      .from("referrals").select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id);

    const { data: streak } = await supabase
      .from("daily_streaks").select("current_day, total_claimed")
      .eq("user_id", user.id).maybeSingle();

    const { data: wallet } = await supabase
      .from("wallets").select("coin_balance, usdt_balance, won_coins_balance")
      .eq("user_id", user.id).maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        user,
        wallet: wallet ?? { coin_balance: 0, usdt_balance: 0, won_coins_balance: 0 },
        stats: {
          total_tasks_completed: totalTasks ?? 0,
          total_referrals: totalReferrals ?? 0,
          current_streak_day: streak?.current_day ?? 1,
          total_streaks_claimed: streak?.total_claimed ?? 0,
        },
      },
    });
  } catch (err) {
    console.error("[profile]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
