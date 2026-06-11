import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    const { data: user } = await supabase
      .from("users").select("id").eq("id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const todayStart = startOfDay(new Date()).toISOString();

    const { count: normalCount } = await supabase
      .from("ad_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("ad_type", "normal")
      .gte("created_at", todayStart);

    const { count: bonusCount } = await supabase
      .from("ad_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("ad_type", "bonus")
      .gte("created_at", todayStart);

    return NextResponse.json({
      success: true,
      data: {
        ads_watched_today: normalCount ?? 0,
        bonus_ads_today: bonusCount ?? 0,
        daily_limit: settings.daily_ad_limit,
        ad_reward: settings.ad_reward_coins,
        limit_reached: (normalCount ?? 0) >= settings.daily_ad_limit,
      },
    });
  } catch (err) {
    console.error("[ads/status]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
