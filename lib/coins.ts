import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Coin crediting — ek hi jagah se, taaki koi bhi reward (task, ad, streak,
 * welcome bonus, admin adjustment) reliably credit ho.
 *
 * Pehle DB RPC `credit_coins` try hota hai (atomic). Agar woh RPC install na
 * ho / error de, to service-role client se read-modify-write fallback chalta
 * hai — is se "join kiya lekin coins nahi mile" wala bug khatam ho jata hai.
 */
export interface CreditCoinsArgs {
  userId: string;
  amount: number;
  reason: string;
}

export interface CreditCoinsResult {
  ok: boolean;
  method?: "rpc" | "fallback";
  error?: string;
}

export async function creditCoins(
  supabase: SupabaseClient,
  { userId, amount, reason }: CreditCoinsArgs
): Promise<CreditCoinsResult> {
  if (!userId || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Invalid credit request" };
  }

  // ── 1. Preferred path: DB function (atomic) ──────────────────────────────
  try {
    const { error } = await supabase.rpc("credit_coins", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    });
    if (!error) return { ok: true, method: "rpc" };
    console.error("[creditCoins] rpc failed, using fallback:", error.message);
  } catch (err) {
    console.error("[creditCoins] rpc threw, using fallback:", err);
  }

  // ── 2. Fallback: direct wallet update (retry for concurrent writes) ──────
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data: wallet, error: readErr } = await supabase
        .from("wallets")
        .select("coin_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (readErr) throw readErr;

      if (!wallet) {
        const { error: insertErr } = await supabase
          .from("wallets")
          .insert({ user_id: userId, coin_balance: amount, usdt_balance: 0 });
        if (insertErr) throw insertErr;
      } else {
        const current = Number(wallet.coin_balance ?? 0);
        const { error: updateErr } = await supabase
          .from("wallets")
          .update({ coin_balance: current + amount, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("coin_balance", current); // optimistic lock
        if (updateErr) throw updateErr;

        // Agar concurrent write ki wajah se 0 rows update hue, dobara try karo
        const { data: check } = await supabase
          .from("wallets")
          .select("coin_balance")
          .eq("user_id", userId)
          .maybeSingle();
        if (check && Number(check.coin_balance ?? 0) !== current + amount) continue;
      }

      // Best-effort ledger entry (schema alag ho to ignore)
      try {
        await supabase.from("transactions").insert({
          user_id: userId,
          type: reason,
          amount,
          description: `+${amount} Coins — ${reason.replace(/_/g, " ")}`,
        });
      } catch {
        /* ignore */
      }

      return { ok: true, method: "fallback" };
    } catch (err) {
      if (attempt === 2) {
        console.error("[creditCoins] fallback failed:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Credit failed" };
      }
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }

  return { ok: false, error: "Credit failed after retries" };
}

export interface CreditUsdtArgs {
  userId: string;
  amount: number;
  reason: string;
}

/**
 * USDT credit — RPC pehle, phir direct wallet fallback.
 * Admin withdrawal reject / deposit approve yahi use karte hain.
 */
export async function creditUsdt(
  supabase: SupabaseClient,
  { userId, amount, reason }: CreditUsdtArgs
): Promise<CreditCoinsResult> {
  if (!userId || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: "Invalid USDT credit request" };
  }

  // Signature drift: kuch DBs me p_reason nahi hota
  const rpcAttempts: Record<string, unknown>[] = [
    { p_user_id: userId, p_amount: amount, p_reason: reason },
    { p_user_id: userId, p_amount: amount },
  ];
  for (const args of rpcAttempts) {
    try {
      const { error } = await supabase.rpc("credit_usdt", args);
      if (!error) return { ok: true, method: "rpc" };
      console.error("[creditUsdt] rpc failed:", error.message);
    } catch (err) {
      console.error("[creditUsdt] rpc threw:", err);
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data: wallet, error: readErr } = await supabase
        .from("wallets")
        .select("usdt_balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (readErr) throw readErr;

      if (!wallet) {
        const { error: insertErr } = await supabase
          .from("wallets")
          .insert({ user_id: userId, coin_balance: 0, usdt_balance: amount });
        if (insertErr) throw insertErr;
      } else {
        const current = Number(wallet.usdt_balance ?? 0);
        const { error: updateErr } = await supabase
          .from("wallets")
          .update({ usdt_balance: current + amount, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("usdt_balance", current);
        if (updateErr) throw updateErr;
      }

      try {
        await supabase.from("transactions").insert({
          user_id: userId,
          type: reason,
          currency: "usdt",
          amount,
          status: "completed",
          description: `+${amount} USDT — ${reason.replace(/_/g, " ")}`,
        });
      } catch {
        /* ledger optional */
      }

      return { ok: true, method: "fallback" };
    } catch (err) {
      if (attempt === 2) {
        return { ok: false, error: err instanceof Error ? err.message : "USDT credit failed" };
      }
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }

  return { ok: false, error: "USDT credit failed after retries" };
}
