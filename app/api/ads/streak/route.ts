import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, getStreakReward } from "@/lib/settings";
import { startOfDay, differenceInCalendarDays } from "date-fns";

const BONUS_ADS_REQUIRED = 3;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const bonusAdsWatched = Number(body.bonus_ads_watched ?? 0);

    // Quick client-side sanity check (DB is the real source of truth below)
    if (bonusAdsWatched < BONUS_ADS_REQUIRED) {
      return NextResponse.json(
        { success: false, error: `Watch ${BONUS_ADS_REQUIRED} bonus ads to claim streak` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    const { data: user } = await supabase
      .from("users")
      .select("id, status")
      .eq("id", auth.userId!)
      .maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });

    // Get or create streak record
    let { data: streak } = await supabase
      .from("daily_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!streak) {
      const { data: newStreak } = await supabase
        .from("daily_streaks")
        .insert({ user_id: user.id, current_day: 1, total_claimed: 0 })
        .select("*")
        .single();
      streak = newStreak!;
    }

    const now = new Date();

    // Already claimed today?
    if (streak.last_claimed_at) {
      const lastClaimed = new Date(streak.last_claimed_at);
      const daysSinceClaim = differenceInCalendarDays(now, lastClaimed);
      if (daysSinceClaim === 0) {
        return NextResponse.json({ success: false, error: "Already claimed today" }, { status: 400 });
      }

      // Missed a day — reset streak
      if (daysSinceClaim > 1) {
        await supabase
          .from("daily_streaks")
          .update({ current_day: 1 })
          .eq("id", streak.id);
        streak.current_day = 1;
      }
    }

    // Verify bonus ads were actually logged in ad_logs today (DB is source of truth)
    const todayStart = startOfDay(now).toISOString();
    const { count: bonusCount, error: countError } = await supabase
      .from("ad_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("ad_type", "bonus")
      .gte("created_at", todayStart);

    if (countError) {
      console.error("[ads/streak] ad_logs count error:", countError);
      return NextResponse.json({ success: false, error: "Server error verifying ads" }, { status: 500 });
    }

    if ((bonusCount ?? 0) < BONUS_ADS_REQUIRED) {
      console.log(
        `[ads/streak] Bonus ads not verified. DB count: ${bonusCount}, required: ${BONUS_ADS_REQUIRED}, user: ${user.id}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Bonus ads not verified",
          debug: { db_count: bonusCount, required: BONUS_ADS_REQUIRED },
        },
        { status: 400 }
      );
    }

    const currentDay = streak.current_day ?? 1;
    const reward = getStreakReward(settings, currentDay);
    const nextDay = currentDay >= 7 ? 1 : currentDay + 1;

    // Credit coins
    await supabase.rpc("credit_coins", {
      p_user_id: user.id,
      p_amount: reward,
      p_reason: "daily_streak",
    });

    // Update streak
    await supabase
      .from("daily_streaks")
      .update({
        current_day: nextDay,
        last_claimed_at: now.toISOString(),
        total_claimed: (streak.total_claimed ?? 0) + 1,
      })
      .eq("id", streak.id);

    return NextResponse.json({
      success: true,
      data: { reward, day_claimed: currentDay, next_day: nextDay },
    });
  } catch (err) {
    console.error("[ads/streak]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
