import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Network currency mapping for NOWPayments API
const NETWORK_CURRENCY: Record<string, string> = {
  TRC20: "usdttrc20",
  BEP20: "usdtbsc",
  TON:   "usdtton",
};

// Simple in-memory rate limiting (per user, max 3 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok)
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  // Rate limiting
  if (!checkRateLimit(auth.userId!)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const coinAmount = Number(body.coin_amount);
    const network    = String(body.network ?? "").toUpperCase();

    // Validate coin amount
    if (!coinAmount || coinAmount < 100 || coinAmount > 5000) {
      return NextResponse.json(
        { success: false, error: "Coin amount must be between 100 and 5000." },
        { status: 400 }
      );
    }

    // Validate network
    if (!NETWORK_CURRENCY[network]) {
      return NextResponse.json(
        { success: false, error: "Network must be TRC20, BEP20, or TON." },
        { status: 400 }
      );
    }

    const usdtAmount = parseFloat((coinAmount / 100).toFixed(2));
    const payCurrency = NETWORK_CURRENCY[network];

    const supabase = createAdminClient();

    // Look up user
    const { data: user } = await supabase
      .from("users")
      .select("id, status")
      .eq("id", auth.userId!)
      .maybeSingle();

    if (!user)
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    if (user.status === "suspended")
      return NextResponse.json({ success: false, error: "Account suspended." }, { status: 403 });

    // Create deposit record (pending)
    const { data: deposit, error: depositErr } = await supabase
      .from("deposits")
      .insert({
        user_id:           user.id,
        amount:            usdtAmount,
        coin_amount:       coinAmount,
        usdt_amount:       usdtAmount,
        network:           network,
        nowpayments_status: "waiting",
        status:            "pending",
      })
      .select("id")
      .single();

    if (depositErr || !deposit)
      return NextResponse.json({ success: false, error: "Failed to create deposit record." }, { status: 500 });

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      // Dev mode: return mock data
      await supabase
        .from("deposits")
        .update({ payment_id: `dev_${deposit.id}`, payment_address: "TDev1234MockAddress5678" })
        .eq("id", deposit.id);

      return NextResponse.json({
        success: true,
        data: {
          deposit_id:      deposit.id,
          payment_id:      `dev_${deposit.id}`,
          payment_address: "TDev1234MockAddress5678",
          usdt_amount:     usdtAmount,
          coin_amount:     coinAmount,
          network:         network,
          status:          "waiting",
        },
      });
    }

    // Call NOWPayments API to create payment
    const origin = req.headers.get("origin") ?? req.headers.get("host") ?? "";
    const callbackUrl = `${origin}/api/deposits/webhook`;

    const nowPayload = {
      price_amount:       usdtAmount,
      price_currency:     "usd",
      pay_currency:       payCurrency,
      order_id:           deposit.id,
      order_description:  `Ludzo deposit — ${coinAmount} coins`,
      ipn_callback_url:   callbackUrl,
      is_fixed_rate:      false,
      is_fee_paid_by_user: false,
    };

    const nowRes = await fetch("https://api.nowpayments.io/v1/payment", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key":    apiKey,
      },
      body: JSON.stringify(nowPayload),
    });

    if (!nowRes.ok) {
      const errBody = await nowRes.text();
      console.error("[deposits/create] NOWPayments error:", errBody);
      await supabase.from("deposits").update({ status: "failed" }).eq("id", deposit.id);
      return NextResponse.json({ success: false, error: "Payment gateway error. Please try again." }, { status: 502 });
    }

    const nowData = await nowRes.json();

    // Save payment details to deposit record
    await supabase
      .from("deposits")
      .update({
        payment_id:      String(nowData.payment_id),
        order_id:        String(nowData.order_id ?? deposit.id),
        payment_address: nowData.pay_address ?? "",
        nowpayments_status: nowData.payment_status ?? "waiting",
      })
      .eq("id", deposit.id);

    return NextResponse.json({
      success: true,
      data: {
        deposit_id:      deposit.id,
        payment_id:      String(nowData.payment_id),
        payment_address: nowData.pay_address ?? "",
        usdt_amount:     usdtAmount,
        coin_amount:     coinAmount,
        network:         network,
        status:          nowData.payment_status ?? "waiting",
      },
    });
  } catch (err) {
    console.error("[deposits/create]", err);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
