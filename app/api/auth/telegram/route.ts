import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTelegramInitData } from "@/lib/telegram";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData, referralCode } = body as { initData?: string; referralCode?: string };

    if (!initData) {
      return NextResponse.json({ success: false, error: "initData required" }, { status: 400 });
    }

    // Dev mode bypass
    let tgUser = null;
    if (initData === "dev_mode" && process.env.NODE_ENV === "development") {
      tgUser = {
        id: 123456789,
        first_name: "Dev",
        last_name: "User",
        username: "devuser",
        language_code: "en",
      };
    } else {
      tgUser = await validateTelegramInitData(initData);
    }

    if (!tgUser) {
  console.log("INIT DATA:", initData);
  console.log("BOT TOKEN EXISTS:", !!process.env.TELEGRAM_BOT_TOKEN);

  return NextResponse.json(
    { success: false, error: "Invalid Telegram auth" },
    { status: 401 }
  );
}

    const supabase = createAdminClient();
    const settings = await getSettings(supabase);
    const telegramId = String(tgUser.id);

    // Upsert user
    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          telegram_id: telegramId,
          first_name: tgUser.first_name ?? "",
          last_name: tgUser.last_name ?? null,
          username: tgUser.username ?? null,
          language_code: tgUser.language_code ?? "en",
          photo_url: tgUser.photo_url ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "telegram_id", ignoreDuplicates: false }
      )
      .select("*")
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
    }

    // Check if this is a new user (wallet doesn't exist yet)
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, coin_balance, usdt_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const isNewUser = !wallet;

    if (isNewUser) {
      // Create wallet + welcome bonus
      await supabase.rpc("credit_coins", {
        p_user_id: user.id,
        p_amount: settings.welcome_bonus_coins,
        p_reason: "welcome_bonus",
      });

      // Create default streak
      await supabase.from("daily_streaks").insert({
        user_id: user.id,
        current_day: 1,
        total_claimed: 0,
      });

      // Create default preferences
      await supabase.from("user_preferences").insert({
        user_id: user.id,
        theme: "dark",
        language: tgUser.language_code ?? "en",
      });

      // Handle referral
      if (referralCode && referralCode !== telegramId) {
        const { data: referrer } = await supabase
          .from("users")
          .select("id")
          .eq("telegram_id", referralCode)
          .maybeSingle();

        if (referrer) {
          await supabase.from("referrals").insert({
            referrer_id: referrer.id,
            referee_id: user.id,
            commission_status: "pending",
          });
        }
      }
    }

    // Fetch fresh wallet
    const { data: freshWallet } = await supabase
      .from("wallets")
      .select("coin_balance, usdt_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch preferences
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        user,
        wallet: freshWallet ?? { coin_balance: 0, usdt_balance: 0 },
        prefs,
        is_new_user: isNewUser,
        welcome_bonus: isNewUser ? settings.welcome_bonus_coins : 0,
      },
    });
  } catch (err) {
    console.error("[auth/telegram]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
