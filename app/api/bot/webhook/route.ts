import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    // Silently ignore non-message updates (callbacks, inline queries, etc.)
    if (!body?.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId: number = body.message.chat?.id;

    // Extract base command, strip @BotUsername suffix and any arguments
    const command = body.message.text.split("@")[0].split(" ")[0].toLowerCase();

    const replyText = BOT_COMMANDS[command];

    // Unknown command or missing chat id — ignore silently
    if (!replyText || !chatId) {
      return NextResponse.json({ ok: true });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not set");
      return NextResponse.json({ ok: false, error: "Bot token missing" }, { status: 500 });
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
        }),
      }
    );

    if (!telegramRes.ok) {
      const errorBody = await telegramRes.text();
      console.error("Telegram sendMessage failed:", errorBody);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("BOT WEBHOOK ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
