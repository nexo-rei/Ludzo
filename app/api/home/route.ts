import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, getStreakReward } from "@/lib/settings";
import { checkEntryCapacity } from "@/lib/capacity";
import { trackApiRequest, touchUserPresence } from "@/lib/usage-tracker";
import { COINS_PER_USDT } from "@/lib/economy";
import { normalizeLeaderboardRows } from "@/lib/leaderboard";
import { startOfDay, differenceInCalendarDays } from "date-fns";

// Aggregated home page data in one request
//redeploy
export async function GET(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    // rebuild
    //rebuild
    // Check maintenance mode first
    if (settings.maintenance_mode) {
      return NextResponse.json({
        success: false,
        error: "maintenance",
        message: settings.maintenance_message,
      }, { status: 503 });
    }

    // ── Capacity guard (System / Bot Health) ────────────────────────────────
    // Block mode ON + active users limit cross → NAYE users ko server-full
    // screen. Already-active user ya match me phase player andar aata hai.
    // NOTE: ye check touchUserPresence se PEHLE hona chahiye, warna user khud
    // ko "active" mark karke limit bypass kar jayega.
    const entry = await checkEntryCapacity(supabase, settings, auth.userId!);
    if (entry.blocked) {
      return NextResponse.json({
        success: false,
        error: "server_full",
        message: entry.message,
      }, { status: 503 });
    }

    // Presence — users.last_seen (60s self-throttle, capacity/active counts)
    if (auth.userId) touchUserPresence(auth.userId);

    console.log("AUTH USER ID:", auth.userId);

  const { data: user, error: userError } = await supabase
  .from("users")
  .select("id, telegram_id, first_name, photo_url, status")
  .eq("id", auth.userId!)
  .maybeSingle();

console.log("HOME USER DATA:", JSON.stringify(user));
console.log("HOME USER ERROR:", JSON.stringify(userError));
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") {
      return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
    }

    const todayStart = startOfDay(new Date()).toISOString();

    // Fetch in parallel
    const [
      walletRes,
      adCountRes,
      bonusAdCountRes,
      streakRes,
      announcementsRes,
      recentActivityRes,
      leaderboardRes,
    ] = await Promise.all([
      supabase.from("wallets").select("coin_balance, usdt_balance, won_coins_balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("ad_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("ad_type", "normal").gte("created_at", todayStart),
      supabase.from("ad_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("ad_type", "bonus").gte("created_at", todayStart),
      supabase.from("daily_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("announcements").select("id, title, description, priority, created_at").eq("is_active", true).order("priority", { ascending: false }).limit(3),
      supabase.from("transactions").select("id, type, currency, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.rpc("get_leaderboard", { p_limit: 3, p_period: "all" }),
    ]);

    const streak = streakRes.data;
    let streakDay = streak?.current_day ?? 1;

    // Check if streak needs reset
    if (streak?.last_claimed_at) {
      const days = differenceInCalendarDays(new Date(), new Date(streak.last_claimed_at));
      if (days > 1) streakDay = 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, first_name: user.first_name, photo_url: user.photo_url },
        wallet: walletRes.data ?? { coin_balance: 0, usdt_balance: 0, won_coins_balance: 0 },
        ads: {
          watched_today: adCountRes.count ?? 0,
          daily_limit: settings.daily_ad_limit,
          reward_per_ad: settings.ad_reward_coins,
        },
        streak: {
          current_day: streakDay,
          last_claimed_at: streak?.last_claimed_at ?? null,
          today_reward: getStreakReward(settings, streakDay),
        },
        announcements: announcementsRes.data ?? [],
        recent_activity: recentActivityRes.data ?? [],
        // Names only — @usernames are stripped before the row reaches the client.
        leaderboard_top3: normalizeLeaderboardRows(leaderboardRes.data as never[]),
        settings: {
          coin_rate: COINS_PER_USDT,
        },
      },
    });
  } catch (err) {
    console.error("[home]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
