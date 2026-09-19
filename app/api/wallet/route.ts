import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackApiRequest } from "@/lib/usage-tracker";

// BUG FIXED: Was doing .eq("telegram_id", auth.userId!) but auth.userId
// is a UUID (the user's row id), not a telegram_id numeric string.
// Every route that previously used telegram_id for user lookup has been
// corrected to use .eq("id", auth.userId!).
//rebuild

export async function GET(req: NextRequest) {
  // Cloudflare quota counter — in-memory batched, per-request DB write nahi hota
  trackApiRequest("api");
  const auth = await requireAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 }
    );

  try {
    const supabase = createAdminClient();

    // ✅ FIXED: look up by id (UUID), not telegram_id
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", auth.userId!)
      .maybeSingle();

    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );

    const { data: wallet } = await supabase
      .from("wallets")
      .select("coin_balance, usdt_balance, won_coins_balance, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const balances = wallet ?? { coin_balance: 0, usdt_balance: 0, won_coins_balance: 0, updated_at: null };

    return NextResponse.json({
      success: true,
      data: {
        ...balances,
        // Explicit aliases make the two ledgers difficult to confuse in new UI
        // code while preserving the legacy `coin_balance` API contract.
        playable_coins_balance: Number(balances.coin_balance ?? 0),
        protected_usdt_balance: Number(balances.usdt_balance ?? 0),
        withdrawable_won_coins: Number(balances.won_coins_balance ?? 0),
      },
    });
  } catch (err) {
    console.error("[wallet]", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
