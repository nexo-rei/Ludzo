import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram-chat";
import { trackApiRequest } from "@/lib/usage-tracker";

/**
 * /api/support
 *   GET  → logged-in user ke support tickets (+ har ticket ka message thread)
 *   POST → naya ticket create karo
 *
 * Note: pehle ye route maujood hi nahi tha, is liye Support page pe ticket
 * bhejne par frontend ka catch block "Connection error. Please try again."
 * dikhata tha. Ab yahi se tickets create + list hote hain.
 */

const MISSING_TABLE = (code?: string, message?: string) =>
  code === "42P01" ||
  code === "PGRST205" ||
  /does not exist|schema cache|could not find the table/i.test(message ?? "");

const CATEGORIES = ["general", "withdrawal", "deposit", "task", "game", "account", "other"];

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function resolveUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data } = await supabase
    .from("users")
    .select("id, first_name, username, status")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const user = await resolveUser(supabase, auth.userId!);
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("id, subject, message, category, priority, status, admin_reply, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      if (MISSING_TABLE(error.code, error.message)) {
        return NextResponse.json(
          {
            success: true,
            data: [],
            warning: "support_table_missing",
            hint: "Run sql/05_support_and_task_verification.sql in Supabase SQL editor.",
          },
          { status: 200 }
        );
      }
      throw error;
    }

    const ticketIds = (tickets ?? []).map((t) => t.id);
    let messagesByTicket: Record<string, unknown[]> = {};

    if (ticketIds.length > 0) {
      const { data: messages } = await supabase
        .from("support_ticket_messages")
        .select("id, ticket_id, sender_type, sender_name, body, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });

      messagesByTicket = (messages ?? []).reduce<Record<string, unknown[]>>((acc, m) => {
        (acc[m.ticket_id] ??= []).push(m);
        return acc;
      }, {});
    }

    const items = (tickets ?? []).map((t) => ({
      ...t,
      messages: messagesByTicket[t.id] ?? [],
    }));

    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    console.error("[support GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "general";

    if (subject.length < 3) {
      return NextResponse.json({ success: false, error: "Please add a subject (min 3 characters)." }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ success: false, error: "Please describe your issue in a bit more detail." }, { status: 400 });
    }
    if (subject.length > 160 || message.length > 4000) {
      return NextResponse.json({ success: false, error: "Ticket is too long — please shorten it." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const user = await resolveUser(supabase, auth.userId!);
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") {
      return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
    }

    // Simple abuse guard: ek din me max 10 tickets
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayStart.toISOString());

    if ((todayCount ?? 0) >= 10) {
      return NextResponse.json(
        { success: false, error: "Daily ticket limit reached. Please continue on an existing ticket." },
        { status: 429 }
      );
    }

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        message,
        category,
        status: "open",
        priority: "normal",
      })
      .select("id, subject, message, category, priority, status, created_at, updated_at")
      .single();

    if (error) {
      if (MISSING_TABLE(error.code, error.message)) {
        return NextResponse.json(
          {
            success: false,
            error: "Support system is not set up yet. Please try again shortly.",
            code: "support_table_missing",
            hint: "Run sql/05_support_and_task_verification.sql in Supabase SQL editor.",
          },
          { status: 503 }
        );
      }
      throw error;
    }

    // Thread ka pehla message
    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "user",
      sender_id: user.id,
      sender_name: user.username ? `@${user.username}` : (user.first_name ?? "User"),
      body: message,
    });

    // Admin ko Telegram ping (optional: TELEGRAM_SUPPORT_CHAT_ID set ho to)
    const alertChat = process.env.TELEGRAM_SUPPORT_CHAT_ID;
    if (alertChat) {
      const who = user.username ? `@${user.username}` : (user.first_name ?? "User");
      await sendTelegramMessage(
        alertChat,
        `🛟 <b>New support ticket</b>\n\n<b>${escapeHtml(subject)}</b>\n<i>${category}</i> · ${escapeHtml(who)}\n\n${escapeHtml(message.slice(0, 700))}\n\n👉 /admin/support`
      ).catch(() => false);
    }

    return NextResponse.json({ success: true, data: { ...ticket, messages: [] } });
  } catch (err) {
    console.error("[support POST]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
