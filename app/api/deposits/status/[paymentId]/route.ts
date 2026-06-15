import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const auth = await requireAuth(req);
  if (!auth.ok)
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  const { paymentId } = params;
  if (!paymentId)
    return NextResponse.json({ success: false, error: "paymentId required." }, { status: 400 });

  try {
    const supabase = createAdminClient();

    // Look up deposit to ensure it belongs to this user
    const { data: deposit } = await supabase
      .from("deposits")
      .select("id, user_id, coin_amount, usdt_amount, network, payment_address, nowpayments_status, status, created_at")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (!deposit)
      return NextResponse.json({ success: false, error: "Deposit not found." }, { status: 404 });

    // Ensure this deposit belongs to the authenticated user
    if (deposit.user_id !== auth.userId)
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });

    // If already terminal, return DB status without hitting NOWPayments API
    const terminalStatuses = ["finished", "failed", "expired"];
    if (terminalStatuses.includes(deposit.nowpayments_status ?? "")) {
      return NextResponse.json({
        success: true,
        data: {
          payment_id:      paymentId,
          status:          deposit.nowpayments_status,
          deposit_status:  deposit.status,
          coin_amount:     deposit.coin_amount,
          usdt_amount:     deposit.usdt_amount,
          network:         deposit.network,
          payment_address: deposit.payment_address,
        },
      });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    // Dev mode — return current DB status
    if (!apiKey || paymentId.startsWith("dev_")) {
      return NextResponse.json({
        success: true,
        data: {
          payment_id:      paymentId,
          status:          deposit.nowpayments_status ?? "waiting",
          deposit_status:  deposit.status,
          coin_amount:     deposit.coin_amount,
          usdt_amount:     deposit.usdt_amount,
          network:         deposit.network,
          payment_address: deposit.payment_address,
        },
      });
    }

    // Fetch live status from NOWPayments
    const nowRes = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!nowRes.ok) {
      // Return cached DB status on API error
      return NextResponse.json({
        success: true,
        data: {
          payment_id:      paymentId,
          status:          deposit.nowpayments_status ?? "waiting",
          deposit_status:  deposit.status,
          coin_amount:     deposit.coin_amount,
          usdt_amount:     deposit.usdt_amount,
          network:         deposit.network,
          payment_address: deposit.payment_address,
        },
      });
    }

    const nowData = await nowRes.json();
    const nowStatus = nowData.payment_status ?? deposit.nowpayments_status ?? "waiting";

    // Sync status back to DB
    if (nowStatus !== deposit.nowpayments_status) {
      await supabase
        .from("deposits")
        .update({ nowpayments_status: nowStatus })
        .eq("id", deposit.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        payment_id:      paymentId,
        status:          nowStatus,
        deposit_status:  deposit.status,
        coin_amount:     deposit.coin_amount,
        usdt_amount:     deposit.usdt_amount,
        network:         deposit.network,
        payment_address: nowData.pay_address ?? deposit.payment_address,
      },
    });
  } catch (err) {
    console.error("[deposits/status]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
