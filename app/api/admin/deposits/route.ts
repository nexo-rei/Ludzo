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
    const search = url.searchParams.get("search") ?? "";

    const supabase = createAdminClient();
    let query = supabase
      .from("deposits")
      .select("id, user_id, amount, status, created_at, completed_at, binance_order_id, binance_transaction_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") query = query.eq("status", status);

    const { data: deposits, count, error } = await query;
    if (error) throw error;

    // Attach user info
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
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const { deposit_id, action } = body as { deposit_id: string; action: "approve" | "reject" };

    const supabase = createAdminClient();
    const { data: deposit } = await supabase
      .from("deposits").select("*").eq("id", deposit_id).maybeSingle();
    if (!deposit) return NextResponse.json({ success: false, error: "Deposit not found" }, { status: 404 });

    if (action === "approve" && deposit.status === "pending") {
      await supabase.from("deposits").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        reviewed_by: auth.adminId,
      }).eq("id", deposit_id);
      await supabase.rpc("credit_usdt", {
        p_user_id: deposit.user_id, p_amount: deposit.amount, p_reason: "deposit",
      });
    } else if (action === "reject") {
      await supabase.from("deposits").update({
        status: "failed", reviewed_by: auth.adminId,
      }).eq("id", deposit_id);
    }

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: `deposit_${action}`,
      target_type: "deposit",
      target_id: deposit_id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
