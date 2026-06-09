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
    const search = url.searchParams.get("search") ?? "";
    const status = url.searchParams.get("status") ?? "all";

    const supabase = createAdminClient();
    let query = supabase
      .from("users")
      .select("id, telegram_id, first_name, last_name, username, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,username.ilike.%${search}%,telegram_id.eq.${search}`);
    }
    if (status !== "all") query = query.eq("status", status);

    const { data: users, count, error } = await query;
    if (error) throw error;

    // Fetch wallet data for user list
    const userIds = (users ?? []).map((u) => u.id);
    let walletMap: Record<string, { coin_balance: number; usdt_balance: number }> = {};
    if (userIds.length > 0) {
      const { data: wallets } = await supabase
        .from("wallets").select("user_id, coin_balance, usdt_balance").in("user_id", userIds);
      walletMap = Object.fromEntries((wallets ?? []).map((w) => [w.user_id, w]));
    }

    const items = (users ?? []).map((u) => ({
      ...u,
      wallet: walletMap[u.id] ?? { coin_balance: 0, usdt_balance: 0 },
    }));

    return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const { user_id, action, amount, reason } = body as {
      user_id: string; action: string; amount?: number; reason?: string;
    };
    const supabase = createAdminClient();

    if (action === "suspend") {
      await supabase.from("users").update({ status: "suspended" }).eq("id", user_id);
    } else if (action === "unsuspend") {
      await supabase.from("users").update({ status: "active" }).eq("id", user_id);
    } else if (action === "add_coins" && amount) {
      await supabase.rpc("credit_coins", { p_user_id: user_id, p_amount: amount, p_reason: reason ?? "admin_adjustment" });
    } else if (action === "remove_coins" && amount) {
      await supabase.rpc("debit_coins", { p_user_id: user_id, p_amount: amount, p_reason: reason ?? "admin_adjustment" });
    } else if (action === "add_usdt" && amount) {
      await supabase.rpc("credit_usdt", { p_user_id: user_id, p_amount: amount, p_reason: reason ?? "admin_adjustment" });
    } else if (action === "remove_usdt" && amount) {
      await supabase.rpc("debit_usdt", { p_user_id: user_id, p_amount: amount, p_reason: reason ?? "admin_adjustment" });
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await supabase.from("admin_logs").insert({
      admin_id: auth.adminId,
      action: `user_${action}`,
      target_type: "user",
      target_id: user_id,
      details: { amount, reason },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
