import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // coins | usdt | deposits | withdrawals | ads | tasks | referrals
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type === "coins") query = query.eq("currency", "coins");
    else if (type === "usdt") query = query.eq("currency", "usdt");
    else if (type === "deposits") query = query.eq("type", "deposit");
    else if (type === "withdrawals") query = query.eq("type", "withdrawal");
    else if (type === "ads") query = query.eq("type", "ad_reward");
    else if (type === "tasks") query = query.eq("type", "task_reward");
    else if (type === "referrals") query = query.in("type", ["referral_bonus", "referral_commission"]);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { items: data ?? [], total: count ?? 0, page, limit },
    });
  } catch (err) {
    console.error("[wallet/history]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
