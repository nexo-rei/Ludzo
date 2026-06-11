import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

async function sendMessage(payload: object): Promise<number | null> {
  const res = await fetch(TG("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data?.result?.message_id ?? null;
}

async function editMessage(chatId: number, messageId: number, text: string): Promise<void> {
  await fetch(TG("editMessageText"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
    }),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// /start handler — animated loader then full welcome
// ---------------------------------------------------------------------------

async function handleStart(chatId: number): Promise<void> {
  const steps = [
    "⚡ Initializing Ludzo Core... ▰▱▱▱▱▱▱▱▱▱ 10%",
    "⚡ Loading Rewards Engine... ▰▰▰▰▱▱▱▱▱▱ 40%",
    "⚡ Syncing Wallet... ▰▰▰▰▰▰▰▱▱▱ 70%",
    "⚡ Launch Complete ▰▰▰▰▰▰▰▰▰▰ 100%",
  ];

  // Step 1 — send first loader message
  const messageId = await sendMessage({
    chat_id: chatId,
    text: steps[0],
  });

  if (!messageId) return;

  // Edit through remaining loader steps with 700ms gaps
  for (let i = 1; i < steps.length; i++) {
    await sleep(700);
    await editMessage(chatId, messageId, steps[i]);
  }

  // Step 2 — replace with full welcome message after final loader
  await sleep(700);
  await fetch(TG("editMessageText"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: `🎮 <b>WELCOME TO LUDZO</b>
━━━━━━━━━━━━━━
💰 Daily Rewards
👥 Referral Earnings
🚀 Tasks &amp; Missions
🏆 Leaderboards
💵 USDT Withdrawals
━━━━━━━━━━━━━━
📌 <b>Commands</b>
/help - Help Center
/profile - Your Profile
/paidpromotion - Promotion Services
━━━━━━━━━━━━━━
🛟 Support @LudzosupportBot

🚀 Start earning today!`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 Open Ludzo",
              web_app: { url: "https://t.me/LudzoBot/app" },
            },
          ],
          [
            {
              text: "🛟 Support",
              url: "https://t.me/LudzosupportBot",
            },
            {
              text: "📢 Promotion",
              callback_data: "paidpromotion",
            },
          ],
        ],
      },
    }),
  });
}

// ---------------------------------------------------------------------------
// /profile handler — real Telegram user data
// ---------------------------------------------------------------------------

async function handleProfile(
  chatId: number,
  user: { id: number; first_name?: string; username?: string }
): Promise<void> {
  const name = user.first_name ?? "N/A";
  const username = user.username ? `@${user.username}` : "N/A";

  await sendMessage({
    chat_id: chatId,
    text: `👤 <b>PROFILE</b>
━━━━━━━━━━━━━━
🆔 <b>User ID:</b> <code>${user.id}</code>
👤 <b>Name:</b> ${name}
📛 <b>Username:</b> ${username}
━━━━━━━━━━━━━━
🛟 Support: @LudzosupportBot`,
    parse_mode: "HTML",
  });
}

// ---------------------------------------------------------------------------
// /help handler
// ---------------------------------------------------------------------------

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage({
    chat_id: chatId,
    text: `🛟 <b>Ludzo Help Center</b>

<b>Available Commands:</b>

/start - Welcome message
/help - Help &amp; Support
/profile - View your profile
/paidpromotion - Promotion services

Need help?

Contact:
@LudzosupportBot`,
    parse_mode: "HTML",
  });
}

// ---------------------------------------------------------------------------
// /paidpromotion handler
// ---------------------------------------------------------------------------

async function handlePaidPromotion(chatId: number): Promise<void> {
  await sendMessage({
    chat_id: chatId,
    text: `📢 <b>Ludzo Paid Promotion</b>

We offer promotion opportunities for:

• Telegram Channels
• Telegram Groups
• Bots
• Mini Apps
• Sponsored Campaigns

For pricing and partnership inquiries:

🛟 @LudzosupportBot`,
    parse_mode: "HTML",
  });
}

// ---------------------------------------------------------------------------
// Webhook POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // Handle inline button callback for "paidpromotion"
    if (body?.callback_query) {
      const cb = body.callback_query;
      const chatId: number = cb.message?.chat?.id;
      if (cb.data === "paidpromotion" && chatId) {
        await handlePaidPromotion(chatId);
        // Acknowledge the callback
        await fetch(TG("answerCallbackQuery"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id }),
        });
      }
      return NextResponse.json({ ok: true });
    }

    // Ignore non-message updates
    if (!body?.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId: number = message.chat?.id;
    const tgUser = message.from ?? {};

    // Extract base command, strip @BotUsername suffix and arguments
    const command = message.text.split("@")[0].split(" ")[0].toLowerCase();

    if (!chatId) return NextResponse.json({ ok: true });

    if (!BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is not set");
      return NextResponse.json({ ok: false, error: "Bot token missing" }, { status: 500 });
    }

    switch (command) {
      case "/start":
        await handleStart(chatId);
        break;
      case "/help":
        await handleHelp(chatId);
        break;
      case "/profile":
        await handleProfile(chatId, tgUser);
        break;
      case "/paidpromotion":
        await handlePaidPromotion(chatId);
        break;
      default:
        // Unknown command — ignore silently
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("BOT WEBHOOK ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
