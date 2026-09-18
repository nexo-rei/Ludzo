import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-log";
import {
  COINS_PER_USDT,
  MIN_DEPOSIT_USD,
  MIN_WON_WITHDRAWAL_COINS,
  coinsToUsd,
} from "@/lib/economy";

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) throw error;

    const ALIASES: Record<string, string> = {
      min_deposit: "min_deposit_usdt",
      min_withdrawal: "min_withdrawal_usdt",
      app_name: "site_name",
    };

    const settings: Record<string, string> = {};
    (data ?? []).forEach(({ key, value }) => {
      settings[key] = value;
      if (ALIASES[key]) settings[ALIASES[key]] = value;
    });

    const fixedMinimum = coinsToUsd(MIN_WON_WITHDRAWAL_COINS).toFixed(2);
    const fixedMinDeposit = MIN_DEPOSIT_USD.toFixed(2);
    settings.coin_rate = String(COINS_PER_USDT);
    settings.min_withdrawal = fixedMinimum;
    settings.min_withdrawal_usdt = fixedMinimum;
    settings.min_deposit = fixedMinDeposit;
    settings.min_deposit_usdt = fixedMinDeposit;

    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: 401 });

  try {
    const body = await req.json();
    const settings = body as Record<string, string>;

    const supabase = createAdminClient();
    const upserts = Object.entries(settings).map(([key, value]) => ({
      key,
      // Keep the public economy rules fixed: 100 Coins = $0.50, the minimum
      // deposit is $3.00, and 1,000 Won Coins = $5 is the minimum conversion.
      value: key === "coin_rate"
        ? String(COINS_PER_USDT)
        : key === "min_withdrawal" || key === "min_withdrawal_usdt"
          ? coinsToUsd(MIN_WON_WITHDRAWAL_COINS).toFixed(2)
          : key === "min_deposit" || key === "min_deposit_usdt"
            ? MIN_DEPOSIT_USD.toFixed(2)
            : String(value),
    }));
    const { error: upsertErr } = await supabase
      .from("settings")
      .upsert(upserts, { onConflict: "key" });

    if (upsertErr) {
      console.error(
        `[ADMIN SETTINGS] UPSERT FAILED code=${upsertErr.code} ${upsertErr.message} ` +
        `details=${upsertErr.details ?? "-"} hint=${upsertErr.hint ?? "-"} ` +
        `keys=${JSON.stringify(upserts.map(u => u.key))}`
      );
      return NextResponse.json(
        { success: false, error: `Save failed: ${upsertErr.message}` },
        { status: 500 }
      );
    }

    const { data: verify } = await supabase
      .from("settings")
      .select("key, value")
      .eq("key", "maintenance_mode")
      .maybeSingle();
    console.log(`[ADMIN SETTINGS] saved. maintenance_mode now = ${JSON.stringify(verify?.value)}`);

    await logAdminAction(supabase, {
      adminId: auth.adminId,
      action: "settings_update",
      details: settings,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
