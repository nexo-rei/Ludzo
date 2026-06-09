import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfDay, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const yesterday = subDays(now, 1).toISOString();
    const weekAgo = subDays(now, 7).toISOString();
    const monthAgo = subDays(now, 30).toISOString();

    const [
      totalUsersRes,
      activeUsersRes,
      newUsersRes,
      pendingWithdrawalsRes,
      pendingDepositsRes,
      totalDepositsRes,
      totalWithdrawalsRes,
      totalCoinsRes,
      weeklyUsersRes,
      monthlyRevenueRes,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("ad_logs").select("user_id").gte("created_at", todayStart),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("withdrawals").select("id, amount", { count: "exact" }).eq("status", "pending"),
      supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("deposits").select("amount").eq("status", "completed"),
      supabase.from("withdrawals").select("net_amount").eq("status", "paid"),
      supabase.from("transactions").select("amount").eq("type", "ad_reward"),
      supabase.from("users").select("id, created_at").gte("created_at", weekAgo).order("created_at"),
      supabase.from("deposits").select("amount, created_at").eq("status", "completed").gte("created_at", monthAgo),
    ]);

    const uniqueActiveUsers = new Set((activeUsersRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size;
    const totalDeposited = (totalDepositsRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const totalWithdrawn = (totalWithdrawalsRes.data ?? []).reduce((s, r) => s + Number(r.net_amount), 0);
    const totalCoins = (totalCoinsRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const pendingWithdrawalAmount = (pendingWithdrawalsRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

    return NextResponse.json({
      success: true,
      data: {
        total_users: totalUsersRes.count ?? 0,
        active_users_today: uniqueActiveUsers,
        new_users_today: newUsersRes.count ?? 0,
        pending_withdrawals: pendingWithdrawalsRes.count ?? 0,
        pending_withdrawal_amount: pendingWithdrawalAmount,
        pending_deposits: pendingDepositsRes.count ?? 0,
        total_deposited: totalDeposited,
        total_withdrawn: totalWithdrawn,
        total_coins_distributed: totalCoins,
        weekly_signups: weeklyUsersRes.data ?? [],
        monthly_revenue: monthlyRevenueRes.data ?? [],
      },
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
