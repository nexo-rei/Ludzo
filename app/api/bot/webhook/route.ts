import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMessage(payload: object): Promise<number | null> {
  const res = await fetch(TG("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data?.result?.message_id ?? null;
}

async function editMessageText(
  chatId: number,
  messageId: number,
  text: string
): Promise<void> {
  await fetch(TG("editMessageText"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
  });
}

async function deleteMessage(
  chatId: number,
  messageId: number
): Promise<void> {
  await fetch(TG("deleteMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
}

// ---------------------------------------------------------------------------
// /start — animated loader → delete → send fresh welcome with keyboard
// ---------------------------------------------------------------------------

async function handleStart(chatId: number): Promise<void> {
  const loaderSteps = [
    "⚡ Initializing Ludzo Core...\n█░░░░░░░░░ 10%",
    "⚡ Loading Rewards Engine...\n███░░░░░░░ 40%",
    "⚡ Syncing Wallet...\n███████░░░ 70%",
    "⚡ Launch Complete\n██████████ 100%",
  ];

  // Send the first loader frame
  const loadingMsgId = await sendMessage({
    chat_id: chatId,
    text: loaderSteps[0],
  });

  if (!loadingMsgId) return;

  // Edit through the remaining loader frames
  for (let i = 1; i < loaderSteps.length; i++) {
    await sleep(700);
    await editMessageText(chatId, loadingMsgId, loaderSteps[i]);
  }

  // Wait, then delete the loader message entirely
  await sleep(500);
  await deleteMessage(chatId, loadingMsgId);

  // Send a brand-new message with inline keyboard
  await sendMessage({
    chat_id: chatId,
    text: `🎮 <b>WELCOME TO LUDZO</b>
━━━━━━━━━━━━━━
💰 Daily Rewards
👥 Referral Earnings
🚀 Tasks &amp; Missions
🏆 Leaderboards
💵 USDT Withdrawals
━━━━━━━━━━━━━━
📌 <b>Quick Commands</b>
/help - Help Center
/profile - Your Profile
/paidpromotion - Promotion Services
━━━━━━━━━━━━━━
🛟 Support
@LudzosupportBot

🚀 Start earning today!`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🎮 Open Ludzo",
            url: "https://t.me/LudzoBot/app",
          },
        ],
        [
          {
            text: "🛟 Support",
            url: "https://t.me/LudzosupportBot",
          },
          {
            text: "📢 Promotion",
            url: "https://t.me/LudzosupportBot",
          },
        ],
      ],
    },
  });
}

// ---------------------------------------------------------------------------
// /profile — real Telegram user data
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
// /help
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
// /paidpromotion
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

    // Acknowledge callback queries silently (buttons are all URLs, no callback_data)
    if (body?.callback_query) {
      await fetch(TG("answerCallbackQuery"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: body.callback_query.id }),
      });
      return NextResponse.json({ ok: true });
    }

    // Ignore non-text updates
    if (!body?.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId: number = message.chat?.id;
    const tgUser = message.from ?? {};

    if (!chatId) return NextResponse.json({ ok: true });

    if (!BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN is not set");
      return NextResponse.json(
        { ok: false, error: "Bot token missing" },
        { status: 500 }
      );
    }

    // Extract base command, strip @BotUsername suffix and any arguments
    const command = message.text.split("@")[0].split(" ")[0].toLowerCase();

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
