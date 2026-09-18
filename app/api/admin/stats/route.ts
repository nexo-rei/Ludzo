import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { isModerator } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfDay, subDays } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    // ── Moderator dashboard: sirf counts, koi money/revenue data NAHI ──────
    if (isModerator(auth.role)) {
      const supabase = createAdminClient();
      const todayStart = startOfDay(new Date()).toISOString();
      const [totalUsers, newToday, suspended, openTickets, inProgressTickets, pendingWithdrawals, activeTodayRes] =
        await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "suspended"),
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
          supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("ad_logs").select("user_id").gte("created_at", todayStart),
        ]);

      const activeToday = new Set((activeTodayRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size;

      return NextResponse.json({
        success: true,
        data: {
          moderator_view: true,
          total_users: totalUsers.count ?? 0,
          new_users_today: newToday.count ?? 0,
          active_users_today: activeToday,
          suspended_users: suspended.count ?? 0,
          open_support_tickets: openTickets.count ?? 0,
          in_progress_tickets: inProgressTickets.count ?? 0,
          pending_withdrawals: pendingWithdrawals.count ?? 0,
        },
      });
    }

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
      supportTicketsRes,
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
      // support_tickets table na ho to error aata hai — niche count 0 rakhte hain
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
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
        open_support_tickets: supportTicketsRes.count ?? 0,
        weekly_signups: weeklyUsersRes.data ?? [],
        monthly_revenue: monthlyRevenueRes.data ?? [],
      },
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
