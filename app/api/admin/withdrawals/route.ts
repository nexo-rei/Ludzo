import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = url.searchParams.get("status") ?? "all";

    const supabase = createAdminClient();
    let query = supabase
      .from("withdrawals")
      .select("id, user_id, amount, fee_amount, net_amount, wallet_address, status, created_at, reviewed_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") query = query.eq("status", status);

    const { data: withdrawals, count, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
    let userMap: Record<string, { first_name: string; username?: string; telegram_id: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users").select("id, first_name, username, telegram_id").in("id", userIds);
      userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    }

    const items = (withdrawals ?? []).map((w) => ({ ...w, user: userMap[w.user_id] ?? null }));
    return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const { withdrawal_id, action, note } = body as {
      withdrawal_id: string; action: "approve" | "reject" | "mark_paid"; note?: string;
    };

    const supabase = createAdminClient();
    const { data: withdrawal } = await supabase
      .from("withdrawals").select("*").eq("id", withdrawal_id).maybeSingle();
    if (!withdrawal) return NextResponse.json({ success: false, error: "Withdrawal not found" }, { status: 404 });

    const now = new Date().toISOString();

    if (action === "approve" && withdrawal.status === "pending") {
      await supabase.from("withdrawals").update({
        status: "approved", reviewed_at: now, reviewed_by: auth.adminId, admin_note: note ?? null,
      }).eq("id", withdrawal_id);
    } else if (action === "reject" && ["pending", "approved"].includes(withdrawal.status)) {
      await supabase.from("withdrawals").update({
        status: "rejected", reviewed_at: now, reviewed_by: auth.adminId, admin_note: note ?? null,
      }).eq("id", withdrawal_id);
      // Refund USDT to user
      await supabase.rpc("credit_usdt", {
        p_user_id: withdrawal.user_id,
        p_amount: withdrawal.amount,
        p_reason: "withdrawal_rejected",
      });
    } else if (action === "mark_paid" && withdrawal.status === "approved") {
      await supabase.from("withdrawals").update({
        status: "paid", paid_at: now,
      }).eq("id", withdrawal_id);
    } else {
      return NextResponse.json({ success: false, error: `Cannot ${action} withdrawal with status ${withdrawal.status}` }, { status: 400 });
    }

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: `withdrawal_${action}`,
      target_type: "withdrawal",
      target_id: withdrawal_id,
      details: { note },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
