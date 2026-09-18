import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: referrals, count } = await supabase
      .from("referrals")
      .select("*", { count: "exact" })
      .eq("referrer_id", user.id);

    const referralCoins = (row: { commission_coins?: number | null; commission_amount?: number | null }) =>
      Number(row.commission_coins ?? row.commission_amount ?? 0);
    const totalCommission = (referrals ?? []).reduce((s, r) => s + referralCoins(r), 0);
    const pendingCommission = (referrals ?? [])
      .filter((r) => r.commission_status === "pending")
      .reduce((s, r) => s + referralCoins(r), 0);

    const telegramUsername = process.env.TELEGRAM_BOT_USERNAME ?? "LudzoBot";
    const { data: userData } = await supabase
      .from("users").select("telegram_id").eq("id", user.id).maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        total_referrals: count ?? 0,
        // Referral rewards are playable Coins, never the locked Won-Coin ledger.
        total_commission: totalCommission,
        pending_commission: pendingCommission,
        total_commission_coins: totalCommission,
        pending_commission_coins: pendingCommission,
        referral_link: `https://t.me/${telegramUsername}?startapp=${userData?.telegram_id}`,
      },
    });
  } catch (err) {
    console.error("[referrals]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
