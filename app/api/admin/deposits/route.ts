import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { isSuperAdmin, moderatorForbidden } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { updateById } from "@/lib/db-write";
import { creditUsdt } from "@/lib/coins";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = url.searchParams.get("status") ?? "all";

    const supabase = createAdminClient();
    let query = supabase
      .from("deposits")
      .select("id, user_id, amount, status, created_at, completed_at, binance_order_id, binance_transaction_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") query = query.eq("status", status);

    const { data: deposits, count, error } = await query;
    if (error) throw error;

    const userIds = [...new Set((deposits ?? []).map((d) => d.user_id))];
    let userMap: Record<string, { first_name: string; username?: string; telegram_id: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users").select("id, first_name, username, telegram_id").in("id", userIds);
      userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
    }

    const items = (deposits ?? []).map((d) => ({ ...d, user: userMap[d.user_id] ?? null }));
    return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
  } catch (err) {
    console.error("[admin/deposits GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const body = await req.json();
    const { deposit_id, action } = body as { deposit_id: string; action: "approve" | "reject" };

    if (!deposit_id || !action) {
      return NextResponse.json({ success: false, error: "deposit_id and action required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: deposit, error: readErr } = await supabase
      .from("deposits").select("*").eq("id", deposit_id).maybeSingle();
    if (readErr) return NextResponse.json({ success: false, error: readErr.message }, { status: 500 });
    if (!deposit) return NextResponse.json({ success: false, error: "Deposit not found" }, { status: 404 });

    const now = new Date().toISOString();

    if (action === "approve") {
      if (deposit.status !== "pending") {
        return NextResponse.json({ success: false, error: `Cannot approve deposit with status ${deposit.status}` }, { status: 400 });
      }
      const updated = await updateById(supabase, "deposits", deposit_id, {
        status: "completed",
        completed_at: now,
        reviewed_by: auth.adminId ?? null,
        updated_at: now,
      });
      if (!updated.ok) {
        return NextResponse.json({ success: false, error: `Approve failed: ${updated.error}` }, { status: 500 });
      }
      const credited = await creditUsdt(supabase, {
        userId: deposit.user_id,
        amount: Number(deposit.amount),
        reason: "deposit",
      });
      if (!credited.ok) {
        return NextResponse.json({
          success: true,
          warning: `Marked completed, but USDT credit failed: ${credited.error}`,
        });
      }
    } else if (action === "reject") {
      const updated = await updateById(supabase, "deposits", deposit_id, {
        status: "failed",
        reviewed_by: auth.adminId ?? null,
        updated_at: now,
      });
      if (!updated.ok) {
        return NextResponse.json({ success: false, error: `Reject failed: ${updated.error}` }, { status: 500 });
      }
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: `deposit_${action}`,
      targetType: "deposit",
      targetId: deposit_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/deposits PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
