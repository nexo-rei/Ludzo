import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? "all"; // all | month | week
    const limit = Math.min(100, Number(url.searchParams.get("limit") ?? "50"));

    const supabase = createAdminClient();
    const { data } = await supabase.rpc("get_leaderboard", { p_limit: limit, p_period: period });

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("[leaderboard]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
