import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data, count, error } = await supabase
      .from("withdrawals")
      .select("id, amount, fee_amount, net_amount, wallet_address, status, created_at, reviewed_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({ success: true, data: { items: data ?? [], total: count ?? 0, page, limit } });
  } catch (err) {
    console.error("[withdrawals/history]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
