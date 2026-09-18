import { NextRequest, NextResponse } from "next/server";
import { buildStartMessage, extractStartPayload, type StartPayload } from "@/lib/telegram-bot";

// ---------------------------------------------------------------------------
// Telegram Bot API helpers
// ---------------------------------------------------------------------------

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TG = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

// /start is the ONLY command this bot answers. The former /help, /profile and
// /paidpromotion handlers were removed entirely — no handler, menu, response
// or feature for them exists anywhere in this route. Any other slash command
// (typed manually or arriving as a stale suggestion) must not execute anything;
// the user gets exactly this one short, static rejection reply and nothing else.
const UNKNOWN_COMMAND_REPLY =
  "❓ Unknown command.\n\nThe only available command is /start.";

/**
 * One POST to the Bot API. Never throws and never retries: a retry — or a 5xx
 * webhook response, which makes Telegram redeliver the whole update — would show
 * the user the same message twice. Failures are logged and dropped instead.
 */
async function sendMessage(payload: object): Promise<number | null> {
  try {
    const res = await fetch(TG("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);

    if (!data?.ok) {
      console.error(
        "[bot] sendMessage failed:",
        data?.description ?? `HTTP ${res.status}`
      );
      return null;
    }

    return data?.result?.message_id ?? null;
  } catch (err) {
    console.error("[bot] sendMessage error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// /start — exactly ONE message, exactly ONE button
// ---------------------------------------------------------------------------
//
// The reply body comes from lib/telegram-bot.ts (single source of truth):
//
//   Hey {first_name}! 🎲
//
//   Welcome to LUDZO.
//
//   Play Ludo, collect Coins, and climb the leaderboard.
//   Your arena is ready.
//
//   Tap below to start 👇
//
//   [ 🚀 Start Playing ]
//
// There is intentionally no loader animation, no second welcome message, no
// image/video, no contact/support/FAQ/social block, no referral code, no
// deposit/withdrawal or legal text and no extra inline buttons. Deep-link
// payloads (t.me/<bot>?start=<payload>) are still consumed here and handed to
// the existing referral pipeline internally — they are never shown to the user.

async function handleStart(
  chatId: number,
  from: { first_name?: string },
  payload: StartPayload | null
): Promise<void> {
  try {
    if (payload) {
      // Silent processing: the token only feeds the existing referral / deep-link
      // flow (the Mini App reads the same value through initData.start_param).
      console.log(
        "[bot] /start deep-link payload processed" +
          (payload.referralCode ? " (referral)" : "") +
          ":",
        payload.raw
      );
    }

    await sendMessage({ chat_id: chatId, ...buildStartMessage(from) });
  } catch (err) {
    // Never bubble up: a 5xx makes Telegram redeliver the update and the user
    // would receive a duplicate welcome message.
    console.error("[bot] /start handler error:", err);
  }
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

    if (command === "/start") {
      // Exactly one sendMessage call — the deep-link payload (if any) is
      // processed internally and never rendered in the welcome message.
      await handleStart(chatId, tgUser, extractStartPayload(message.text));
    } else if (command.startsWith("/")) {
      // Unknown / removed command (e.g. /help, /profile, /paidpromotion):
      // nothing is executed — one static rejection reply, no feature access.
      await sendMessage({ chat_id: chatId, text: UNKNOWN_COMMAND_REPLY });
    }
    // Plain (non-command) text is ignored, exactly as before.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("BOT WEBHOOK ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
