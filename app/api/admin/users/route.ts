import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { requireAdminAuth } from "@/lib/auth";
import { isModerator, isSuperAdmin, moderatorForbidden } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { creditCoins, creditUsdt } from "@/lib/coins";

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
    const todayOnly = url.searchParams.get("today") === "1";

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
    if (todayOnly) query = query.gte("created_at", startOfDay(new Date()).toISOString());

    const { data: users, count, error } = await query;
    if (error) throw error;

    // Moderators ko wallet balances nahi dikhate (limited access).
    if (isModerator(auth.role)) {
      const items = (users ?? []).map((u) => ({ ...u, wallet: null }));
      return NextResponse.json({ success: true, data: { items, total: count ?? 0, page, limit } });
    }

    // Fetch wallet data for user list
    const userIds = (users ?? []).map((u) => u.id);
    let walletMap: Record<string, { coin_balance: number; usdt_balance: number; won_coins_balance: number }> = {};
    if (userIds.length > 0) {
      const { data: wallets } = await supabase
        .from("wallets").select("user_id, coin_balance, usdt_balance, won_coins_balance").in("user_id", userIds);
      walletMap = Object.fromEntries((wallets ?? []).map((w) => [w.user_id, w]));
    }

    const items = (users ?? []).map((u) => ({
      ...u,
      wallet: walletMap[u.id] ?? { coin_balance: 0, usdt_balance: 0, won_coins_balance: 0 },
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
  // Suspend/unsuspend + wallet adjustments — sirf full admin. Moderator NAHI.
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const body = await req.json();
    const { user_id, action, amount, reason } = body as {
      user_id: string; action: string; amount?: number; reason?: string;
    };
    const supabase = createAdminClient();

    if (action === "suspend") {
      const { error } = await supabase.from("users").update({ status: "suspended" }).eq("id", user_id);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else if (action === "unsuspend") {
      const { error } = await supabase.from("users").update({ status: "active" }).eq("id", user_id);
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else if (action === "add_coins" && amount) {
      const credited = await creditCoins(supabase, { userId: user_id, amount, reason: reason ?? "admin_adjustment" });
      if (!credited.ok) return NextResponse.json({ success: false, error: credited.error }, { status: 500 });
    } else if (action === "remove_coins" && amount) {
      const { error } = await supabase.rpc("debit_coins", { p_user_id: user_id, p_amount: amount, p_reason: reason ?? "admin_adjustment" });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else if (action === "add_usdt" && amount) {
      const credited = await creditUsdt(supabase, { userId: user_id, amount, reason: reason ?? "admin_adjustment" });
      if (!credited.ok) return NextResponse.json({ success: false, error: credited.error }, { status: 500 });
    } else if (action === "remove_usdt" && amount) {
      const { error } = await supabase.rpc("debit_usdt", { p_user_id: user_id, p_amount: amount, p_reason: reason ?? "admin_adjustment" });
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: `user_${action}`,
      targetType: "user",
      targetId: user_id,
      details: { amount, reason },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
