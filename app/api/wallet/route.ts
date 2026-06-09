import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users").select("id").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { data: wallet } = await supabase
      .from("wallets")
      .select("coin_balance, usdt_balance, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: wallet ?? { coin_balance: 0, usdt_balance: 0, updated_at: null },
    });
  } catch (err) {
    console.error("[wallet]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
