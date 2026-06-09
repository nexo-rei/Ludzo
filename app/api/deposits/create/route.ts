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

    const supabase = createAdminClient();
    const settings = await getSettings(supabase);

    if (!amount || amount < settings.min_deposit) {
      return NextResponse.json(
        { success: false, error: `Minimum deposit is $${settings.min_deposit}` },
        { status: 400 }
      );
    }

    const { data: user } = await supabase
      .from("users").select("id, status").eq("telegram_id", auth.userId!).maybeSingle();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    if (user.status === "suspended") return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });

    // Create deposit record
    const { data: deposit, error } = await supabase
      .from("deposits")
      .insert({ user_id: user.id, amount, status: "pending" })
      .select("id")
      .single();

    if (error || !deposit) {
      return NextResponse.json({ success: false, error: "Failed to create deposit" }, { status: 500 });
    }

    // Create Binance Pay order
    const binanceApiKey = process.env.BINANCE_API_KEY;
    const binanceSecretKey = process.env.BINANCE_SECRET_KEY;

    if (!binanceApiKey || !binanceSecretKey) {
      // Dev mode: simulate payment URL
      return NextResponse.json({
        success: true,
        data: {
          deposit_id: deposit.id,
          payment_url: `https://pay.binance.com/checkout/dev-mode-${deposit.id}`,
          amount,
        },
      });
    }

    const timestamp = Date.now();
    const nonce = Math.random().toString(36).slice(2, 18).toUpperCase();
    const payload = {
      env: { terminalType: "WEB" },
      merchantTradeNo: deposit.id,
      orderAmount: amount,
      currency: "USDT",
      description: `LUDZO Deposit #${deposit.id.slice(0, 8)}`,
      returnUrl: `${req.headers.get("origin") ?? ""}/deposit?status=success`,
      cancelUrl: `${req.headers.get("origin") ?? ""}/deposit?status=cancelled`,
    };

    const bodyStr = JSON.stringify(payload);
    const signPayload = `${timestamp}\n${nonce}\n${bodyStr}\n`;
    const { createHmac } = await import("crypto");
    const signature = createHmac("sha512", binanceSecretKey)
      .update(signPayload)
      .digest("hex")
      .toUpperCase();

    const binanceRes = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": String(timestamp),
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": binanceApiKey,
        "BinancePay-Signature": signature,
      },
      body: bodyStr,
    });
    const binanceData = await binanceRes.json();

    if (binanceData.status !== "SUCCESS") {
      await supabase.from("deposits").update({ status: "failed" }).eq("id", deposit.id);
      return NextResponse.json({ success: false, error: "Payment gateway error" }, { status: 500 });
    }

    await supabase
      .from("deposits")
      .update({ binance_order_id: binanceData.data?.prepayId })
      .eq("id", deposit.id);

    return NextResponse.json({
      success: true,
      data: {
        deposit_id: deposit.id,
        payment_url: binanceData.data?.checkoutUrl,
        amount,
      },
    });
  } catch (err) {
    console.error("[deposits/create]", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
