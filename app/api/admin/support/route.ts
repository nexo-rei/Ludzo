import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";

/**
 * /api/admin/support — admin panel ka Support inbox.
 *
 *   GET    ?status=open|in_progress|resolved|closed|all   → ticket list
 *          ?ticket_id=<uuid>                              → ek ticket + poori thread
 *   POST   { ticket_id, message }                         → admin reply
 *   PATCH  { ticket_id, status?, priority? }              → status / priority badlo
 */

const MISSING_TABLE = (code?: string, message?: string) =>
  code === "42P01" ||
  code === "PGRST205" ||
  /does not exist|schema cache|could not find the table/i.test(message ?? "");

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const supabase = createAdminClient();

    const ticketId = url.searchParams.get("ticket_id");

    // ── Single ticket + thread ──────────────────────────────────────────────
    if (ticketId) {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      if (!ticket) return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });

      const [{ data: messages }, { data: user }] = await Promise.all([
        supabase
          .from("support_ticket_messages")
          .select("id, sender_type, sender_name, body, created_at")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true }),
        supabase
          .from("users")
          .select("id, telegram_id, first_name, last_name, username, status")
          .eq("id", ticket.user_id)
          .maybeSingle(),
      ]);

      return NextResponse.json({ success: true, data: { ...ticket, messages: messages ?? [], user } });
    }

    // ── List ────────────────────────────────────────────────────────────────
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(5, Number(url.searchParams.get("limit") ?? "25")));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get("status") ?? "all";
    const search = (url.searchParams.get("search") ?? "").trim();

    let query = supabase
      .from("support_tickets")
      .select(
        "id, user_id, subject, message, category, priority, status, admin_reply, replied_at, created_at, updated_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") query = query.eq("status", status);
    if (search) query = query.or(`subject.ilike.%${search}%,message.ilike.%${search}%`);

    const { data: tickets, count, error } = await query;

    if (error) {
      if (MISSING_TABLE(error.code, error.message)) {
        return NextResponse.json({
          success: true,
          data: { items: [], total: 0, page, limit, warning: "support_table_missing" },
        });
      }
      throw error;
    }

    // Users + open counts
    const userIds = [...new Set((tickets ?? []).map((t) => t.user_id).filter(Boolean))];
    let userMap: Record<string, { first_name?: string; username?: string; telegram_id?: string; status?: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, first_name, last_name, username, telegram_id, status")
        .in("id", userIds);
      userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    }

    const ticketIds = (tickets ?? []).map((t) => t.id);
    let messageCounts: Record<string, number> = {};
    let lastMessage: Record<string, { created_at: string; sender_type: string }> = {};
    if (ticketIds.length > 0) {
      const { data: msgs } = await supabase
        .from("support_ticket_messages")
        .select("ticket_id, sender_type, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });
      for (const m of msgs ?? []) {
        messageCounts[m.ticket_id] = (messageCounts[m.ticket_id] ?? 0) + 1;
        lastMessage[m.ticket_id] = { created_at: m.created_at, sender_type: m.sender_type };
      }
    }

    const [{ count: openCount }, { count: pendingCount }] = await Promise.all([
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    ]);

    const items = (tickets ?? []).map((t) => ({
      ...t,
      user: userMap[t.user_id] ?? null,
      message_count: messageCounts[t.id] ?? 0,
      last_message_at: lastMessage[t.id]?.created_at ?? t.created_at,
      last_sender: lastMessage[t.id]?.sender_type ?? "user",
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: count ?? 0,
        page,
        limit,
        stats: { open: openCount ?? 0, in_progress: pendingCount ?? 0 },
      },
    });
  } catch (err) {
    console.error("[admin/support GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const ticketId = String(body.ticket_id ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!ticketId) return NextResponse.json({ success: false, error: "ticket_id required" }, { status: 400 });
    if (message.length < 2) return NextResponse.json({ success: false, error: "Reply is too short" }, { status: 400 });
    if (message.length > 4000) return NextResponse.json({ success: false, error: "Reply is too long" }, { status: 400 });

    const supabase = createAdminClient();

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, user_id, status, subject")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("username")
      .eq("id", auth.adminId!)
      .maybeSingle();
    const adminName = adminRow?.username ?? "Support team";

    const { data: msg, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: "admin",
        sender_id: auth.adminId!,
        sender_name: adminName,
        body: message,
      })
      .select("id, ticket_id, sender_type, sender_name, body, created_at")
      .single();
    if (error) throw error;

    const nextStatus = body.status ?? "in_progress";

    await supabase
      .from("support_tickets")
      .update({
        admin_reply: message,
        replied_by: auth.adminId!,
        replied_at: new Date().toISOString(),
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      adminUsername: adminName,
      action: "support_reply",
      targetType: "support_ticket",
      targetId: ticketId,
      details: { subject: ticket.subject, status: nextStatus },
    });

    return NextResponse.json({ success: true, data: msg });
  } catch (err) {
    console.error("[admin/support POST]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const ticketId = String(body.ticket_id ?? "").trim();
    if (!ticketId) return NextResponse.json({ success: false, error: "ticket_id required" }, { status: 400 });

    const supabase = createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowedStatus = ["open", "in_progress", "resolved", "closed"];
    const allowedPriority = ["low", "normal", "high", "urgent"];
    if (body.status) {
      if (!allowedStatus.includes(body.status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      patch.status = body.status;
      if (body.status === "resolved" || body.status === "closed") {
        patch.replied_by = auth.adminId;
        patch.replied_at = new Date().toISOString();
      }
    }
    if (body.priority) {
      if (!allowedPriority.includes(body.priority)) {
        return NextResponse.json({ success: false, error: "Invalid priority" }, { status: 400 });
      }
      patch.priority = body.priority;
    }

    const { error } = await supabase.from("support_tickets").update(patch).eq("id", ticketId);
    if (error) throw error;

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "support_update",
      targetType: "support_ticket",
      targetId: ticketId,
      details: { status: body.status, priority: body.priority },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/support PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
