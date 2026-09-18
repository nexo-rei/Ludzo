import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import {
  COINS_PER_USDT,
  MIN_WON_WITHDRAWAL_COINS,
  WON_WITHDRAWAL_STEP,
  coinsToUsd,
  isValidWonWithdrawalAmount,
  isValidUsdtWalletAddress,
  isWithdrawalNetwork,
  WITHDRAWAL_NETWORKS,
} from "@/lib/economy";

/**
 * Convert only the locked Ludo-prize ledger into a withdrawal request.
 *
 * `wallets.usdt_balance` is deliberately not read here. That balance contains
 * deposit/admin funds and is protected from withdrawal by product design.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const rawCoinAmount = body.coin_amount ?? (
      Number.isFinite(Number(body.amount)) ? Number(body.amount) * COINS_PER_USDT : NaN
    );
    const coinAmount = Number(rawCoinAmount);
    const walletAddress = String(body.wallet_address ?? "").trim();
    const network = String(body.network ?? "TRC20").trim().toUpperCase();

    if (!isValidWonWithdrawalAmount(coinAmount)) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum conversion is ${MIN_WON_WITHDRAWAL_COINS.toLocaleString()} Won Coins ($${coinsToUsd(MIN_WON_WITHDRAWAL_COINS).toFixed(2)}). Use ${WON_WITHDRAWAL_STEP}-Coin steps.`,
        },
        { status: 400 },
      );
    }

    if (!isWithdrawalNetwork(network)) {
      return NextResponse.json(
        { success: false, error: `Select a supported network (${WITHDRAWAL_NETWORKS.join(" or ")}).` },
        { status: 400 },
      );
    }

    if (!isValidUsdtWalletAddress(walletAddress, network)) {
      return NextResponse.json(
        { success: false, error: `Enter a valid ${network} USDT wallet address.` },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, status")
      .eq("id", auth.userId!)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    if (user.status === "suspended") {
      return NextResponse.json({ success: false, error: "Account suspended" }, { status: 403 });
    }

    const settings = await getSettings(supabase);
    const feePct = Math.max(0, Math.min(99, Number(settings.withdrawal_fee_pct) || 0));

    // This RPC locks the wallet, checks won_coins_balance, debits it and
    // inserts the pending withdrawal in one database transaction.
    const { data: withdrawalId, error: createError } = await supabase.rpc(
      "create_ludo_won_withdrawal",
      {
        p_user_id: user.id,
        p_coin_amount: coinAmount,
        p_wallet_address: walletAddress,
        p_fee_pct: feePct,
        p_network: network,
      },
    );

    if (createError || !withdrawalId) {
      console.error("[withdrawals/create] won-coin conversion failed:", createError);
      const message = createError?.message ?? "Insufficient Won Coins or conversion unavailable";
      return NextResponse.json(
        {
          success: false,
          error: message.includes("function")
            ? "Won Coin conversion is not enabled yet. Please apply sql/08_coin_economy_and_won_withdrawals.sql."
            : message,
        },
        { status: 400 },
      );
    }

    const grossAmount = coinsToUsd(coinAmount);
    const feeAmount = Math.round(grossAmount * (feePct / 100) * 100) / 100;
    const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        id: withdrawalId,
        withdrawal_id: withdrawalId,
        source: "ludo_won",
        network,
        wallet_address: walletAddress,
        coin_amount: coinAmount,
        amount: grossAmount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: "pending",
      },
    });
  } catch (err) {
    console.error("[withdrawals/create]", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
