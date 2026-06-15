import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

// Verify NOWPayments IPN signature
// Docs: sort payload keys alphabetically, JSON.stringify, HMAC-SHA512 with IPN_SECRET
function verifyNowPaymentsSignature(
  rawBody:   string,
  signature: string,
  secret:    string
): boolean {
  try {
    const payload = JSON.parse(rawBody);

    // Sort keys alphabetically and rebuild object
    const sorted = Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});

    const hmac = createHmac("sha512", secret)
      .update(JSON.stringify(sorted))
      .digest("hex");

    return hmac === signature;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Get IPN signature from header
  const signature = req.headers.get("x-nowpayments-sig") ?? "";
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET ?? "";

  // Verify signature when secret is configured
  if (ipnSecret && !verifyNowPaymentsSignature(rawBody, signature, ipnSecret)) {
    console.warn("[deposits/webhook] Invalid IPN signature — rejecting request");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paymentId   = String(event.payment_id ?? "");
  const orderId     = String(event.order_id   ?? "");
  const nowStatus   = String(event.payment_status ?? "");
  const payAmount   = Number(event.actually_paid ?? event.pay_amount ?? 0);

  if (!paymentId || !nowStatus) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find deposit by payment_id or order_id
  let deposit: Record<string, unknown> | null = null;

  const { data: byPaymentId } = await supabase
    .from("deposits")
    .select("id, user_id, coin_amount, usdt_amount, status, credited_at, payment_id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (byPaymentId) {
    deposit = byPaymentId;
  } else if (orderId) {
    const { data: byOrderId } = await supabase
      .from("deposits")
      .select("id, user_id, coin_amount, usdt_amount, status, credited_at, payment_id")
      .eq("id", orderId)
      .maybeSingle();
    if (byOrderId) {
      deposit = byOrderId;
      // Save payment_id if not set
      if (!byOrderId.payment_id) {
        await supabase
          .from("deposits")
          .update({ payment_id: paymentId })
          .eq("id", orderId);
      }
    }
  }

  if (!deposit) {
    console.warn("[deposits/webhook] Deposit not found for payment_id:", paymentId);
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  // Always update nowpayments_status
  await supabase
    .from("deposits")
    .update({ nowpayments_status: nowStatus })
    .eq("id", deposit.id as string);

  // Only process "finished" status — idempotency: check credited_at
  if (nowStatus !== "finished") {
    // For failed/expired, also update main status
    if (nowStatus === "failed" || nowStatus === "expired") {
      await supabase
        .from("deposits")
        .update({ status: "failed" })
        .eq("id", deposit.id as string);
    }
    return NextResponse.json({ success: true, message: "Status updated" });
  }

  // Idempotency guard — if already credited, skip
  if (deposit.credited_at) {
    console.log("[deposits/webhook] Already credited, skipping:", deposit.id);
    return NextResponse.json({ success: true, message: "Already processed" });
  }

  const userId     = deposit.user_id as string;
  const coinAmount = (deposit.coin_amount as number) ?? Math.round((deposit.usdt_amount as number) * 100);
  const depositId  = deposit.id as string;

  // Credit coins atomically via DB function
  const { data: credited, error: creditErr } = await supabase.rpc(
    "credit_coins_for_deposit",
    {
      p_deposit_id:  depositId,
      p_user_id:     userId,
      p_coin_amount: coinAmount,
      p_payment_id:  paymentId,
    }
  );

  if (creditErr) {
    console.error("[deposits/webhook] credit_coins_for_deposit error:", creditErr);
    return NextResponse.json({ error: "Credit failed" }, { status: 500 });
  }

  if (!credited) {
    console.log("[deposits/webhook] Already credited (race condition guard):", depositId);
  } else {
    console.log(`[deposits/webhook] Credited ${coinAmount} coins to user ${userId} for deposit ${depositId}`);
  }

  return NextResponse.json({ success: true, message: "Coins credited" });
}
