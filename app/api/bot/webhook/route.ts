import { NextRequest, NextResponse } from "next/server";

const BOT_COMMANDS: Record<string, string> = {
  "/start": `🎮 Welcome to Ludzo! ...`,
  "/help": `🛟 Ludzo Help Center ...`,
  "/profile": `👤 Profile\n\nProfile system will be available soon.\n\nSupport:\n@LudzosupportBot`,
  "/paidpromotion": `📢 Ludzo Paid Promotion ...`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.message?.text) return NextResponse.json({ ok: true });

    const chatId: number = body.message.chat?.id;
    const command = body.message.text.split("@")[0].split(" ")[0].toLowerCase();
    const replyText = BOT_COMMANDS[command];

    if (!replyText || !chatId) return NextResponse.json({ ok: true });

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: replyText }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("BOT WEBHOOK ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
