import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok)
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 }
    );

  try {
    const { amount, wallet_address } = await req.json();

    if (!amount || !wallet_address) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ✅ FIXED: look up by id (UUID), not telegram_id
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", auth.userId!)   // <-- was: .eq("telegram_id", auth.userId!)
      .maybeSingle();

    if (!user)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );

    const settings = await getSettings(supabase);
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < settings.min_withdrawal) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal is $${settings.min_withdrawal}` },
        { status: 400 }
      );
    }

    let rpcError = (await supabase.rpc("debit_usdt", {
      p_user_id: user.id,
      p_amount: amountNum,
      p_reason: "withdrawal",
    })).error;
    if (rpcError) {
      rpcError = (await supabase.rpc("debit_usdt", {
        p_user_id: user.id,
        p_amount: amountNum,
      })).error;
    }

    if (rpcError) {
      console.error("[withdrawals/create] debit_usdt error:", rpcError);
      return NextResponse.json(
        { success: false, error: rpcError.message ?? "Insufficient balance or debit failed" },
        { status: 400 }
      );
    }

    const fee_amount = Math.round(amountNum * (settings.withdrawal_fee_pct / 100) * 100) / 100;
    const net_amount = Math.round((amountNum - fee_amount) * 100) / 100;

    const { data: withdrawal, error: insertError } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount: amountNum,
        fee_amount,
        net_amount,
        wallet_address,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[withdrawals/create] insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to record withdrawal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: withdrawal });
  } catch (err) {
    console.error("[withdrawals/create]", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
