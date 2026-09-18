import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { creditCoins } from "@/lib/coins";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const adType: "normal" | "bonus" = body.ad_type === "bonus" ? "bonus" : "normal";
    // Rewarded ads must remain open for the full provider viewing window. The
    // check is server-side so navigating back cannot immediately claim coins.
    const startedAt = Number(body.started_at);
    const elapsed = Date.now() - startedAt;
    if (!Number.isFinite(startedAt) || elapsed < 10_000 || elapsed > 30 * 60_000) {
      return NextResponse.json({ success: false, error: "Please watch the ad for at least 10 seconds." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    const { data: user } = await supabase
      .from("users")
      .select("id, status")
      .eq("id", auth.userId!)
      .maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    console.log("AUTH USER ID:", auth.userId);
    console.log("FOUND USER:", user);
    if (user.status === "suspended") return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });

    const todayStart = startOfDay(new Date()).toISOString();

    if (adType === "normal") {
      const { count } = await supabase
        .from("ad_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("ad_type", "normal")
        .gte("created_at", todayStart);

      if ((count ?? 0) >= settings.daily_ad_limit) {
        return NextResponse.json({ success: false, error: "Daily ad limit reached" }, { status: 400 });
      }
    }

    // Log ad
    const { error: logError } = await supabase.from("ad_logs").insert({
      user_id: user.id,
      ad_type: adType,
      reward_coins: adType === "normal" ? settings.ad_reward_coins : 0,
    });

    if (logError) {
      console.error("[ads/reward] ad_logs insert failed:", logError);
      return NextResponse.json(
        { success: false, error: logError.message },
        { status: 500 }
      );
    }

    if (adType === "normal") {
      const credited = await creditCoins(supabase, {
        userId: user.id,
        amount: settings.ad_reward_coins,
        reason: "ad_reward",
      });
      if (!credited.ok) {
        return NextResponse.json({ success: false, error: credited.error ?? "Failed to credit coins" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: { reward: adType === "normal" ? settings.ad_reward_coins : 0, ad_type: adType },
    });
  } catch (err) {
    console.error("[ads/reward]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
