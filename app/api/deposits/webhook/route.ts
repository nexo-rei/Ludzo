import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBinanceWebhook } from "@/lib/telegram";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("binancepay-signature") ?? "";
    const timestamp = req.headers.get("binancepay-timestamp") ?? "";
    const nonce = req.headers.get("binancepay-nonce") ?? "";
    const secret = process.env.BINANCE_WEBHOOK_SECRET ?? "";

    if (secret && !verifyBinanceWebhook(rawBody, signature, timestamp, nonce, secret)) {
      return NextResponse.json({ returnCode: "FAIL", returnMessage: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.bizType !== "PAY" || event.bizStatus !== "PAY_SUCCESS") {
      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
    }

    const merchantTradeNo = event.data?.merchantTradeNo as string;
    if (!merchantTradeNo) {
      return NextResponse.json({ returnCode: "FAIL", returnMessage: "No trade number" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    const { data: deposit } = await supabase
      .from("deposits")
      .select("*, users!inner(id, telegram_id)")
      .eq("id", merchantTradeNo)
      .maybeSingle();

    if (!deposit) {
      return NextResponse.json({ returnCode: "FAIL", returnMessage: "Deposit not found" }, { status: 404 });
    }
    if (deposit.status === "completed") {
      return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "Already processed" });
    }

    // Mark deposit completed
    await supabase.from("deposits").update({
      status: "completed",
      binance_transaction_id: event.data?.transactionId,
      completed_at: new Date().toISOString(),
    }).eq("id", deposit.id);

    const userId = deposit.user_id;

    // Credit USDT
    await supabase.rpc("credit_usdt", {
      p_user_id: userId,
      p_amount: deposit.amount,
      p_reason: "deposit",
    });

    // Handle referral commission (first deposit only)
    const { data: referral } = await supabase
      .from("referrals")
      .select("*")
      .eq("referee_id", userId)
      .eq("commission_status", "pending")
      .maybeSingle();

    if (referral) {
      const commissionAmount = Number(deposit.amount) * (settings.referral_commission_pct / 100);
      await supabase.rpc("credit_usdt", {
        p_user_id: referral.referrer_id,
        p_amount: commissionAmount,
        p_reason: "referral_commission",
      });
      await supabase.from("referrals").update({
        commission_amount: commissionAmount,
        commission_status: "earned",
        commission_paid_at: new Date().toISOString(),
      }).eq("id", referral.id);
    }

    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: "OK" });
  } catch (err) {
    console.error("[deposits/webhook]", err);
    return NextResponse.json({ returnCode: "FAIL", returnMessage: "Server error" }, { status: 500 });
  }
}
