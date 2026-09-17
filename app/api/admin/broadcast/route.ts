import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";

export const dynamic = "force-dynamic";

/** Telegram allows ~30 messages/sec. Stay well under it. */
const BATCH_SIZE   = 25;
const BATCH_PAUSE  = 1100;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "TELEGRAM_BOT_TOKEN is not configured" },
      { status: 500 }
    );
  }

  try {
    const { title, description, url } = await req.json();
    if (!title) {
      return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: users, error } = await supabase
      .from("users")
      .select("telegram_id")
      .not("telegram_id", "is", null);
    if (error) throw error;

    const ids = (users ?? [])
      .map(u => String((u as { telegram_id: string | number }).telegram_id))
      .filter(Boolean);

    const text =
      `📢 <b>${escapeHtml(title)}</b>` +
      (description ? `\n\n${escapeHtml(description)}` : "");

    const reply_markup = url
      ? { inline_keyboard: [[{ text: "Open LUDZO", url }]] }
      : undefined;

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(chat_id =>
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id,
              text,
              parse_mode: "HTML",
              disable_web_page_preview: true,
              ...(reply_markup ? { reply_markup } : {}),
            }),
          }).then(r => r.json())
        )
      );

      for (const r of results) {
        // A user who blocked the bot returns ok:false — expected, not an error.
        if (r.status === "fulfilled" && (r.value as { ok?: boolean })?.ok) sent++;
        else failed++;
      }

      if (i + BATCH_SIZE < ids.length) await sleep(BATCH_PAUSE);
    }

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "announcement_broadcast",
      targetType: "broadcast",
      details: { total: ids.length, sent, failed },
    });

    console.log(`[BROADCAST] total=${ids.length} sent=${sent} failed=${failed}`);
    return NextResponse.json({ success: true, data: { total: ids.length, sent, failed } });
  } catch (err) {
    console.error("[BROADCAST] error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
