import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTelegramInitData } from "@/lib/telegram";
import { getSettings } from "@/lib/settings";

// ---------------------------------------------------------------------------
// Bot command webhook handler (GET)
// ---------------------------------------------------------------------------

const BOT_COMMANDS: Record<string, string> = {
  "/start": `🎮 Welcome to Ludzo!

Earn rewards, complete tasks, invite friends and grow your wallet.

✨ Features:
• Daily Rewards
• Referral Earnings
• Coin Rewards
• USDT Withdrawals
• Special Events & Promotions

📌 Commands:
/help - Help & Support
/profile - Your Account Info
/paidpromotion - Promotion Services

🛟 Support:
@LudzosupportBot

🚀 Open Ludzo Mini App and start earning today!`,

  "/help": `🛟 Ludzo Help Center

Available Commands:

/start - Welcome message
/help - Help & Support
/profile - View your profile
/paidpromotion - Promotion services

Need help?

Contact:
@LudzosupportBot`,

  "/profile": `👤 Profile

Profile system will be available soon.

Support:
@LudzosupportBot`,

  "/paidpromotion": `📢 Ludzo Paid Promotion

We offer promotion opportunities for:

• Telegram Channels
• Telegram Groups
• Bots
• Mini Apps
• Sponsored Campaigns

For pricing and partnership inquiries:

🛟 @LudzosupportBot`,
};

export async function GET(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || body.message?.text === undefined) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId: number = message.chat?.id;
    const rawText: string = message.text ?? "";

    // Extract the base command (strip any @BotUsername suffix)
    const command = rawText.split("@")[0].split(" ")[0].toLowerCase();

    const replyText = BOT_COMMANDS[command];
    if (!replyText || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      return NextResponse.json({ ok: false, error: "Bot token missing" }, { status: 500 });
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        parse_mode: "HTML",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("BOT COMMAND ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Existing auth handler (POST) — NOT modified
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("FULL BODY:", JSON.stringify(body));
    const { initData, referralCode } = body as { initData?: string; referralCode?: string };
    console.log("BODY REFERRAL CODE:", referralCode);

    if (!initData) {
      return NextResponse.json({ success: false, error: "initData required" }, { status: 400 });
    }

    // Dev mode bypass
    //redeploy
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
    console.log("SUPABASE URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("SERVICE KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("BOT TOKEN:", !!process.env.TELEGRAM_BOT_TOKEN);

    const supabase = createAdminClient();

    console.log("SUPABASE URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("SERVICE KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("BOT TOKEN:", !!process.env.TELEGRAM_BOT_TOKEN);

    console.log("STEP 1 - CLIENT CREATED");

    const settings = await getSettings(supabase);
    console.log("STEP 2 - SETTINGS LOADED");
  
    const telegramId = String(tgUser.id);
    console.log("STEP 3 - TELEGRAM ID:", telegramId);

    // Upsert user
    //redeploy
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

      console.log("USER DATA:", user);
      console.log("USER ERROR:", JSON.stringify(userError));

    if (userError) {
    throw new Error(JSON.stringify(userError));
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

    console.log("REFERRAL CODE:", referralCode);
    console.log("IS NEW USER:", isNewUser);
    console.log("TELEGRAM ID:", telegramId);
      
      // Handle referral
if (referralCode && referralCode !== telegramId) {
  console.log("REFERRAL CODE:", referralCode);

  const { data: referrer } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", referralCode)
    .maybeSingle();

  console.log("REFERRER:", referrer);

  if (referrer) {
    const { error: referralError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referee_id: user.id,
        commission_status: "pending",
      });

    console.log("REFERRAL ERROR:", referralError);
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
  console.error("AUTH ERROR FULL:", err);

  return NextResponse.json(
    {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : JSON.stringify(err),
      stack:
        err instanceof Error
          ? err.stack
          : null,
    },
    { status: 500 }
  );
}
}
