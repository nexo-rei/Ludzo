import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const adType: "normal" | "bonus" = body.ad_type === "bonus" ? "bonus" : "normal";

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
    //rebuild 
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

    console.log("AD_LOG_DATA:", data);
    console.log("AD_LOG_ERROR:", error);
    console.log("AFTER AD LOG INSERT");
    
    // Credit coins for normal ads only
    if (adType === "normal") {
      await supabase.rpc("credit_coins", {
        p_user_id: user.id,
        p_amount: settings.ad_reward_coins,
        p_reason: "ad_reward",
      });
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
