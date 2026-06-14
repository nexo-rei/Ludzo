import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Debit USDT balance via RPC
    const { error: rpcError } = await supabase.rpc("debit_usdt", {
      p_user_id: user.id,
      p_amount: amount,
    });

    if (rpcError) {
      console.error("[withdrawals/create] debit_usdt error:", rpcError);
      return NextResponse.json(
        { success: false, error: rpcError.message ?? "Insufficient balance or debit failed" },
        { status: 400 }
      );
    }

    // Insert withdrawal record
    const fee_amount = 0; // adjust if you have a fee formula
    const net_amount = Number(amount) - fee_amount;

    const { data: withdrawal, error: insertError } = await supabase
      .from("withdrawals")
      .insert({
        user_id: user.id,
        amount,
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
