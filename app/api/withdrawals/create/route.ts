import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const walletAddress = (body.wallet_address as string ?? "").trim();

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    if (!amount || amount < settings.min_withdrawal) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal is $${settings.min_withdrawal}` },
        { status: 400 }
      );
    }

    const { data: user } = await supabase
      .from("users").select("id, status").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });

    const feeAmount = amount * (settings.withdrawal_fee_pct / 100);
    const netAmount = amount - feeAmount;

    // Check balance
    const { data: wallet } = await supabase
      .from("wallets").select("usdt_balance").eq("user_id", user.id).maybeSingle();
    const balance = Number(wallet?.usdt_balance ?? 0);

    if (balance < amount) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 });
    }

    // Debit USDT
    const debitResult = await supabase.rpc("debit_usdt", {
      p_user_id: user.id,
      p_amount: amount,
      p_reason: "withdrawal",
    });
    if (debitResult.error) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 });
    }

    // Create withdrawal record
    const { data: withdrawal, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        wallet_address: walletAddress,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !withdrawal) {
      // Rollback: refund USDT
      await supabase.rpc("credit_usdt", {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: "withdrawal_failed",
      });
      return NextResponse.json({ success: false, error: "Failed to create withdrawal" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { withdrawal_id: withdrawal.id, amount, fee: feeAmount, net_amount: netAmount },
    });
  } catch (err) {
    console.error("[withdrawals/create]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
