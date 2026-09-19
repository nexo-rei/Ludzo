import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackApiRequest } from "@/lib/usage-tracker";

/**
 * POST /api/support/reply — user apne hi ticket me reply kare.
 * Ticket apne aap "open" ho jata hai taaki admin ko dobara dikhe.
 */
export async function POST(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const ticketId = String(body.ticket_id ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!ticketId) return NextResponse.json({ success: false, error: "ticket_id required" }, { status: 400 });
    if (message.length < 2) return NextResponse.json({ success: false, error: "Message is too short" }, { status: 400 });
    if (message.length > 4000) return NextResponse.json({ success: false, error: "Message is too long" }, { status: 400 });

    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, first_name, username")
      .eq("id", auth.userId!)
      .maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, user_id, status")
      .eq("id", ticketId)
      .maybeSingle();

    if (!ticket) return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    if (ticket.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Not your ticket" }, { status: 403 });
    }
    if (ticket.status === "closed") {
      return NextResponse.json(
        { success: false, error: "This ticket is closed. Please open a new ticket." },
        { status: 400 }
      );
    }

    const senderName = user.username ? `@${user.username}` : (user.first_name ?? "User");

    const { data: msg, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: "user",
        sender_id: user.id,
        sender_name: senderName,
        body: message,
      })
      .select("id, ticket_id, sender_type, sender_name, body, created_at")
      .single();

    if (error) throw error;

    await supabase
      .from("support_tickets")
      .update({ status: ticket.status === "resolved" ? "open" : ticket.status, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    return NextResponse.json({ success: true, data: msg });
  } catch (err) {
    console.error("[support/reply]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
