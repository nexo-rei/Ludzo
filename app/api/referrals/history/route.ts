import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // all | pending | earned
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    let query = supabase
      .from("referrals")
      .select("id, commission_amount, commission_status, created_at, referee_id", { count: "exact" })
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("commission_status", status);

    const { data: referrals, count, error } = await query;
    if (error) throw error;

    // Fetch referee user info
    const refereeIds = (referrals ?? []).map((r) => r.referee_id);
    let refereeMap: Record<string, { first_name: string; username?: string }> = {};
    if (refereeIds.length > 0) {
      const { data: referees } = await supabase
        .from("users")
        .select("id, first_name, username")
        .in("id", refereeIds);
      refereeMap = Object.fromEntries((referees ?? []).map((u) => [u.id, u]));
    }

    const items = (referrals ?? []).map((r) => ({
      id: r.id,
      name: refereeMap[r.referee_id]?.first_name ?? "User",
      username: refereeMap[r.referee_id]?.username,
      commission_amount: r.commission_amount,
      commission_status: r.commission_status,
      joined_at: r.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: { items, total: count ?? 0, page, limit },
    });
  } catch (err) {
    console.error("[referrals/history]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
