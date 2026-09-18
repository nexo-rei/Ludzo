import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { updateById } from "@/lib/db-write";
import { creditUsdt } from "@/lib/coins";

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

    const items = (withdrawals ?? []).map((w) => ({
      ...w,
      user: userMap[w.user_id] ?? { first_name: "Unknown", telegram_id: "" },
    }));
    return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
  } catch (err) {
    console.error("[admin/withdrawals GET]", err);
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

    if (!withdrawal_id || !action) {
      return NextResponse.json({ success: false, error: "withdrawal_id and action required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: withdrawal, error: readErr } = await supabase
      .from("withdrawals").select("*").eq("id", withdrawal_id).maybeSingle();
    if (readErr) {
      return NextResponse.json({ success: false, error: readErr.message }, { status: 500 });
    }
    if (!withdrawal) return NextResponse.json({ success: false, error: "Withdrawal not found" }, { status: 404 });

    const now = new Date().toISOString();
    const current = String(withdrawal.status ?? "pending").toLowerCase();

    if (action === "approve") {
      if (current !== "pending") {
        return NextResponse.json({ success: false, error: `Cannot approve withdrawal with status ${withdrawal.status}` }, { status: 400 });
      }
      const updated = await updateById(supabase, "withdrawals", withdrawal_id, {
        status: "approved",
        reviewed_at: now,
        reviewed_by: auth.adminId ?? null,
        admin_note: note ?? null,
        updated_at: now,
      });
      if (!updated.ok) {
        return NextResponse.json({
          success: false,
          error: `Approve failed: ${updated.error}. Agar status check constraint hai to sql/06_admin_tasks_withdrawals.sql chalao.`,
        }, { status: 500 });
      }
    } else if (action === "reject") {
      if (!["pending", "approved"].includes(current)) {
        return NextResponse.json({ success: false, error: `Cannot reject withdrawal with status ${withdrawal.status}` }, { status: 400 });
      }
      const updated = await updateById(supabase, "withdrawals", withdrawal_id, {
        status: "rejected",
        reviewed_at: now,
        reviewed_by: auth.adminId ?? null,
        admin_note: note ?? null,
        updated_at: now,
      });
      if (!updated.ok) {
        return NextResponse.json({
          success: false,
          error: `Reject failed: ${updated.error}. Agar status check constraint hai to sql/06_admin_tasks_withdrawals.sql chalao.`,
        }, { status: 500 });
      }
      const refund = await creditUsdt(supabase, {
        userId: withdrawal.user_id,
        amount: Number(withdrawal.amount),
        reason: "withdrawal_rejected",
      });
      if (!refund.ok) {
        console.error("[admin/withdrawals] refund failed after reject:", refund.error);
        return NextResponse.json({
          success: true,
          warning: `Rejected, but USDT refund failed: ${refund.error}`,
        });
      }
    } else if (action === "mark_paid") {
      if (current !== "approved") {
        return NextResponse.json({ success: false, error: `Cannot mark paid with status ${withdrawal.status}` }, { status: 400 });
      }
      const updated = await updateById(supabase, "withdrawals", withdrawal_id, {
        status: "paid",
        paid_at: now,
        updated_at: now,
      });
      if (!updated.ok) {
        return NextResponse.json({ success: false, error: `Mark paid failed: ${updated.error}` }, { status: 500 });
      }
    } else {
      return NextResponse.json({ success: false, error: `Unknown action ${action}` }, { status: 400 });
    }

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: `withdrawal_${action}`,
      targetType: "withdrawal",
      targetId: withdrawal_id,
      details: { note },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/withdrawals PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
